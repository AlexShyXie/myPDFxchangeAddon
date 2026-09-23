/**
 * 获取选中注释信息并生成Obsidian跳转链接（XFDF版本 - 全路径编码）
 * version5 —— 智能使用同步插件记录的XFDF路径
 *
 * v5 更新说明:
 *   - 不再自己拼XFDF路径, 而是【智能使用】"智能注释同步脚本"(version5)在
 *     docSyncState 中为当前文档记录的 targetPath（可能是同级目录, 也可能是
 *     集中存储, 以实际记录的加载来源为准）
 *   - 如果当前文档没有任何已保存的XFDF记录（用户只是编辑了, 还没做任何保存,
 *     尚未激活自动同步）, 点击本按钮会提示"请先保存XFDF后再尝试"
 *
 * 依赖:
 *   - 智能注释同步脚本 version5（提供 docSyncState 全局, 两个文件需配套使用）
 *   - 3ExportImportFunction.js（提供 trustedReadFile, 仅用于文件存在性探测,
 *     缺失时也不影响生成链接）
 */

// 来源中文名映射 (与同步脚本的 mode 标识对应)
var XFDF_SOURCE_NAMES = { sibling: "同级目录", central: "集中存储" };

// 路径转换函数：Windows格式 → Unix格式，然后对整个路径进行URL编码
function convertToFullyEncodedUnixPathXFDF(windowsPath) {
    // 1. 将 "G:\Tmp" 转换为 "G:/Tmp"
    var unixPath = windowsPath.replace(/^([A-Z]):\\/, '$1:/');
    // 2. 将所有反斜杠转换为正斜杠
    unixPath = unixPath.replace(/\\/g, '/');

    // 3. 【关键】对整个路径字符串进行URL编码，包括开头的斜杠和驱动器字母
    return encodeURIComponent(unixPath);
}

