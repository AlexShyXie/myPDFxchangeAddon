// ===================================================================
// PDF-Xchange Editor JavaScript: 按需激活的智能注释同步脚本 (唯一文件名版)
// version5 —— 同级目录模式完善版
//
// 功能1: 集中存储模式（XFDF存到集中笔记文件夹, 按父文件夹分子目录）
// 功能2: 同级目录模式（XFDF与PDF同目录、同名）
//
// v5 更新说明:
//   1. 打开PDF后自动加载顺序: 先找【同级目录】XFDF → 没有再找【集中存储】XFDF
//   2. 无论从哪条途径加载成功, 都会在 docSyncState 中记录该文档实际使用的
//      XFDF路径(targetPath)和来源(mode: "sibling"=同级 / "central"=集中存储)
//   3. Ctrl+S 改为弹出选择框: [保存到同级目录] [保存到存储目录] [取消];
//      选择保存后自动接入"导出并激活同步"流程; 取消则什么也不做
//   4. 配合《对当前选中的第1个注释生成ob链接xfdf.js》(v5):
//      ob链接智能使用这里记录的 targetPath; 没有记录时提示先保存XFDF
//
// 依赖: 3ExportImportFunction.js (loadConfig / trustedReadFile /
//       getAnnotationsSnapshot / parseXFDFToSnapshot)
// 部署: 与 3ExportImportFunction.js 一起放入 JavaScripts 目录;
//       升级时请删除旧版 version4 文件, 避免按钮与轮循重复注册。
// ===================================================================

// --- 全局变量 ---
var pollTimer;
var docSyncState = new Map(); // 每个文档的同步状态档案(按文档对象区分, 多开互不混淆)

// 加载来源标识: "sibling" = 同级目录, "central" = 集中存储
var XFDF_MODE_NAMES = { sibling: "同级目录", central: "集中存储" };

// --- 1. 加载配置 (loadConfig 来自 3ExportImportFunction.js) ---
var appConfig = loadConfig('myAppConfig.json');

// --- 2. 检查并使用配置 ---
if (appConfig && appConfig.ANNOTATION_FOLDER) {
    var ANNOTATION_FOLDER = appConfig.ANNOTATION_FOLDER;
    console.println("--- 配置加载成功 ---");
    console.println("注释文件夹(集中存储): " + ANNOTATION_FOLDER);
} else {
    console.println("--- 配置加载失败，使用默认值 ---");
    var ANNOTATION_FOLDER = "G:\\OneDrive - xiehui1573\\Appdata_my\\VnoteData\\12_PDFxchangeAnnot";
}

// ===================================================================
// 3. 工具函数: 路径生成
// ===================================================================

/**
 * 生成集中存储的XFDF路径
 * @param {string} pdfPath - PDF路径, 例如 /E/Downloads/ProjectA/report.pdf
 * @returns {string} - 例如 /G/.../12_PDFxchangeAnnot/ProjectA/report.xfdf
 */
