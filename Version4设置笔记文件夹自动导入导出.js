// ===================================================================
// PDF-Xchange Editor JavaScript: 按需激活的智能注释同步脚本 (唯一文件名版)
//（无导入时注释要手动导出才能激活自动同步）
// 根据PDF路径父文件夹生成唯一的XFDF文件路径，包含父文件夹名。
// PDF-Xchange Editor JavaScript: 智能注释同步脚本 (整合版)
// 功能1: 集中存储模式 (原功能)
// 功能2: 同级目录模式 (新增功能)
// ===================================================================

// --- 全局配置 ---
//var ANNOTATION_FOLDER = "G:\\OneDrive - xiehui1573\\Appdata_my\\VnoteData\\12_PDFxchangeAnnot"; // 你的笔记文件夹

// --- 全局变量 ---
var pollTimer;
var docSyncState = new Map(); // 存储每个文档的同步状态档案

// --- 1. 加载配置 ---
var appConfig = loadConfig('myAppConfig.json'); //来自3ExportImportFunction.js

// --- 2. 检查并使用配置 ---
if (appConfig) {
    console.println("--- 配置加载成功 ---");
    // 直接使用配置项
    var ANNOTATION_FOLDER = appConfig.ANNOTATION_FOLDER;
    console.println("注释文件夹: " + ANNOTATION_FOLDER);
} else {
    console.println("--- 配置加载失败，使用默认值 ---");
    // 如果加载失败，设置一个默认值
    var ANNOTATION_FOLDER = "G:\\OneDrive - xiehui1573\\Appdata_my\\VnoteData\\12_PDFxchangeAnnot";
}

// ===================================================================
// 0. 【新增】工具函数：生成唯一的XFDF路径
// ===================================================================

/**
 * 根据PDF路径生成唯一的XFDF文件路径，包含父文件夹名。
 * @param {string} pdfPath - PDF文件的路径，例如 /E/Downloads/ProjectA/report.pdf
 * @returns {string} - 生成的XFDF路径，例如 /E/Downloads/ProjectA/ProjectA_report_Annotations.xfdf
 */
function generateXfdfPath(pdfPath) {
    if (!pdfPath) return "";

    // 1. 提取文件名（不含扩展名）
    var separatorIndex = pdfPath.lastIndexOf("/");
    var fileNameWithoutExt = pdfPath.substring(separatorIndex + 1, pdfPath.lastIndexOf("."));

    // 2. 提取父文件夹名
    var parentFolderSeparatorIndex = pdfPath.lastIndexOf("/", separatorIndex - 1);
    var parentFolderName = pdfPath.substring(parentFolderSeparatorIndex + 1, separatorIndex);

    // 3. 【关键】组合新的文件名：父文件夹名_原文件名_Annotations.xfdf
    var newFileName = parentFolderName + "/" + fileNameWithoutExt + "_Annotations.xfdf";

    // 4. 【复用】将 ANNOTATION_FOLDER 转换为Unix风格路径
    var windowsPath = ANNOTATION_FOLDER.replace(/\\\\/g, "\\");
    var unixPath = windowsPath.replace(/^([A-Z]):\\/, '/$1/');
    if (!unixPath.endsWith("/")) {
        unixPath += "/";
    }

    // 5. 组合成最终路径
    var xfdfPath = unixPath + newFileName;
    return xfdfPath;
}

/**
 * [新增功能] 生成PDF同级目录的XFDF路径
 */