function getSelectedAnnotationInfoXFDF(doc) {
    // --- 0. [v5] 确定当前文档 (兼容多种调用方式, 多开PDF互不混淆) ---
    var targetDoc = doc || this;
    if (!targetDoc || !targetDoc.path) {
        try { targetDoc = app.doc; } catch (e) { targetDoc = null; }
    }
    if (!targetDoc || !targetDoc.path) {
        app.alert({
            cMsg: "当前没有已保存到磁盘的PDF文档。",
            cTitle: "提示", nIcon: 0
        });
        return;
    }

    // --- 1. 选中注释检查 ---
    var selectedAnnots = targetDoc.selectedAnnots;

    if (!selectedAnnots || selectedAnnots.length === 0) {
        app.alert({
            cMsg: "请先选中一个或多个注释再运行此脚本。",
            cTitle: "提示"
        });
        return;
    }

    var primaryAnnot = selectedAnnots[0];

    // --- 2. 【v5核心】读取同步插件为当前文档记录的XFDF路径 ---
    var xfdfRecord = null;
    try {
        if (typeof docSyncState !== "undefined") {
            var st = docSyncState.get(targetDoc);
            if (st && st.isActive && st.targetPath) {
                xfdfRecord = { path: st.targetPath, mode: st.mode || "central" };
            }
        }
    } catch (e) {
        console.println("读取同步状态失败: " + e.message);
    }

    if (!xfdfRecord) {
        // 没有任何已保存的XFDF记录 → 提示先保存再试
        app.alert({
            cMsg: "当前文档还没有已保存的XFDF（尚未激活自动同步）。\n\n请先做一次保存（任选其一）：\n  • 按 Ctrl+S → 选择保存位置（同级/存储）\n  • \"快速导出XFDF\"（保存到同级目录）\n  • \"导出并激活\"（Alt+W，保存到集中存储）\n\n保存成功后，再重新生成本ob链接。",
            cTitle: "请先保存XFDF", nIcon: 1
        });
        return;
    }

    var xfdfUnixPath = xfdfRecord.path;
    var xfdfSourceName = XFDF_SOURCE_NAMES[xfdfRecord.mode] || "未知来源";
    console.println(">> 使用已记录的XFDF [" + xfdfSourceName + "]: " + xfdfUnixPath);

    // --- 2.5 [v5] 证据检查: 记录的XFDF文件当前是否还能读到 (不阻断, 仅提醒) ---
    try {
        if (typeof trustedReadFile === "function") {
            var probe = trustedReadFile(xfdfUnixPath);
            if (typeof probe !== "string" || !probe.trim()) {
                console.println(">> 警告: 记录的XFDF文件当前读不到(可能已被移动/删除): " + xfdfUnixPath);
            }
        }
    } catch (eProbe) {
        console.println(">> 警告: 记录的XFDF文件当前读不到(可能已被移动/删除): " + xfdfUnixPath);
    }

    // --- 3. 转换为Windows格式路径并编码 ---
    var xfdfWindowsPath = xfdfUnixPath.replace(/^\//, "").replace(/\//g, "\\");
    xfdfWindowsPath = xfdfWindowsPath.replace(/^([A-Z])/, "$1:");

    var encodedXfdfPath = convertToFullyEncodedUnixPathXFDF(xfdfWindowsPath);

    // --- 4. 【最终方案】基于正确的坐标系和坐标转换 ---
    var annotRect = primaryAnnot.rect; // [left, top, right, bottom] in PDF's internal coords
    var centerY_PDF = (annotRect[1] + annotRect[3]) / 2; // 注释中心在PDF坐标系中的Y值

    var pageBox = targetDoc.getPageBox("Media", targetDoc.pageNum);
    var pageHeight = pageBox[1] - pageBox[3]; // 页面高度

    // 【核心转换】将PDF坐标系的Y值，转换为屏幕坐标系的Y值
    var centerY_Screen = pageHeight - centerY_PDF;

    // 估算一个合理的视图高度（像素），用于计算居中位置
    var viewHeightOnScreen = 300;

    // 【核心计算】计算滚动的top值，让注释垂直居中
    var idealScrollTop = centerY_Screen - viewHeightOnScreen / 2;

    // 【保险】进行边界检查，确保 scrollTop 在有效范围内
    var finalScrollTop = Math.max(0, idealScrollTop);

    // --- 5. 【关键】生成新的pxce链接（使用 zoom 参数） ---
    var fixedZoom = 125;
    var pageNum = targetDoc.pageNum + 1;
    var pxceLink = "pxce:file:///" + encodedXfdfPath + "#page=" + pageNum + ";zoom=" + fixedZoom + ",null," + Math.round(finalScrollTop);

    // --- 6. 生成Obsidian链接 ---
    var note = primaryAnnot.contents || "";

    // 清理注释文本中的换行符，确保链接文字的连续性
    var cleanNote = note.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();

    var linkTitle = cleanNote || "查看注释";

    if (linkTitle.length > 50) {
        linkTitle = linkTitle.substring(0, 50) + "...";
    }
    var obsidianLink = "[" + linkTitle + " ; " + targetDoc.documentFileName + "](" + pxceLink + ")";

    // --- 7. 构建信息对象 ---
    var jsonObject = {
        obsidian_link: obsidianLink,
        pxce_link: pxceLink,
        note: note,
        page: pageNum,
        comment_id: primaryAnnot.name,
        xfdf_path: xfdfWindowsPath,
        xfdf_source: xfdfSourceName,
        file_name: targetDoc.documentFileName,
        author: primaryAnnot.author || "",
        created: primaryAnnot.creationDate,
        modified: primaryAnnot.modDate
    };

    // --- 8. 显示结果 ---
    var outputText = obsidianLink + "\n\n" +
                     "===== XFDF来源 =====\n" +
                     xfdfSourceName + "\n\n" +
                     "===== XFDF路径 =====\n" +
                     xfdfWindowsPath + "\n\n" +
                     "===== 注释笔记 =====\n" +
                     (note || "(无笔记内容)") + "\n\n" +
                     "===== 完整信息 =====\n" +
                     JSON.stringify(jsonObject, null, 2);
    console.println(outputText);
    app.response({
        cQuestion: "请手动复制链接到剪贴板",
        cTitle: "PDF-XChange 注释链接生成器（智能路径版）",
        cDefault: outputText
    });
}

// --- UI注册 ---
app.addToolButton({
    cName: 'getSelectedAnnotationInfoXFDF',
    cLabel: '生成XFDFObLink',
    cIconID: 'cmd.linksView.wrapTitles',
    cTooltext: '为选中的第1个注释生成XFDFObLink（使用已记录的XFDF路径）',
    cExec: 'getSelectedAnnotationInfoXFDF(this);'
});

app.addMenuItem({
    cName: "getSelectedAnnotationInfoXFDFMenu",
    cUser: "为选中的注释生成XFDFObLink",
    cLabel: "为选中的注释生成XFDFObLink",
    cTooltext: '为选中的第1个注释生成XFDFObLink（使用已记录的XFDF路径）',
    cIconID: 'cmd.linksView.wrapTitles',
    cExec: "getSelectedAnnotationInfoXFDF(this)",
    cHotkey: 'Alt+G',
    cParent: 'Home',
    nPos: 'rbar.home.protec',
    cRbParent: 'JS:QuickAccess',
    nRbPos: -1
});