function generateXfdfPath(pdfPath) {
    if (!pdfPath) return "";

    // 1. 提取文件名（不含扩展名）
    var separatorIndex = pdfPath.lastIndexOf("/");
    var fileNameWithoutExt = pdfPath.substring(separatorIndex + 1, pdfPath.lastIndexOf("."));

    // 2. 提取父文件夹名
    var parentFolderSeparatorIndex = pdfPath.lastIndexOf("/", separatorIndex - 1);
    var parentFolderName = pdfPath.substring(parentFolderSeparatorIndex + 1, separatorIndex);

    // 3. 组合新的文件名：父文件夹名/原文件名.xfdf
    var newFileName = parentFolderName + "/" + fileNameWithoutExt + ".xfdf";

    // 4. 将 ANNOTATION_FOLDER 转换为Unix风格路径
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
 * 生成PDF同级目录的XFDF路径（同名.xfdf）
 */
function generateSiblingXfdfPath(pdfPath) {
    if (!pdfPath) return "";
    if (pdfPath.toLowerCase().endsWith(".pdf")) {
        return pdfPath.substring(0, pdfPath.length - 4) + ".xfdf";
    }
    return pdfPath + ".xfdf";
}

// ===================================================================
// 4. 受信任函数 (复用)
// ===================================================================

// 受信任的导入函数
var privImportXFDF = app.trustedFunction( (t, path) => {
    app.beginPriv();
    t.importAnXFDF(path);
    app.endPriv();
});

// 受信任的导出函数
var privExportXFDF = app.trustedFunction((t, path) => {
    app.beginPriv();
    t.exportAsXFDF({ cPath: path, bAnnotations: true, bExportAsOff: false });
    app.endPriv();
});

// 受信任的获取所有文档函数
const getAllDocs = app.trustedFunction(() => {
    app.beginPriv();
    return app.activeDocs;
});

// ===================================================================
// 5. [v5新增] XFDF来源解析与状态记录
// ===================================================================

/**
 * 静默读取XFDF文件内容; 不存在/为空/读失败 一律返回 ""
 * (探测路径不存在属于正常流程, 不刷错误信息)
 */
function readXfdfContent(filePath) {
    if (!filePath) return "";
    try {
        var content = trustedReadFile(filePath);
        if (typeof content === "string" && content.trim()) return content;
    } catch (e) { /* 文件不存在, 静默处理 */ }
    return "";
}

/**
 * [v5核心] 按优先级解析当前文档应使用的XFDF来源:
 *   先同级目录, 没有再集中存储。两处都有时优先同级并在控制台提示。
 * @returns {mode, path, content} 或 null(两处都没有)
 */
function resolveXfdfSource(doc) {
    var siblingPath = generateSiblingXfdfPath(doc.path);
    var centralPath = generateXfdfPath(doc.path);
    var siblingContent = readXfdfContent(siblingPath);
    var centralContent = readXfdfContent(centralPath);

    if (siblingContent) {
        if (centralContent) {
            console.println(">> 注意: 同级目录与集中存储都存在XFDF, 按优先级使用【同级目录】文件。");
        }
        return { mode: "sibling", path: siblingPath, content: siblingContent };
    }
    if (centralContent) {
        return { mode: "central", path: centralPath, content: centralContent };
    }
    return null;
}

/**
 * [v5核心] 记录/更新文档的同步状态档案。
 * targetPath = 该文档实际使用的XFDF完整路径
 * mode       = "sibling"(同级) | "central"(集中存储)  ← 明确记录来源
 */
function activateSyncState(doc, xfdfPath, mode) {
    docSyncState.set(doc, {
        isActive: true,
        baselineSnapshot: getAnnotationsSnapshot(doc),
        targetPath: xfdfPath,
        mode: mode || "central"
    });
    console.println(">> 同步已激活 [" + XFDF_MODE_NAMES[mode || "central"] + "]: " + xfdfPath);
}

/**
 * [v5新增] 导入XFDF并激活同步 (统一入口)
 */
function importAndActivate(doc, xfdfPath, mode) {
    privImportXFDF(doc, xfdfPath);
    activateSyncState(doc, xfdfPath, mode);
    doc.dirty = false;
    console.println(">> XFDF导入完成 [" + XFDF_MODE_NAMES[mode] + "]: " + xfdfPath);
}

/**
 * [v5新增] 查询某文档当前记录的XFDF信息 (供 ob链接 等其他脚本调用)
 * @returns {path, mode} 或 null(该文档没有已保存的XFDF记录)
 */
function getXfdfRecord(doc) {
    if (typeof docSyncState === "undefined" || !doc) return null;
    var state = docSyncState.get(doc);
    if (state && state.isActive && state.targetPath) {
        return { path: state.targetPath, mode: state.mode || "central" };
    }
    return null;
}

// ===================================================================
// 6. 核心同步逻辑
// ===================================================================
function processDocument(doc) {
    if (!doc || !doc.path) return;

    // 获取该文档的同步状态档案
    var state = docSyncState.get(doc);

    // --- 情况1: 该文档尚未被激活同步 -> [v5] 先找同级, 再找集中存储 ---
    if (!state) {
        console.println("检查新文档: " + doc.documentFileName);
        try {
            var source = resolveXfdfSource(doc);
            if (source) {
                console.println(">> 在[" + XFDF_MODE_NAMES[source.mode] + "]找到XFDF, 正在导入并激活同步...");
                importAndActivate(doc, source.path, source.mode);
            } else {
                docSyncState.set(doc, {
                    isActive: false,
                    baselineSnapshot: getAnnotationsSnapshot(doc),
                    importChecked: true
                });
                console.println(">> 同级目录和集中存储都没有XFDF, 文档未激活自动同步。");
                console.println(">> 可按 Ctrl+S 选择保存位置, 或用\"快速导出XFDF\"/\"导出并激活\"按钮开启。");
            }
        } catch (e) {
            console.println("处理新文档时出错: " + e.message);
            // 防御: 导入失败也要记一个未激活状态, 避免每2秒重复尝试导入
            try {
                if (!docSyncState.get(doc)) {
                    docSyncState.set(doc, {
                        isActive: false,
                        baselineSnapshot: getAnnotationsSnapshot(doc),
                        importChecked: true
                    });
                }
            } catch (e2) { /* 忽略 */ }
        }
        return;
    }

    // --- 情况2: 已激活同步 -> 监控注释变化, 自动导出到记录的路径 ---
    if (state.isActive) {
        var currentSnapshot = getAnnotationsSnapshot(doc);
        if (currentSnapshot !== state.baselineSnapshot) {
            // 使用该文档自己记录的路径与来源进行保存（多开文档互不混淆）
            console.println(">> 检测到注释变化 [" + XFDF_MODE_NAMES[state.mode || "central"] + "], 正在自动导出: " + state.targetPath);
            privExportXFDF(doc, state.targetPath);
            state.baselineSnapshot = currentSnapshot;
            doc.dirty = false;
            console.println(">> 自动导出完成。");
        }
    }
}

// ===================================================================
// 7. 全局轮循管理
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
// 8. 核心功能函数
// ===================================================================

/**
 * 导出并激活同步 → 集中存储目录 (Alt+W)
 */
function manualExportAndActivate(doc) {
    if (!doc || !doc.path) {
        app.alert({ cMsg: "请先保存PDF文件。", cTitle: "错误", nIcon: 0 });
        return;
    }
    activateSyncWithExport(doc, generateXfdfPath(doc.path), "central");
}

/**
 * 导出并激活同步 → 同级目录
 */
function quickExportAndActivate(doc) {
    if (!doc || !doc.path) {
        app.alert({ cMsg: "请先保存PDF文件。", cTitle: "错误", nIcon: 0 });
        return;
    }
    activateSyncWithExport(doc, generateSiblingXfdfPath(doc.path), "sibling");
}

/**
 * [v5] 智能加载XFDF并激活: 先找同级, 找不到再找集中存储, 并记录来源
 */
function smartLoadXFDF(doc) {
    if (!doc || !doc.path) {
        app.alert({ cMsg: "请先保存PDF文件。", cTitle: "错误", nIcon: 0 });
        return;
    }
    // 已在同步中的文档不重复导入, 避免混淆当前来源
    var state = docSyncState.get(doc);
    if (state && state.isActive) {
        app.alert({
            cMsg: "该文档已在自动同步中，无需重复加载。\n来源: " + XFDF_MODE_NAMES[state.mode || "central"] + "\n路径: " + state.targetPath,
            cTitle: "已在同步中", nIcon: 1
        });
        return;
    }
    try {
        var source = resolveXfdfSource(doc);
        if (!source) {
            app.alert({
                cMsg: "以下两处都没有找到XFDF文件：\n\n[同级目录]\n" + generateSiblingXfdfPath(doc.path) + "\n\n[集中存储]\n" + generateXfdfPath(doc.path),
                cTitle: "未找到文件", nIcon: 1
            });
            return;
        }
        importAndActivate(doc, source.path, source.mode);
        app.alert({
            cMsg: "成功加载XFDF并激活自动同步！\n来源: " + XFDF_MODE_NAMES[source.mode] + "\n路径: " + source.path,
            cTitle: "成功", nIcon: 1
        });
    } catch (e) {
        app.alert({ cMsg: "加载失败: " + e.message, cTitle: "错误", nIcon: 0 });
    }
}

/**
 * [核心辅助] 统一的导出并激活逻辑 (带来源记录)
 */
function activateSyncWithExport(doc, xfdfPath, mode) {
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
            console.println("成功！XFDF已导出 [" + XFDF_MODE_NAMES[mode] + "]：" + xfdfPath);
        }

        // 激活同步状态（记录来源模式）
        activateSyncState(doc, xfdfPath, mode);
        app.alert({
            cMsg: "操作成功！已开启自动同步。\n来源: " + XFDF_MODE_NAMES[mode] + "\n路径: " + xfdfPath,
            cTitle: "成功", nIcon: 1
        });

    } catch (e) {
        app.alert({ cMsg: "操作失败: " + e.message, cTitle: "错误", nIcon: 0 });
    }
}