function generateSiblingXfdfPath(pdfPath) {
    if (!pdfPath) return "";
    // 直接替换扩展名为 .xfdf
    if (pdfPath.toLowerCase().endsWith(".pdf")) {
        return pdfPath.substring(0, pdfPath.length - 4) + "_Annotations.xfdf";
    }
    return pdfPath + "_Annotations.xfdf";
}

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
// 2. 核心同步逻辑
// ===================================================================
function processDocument(doc) {
    if (!doc || !doc.path) return;
    var pdfPath = doc.path;
    
    // 【修改】使用新的函数生成XFDF路径
    var xfdfPath = generateXfdfPath(pdfPath);
    //console.println("目标XFDF路径: " + xfdfPath);
	
    // 获取或创建该文档的同步状态档案
    var state = docSyncState.get(doc);

	// --- 情况1: 该文档尚未被激活同步 ---
	if (!state) {
		console.println("检查新文档: " + doc.documentFileName);
		try {
			// --- 【调试实验】开始 ---
			try {
				var xfdfContent = trustedReadFile(xfdfPath);
			}catch (e){
				console.println(">> 读取xfdf文件失败，大概相关路径尚不存在，手动设置xfdfContent为空");
				xfdfContent = "";
			}
			// --- 【调试实验】结束 ---
			if (typeof xfdfContent !== "string" || xfdfContent.length === 0 || !xfdfContent.trim()) {
				console.println(">> 未找到或外部XFDF文件为空，跳过导入。");
				docSyncState.set(doc, {
					isActive: false,
					baselineSnapshot: getAnnotationsSnapshot(doc),
					importChecked: true
				});
				console.println(">> 该文档尚未激活自动同步，请通过“导出并激活”按钮开始。");
				return;
			}
            console.println(">> 找到外部XFDF，正在导入并激活同步...");
            privImportXFDF(doc, xfdfPath);
            
            docSyncState.set(doc, {
                isActive: true,
                baselineSnapshot: getAnnotationsSnapshot(doc),
                importChecked: true,
                targetPath: xfdfPath  // 【关键修复】必须记录导入时的路径，供后续自动导出使用
            });
			doc.dirty = false; 
            console.println(">> 导入完成，同步已激活。");

		} catch (e) {
			console.println("处理新文档时出错: " + e.message);
		}
		return;
	}
     // --- 情况2: 该文档已被激活同步，执行监控和自动导出 ---
    if (state && state.isActive) {
        var currentSnapshot = getAnnotationsSnapshot(doc);
        if (currentSnapshot !== state.baselineSnapshot) {
            // 使用文档记录的路径进行保存（可能是集中路径，也可能是同级路径）
            var xfdfPath = state.targetPath; 
            console.println(">> 检测到注释变化，正在自动导出: " + xfdfPath);
            privExportXFDF(doc, xfdfPath);
            state.baselineSnapshot = currentSnapshot;
            doc.dirty = false;
            console.println(">> 自动导出完成。");
        }
    }
}

// ===================================================================
// 3. 全局轮循管理
// ===================================================================
function pollAllDocs() {
    try {
        var allOpenDocs = getAllDocs();
        var openDocSet = new Set(allOpenDocs);
        for (var doc of docSyncState.keys()) {
            if (!openDocSet.has(doc)) {
                docSyncState.delete(doc);
                console.println("已清理已关闭文档的同步状态。");
            }
        }
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
        // app.alert({cMsg: "轮循已在运行中。", cTitle: "提示", nIcon: 1}); // 启动时屏蔽提示
        return;
    }
    console.println("启动智能同步轮循...");
    pollTimer = app.setInterval(pollAllDocs, 2000);
}

function stopPolling() {
    if (pollTimer) {
        app.clearInterval(pollTimer);
        pollTimer = null;
        console.println("已停止智能同步轮循。");
        app.alert({ cMsg: "智能同步已停止。", cTitle: "提示", nIcon: 1 });
    } else {
        app.alert({ cMsg: "当前没有运行的轮循。", cTitle: "提示", nIcon: 1 });
    }
}

// ===================================================================
// 4. 核心功能函数
// ===================================================================

/**
 * [原功能] 智能导出并激活 (导出到集中文件夹)
 */
function manualExportAndActivate(doc) {
    if (!doc || !doc.path) {
        app.alert({ cMsg: "请先保存PDF文件。", cTitle: "错误", nIcon: 0 });
        return;
    }
    var xfdfPath = generateXfdfPath(doc.path); // 使用集中路径
    activateSyncWithExport(doc, xfdfPath, "集中存储");
}

/**
 * [新增功能] 快速导出同名XFDF并激活 (导出到同级目录)
 */
function quickExportAndActivate(doc) {
    if (!doc || !doc.path) {
        app.alert({ cMsg: "请先保存PDF文件。", cTitle: "错误", nIcon: 0 });
        return;
    }
    var xfdfPath = generateSiblingXfdfPath(doc.path); // 使用同级路径
    activateSyncWithExport(doc, xfdfPath, "同级目录");
}

/**
 * [新增功能] 加载同级XFDF并激活
 */
function loadSiblingXFDF(doc) {
    if (!doc || !doc.path) {
        app.alert({ cMsg: "请先保存PDF文件。", cTitle: "错误", nIcon: 0 });
        return;
    }
    var xfdfPath = generateSiblingXfdfPath(doc.path);
    
    try {
        var xfdfContent = trustedReadFile(xfdfPath);
        if (typeof xfdfContent !== "string" || xfdfContent.length === 0) {
            app.alert({ cMsg: "未找到同级目录下的XFDF文件：\n" + xfdfPath, cTitle: "未找到文件", nIcon: 1 });
            return;
        }
        
        privImportXFDF(doc, xfdfPath);
        activateSyncState(doc, xfdfPath); // 激活状态
        doc.dirty = false;
        app.alert({ cMsg: "成功加载XFDF并激活自动同步！\n\n" + xfdfPath, cTitle: "成功", nIcon: 1 });
        
    } catch (e) {
        app.alert({ cMsg: "加载失败: " + e.message, cTitle: "错误", nIcon: 0 });
    }
}

