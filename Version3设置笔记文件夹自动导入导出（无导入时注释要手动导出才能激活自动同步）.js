// ===================================================================
// PDF-Xchange Editor JavaScript: 按需激活的智能注释同步脚本 (最终版)
// ===================================================================

// --- 全局配置 ---

var ANNOTATION_FOLDER = "G:\\OneDrive - xiehui1573\\Appdata_my\\PDFxchangeAnnot"; // 你的笔记文件夹，使用Windows标准反斜杠

// --- 全局变量 ---
var pollTimer;
var docSyncState = new Map(); // 存储每个文档的同步状态档案

// ===================================================================
// 3. 受信任函数和工具函数 (复用自你的脚本)
// ===================================================================

// 【新增】受信任的导入函数
var privImportXFDF = app.trustedFunction( (t, path) => {
    app.beginPriv();
    t.importAnXFDF(path);
    app.endPriv();
});

// 【复用】受信任的导出函数
var privExportXFDF = app.trustedFunction((t, path) => {
    app.beginPriv();
    t.exportAsXFDF({ cPath: path, bAnnotations: true, bExportAsOff: false });
    app.endPriv();
});

// 【复用】受信任的获取所有文档函数
const getAllDocs = app.trustedFunction(() => {
    app.beginPriv();
    return app.activeDocs;
});

// 注意: getAnnotationsSnapshot, parseXFDFToSnapshot, trustedReadFile 这些函数
// 需要从你的函数库 (3ExportImportFunction.js) 中复制过来，或者确保该库已加载。

// ===================================================================
// 1. 核心同步逻辑 (处理单个文档)
// ===================================================================
function processDocument(doc) {
    if (!doc || !doc.path) return;

    var pdfPath = doc.path; // 这是 /E/Downloads/tmp/JCO.pdf 格式
    //console.println("PDF路径: " + pdfPath);
    
    var separatorIndex = pdfPath.lastIndexOf("/");
    var fileNameWithoutExt = pdfPath.substring(separatorIndex + 1, pdfPath.lastIndexOf("."));
    
    // 【关键】在这里转换 ANNOTATION_FOLDER
    // 1. 将 "E:\\Tmp" 转换为 "E:\Tmp"
    var windowsPath = ANNOTATION_FOLDER.replace(/\\\\/g, "\\");
    // 2. 【修改】将 "E:\Tmp" 转换为 "/E/Tmp"
    var unixPath = windowsPath.replace(/^([A-Z]):\\/, '/$1/');
    // 3. 确保末尾有斜杠
    if (!unixPath.endsWith("/")) {
        unixPath += "/";
    }
    
    var xfdfPath = unixPath + fileNameWithoutExt + "_Annotations.xfdf";
    //console.println("目标XFDF路径: " + xfdfPath);
	
    // 获取或创建该文档的同步状态档案
    var state = docSyncState.get(doc);

	// --- 情况1: 该文档尚未被激活同步 【修改】不再自动激活，等待用户手动操作---
	if (!state) {
		console.println("检查新文档: " + doc.documentFileName);
		try {
			var xfdfContent = trustedReadFile(xfdfPath);

			if (typeof xfdfContent !== "string" || xfdfContent.length === 0 || !xfdfContent.trim()) {
				console.println(">> 未找到或外部XFDF文件为空，跳过导入。");
				// 【关键修改】创建一个“待激活”的状态档案，避免重复检查
				docSyncState.set(doc, {
					isActive: false, // 【核心】标记为未激活
					baselineSnapshot: getAnnotationsSnapshot(doc),
					importChecked: true
				});
				console.println(">> 该文档尚未激活自动同步，请通过“导出并激活”按钮开始。");
				return; // 首次处理完毕
			}
            // --- 步骤2: 文件存在且有内容，执行导入 ---
            console.println(">> 找到外部XFDF，正在导入并激活同步...");
            privImportXFDF(doc, xfdfPath);
            
            // 创建档案，记录为已激活，并保存导入后的快照作为基准
            docSyncState.set(doc, {
                isActive: true,
                baselineSnapshot: getAnnotationsSnapshot(doc),
                importChecked: true // 【新增】标记导入已检查过
            });
            console.println(">> 导入完成，同步已激活。");

		} catch (e) {
			console.println("处理新文档时出错: " + e.message);
		}
		return;
	}


    // --- 情况2: 该文档已被激活同步，执行监控和自动导出 ---
    // 【修改】增加一个判断，如果已经检查过导入，就不再走上面的逻辑
    if (state && state.isActive) {
        var currentSnapshot = getAnnotationsSnapshot(doc);
        if (currentSnapshot !== state.baselineSnapshot) {
            console.println(">> 检测到注释变化，正在自动导出: " + doc.documentFileName);
            privExportXFDF(doc, xfdfPath);
            // 更新基准快照
            state.baselineSnapshot = currentSnapshot;
            console.println(">> 自动导出完成。");
        }
    }
}

