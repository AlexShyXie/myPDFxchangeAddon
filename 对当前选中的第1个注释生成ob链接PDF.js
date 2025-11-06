/**
 * 获取选中注释信息并生成Obsidian跳转链接（PDF版本 - 直接跳转到PDF）
 */

// 【重新加入】路径转换函数：Editor内部路径 → pxce协议可用路径 → URL编码
function convertToFullyEncodedUnixPath(editorPath) {
    // 1. 【关键】将Editor的Unix风格路径 "/E/Downloads/tmp/JCO.pdf" 转换为 "E:/Downloads/tmp/JCO.pdf"
    // 去掉开头的斜杠，并将驱动器字母后的斜杠转为冒号
    var pxceStylePath = editorPath.replace(/^\/([A-Z])\//, '$1:/');
    
    // 2. 将所有剩余的斜杠保持不变（因为已经是正确的格式了）
    // 这一步可以省略，因为上一步已经处理了主要部分
    
    // 3. 【关键】对整个路径字符串进行URL编码
    return encodeURIComponent(pxceStylePath);
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
    var pdfPath = this.path; // 获取Editor内部的路径，例如 /E/Downloads/tmp/JCO.pdf

    // --- 3. 【修改】使用转换函数处理PDF路径 ---
    var encodedPdfPath = convertToFullyEncodedUnixPath(pdfPath);

    // --- 4. 【最终方案】基于正确的坐标系和坐标转换 ---
    var annotRect = primaryAnnot.rect; // [left, top, right, bottom] in PDF's internal coords
    var centerY_PDF = (annotRect[1] + annotRect[3]) / 2; // 注释中心在PDF坐标系中的Y值

    var pageBox = this.getPageBox("Media", this.pageNum);
    var pageHeight = pageBox[1] - pageBox[3]; // 页面高度

    // 【核心转换】将PDF坐标系的Y值，转换为屏幕坐标系的Y值
    var centerY_Screen = pageHeight - centerY_PDF;

    // 估算一个合理的视图高度（像素），用于计算居中位置
    var viewHeightOnScreen = 300; // 你可以根据喜好调整这个值

    // 【核心计算】计算滚动的top值，让注释垂直居中
    var idealScrollTop = centerY_Screen - viewHeightOnScreen / 2;

    // 【保险】进行边界检查，确保 scrollTop 在有效范围内
    var finalScrollTop = Math.max(0, idealScrollTop);

    // --- 5. 【关键修改】生成新的pxce链接（直接指向PDF文件） ---
    // 协议从 file:/// 变为指向PDF的路径
    var fixedZoom = 125; // 你可以调整这个缩放值
    var pxceLink = "pxce:file:///" + encodedPdfPath + "#page=" + pageNum + ";zoom=" + fixedZoom + ",null," + Math.round(finalScrollTop);

    // --- 6. 生成Obsidian链接 ---
    // 【新增】清理注释文本中的换行符，确保链接文字的连续性
    var cleanNote = note.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
    
    var linkTitle = cleanNote || "查看注释";
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
        pdf_path: pdfPath, // 记录原始的Editor路径
        file_name: this.documentFileName,
        author: primaryAnnot.author || "",
        created: primaryAnnot.creationDate,
        modified: primaryAnnot.modDate
    };

    // --- 8. 显示结果 ---
    var outputText = obsidianLink + "\n\n" +
                     "===== PDF路径 =====\n" +
                     pdfPath + "\n\n" +
                     "===== 注释笔记 =====\n" +
                     (note || "(无笔记内容)") + "\n\n" +
                     "===== 完整信息 =====\n" +
                     JSON.stringify(jsonObject, null, 2);
    console.println(outputText);
    app.response({
        cQuestion: "请手动复制链接到剪贴板",
        cTitle: "PDF-XChange 注释链接生成器（PDF直接跳转版）",
        cDefault: outputText
    });
}

// --- UI注册（保持不变） ---
app.addToolButton({
    cName: 'getSelectedAnnotationInfoPDF',
    cLabel: '为选中的注释生成ObLinkPDF',
    cIconID: 'cmd.linksView.wrapTitles',
    cTooltext: '为选中的第1个注释生成ObLink',
    cExec: 'getSelectedAnnotationInfo(this);'
});

app.addMenuItem({
    cName: "getSelectedAnnotationInfoMenuPDF",
    cUser: "为选中的注释生成ObLinkPDF",
    cLabel: "为选中的注释生成ObLinkPDF",
    cTooltext: '为选中的第1个注释生成ObLinkPDF',
    cIconID: 'cmd.linksView.wrapTitles',
    cExec: "getSelectedAnnotationInfo(this)",
    cHotkey: 'Alt+G',
    cParent: 'Home',
    nPos: 'rbar.home.protec',
    cRbParent: 'JS:QuickAccess',
    nRbPos: -1
});
