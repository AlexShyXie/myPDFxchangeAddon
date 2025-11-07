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
    
    // 【新增】在返回前对快照行进行排序，以解决顺序不一致问题
    var snapshotLines = snapshot.trim().split('\n');
    snapshotLines.sort();
    return snapshotLines.join('\n');
}

// ===================================================================
// 【新增】轻量级 XFDF 解析库
var XFDFParser = {
	// 在 3ExportImportFunction.js 的 XFDFParser 对象中，替换为这个最终版
	getTextContent: function(annotBlock) {
		// 1. 首先检查是否是 Text 注释
		if (/<text[^>]*>/i.test(annotBlock)) {
			// 2. 尝试查找 <contents-richtext> 块
			var richTextMatch = annotBlock.match(/<contents-richtext>([\s\S]*?)<\/contents-richtext>/i);
			// console.println(richTextMatch);
			// 3. 如果找到了，说明这是一个有内容的 Text 注释（如便贴）
			if (richTextMatch) {
				var bodyMatch = richTextMatch[1].match(/<body[^>]*>([\s\S]*?)<\/body>/i);
				if (bodyMatch) {
					var spanMatches = bodyMatch[1].match(/<span[^>]*>([\s\S]*?)<\/span>/gi);
					if (spanMatches) {
						var textParts = [];
						for (var i = 0; i < spanMatches.length; i++) {
							var spanTextMatch = spanMatches[i].match(/<span[^>]*>([\s\S]*?)<\/span>/i);
							if (spanTextMatch) {
								var decodedText = decodeHtmlEntities(spanTextMatch[1]);
								if (decodedText) {
									textParts.push(decodedText.trim());
								}
							}
						}
						// 返回拼接后的内容
						return textParts.join(' ');
					}
				}
			}
			
			// 4. 如果是 Text 注释，但没有找到 <contents-richtext>，
			//    那么它就是一个没有内容的标记（如“已接受”）。
			//    我们明确返回一个空字符串。
			return "";
		}
		
		// 5. 如果不是 Text 注释，则按原逻辑处理 <span>（用于 highlight 等）
		var spanMatches = annotBlock.match(/<span[^>]*>([\s\S]*?)<\/span>/gi);
		if (spanMatches) {
			var textParts = [];
			for (var i = 0; i < spanMatches.length; i++) {
				var spanTextMatch = spanMatches[i].match(/<span[^>]*>([\s\S]*?)<\/span>/i);
				if (spanTextMatch) {
					var decodedText = decodeHtmlEntities(spanTextMatch[1]);
					if (decodedText) {
						textParts.push(decodedText.trim());
					}
				}
			}
			return textParts.join(' ');
		}

		// 6. 如果什么都没找到，返回空字符串
		return "";
	},

    /**
     * 从注释块中提取指定属性的值
     * @param {string} annotBlock - 单个注释的XML字符串
     * @param {string} attrName - 属性名，例如 'rect', 'color', 'subject'
     * @returns {string|null} 属性值，未找到则返回 null
     */
    getAttribute: function(annotBlock, attrName) {
        var regex = new RegExp(attrName + '="([^"]+)"', 'i');
        var match = annotBlock.match(regex);
        return match ? match[1] : null;
    },

    /**
     * 检查注释块中是否存在某个标志（flags）
     * @param {string} annotBlock - 单个注释的XML字符串
     * @param {string} flag - 标志名，例如 'locked'
     * @returns {boolean}
     */
    hasFlag: function(annotBlock, flag) {
        var flagsMatch = annotBlock.match(/flags="([^"]+)"/i);
        if (flagsMatch) {
            return flagsMatch[1].split(',').includes(flag);
        }
        return false;
    },
    
    /**
     * 检查注释的 popup 是否默认打开
     * @param {string} annotBlock - 单个注释的XML字符串
     * @returns {boolean}
     */
    isPopupOpen: function(annotBlock) {
        return /<popup[^>]*open="yes"[^>]*>/i.test(annotBlock);
    }
};

