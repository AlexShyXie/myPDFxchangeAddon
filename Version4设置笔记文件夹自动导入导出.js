// ===================================================================
// PDF-Xchange Editor JavaScript: 按需激活的智能注释同步脚本 (唯一文件名版)
//（无导入时注释要手动导出才能激活自动同步）
// 根据PDF路径父文件夹生成唯一的XFDF文件路径，包含父文件夹名。
// 导出后dirty=false
// ===================================================================

// --- 全局配置 ---
var ANNOTATION_FOLDER = "G:\\OneDrive - xiehui1573\\Appdata_my\\VnoteData\\16_PDFxchangeAnnot"; // 你的笔记文件夹，使用Windows标准反斜杠

// --- 全局变量 ---
var pollTimer;
var docSyncState = new Map(); // 存储每个文档的同步状态档案

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
    var newFileName = parentFolderName + "_" + fileNameWithoutExt + "_Annotations.xfdf";

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
			var xfdfContent = trustedReadFile(xfdfPath);

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

    // 【修改】使用新的函数生成XFDF路径
    var xfdfPath = generateXfdfPath(doc.path);
    console.println("手动导出目标XFDF路径: " + xfdfPath);

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
    cHotkey: 'Ctrl+S',
    cParent: 'Home',
    cExec: 'manualExportAndActivate(this);'
});

// 启动监控！
startPolling();

// 脚本结束