// ===================================================================
// 9. [v5重写] Ctrl+S: 弹出保存位置选择框
//    [保存到同级目录] [保存到存储目录] [取消]
//    取消 → 什么都不做; 选择保存 → 自动接入"导出并激活同步"
//    [v5.1] 按钮行等距均匀排布 + 文件名截断(防止长文件名撑宽对话框)
//    注: PXE 实测 align_children 值连方向一起切换 —
//        "align_row"=横排靠左, "align_right"=竖排右贴(用户截图实证),
//        "align_distribute"=横排等距铺开(Acrobat 语义, 待真机确认)
// ===================================================================

// 把文件名截断到约38个"字符单位"内(CJK按2计), 保证各行宽度一致,
// 否则长文件名会把对话框撑宽, 按钮行即使右对齐也贴不到对话框右边缘
// 超宽时保留 头部22单位 + … + 尾部14单位 (尾部保住 .pdf 扩展名)
function fitNameForDialog(name) {
    name = String(name || "(未命名)");
    var total = 0, i;
    for (i = 0; i < name.length; i++) total += (name.charCodeAt(i) > 255) ? 2 : 1;
    if (total <= 38) return name;
    var units = 0, head = "";
    for (i = 0; i < name.length; i++) {
        units += (name.charCodeAt(i) > 255) ? 2 : 1;
        if (units > 22) break;
        head += name.charAt(i);
    }
    units = 0; var tail = "";
    for (i = name.length - 1; i >= 0; i--) {
        units += (name.charCodeAt(i) > 255) ? 2 : 1;
        if (units > 14) break;
        tail = name.charAt(i) + tail;
    }
    return head + "…" + tail;
}

