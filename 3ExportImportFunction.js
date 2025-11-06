// ===================================================================
// PDF-Xchange Editor JavaScript: 导入导出共用函数库 (增强属性版)
// ===================================================================

// ===================================================================
// 辅助函数 (保持不变)
// ===================================================================

// 【新增】通用的HTML实体解码函数
function decodeHtmlEntities(str) {
    if (!str) return str;
    // 先处理常见的命名实体
    str = str.replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'");
    // 再处理数字实体（如 &#64257; 或 &#x1234;）
    return str.replace(/&#(\d+);/g, function(match, dec) {
        return String.fromCharCode(dec);
    }).replace(/&#x([0-9a-fA-F]+);/g, function(match, hex) {
        return String.fromCharCode(parseInt(hex, 16));
    });
}

// 【辅助】将颜色对象转换为十六进制字符串 (自己的实现)
function colorToHex(colorObj) {
    if (!colorObj) return null;
    // 检查是否是 ["RGB", R, G, B] 格式
    if (Array.isArray(colorObj) && colorObj.length >= 4 && typeof colorObj[0] === "string") {
        var r = Math.round(colorObj[1] * 255);
        var g = Math.round(colorObj[2] * 255);
        var b = Math.round(colorObj[3] * 255);
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }
    return null;
}

// 【辅助】格式化坐标，保留6位小数
function formatRect(rectArray) {
    return rectArray.map(coord => parseFloat(coord).toFixed(6)).join(',');
}

// 【核心】简单的颜色比较函数 (字符串化比较)
function areColorsEqual(color1, color2) {
    return JSON.stringify(color1) === JSON.stringify(color2);
}

// 【核心】受信任的文件读取函数
var trustedReadFile = app.trustedFunction((filePath) => {
    app.beginPriv();
    return util.stringFromStream(util.readFileIntoStream(filePath));
});


// ===================================================================
// 核心快照函数 (增强版)
// ===================================================================

// 【核心】获取当前所有注释的"内容快照"（用于比较）
function getAnnotationsSnapshot(doc) {
    var snapshot = "";
    for (var i = 0; i < doc.numPages; i++) {
        var annots = doc.getAnnots(i);
        if (annots != null) {
            for (var j = 0; j < annots.length; j++) {
                var annot = annots[j];
                
                // --- 内容提取：优先从 richContents 获取完整内容 ---
				var contents = "";
				if (annot.richContents && annot.richContents.length > 0) {
					for (var k = 0; k < annot.richContents.length; k++) {
						var textContent = annot.richContents[k].text || "";
						// 【新增】规范化文本内容
						textContent = textContent
							.replace(/\r\n/g, ' ')                   // 将CRLF替换为空格
							.replace(/\r/g, ' ')                     // 将CR替换为空格
							.replace(/\n/g, ' ')                     // 将LF替换为空格
							.trim();                                 // 去除首尾空格
						
						if (textContent) {
							// 如果不是第一个内容块，且前一个不是以标点符号结尾，添加空格
							if (contents && !/[.!?]$/.test(contents)) {
								contents += " ";
							}
							contents += textContent;
						}
					}
				} else {
					contents = (annot.contents || "").replace(/\r\n/g, '\n');
				}
				//console.println(contents);
                // 【新增】规范化注释内容：去除行末空格，统一换行符
                contents = contents
                    .replace(/\r\n/g, '\n')                   // 统一换行符为LF
                    .replace(/\r/g, '\n')                     // 处理单独的CR
                    .split('\n')                              // 按行分割
                    .map(line => line.trimEnd())              // 去除每行末尾空白（保留行首空格）
                    .join('\n');                              // 重新组合
                // --- 坐标格式化：保留6位小数，确保精度一致 ---
                var rect = formatRect(annot.rect);
                
                // --- 智能颜色提取：使用自己的颜色转换函数 ---
                var representativeColor = "undefined";
                var colorsToCheck = [];

                if (annot.strokeColor) colorsToCheck.push(annot.strokeColor);
                if (annot.fillColor) colorsToCheck.push(annot.fillColor);
                if (annot.richContents) {
                    for (var k = 0; k < annot.richContents.length; k++) {
                        if (annot.richContents[k].textColor) {
                            colorsToCheck.push(annot.richContents[k].textColor);
                        }
                    }
                }

                // 使用自己的颜色转换逻辑
                for (var c = 0; c < colorsToCheck.length; c++) {
                    var hexColor = colorToHex(colorsToCheck[c]);
                    if (hexColor && hexColor.toUpperCase() !== "#000000") {
                        representativeColor = hexColor;
                        break;
                    }
                }

                // --- 【增强】构建快照行，增加额外属性 ---
                var snapshotLine = annot.type + "|" + contents + "|" + rect + "|" + representativeColor;
                
                // 处理图形注释的 width 属性
                if (annot.type === "Square" || annot.type === "Circle") {
                    var width = annot.width ? annot.width.toString() : "1";
                    snapshotLine += "|" + width;
                }

                // --- 【新增】收集额外属性 ---
                var extraAttrs = [];
                // lock: 默认为 false，只有为 true 时才记录
                if (annot.lock) {
                    extraAttrs.push("lock:true");
                }
                // opacity: 默认为 1.0，只有不等于 1.0 时才记录
                if (typeof annot.opacity === 'number' && annot.opacity !== 1) {
                    extraAttrs.push("opacity:" + annot.opacity.toFixed(2));
                }
                // popupOpen: 默认为 false，只有为 true 时才记录
                if (annot.popupOpen) {
                    extraAttrs.push("popupOpen:true");
                }
                // subject: 默认为空，只有不为空时才记录
                if (annot.subject) {
                    // 对 subject 进行转义，防止包含管道符
                    var escapedSubject = annot.subject.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
                    extraAttrs.push("subject:" + escapedSubject);
                }

                // 将额外属性拼接到快照行
                if (extraAttrs.length > 0) {
                    snapshotLine += "|" + extraAttrs.join('|');
                }
                
                snapshot += snapshotLine + "\n";
            }
        }
    }
	//console.println(snapshot);
    return snapshot.trim();
}

