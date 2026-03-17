// ===================================================================
// PDF-Xchange Editor JavaScript: 按需激活的智能注释同步脚本 (唯一文件名版)
//（无导入时注释要手动导出才能激活自动同步）
// 根据PDF路径父文件夹生成唯一的XFDF文件路径，包含父文件夹名。
// 导出后dirty=false
// ===================================================================




// --- 全局配置 ---
//var ANNOTATION_FOLDER = "G:\\OneDrive - xiehui1573\\Appdata_my\\VnoteData\\12_PDFxchangeAnnot"; // 你的笔记文件夹，使用Windows标准反斜杠



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
                importChecked: true
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
            console.println(">> 检测到注释变化，正在自动导出: " + doc.documentFileName);
            privExportXFDF(doc, xfdfPath);
            state.baselineSnapshot = currentSnapshot;
			doc.dirty = false;
            console.println(">> 自动导出完成。");
        }
    }
}

// ===================================================================
// 2. 全局轮循管理
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
        app.alert({cMsg: "轮循已在运行中。", cTitle: "提示", nIcon: 1});
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

    // --- 【新增】路径检查逻辑 ---
    var targetXfdfPath = "";
    var configFolderExists = false;
    
    // 尝试读取配置文件夹路径（通过尝试读取一个可能不存在的文件来触发错误，从而判断目录是否存在）
    // 或者如果你有更直接的判断文件夹存在的方法也可以替换这里
    try {
        // 假设 trustedReadFile 在路径不存在时会抛出异常或返回空
        // 我们尝试构造一个测试路径，或者直接对目标路径进行操作前的预判
        // 这里简单处理：直接尝试生成路径，然后在导出时捕获异常，或者预先测试
        // 更好的方式是利用你的 trustedReadFile 尝试读取 ANNOTATION_FOLDER 根目录下的一个占位文件
        // 这里我们采用一种简化的逻辑：假设路径无效，让用户选择
        
        var windowsPath = ANNOTATION_FOLDER.replace(/\\\\/g, "\\");
        var unixPath = windowsPath.replace(/^([A-Z]):\\/, '/$1/');
        if (!unixPath.endsWith("/")) { unixPath += "/"; }
        
        // 尝试列出目录或读取（取决于你的安全沙箱限制，通常直接检查比较困难）
        // 这里我们采用“探测尝试”：尝试生成最终路径
        var testPath = generateXfdfPath(doc.path);
        
        // 简单的 heuristic：检查路径是否包含 ANNOTATION_FOLDER
        // 这里主要依赖 trustedReadFile 的异常或后续导出的异常
        // 为了实现你的需求，我们主动抛出一个测试：
        var testRead = "";
        try {
             // 尝试读取文件夹本身或其中任意文件，如果报错则可能不存在
             // 注意：这在 JS 沙箱中可能受限，所以我们改为直接提示用户选择
             // 这里我们假设如果 ANNOTATION_FOLDER 配置的是一个网络路径或脱机路径，可能不存在
             testRead = trustedReadFile(unixPath); 
        } catch (e) {
             // 如果读取根目录报错，我们假定路径不存在
             configFolderExists = false;
        }
        
        // 如果无法确认路径存在（或者你想强制检查），弹出提示
        // 这里的逻辑是：如果 trustedReadFile 无法读取该路径，则认为不存在
        if (!testRead && !configFolderExists) {
             // 可能是路径不存在，也可能是空文件夹，这里为了安全，我们询问用户
             // 注意：如果文件夹存在但为空，trustedReadFile 可能也会失败，这正好触发我们的“备用方案”询问
             
             var response = app.alert({
                cMsg: "配置的注释文件夹路径似乎不存在或无法访问：\n" + ANNOTATION_FOLDER + "\n\n是：改为将 XFDF 文件保存在当前 PDF 的同一路径下？\n否：取消导出操作。",
                cTitle: "路径警告",
                nIcon: 1, // 警告图标
                nType: 2  // 是/否按钮
             });
             
             if (response === 4) { // 用户点击"是"
                 // 生成与 PDF 同路径的 XFDF 文件名
                 var pdfPath = doc.path;
                 var separatorIndex = pdfPath.lastIndexOf("/");
                 var fileNameWithoutExt = pdfPath.substring(separatorIndex + 1, pdfPath.lastIndexOf("."));
                 targetXfdfPath = pdfPath.substring(0, separatorIndex + 1) + fileNameWithoutExt + "_Annotations.xfdf";
             } else {
                 // 用户点击"否"，取消操作
                 console.println("用户取消导出操作。");
                 return;
             }
        } else {
            // 路径存在，使用正常逻辑
            targetXfdfPath = generateXfdfPath(doc.path);
        }
    } catch (e) {
        console.println("路径检查出错: " + e.message);
        // 出错时也询问用户
        targetXfdfPath = generateXfdfPath(doc.path); // fallback to original logic or handle error
    }
    // --- 【路径检查逻辑结束】 ---

    // 【修改】使用确定好的 targetXfdfPath
    // var xfdfPath = generateXfdfPath(doc.path); // 原来的逻辑
    var xfdfPath = targetXfdfPath; 

    try {
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

        if (!snapshotFileExists) {
            console.println("比较结果：未找到旧文件，执行首次导出。");
            privExportXFDF(doc, xfdfPath);
			doc.dirty = false; // <--- 【新增】首次导出后重置状态
            console.println("成功！XFDF文件已导出。");
            app.alert({
                cMsg: "注释导出成功！\n\n文件已保存至:\n" + xfdfPath,
                cTitle: "导出成功",
                nIcon: 1
            });
        } else if (currentSnapshot !== oldSnapshot) {
            console.println("比较结果：注释内容有变化，准备导出。");
            privExportXFDF(doc, xfdfPath);
			doc.dirty = false; // <--- 【新增】首次导出后重置状态
            console.println("成功！XFDF文件已导出。");
            app.alert({
                cMsg: "注释导出成功！\n\n文件已保存至:\n" + xfdfPath,
                cTitle: "导出成功",
                nIcon: 1
            });
        } else {
            console.println("比较结果：注释内容完全相同。");
            var response = app.alert({
                cMsg: "注释内容没有变化，是否仍要强制覆盖导出？",
                cTitle: "确认强制导出",
                nIcon: 2,
                nType: 2
            });

            if (response === 4) {
                console.println("用户选择强制导出，正在执行...");
                privExportXFDF(doc, xfdfPath);
				doc.dirty = false; // <--- 【新增】首次导出后重置状态
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

        console.println("手动操作后，正在激活文档的自动同步...");
        docSyncState.set(doc, {
            isActive: true,
            baselineSnapshot: getAnnotationsSnapshot(doc),
            importChecked: false
        });
        console.println(">> 激活成功！状态已设置，等待下次轮循时开始监控。");

    } catch (e) {
        app.alert({ cMsg: "导出失败: " + e.message, cTitle: "导出失败", nIcon: 0 });
    }
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

app.addToolButton({
    cName: 'exportAndActivatebutton',
    cLabel: '导出并激活同步',
    cIconID: 'cmd.comments.export',
    cTooltext: '智能导出所有注释到同目录下的xfdf文件',
    //cHotkey: 'Alt+Q',
    cParent: 'Home',
    cExec: 'manualExportAndActivate(this);'
});

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


// 启动监控！
startPolling();

// 脚本结束