// ===================================================================
// 2. 全局轮循管理
// ===================================================================
function pollAllDocs() {
    try {
        // 清理已关闭文档的档案
        var allOpenDocs = getAllDocs();
        var openDocSet = new Set(allOpenDocs);
        for (var doc of docSyncState.keys()) {
            if (!openDocSet.has(doc)) {
                docSyncState.delete(doc);
                console.println("已清理已关闭文档的同步状态。");
            }
        }

        // 遍历所有打开的文档并处理
        if (!allOpenDocs || allOpenDocs.length === 0) return;
        for (var i = 0; i < allOpenDocs.length; i++) {
            processDocument(allOpenDocs[i]);
        }
    } catch (e) {
        console.println("轮询过程中发生错误: " + e.message);
    }
}

function startPolling() {
    if (pollTimer) {
        app.alert({cMsg: "轮循已在运行中。", cTitle: "提示", nIcon: 1});
        return;
    }
    console.println("启动智能同步轮循...");
    pollTimer = app.setInterval(pollAllDocs, 2000);
    //app.alert({cMsg: "智能同步已启动。", cTitle: "提示", nIcon: 1});
}

function stopPolling() {
    if (pollTimer) {
        app.clearInterval(pollTimer);
        pollTimer = null;
        console.println("已停止智能同步轮循。");
        app.alert({cMsg: "智能同步已停止。", cTitle: "提示", nIcon: 1});
    } else {
        app.alert({cMsg: "当前没有运行的轮循。", cTitle: "提示", nIcon: 1});
    }
}