function parseXFDFToSnapshot(xfdfString) {
    // console.println("===== [调试] parseXFDFToSnapshot 开始 =====");
    var snapshot = "";
    
    var tagNames = ["highlight", "squiggly", "underline", "strikeout", "text", "freetext", "square", "circle", "line", "polygon", "polyline", "ink"];
    // 【关键修复】修改正则，确保 (/?) 能捕获到结尾的 /
    // 使用 \s* 来匹配属性和结尾的空格，然后用 (\s*/?) 来捕获结尾的空格和 /
    var tagRegex = new RegExp("<(" + tagNames.join("|") + ")([^>]*?)(\s*\/?>)", "gi");

    var annotBlocks = [];
    var match;

    while ((match = tagRegex.exec(xfdfString)) !== null) {
        var fullTag = match[0];
        var tag = match[1];
        var attributes = match[2];
        var endPart = match[3]; // 这里会捕获到 " />" 或 ">"
        
        var isSelfClosing = endPart.includes('/');
        var startIndex = match.index;
        var endIndex = startIndex + fullTag.length;

        // console.println("\n--- [调试] 找到标签: " + fullTag + " (类型: " + tag + ", 自闭合: " + isSelfClosing + ") ---");

        if (!isSelfClosing) {
            var closeTag = '</' + tag + '>';
            var closeTagIndex = xfdfString.indexOf(closeTag, endIndex);
            if (closeTagIndex === -1) {
                console.println("[调试] 格式错误：找不到 " + tag + " 的闭合标签，跳过。");
                tagRegex.lastIndex = endIndex;
                continue;
            }
            endIndex = closeTagIndex + closeTag.length;
        }

        var annotBlock = xfdfString.substring(startIndex, endIndex);
        annotBlocks.push(annotBlock);
        // console.println("[调试] 提取块成功，当前共 " + annotBlocks.length + " 个块。");

        tagRegex.lastIndex = endIndex;
    }
    
    // console.println("\n===== [调试] 开始处理 " + annotBlocks.length + " 个注释块 =====");

    // --- 后续处理逻辑保持不变 ---
    for (var i = 0; i < annotBlocks.length; i++) {
        var annotBlock = annotBlocks[i];
        // console.println("\n--- [调试] 处理块 #" + (i+1) + " ---");
        
        var typeMatch = annotBlock.match(/<(highlight|squiggly|underline|strikeout|text|freetext|square|circle|line|polygon|polyline|ink)/i);
        if (!typeMatch) continue;
        var annotType = typeMatch[1];
        // console.println("[调试] 类型: " + annotType);

        var contents = XFDFParser.getTextContent(annotBlock);
        // console.println("[调试] 提取的内容: '" + contents + "'");
        
        var rect = XFDFParser.getAttribute(annotBlock, 'rect');
        var color = XFDFParser.getAttribute(annotBlock, 'color') || "undefined";
        var subject = XFDFParser.getAttribute(annotBlock, 'subject');
        var width = XFDFParser.getAttribute(annotBlock, 'width');

        var formattedRect = rect ? formatRect(rect.split(',')) : "";
        var snapshotLine = annotType.charAt(0).toUpperCase() + annotType.slice(1) + "|" + contents + "|" + formattedRect + "|" + color;

        if (['square', 'circle'].includes(annotType.toLowerCase())) {
            snapshotLine += "|" + (width || "1");
        }

        var extraAttrs = [];
        if (XFDFParser.hasFlag(annotBlock, 'locked')) extraAttrs.push("lock:true");
        var opacity = XFDFParser.getAttribute(annotBlock, 'opacity');
        if (opacity && parseFloat(opacity) !== 1) extraAttrs.push("opacity:" + parseFloat(opacity).toFixed(2));
        if (XFDFParser.isPopupOpen(annotBlock)) extraAttrs.push("popupOpen:true");
        if (subject) {
            var escapedSubject = subject.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
            extraAttrs.push("subject:" + escapedSubject);
        }

        if (extraAttrs.length > 0) snapshotLine += "|" + extraAttrs.join('|');
        
        // console.println("[调试] 生成的快照行: " + snapshotLine);
        snapshot += snapshotLine + "\n";
    }

    var snapshotLines = snapshot.trim().split('\n');
    snapshotLines.sort();
    var finalSnapshot = snapshotLines.join('\n');

    // console.println("\n===== [调试] 最终快照 =====");
    // console.println(finalSnapshot);
    // console.println("===== [调试] parseXFDFToSnapshot 结束 =====\n");

    return finalSnapshot;
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