function showCtrlSSaveDialog(doc) {
    var dialogResult = ""; // "sibling" | "central" | ""
    var pollRunning = (typeof pollTimer !== "undefined" && !!pollTimer);
    var fileName = fitNameForDialog(doc.documentFileName);

    var dlg = {
        sibB: function(dialog) { dialogResult = "sibling"; dialog.end(); },
        cenB: function(dialog) { dialogResult = "central"; dialog.end(); },
        cncB: function(dialog) { dialogResult = ""; dialog.end(); },
        description: {
            name: "Xfdf Save Dialog",
            elements: [
                { type: "view", align_children: "align_left", elements: [
                    { type: "static_text", item_id: "titl", name: "Ctrl+S 已禁用"},
                    { type: "static_text", item_id: "fnam", name: "当前文档: " + fileName},
                    { type: "static_text", item_id: "ques", name: "请选择XFDF保存位置（保存后自动开启同步）："},
                    { type: "gap", height: 4 },
                    { type: "view", align_children: "align_distribute", char_width: 40, elements: [
                        { type: "button", item_id: "sibB", name: "保存到同级目录" },
                        { type: "button", item_id: "cenB", name: "保存到存储目录" },
                        { type: "button", item_id: "cncB", name: "取消" }
                    ]}
                ]}
            ]
        }
    };

    try {
        app.execDialog(dlg);
    } catch (e) {
        // 对话框引擎异常时的兜底提示, 保证 Ctrl+S 不至于无响应
        console.println(">> Ctrl+S 选择框异常: " + e.message);
        app.alert({
            cMsg: "Ctrl+S 已禁用。请使用\"快速导出XFDF\"(同级)或\"导出并激活\"(Alt+W, 存储目录)按钮。",
            cTitle: "Ctrl+S 已禁用", nIcon: 0
        });
        return "";
    }
    return dialogResult;
}