// ===================================================================
// 4. 手动导出按钮 (智能导出并激活同步)
// ===================================================================
function manualExportAndActivate(doc) {
    if (!doc || !doc.path) {
        app.alert({ cMsg: "请先保存PDF文件。", cTitle: "错误", nIcon: 0 });
        return;
    }

    // 【路径处理】统一使用Unix风格路径
    var pdfPath = doc.path; // 例如 /E/Downloads/tmp/JCO.pdf
    var separatorIndex = pdfPath.lastIndexOf("/");
    var fileNameWithoutExt = pdfPath.substring(separatorIndex + 1, pdfPath.lastIndexOf("."));
    
    // 转换 ANNOTATION_FOLDER 到Unix风格
    var windowsPath = ANNOTATION_FOLDER.replace(/\\\\/g, "\\");
    var unixPath = windowsPath.replace(/^([A-Z]):\\/, '/$1/');
    if (!unixPath.endsWith("/")) {
        unixPath += "/";
    }
    var xfdfPath = unixPath + fileNameWithoutExt + "_Annotations.xfdf";

    try {
        // 【核心逻辑】开始智能比对和导出
        var currentSnapshot = getAnnotationsSnapshot(doc);
        
        if (!currentSnapshot) {
            console.println("当前文档没有任何注释，无需导出。");
            app.alert({
                cMsg: "当前文档中没有找到任何注释，无需操作。",
                cTitle: "无需操作",
                nIcon: 1
            });
            return;
        }
		
        console.println("--- 当前注释快照 ---");
        console.println(currentSnapshot);
        console.println("--------------------");

        var oldSnapshot = "";
        var snapshotFileExists = false;
        try {
            var oldXfdfString = trustedReadFile(xfdfPath);
            oldSnapshot = parseXFDFToSnapshot(oldXfdfString);
            snapshotFileExists = true;
            console.println("--- 从旧XFDF解析出的快照 ---");
            console.println(oldSnapshot);
            console.println("------------------------------");
        } catch (e) {
            console.println("未找到旧的XFDF文件，将执行首次导出。");
        }

        // 【核心逻辑】判断并执行
        if (!snapshotFileExists) {
            // 情况1：首次导出，直接执行
            console.println("比较结果：未找到旧文件，执行首次导出。");
            privExportXFDF(doc, xfdfPath);
            console.println("成功！XFDF文件已导出。");
            app.alert({
                cMsg: "注释导出成功！\n\n文件已保存至:\n" + xfdfPath,
                cTitle: "导出成功",
                nIcon: 1
            });
        } else if (currentSnapshot !== oldSnapshot) {
            // 情况2：检测到更新，直接导出
            console.println("比较结果：注释内容有变化，准备导出。");
            privExportXFDF(doc, xfdfPath);
            console.println("成功！XFDF文件已导出。");
            app.alert({
                cMsg: "注释导出成功！\n\n文件已保存至:\n" + xfdfPath,
                cTitle: "导出成功",
                nIcon: 1
            });
        } else {
            // 情况3：无更新，询问用户是否强制覆盖
            console.println("比较结果：注释内容完全相同。");
            var response = app.alert({
                cMsg: "注释内容没有变化，是否仍要强制覆盖导出？",
                cTitle: "确认强制导出",
                nIcon: 2, // 问号图标
                nType: 2  // Yes/No按钮
            });

            if (response === 4) { // 用户点击了"Yes"
                console.println("用户选择强制导出，正在执行...");
                privExportXFDF(doc, xfdfPath);
                console.println("成功！XFDF文件已强制导出。");
                app.alert({
                    cMsg: "注释已强制导出！\n\n文件已保存至:\n" + xfdfPath,
                    cTitle: "强制导出成功",
                    nIcon: 1
                });
            } else {
                console.println("用户取消导出操作。");
            }
        }

        // 【关键】无论是否导出，只要用户点了按钮，就激活该文档的自动同步
        console.println("手动操作后，正在激活文档的自动同步...");
        docSyncState.set(doc, {
            isActive: true,
            baselineSnapshot: getAnnotationsSnapshot(doc), // 注意：这里要获取最新的快照
            importChecked: false // 【修改】设为false，让processDocument知道这是一个“待处理”的新状态
        });
        console.println(">> 激活成功！状态已设置，等待下次轮循时开始监控。");

    } catch (e) {
        app.alert({ cMsg: "导出失败: " + e.message, cTitle: "导出失败", nIcon: 0 });
    }
}

// ===================================================================
// 5. UI 和启动 (按你的要求添加到QuickAccess)
// ===================================================================

// 按钮1: 开始轮循
app.addMenuItem({
    cName: "autoPollWaker1",
    cUser: "自动轮循唤醒器",
    cLabel: "开始轮循",
    cIconID: 'cmd.annot.line.restoreCaption',
    cExec: "startPolling(this)",
    cParent: 'Home',
    nPos: 'rbar.home.protec',
    cRbParent: 'JS:QuickAccess',
    nRbPos: -2
});

// 按钮2: 停止轮循
app.addMenuItem({
    cName: 'stopPollWaker',
    cUser: '停止后台轮循保存注释',
    bHidden: false,
    cLabel: "停止轮循",
    cTooltext: "停止后台轮循保存注释",
    cIconID: 'ico.stop.export',
    cExec: "stopPolling(this)",
    cParent: 'Home',
    cRbParent: 'JS:QuickAccess',
    nRbPos: -1
});

// 按钮3: 导出并激活同步
app.addMenuItem({
    cName: 'exportAndActivateMenu',
    cUser: '导出并激活同步',
    cLabel: '导出并激活',
    cTooltext: '导出注释到指定文件夹，并开启自动同步',
    cIconID: 'cmd.comments.export',
    cExec: 'manualExportAndActivate(this);',
    cHotkey: 'Alt+W',
    cParent: 'Home',
    cRbParent: 'JS:QuickAccess',
    nRbPos: -3
});
app.addToolButton({
    cName: 'exportAndActivatebutton',
    cLabel: '导出并激活同步',
    cIconID: 'cmd.comments.export',
    cTooltext: '智能导出所有注释到同目录下的xfdf文件',
    cHotkey: 'Ctrl+S',
    cParent: 'Home',
    cExec: 'manualExportAndActivate(this);'
});
// 启动监控！
startPolling();

// 脚本结束