// 【核心】解析XFDF字符串，生成和"当前快照"格式一致的字符串
function parseXFDFToSnapshot(xfdfString) {
    var snapshot = "";
    var annotRegex = /<(highlight|squiggly|underline|strikeout|text|freetext|square|circle|line|polygon|polyline|ink)[^>]*>([\s\S]*?)<\/\1>/gi;
    var match;

    while ((match = annotRegex.exec(xfdfString)) !== null) {
        var annotBlock = match[0];
        var annotType = match[1];

        // --- 内容解析 ---
        var contents = "";
        var spanMatches = annotBlock.match(/<span[^>]*>([\s\S]*?)<\/span>/gi);
        if (spanMatches) {
            for (var i = 0; i < spanMatches.length; i++) {
                var textMatch = spanMatches[i].match(/<span[^>]*>([\s\S]*?)<\/span>/i);
                if (textMatch) {
                    var decodedText = decodeHtmlEntities(textMatch[1]);
                    // 【新增】处理段落分隔和换行符
                    decodedText = decodedText
                        .replace(/&#13;/g, '')                 // 去除XML中的回车符
                        .replace(/\r\n/g, ' ')                 // 将CRLF替换为空格
                        .replace(/\r/g, ' ')                   // 将CR替换为空格
                        .replace(/\n/g, ' ')                   // 将LF替换为空格
                        .trim();                               // 去除首尾空格
                    
                    if (decodedText) {
                        // 如果不是第一个span，且前一个span不是以标点符号结尾，添加空格
                        if (contents && !/[.!?]$/.test(contents)) {
                            contents += " ";
                        }
                        contents += decodedText;
                    }
                }
            }
        }
        
        if (!contents && ['square', 'circle', 'line', 'polygon', 'polyline', 'ink'].includes(annotType.toLowerCase())) {
            contents = "";
        }

        // --- 坐标解析 ---
        var rect = "";
        var rectMatch = annotBlock.match(/rect="([^"]+)"/i);
        if (rectMatch) {
            var rectArray = rectMatch[1].split(',');
            rect = formatRect(rectArray);
        }

        var color = "undefined";
        var colorMatch = annotBlock.match(/color="([^"]+)"/i);
        if (colorMatch) {
            color = colorMatch[1];
        }

        // --- 【增强】构建快照行，增加额外属性 ---
        var snapshotLine = annotType.charAt(0).toUpperCase() + annotType.slice(1) + "|" + contents + "|" + rect + "|" + color;
        
        // 处理图形注释的 width 属性
        if (['square', 'circle'].includes(annotType.toLowerCase())) {
            var widthMatch = annotBlock.match(/width="([^"]+)"/i);
            var width = widthMatch ? widthMatch[1] : "1";
            snapshotLine += "|" + width;
        }

        // --- 【新增】从 XFDF 中解析额外属性 ---
        var extraAttrs = [];
        // 解析 flags 属性
        var flagsMatch = annotBlock.match(/flags="([^"]+)"/i);
        if (flagsMatch) {
            var flags = flagsMatch[1].split(',');
            if (flags.includes('locked')) {
                extraAttrs.push("lock:true");
            }
        }
        // 解析 opacity 属性
        var opacityMatch = annotBlock.match(/opacity="([^"]+)"/i);
        if (opacityMatch) {
            var opacity = parseFloat(opacityMatch[1]);
            if (opacity !== 1) {
                extraAttrs.push("opacity:" + opacity.toFixed(2));
            }
        }
        // 解析 popup 的 open 属性
        var popupMatch = annotBlock.match(/<popup[^>]*open="yes"[^>]*>/i);
        if (popupMatch) {
            extraAttrs.push("popupOpen:true");
        }
        // 解析 subject 属性
        var subjectMatch = annotBlock.match(/subject="([^"]+)"/i);
        if (subjectMatch) {
            var subject = decodeHtmlEntities(subjectMatch[1]);
            // 对 subject 进行转义
            var escapedSubject = subject.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
            extraAttrs.push("subject:" + escapedSubject);
        }

        // 将额外属性拼接到快照行
        if (extraAttrs.length > 0) {
            snapshotLine += "|" + extraAttrs.join('|');
        }
        
        snapshot += snapshotLine + "\n";
    }
	//console.println(snapshot);
    return snapshot.trim();
}


// 【简化版】规范化快照字符串的函数 (保持不变)
function normalizeSnapshot(snapshot) {
    return snapshot
        .replace(/\r\n/g, '\n')                   // 先统一换行符为LF
        .replace(/\r/g, '\n')                     // 处理单独的CR
        .split('\n')                              // 再按行分割
        .map(line => line.trim())                 // 去除每行首尾空白
        .filter(line => line.length > 0)          // 移除空行
        .join('\n')                               // 重新组合
        .replace(/\n+/g, '\n')                    // 将多个连续换行符合并为一个
        .trim();                                  // 去除首尾换行符
}

//console.println("ExportImportFunction.js (增强属性版) 已加载。");