/**
 * [核心辅助] 统一的导出并激活逻辑
 */
function activateSyncWithExport(doc, xfdfPath, modeName) {
    try {
        var currentSnapshot = getAnnotationsSnapshot(doc);
        if (!currentSnapshot) {
            app.alert({ cMsg: "当前文档没有任何注释，无需导出。", cTitle: "无需操作", nIcon: 1 });
            return;
        }
        
        // 检查旧文件是否存在并比较 (复用原逻辑)
        var oldSnapshot = "";
        var snapshotFileExists = false;
        try {
            var oldXfdfString = trustedReadFile(xfdfPath);
            oldSnapshot = parseXFDFToSnapshot(oldXfdfString);
            snapshotFileExists = true;
        } catch (e) { /* 忽略错误，文件可能不存在 */ }

        var shouldExport = true;
        if (snapshotFileExists && currentSnapshot === oldSnapshot) {
            var response = app.alert({ cMsg: "注释内容没有变化，是否仍要强制覆盖导出？", cTitle: "确认强制导出", nIcon: 2, nType: 2 });
            if (response !== 4) shouldExport = false;
        }

        if (shouldExport) {
            privExportXFDF(doc, xfdfPath);
            doc.dirty = false;
            console.println("成功！XFDF已导出 (" + modeName + ")：" + xfdfPath);
        }

        // 激活同步状态
        activateSyncState(doc, xfdfPath);
        app.alert({ cMsg: "操作成功！已开启自动同步。\n路径: " + xfdfPath, cTitle: "成功", nIcon: 1 });

    } catch (e) {
        app.alert({ cMsg: "操作失败: " + e.message, cTitle: "错误", nIcon: 0 });
    }
}

/**
 * [核心辅助] 设置激活状态 (新增 targetPath 属性)
 */
function activateSyncState(doc, xfdfPath) {
    docSyncState.set(doc, {
        isActive: true,
        baselineSnapshot: getAnnotationsSnapshot(doc),
        targetPath: xfdfPath // 关键：记录该文档对应的XFDF路径
    });
    console.println(">> 同步已激活，目标路径: " + xfdfPath);
}


function manualSetDirtyFalse(doc)
{
	doc.dirty = false; 
	console.println("已手动清除文档保存状态！");
}

function ctrlsHintfun()
{
	app.alert({ cMsg: "Ctrl+S 已禁用，想快捷导出 xfdf 请使用 Alt+W ", cTitle: "Ctrl+S 已禁用", nIcon: 0 });
}

// ===================================================================
// 5. UI 和启动
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

app.addMenuItem({
    cName: 'SetDirtyFalse',
    cUser: '清除保存状态',
    cLabel: '将当前状态设置为不用保存',
    cTooltext: '将当前状态设置为不用保存',
    cIconID: 'cmd.saveUnrestricted',
    cExec: 'manualSetDirtyFalse(this);',
    cParent: 'Home',
    cRbParent: 'JS:QuickAccess',
    nRbPos: -1
});

// app.addToolButton({
    // cName: 'exportAndActivatebutton',
    // cLabel: '导出并激活同步',
    // cIconID: 'cmd.comments.export',
    // cTooltext: '智能导出所有注释到同目录下的xfdf文件',
    // //cHotkey: 'Alt+Q',
    // cParent: 'Home',
    // cExec: 'manualExportAndActivate(this);'
// });

// 按钮: Ctrl+S提示（绑定Alt+Q的提示功能）
app.addToolButton({
    cName: 'ctrlSHintButton',
    cLabel: 'Ctrl+S已禁用',
	cIconID: 'cmd.saveCurrentSessionToFile',
    cTooltext: '提示：请使用 Alt+W 快捷导出 XFDF',
    cHotkey: 'Ctrl+S',
    cExec: 'ctrlsHintfun();',
    cParent: 'Home'
});


// --- [新增] 按钮: 快速导出同名XFDF ---
app.addToolButton({
    cName: 'quickExportXFDF',
    cUser: '导出同名XFDF并激活',
    cLabel: '快速导出XFDF',
    cTooltext: '导出XFDF到PDF同级目录，并开启自动保存',
    cIconID: 'cmd.forms.exportData',
    cExec: 'quickExportAndActivate(this);',
    cParent: 'Home'
});

// --- [新增] 按钮: 加载同级XFDF ---
app.addToolButton({
    cName: 'loadXFDFMenu',
    cUser: '加载同名XFDF并激活',
    cLabel: '快速加载XFDF',
    cTooltext: '加载PDF同级目录下的XFDF文件，并开启自动保存',
    cIconID: 'cmd.forms.importData',
    cExec: 'loadSiblingXFDF(this);',
    cParent: 'Home'
});

// 启动监控！
startPolling();
// 脚本结束