function ctrlsHintfun(doc) {
    // 兼容多种调用方式, 确保拿到当前文档
    if (!doc || !doc.path) {
        try { doc = app.doc; } catch (e) { doc = null; }
    }
    if (!doc || !doc.path) {
        app.alert({
            cMsg: "当前没有已保存到磁盘的PDF文档，无法确定XFDF保存位置。\n请先将PDF保存到磁盘后再试。",
            cTitle: "Ctrl+S 已禁用", nIcon: 0
        });
        return;
    }

    var choice = showCtrlSSaveDialog(doc);

    if (choice === "sibling" || choice === "central") {
        var targetPath = (choice === "sibling") ? generateSiblingXfdfPath(doc.path) : generateXfdfPath(doc.path);

        // 已在向同一目标同步 → 轮循早已自动保存, 无需重复导出
        var st = docSyncState.get(doc);
        if (st && st.isActive && st.targetPath === targetPath) {
            app.alert({
                cMsg: "该文档已保存并正在同步到此XFDF，无需重复保存：\n" + st.targetPath,
                cTitle: "已在同步中", nIcon: 1
            });
            return;
        }

        // 自动接入"导出并激活同步"流程
        if (choice === "sibling") {
            quickExportAndActivate(doc);   // 导出到同级目录并激活
        } else {
            manualExportAndActivate(doc);  // 导出到集中存储并激活
        }
    } else {
        // 取消: 什么也不做
        console.println(">> Ctrl+S: 已取消, 未做任何操作。");
    }
}

function manualSetDirtyFalse(doc) {
    doc.dirty = false;
    console.println("已手动清除文档保存状态！");
}

// ===================================================================
// 10. UI 和启动
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

// 按钮3: 导出并激活同步 (集中存储, Alt+W)
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

// 按钮: Ctrl+S → 选择保存位置（同级/存储）并导出XFDF
app.addToolButton({
    cName: 'ctrlSHintButton',
    cLabel: 'Ctrl+S已禁用',
    cIconID: 'cmd.saveCurrentSessionToFile',
    cTooltext: 'Ctrl+S已禁用：点击选择XFDF保存位置（同级/存储）并开启同步',
    cHotkey: 'Ctrl+S',
    cExec: 'ctrlsHintfun(this);',
    cParent: 'Home'
});

// 按钮: 快速导出XFDF（同级目录）
app.addToolButton({
    cName: 'quickExportXFDF',
    cUser: '导出同名XFDF并激活',
    cLabel: '快速导出XFDF',
    cTooltext: '导出XFDF到PDF同级目录，并开启自动保存',
    cIconID: 'cmd.forms.exportData',
    cExec: 'quickExportAndActivate(this);',
    cParent: 'Home'
});

// 按钮: [v5] 智能加载XFDF（先同级，后集中存储）
app.addToolButton({
    cName: 'loadXFDFMenu',
    cUser: '智能加载XFDF并激活',
    cLabel: '快速加载XFDF',
    cTooltext: '智能加载XFDF（先找同级目录，没有再找集中存储），并开启自动保存',
    cIconID: 'cmd.forms.importData',
    cExec: 'smartLoadXFDF(this);',
    cParent: 'Home'
});

// 启动监控！
startPolling();
// 脚本结束
