/**
 * 获取选中注释信息并生成Obsidian跳转链接（XFDF版本 - 全路径编码）
 */

// 路径转换函数：Windows格式 → Unix格式，然后对整个路径进行URL编码
function convertToFullyEncodedUnixPath(windowsPath) {
    // 1. 将 "G:\Tmp" 转换为 "G:/Tmp"，注意这个和自动导入导出的脚本不同
    var unixPath = windowsPath.replace(/^([A-Z]):\\/, '$1:/');
    // 2. 将所有反斜杠转换为正斜杠
    unixPath = unixPath.replace(/\\/g, '/');
    
    // 3. 【关键】对整个路径字符串进行URL编码，包括开头的斜杠和驱动器字母
    return encodeURIComponent(unixPath);
}

// 主函数
function getSelectedAnnotationInfo() {
    var selectedAnnots = this.selectedAnnots;

    if (!selectedAnnots || selectedAnnots.length === 0) {
        app.alert({
            cMsg: "请先选中一个或多个注释再运行此脚本。",
            cTitle: "提示"
        });
        return;
    }

    var primaryAnnot = selectedAnnots[0];

    // --- 1. 提取注释信息 ---
    var pageNum = this.pageNum + 1;
    var commentId = primaryAnnot.name;
    var note = primaryAnnot.contents || "";

    // --- 2. 处理PDF文件名 ---
    var pdfPath = this.path;
    var separatorIndex = pdfPath.lastIndexOf("/");
    var fileNameWithoutExt = pdfPath.substring(separatorIndex + 1, pdfPath.lastIndexOf("."));

    // --- 3. 构建XFDF完整路径并编码 ---
    var ANNOTATION_FOLDER = "G:\\OneDrive - xiehui1573\\Appdata_my\\PDFxchangeAnnot";
    var xfdfWindowsPath = ANNOTATION_FOLDER + "\\" + fileNameWithoutExt + "_Annotations.xfdf";
    var encodedXfdfPath = convertToFullyEncodedUnixPath(xfdfWindowsPath);

    // --- 4. 【最终方案】基于正确的坐标系和坐标转换 ---
    var annotRect = primaryAnnot.rect; // [left, top, right, bottom] in PDF's internal coords
    var centerY_PDF = (annotRect[1] + annotRect[3]) / 2; // 注释中心在PDF坐标系中的Y值

    var pageBox = this.getPageBox("Media", this.pageNum);
    var pageHeight = pageBox[1] - pageBox[3]; // 页面高度

    // 【核心转换】将PDF坐标系的Y值，转换为屏幕坐标系的Y值
    var centerY_Screen = pageHeight - centerY_PDF;

    // 估算一个合理的视图高度（像素），用于计算居中位置
    // 这个值代表你希望在屏幕上看到的、以注释为中心的区域的高度
    var viewHeightOnScreen = 300; // 你可以根据喜好调整这个值

    // 【核心计算】计算滚动的top值，让注释垂直居中
    var idealScrollTop = centerY_Screen - viewHeightOnScreen / 2;

    // 【保险】进行边界检查，确保 scrollTop 在有效范围内 [0, pageHeight - viewHeightOnScreen]
    // 注意：这里的 pageHeight 和 viewHeightOnScreen 需要在同一单位下，我们这里都用像素作为概念
    // 为了简化，我们直接用 idealScrollTop，并确保它不为负数
    var finalScrollTop = Math.max(0, idealScrollTop);

    // --- 5. 【关键】生成新的pxce链接（使用 zoom 参数） ---
    // zoom 参数可以直接设置缩放和滚动，非常直接
    var fixedZoom = 125; // 你可以调整这个缩放值
    var pxceLink = "pxce:file:///" + encodedXfdfPath + "#page=" + pageNum + ";zoom=" + fixedZoom + ",null," + Math.round(finalScrollTop);

    // --- 6. 生成Obsidian链接 ---
    var linkTitle = note || "查看注释";
    if (linkTitle.length > 50) {
        linkTitle = linkTitle.substring(0, 50) + "...";
    }
    var obsidianLink = "[" + linkTitle + " ; " + this.documentFileName + "](" + pxceLink + ")";

    // --- 7. 构建信息对象 ---
    var jsonObject = {
        obsidian_link: obsidianLink,
        pxce_link: pxceLink,
        note: note,
        page: pageNum,
        comment_id: commentId,
        xfdf_path: xfdfWindowsPath,
        file_name: this.documentFileName,
        author: primaryAnnot.author || "",
        created: primaryAnnot.creationDate,
        modified: primaryAnnot.modDate
    };

    // --- 8. 显示结果 ---
    var outputText = obsidianLink + "\n\n" +
                     "===== XFDF路径 =====\n" +
                     xfdfWindowsPath + "\n\n" +
                     "===== 注释笔记 =====\n" +
                     (note || "(无笔记内容)") + "\n\n" +
                     "===== 完整信息 =====\n" +
                     JSON.stringify(jsonObject, null, 2);
    console.println(outputText);
    app.response({
        cQuestion: "请手动复制链接到剪贴板",
        cTitle: "PDF-XChange 注释链接生成器（坐标转换版）",
        cDefault: outputText
    });
}

// --- UI注册（保持不变） ---
app.addToolButton({
    cName: 'getSelectedAnnotationInfo',
    cLabel: '为选中的注释生成ObLink',
    cIconID: 'cmd.linksView.wrapTitles',
    cTooltext: '为选中的第1个注释生成ObLink',
    cExec: 'getSelectedAnnotationInfo(this);'
});

app.addMenuItem({
    cName: "getSelectedAnnotationInfoMenu",
    cUser: "为选中的注释生成ObLink",
    cLabel: "为选中的注释生成ObLink",
    cTooltext: '为选中的第1个注释生成ObLink',
    cIconID: 'cmd.linksView.wrapTitles',
    cExec: "getSelectedAnnotationInfo(this)",
    cHotkey: 'Alt+G',
    cParent: 'Home',
    nPos: 'rbar.home.protec',
    cRbParent: 'JS:QuickAccess',
    nRbPos: -1
});
