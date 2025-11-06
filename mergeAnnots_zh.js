/** 用于合并两个文档中注释的工具
  *
  * v0.7.1 2025-07-08  修复 _XUTIL_DEBUG_ 未定义的bug
  * v0.7   2024-10-22  新增 'stat' 属性用于合并前的状态，修复了一些状态 -> 操作的映射，移动到经典UI的注释菜单，在第一个对话框中添加文件信息
  * v0.6.1 2024-10-21  修复 doc.getAnnot()
  * v0.6   2024-10-21  修订添加操作和检测冲突的方式，在冲突对话框中添加查看注释的按钮，如果一个文档有冲突，则在合并中显示所有文档的冲突
  * v0.5   2024-10-10  重大重构操作对象，添加冲突对话框
  * v0.4   2024-09-30  浏览文档，开始处理冲突
  * v0.3   2024-09-29  添加首选项对话框，图标，当没有保存合并数据时进行调试
  * v0.2   2024-09-28  重大调试并添加戳复制变通方法
  * v0.1   2024-09-11  初始版本
  *
  * @todo
  * 为合并冲突对话框使用 MCLV (多列列表视图)
  *    将源和目标并排放置（类似表格）
  *    首先列出修改日期（也许可以添加“最新的”？）
  * *检查*: 复制戳时书签是否会被一起带过来？
  * 页面框可能会被更改，并且可以通过脚本更新。需要在同步数据中保存这一点。
  * .seqNum 是只读的，但指示了注释的绘制顺序
  *   如果它不同，也许应该删除并重新绘制所有相等及更高顺序的项目？
  *   处理 seqNum 的方法：可以复制页面，然后删除顺序错乱的项目，添加新注释，然后再移回其余的。
  * 需要一个选项来决定是否更新其他作者的注释
  * 使用修改日期来决定保留哪个版本的注释
  *   (依赖于两台机器上的时钟是同步的)
  * 依赖注释的名称来决定它是否是同一个注释 - 应该使用名称-类型来进一步区分
  * 如何优雅地处理页面被移动的情况 (?)
  * 更好的日志记录：
  * 一个可以用于还原的注释历史变更日志/日记？
  * 也处理表单条目？
*/

// 以防没有 1ang.js
if ('undefined' == typeof __ ) __ = (t) => t; // jshint ignore: line


var myIcon = {count:0, width:40, height:40, read:function(nBytes=this.data.length/2){return this.data.slice(this.count,this.count+=2*nBytes);}, data:(a=>{let[b,c]=a.split(":");c=c?.match(/.{8}/g);let d=(a,b)=>a.replace(/./g,a=>parseInt(a,10+b)-b);return b.replace(/([g-p]+)([0-9a-f]+|[q-z]+)/gi,(a,b,e)=>(/[q-z]/.test(e)?c[d(e,26)]:e).repeat(d(b,16)));})("hkshrzmshtqhrvnuhrsirhtrhtsimshrvnuhrsirhtthtuhtvlshtqhrvnuhrsirhtrh80D3D3D3nsiuoqhxhtwiyhrzkshrvouirhtthtuhtvnsiuoqhsqjyhrwksiuoqhxhtwiyhrzithzjsiuoqhsrkyh80C7C7C7jsiuoqhsqiyhqithzksiunqhxhsskyhstjsiuiqhFFE7F1DDisuhtxiqhsrhyhqjtlsiuiqkviqhtylyh80B8B8B8isiuiqhsuhFF9CC671htzhsvhqhxhsshqkth40F1F1F1kskqlvhqhuqhFF9B9B9BkyhFF6B6B6Bh40EBEBEBhsiuiqhsuhtzhFF7CB342hsvjqhntlqhrqhstjyhurhsiuiqhtxisvhFFDFECD1iqhFFB9D2F5hntmqhushuthrxhyhswh40D6D6D6iupqhwkthFF5389BEhC071A6DFjzkwirunvhrqhqhuuhrwhyhFF7A7A7Aiuhgqhwjthyhswh80D6D6D6iskqhgvhrqhqhuvhuwhrxhuhrsiqovhqhwithrwiuisirhmqhrhrshriqovhrqhuxhFFBED7F9ithuwhrxisirpqhrrmqjrpqkxhuyiqhFF7D7D7DisiriqmvhrqhqhFFEED17DhFFECC34EhFFF2D688hFFFEFCF7iqjroqmxhrrhqhrisiriqlvhrqhqhFFF3F2EFhuzhsxhryhFFF0CF74iqjriqmvhtshvqnuhrsjrpqhuzhsxhryhsyhvriqjriqmvhvqoukroqhFFEFD07AhsxhryisyhvriqjrjqhwiqhrrhxiuoqhxiriqkvhrqhrrhFFF2D585hryjsyhFFF0D075iqjriqhwitiqhxiuoqhsqiriqjvothFFFEFDFAiqjriqhrujtiviuoqhsrirkqhwotjqjriqhvhrujthviunqhxhssirlqiwmtjqjrkqhwjthqhuiqlvhqhtyhvsorhwlthqlrlqhwjtjqlvhrqhuqhFFADADADhvsmrhqmthqirhFF858585hrtnrhszjtjqhwitkqhrqhstjyhurhsjthzjtkshvthrtnrhszjtiqhwitlqhushuthrxhyhswjthzhshzithkshwjthvjtkvjqhuuhrwjthzishzithkshqhwmtkvhrqhuxhuvhqjthzjsizhlshrhqhwltjqkxjthwihsirmtiqkxjthwhqihsotlvjthFFBBD4F7hqhrigshzotkvhruithruiqhrigshziszmwhrrkxhuyhwjqhrihsirnqlxkqhrihsiriqhiviqhrihsiriqhiviqhrihsiroqhrrkxhqhrrhqhrihsirhmqhrihshrthorihshvthrthmrhrth20D9D9D9hgs:FFFFFFFFFF80808000000000FF42A5F5FF9F9F9FFF9E9E9EFFC0D8FAFFFEFEFEFF6161618042A5F5FFD5D5D5FFFBFBFBFF90909080898989FF7BA2D080A3A3A3FF848484FF636363FFE8B62980D5D5D5FFC9C9C9FF797979FF676767FF767676FFA4CA7CFF86B951FF656565FFEBC047FFE5AC0AFF6794C640DBDBDBFF737373FFB0B0B0FF7C7C7CFF626262FF787878FF8F8F8FFFE3EFD7FF989898FF8CBC5AFFF6F6F680A7A7A7FFF9F9F9FFACACACFFE3E3E3FFFDFDFDFFBEBEBEFFFCFCFCFFBFD7FAFFEECE74FFA1A1A1FFE6B017FF77777740D9D9D9")};

// 添加菜单项
//app.addSubMenu({ cName: "addTools", cUser: "Add-in Tools", cParent: "Tools", nPos: 0, cRbParent:"-" });

// 功能区分隔符
app.addMenuItem( { cName: "-", cParent: "-", cRbParent: "Share", cExec: "" });

app.addMenuItem( {
	cName: "mergeAnnots",
	cUser: __("合并注释…", 'mergeAnnots'),
    oIcon: myIcon,
    cParent: "Comments",
	nPos: "cmd.comments.export",
    cRbParent: "Share", // 添加到 Share 功能区
    nRbSepStyle: 2, // 硬分隔符
    nRbPos: -1,
	//cEnable: "event.rc = (event.target != null);",
	cExec: 'console.println(mergeDocComments())'}
);


// 开始脚本
/* exported mergeDocComments */
var mergeDocComments = (()=>{
  // const authorName = identity.name;

  // 需要一个函数来访问全局变量
  class GlobalVals  {
      values; // jshint ignore:line
      constructor(name, defaults) {
      // 保存当前的首选项
          this.load = app.trustedFunction(() => {
              app.beginPriv();
              try {
                if ( global[name] ) return JSON.parse( global[name] );
              }catch(e){
                console.println('Could not access global[' + name + ']: ' + e);
              }
          });
          this.save = app.trustedFunction( value => {
              app.beginPriv();
              try {
                global[name] = JSON.stringify( value );
                global.setPersistent( name, true);
              }catch(e){
                console.println('Could not access global[' + name + ']: ' + e);
              }
          });
          this.values = defaults;
      }
      
      get() {
        const newValues = this.load();
        // 只复制目标中键的属性
        const vWalk = ( dest, vals ) => {
            if ( 'object' == typeof vals && !Array.isArray(vals)) {
                for (let k in vals) {
                    if (undefined !== dest[k]) {

                        dest[k] = vWalk( dest[k], vals[k] );
                    }
                }
            } else if (undefined !== vals) {
                dest = vals;
            } 
            return dest;
        };
        this.values = vWalk( this.values, newValues );
        return this.values;
      }
      set(newValues) {
          this.save( Object.assign( this.values, newValues ));
      }
  }
  /****** GlobalVals 类结束 *********/
  
  ///////////////////////////////////////////
  //    默认首选项
  ///////////////////////////////////////////
  const PREFS = new GlobalVals( 'MergeCommentsPrefs', {
          mergeDocs: [], // 上次选择的文档路径列表
          conf: { // 配置
              openPath: true, // 打开合并列表中尚未打开的文档
              closeDoc: false, // 保存并关闭由脚本打开/编辑的文档
              addMergeData: true, // 在每个文档中保存合并数据
              timeFuzz: 10, // 比较日期时视为相等的毫秒变化量
              askAllMerge: true, // 显示一个列出所有合并决策的对话框，即使是非冲突的
              skipNoChange: true, // 在合并冲突对话框中不显示 'nochange' 项目
              // 冲突选项
              // 0 - 询问
              // 1 - 跳过合并
              // 2 - 使用最新的
              // 3 - 使用最旧的
              delmod: 2,
              moddel: 3,
              modboth: 0,
              newboth: 0,
           },
      });


  // 需要在菜单加载期间定义，因为它需要特权函数
  class DocHandler {
    /* jshint ignore:start */
    docs; // 用于保存打开的文档句柄
    nameList; // 用于保存 {name, path} 列表，它可能比 docs 长
    noName; // 用于显示没有名称的文档的名称
    static dupSuffx = ' (%1s)'; // 用于添加到重复名称的后缀
    /* jshint ignore:end */
    
    constructor() {
        // 翻译
        this.noName = __("新文档", 'mergeAnnots');
        this.docs = this.getDocList();
        this.setNames();
    }
    // 返回 this.docs 的 [{name,path},...] 列表，重复名称会获得一个数字
    // 会覆盖 this.nameList 中已有的内容
    setNames() {
        const nameList = [];
        const docNames = {};
        for (let d of this.docs) {
            let name = d.documentFileName || this.noName;
            // 检查重复名称
            if (docNames[name]) {
                name += util.printf( this.constructor.dupSuffx, ++docNames[name] );
            } else {
                docNames[name] = 1;
            }
            let path = d.path;

            nameList.push( {name, path} );

        }
        // 赋值给 this
        this.nameList = nameList;
    }
    // 返回 this.nameList，并为未打开的文件添加前缀
    getNames() {
        const preNotOpen = '[文件] ';
        const theList = [];
        let nDocs = this.docs.length;
        
        for (let n of this.nameList) {
            theList.push( nDocs-- > 0 ? n : { name: preNotOpen + n.name, path: n.path});
        }
        return theList;
    }
    // 向 this.nameList 添加路径和名称
    // 如果存在则返回索引，如果添加则返回新索引
    addPath( fPath, checkExists = true ) {
        // 检查是否已在 nameList 中
        if (checkExists) {
            let pathIx = this.nameList.findIndex( n => (n.path == fPath));
            if (pathIx >= 0) return pathIx;
        }
        let i=0;
        let name = fPath.split('/').pop();
        // 需要确保名称未被占用
        for (let n of this.nameList) {
            if ( n.name == name ) i++;
        }
        
        this.nameList.push({
            name: name + (i ? util.printf( this.constructor.dupSuffx, ++i ) : ''),
            path: fPath });
        return this.nameList.length - 1;
    }
    // 返回 [somePaths] 在 this.nameList 中的索引列表
    getIndexes( somePaths, addPath = true ) {
        const iList = [];
        for (let p of somePaths) {
            let ix = this.nameList.findIndex( px => (p == px.path));
            //console.println(`Index [${ix}] found for path: '${p}'`);

            // 可能找不到路径
            if ( ix > -1 ) {
                iList.push(ix);
            } else {
                // @todo 也许不应该使用 _XUTIL_DEBUG_
                if ('undefined' !== typeof _XUTIL_DEBUG_ && _XUTIL_DEBUG_) console.println(__('Could not find path "%1".', 'mergeAnnots', p.path));
                // 未找到 - 也许可以添加到 nameList
                if (!addPath) continue;
                
                let newIx = this.addPath(p, false);
                
                iList.push(newIx);

            }
        }
        return iList;
    }
    // 给定索引数组，返回文档路径数组
    getPaths( docIxs ) {
        const paths = [];
        for (let i of docIxs) {
            paths.push(this.nameList[i].path);
        }
        return paths;
    }
    // 给定索引数组，返回包含文档句柄（如果在 this.docs 中）或路径的数组
    getDocs( docIxs ) {
        // this.nameList 中的第一项是 docs
        const docMix = [];
        for (let i of docIxs) {
            if (i < this.docs.length) {
                docMix.push(this.docs[i]);
            } else {
                docMix.push(this.nameList[i].path);
            }
        }
        return docMix;
    }
  }
  // 获取当前打开文档的特权函数
  DocHandler.prototype.getDocList = app.trustedFunction( function() {
    app.beginPriv();
    return app.activeDocs;
    //app.endPriv();
  });
  // 浏览文档的特权函数
  DocHandler.prototype.browseForDoc = app.trustedFunction( function(params) {
    let doc;
    app.beginPriv();
    try {
        doc = app.browseForDoc(params);
    } catch(e) {
        console.println(e);
    }
    //app.endPriv();
    return doc;
  });
  /****** DocHandler 类结束 *********/
  

  return function () {
    // 选择合并文档的主对话框
	const pickDocs = {

		docList: [], // 包含当前活动文档列表
        selDocs: [], // 包含所选文档列表
		results: {}, // 用于保存对话框结果
        
		initialize(dialog) {
			this.loadActive(dialog);
		},
        // 需要一个 validate 方法来检查是否至少选择了两个文档
		// 当点击 OK 按钮时调用。
		commit(dialog) {
            const boxes = ["opDs", "mgDs"]; // 包含文档名称的对话框项的名称
			// 有关 dialog.load 和 dialog.store 工作原理的说明，请参阅 Dialog 对象。
			let results = dialog.store();
            const findIx = name => {
                let ix = this.docList.findIndex( d => (name == d.name));
                return ix;
            };
			// 获取文档名称
			for (let d of boxes) {

				let names = Object.keys( results[d] );
                // 在 this.docList 中查找索引
                results[d] = names.map( findIx );
			}
			this.results = results;
		},
        // 选择了浏览按钮
        ldDc(dialog) {
            // 打开合并文档
            let newDoc = app.browseForDoc();
            if (newDoc) {
                let newIx = docs.addPath(newDoc.cPath);
                
                if (this.selDocs.includes(newIx)) { // 它已经存在
                    return console.println(__('已在所选文档中', 'mergeAnnots'));
                }
                // 添加到 this.selDocs
                this.selDocs.push(newIx);
                // 更新 this.docList
                this.docList = docs.getNames();
                // 更新对话框
                this.loadActive(dialog);
            }

        },
        // 添加文档到合并列表
        adDc(dialog) {
            let results = dialog.store();
            // sel 是对话框框中的索引，但需要 this.docList 中的索引
            let sel = this.getIndex(results.opDs);
            let dName = Object.keys(results.opDs)[sel];
            let dIx = this.docList.findIndex( d => ( d.name == dName ));
            
            this.selDocs.push(dIx);
            this.loadActive(dialog);
        },
        // 从合并列表中移除
        rmDc(dialog) {
            let results = dialog.store();
            // sel 是对话框框中的索引，应该与 openDocs 匹配
            let sel = this.getIndex(results.mgDs);
            //let dName = Object.keys(results.mgDs)[sel];
            //let dIx = this.docList.findIndex( d => { d.name == dName });
            // 在 openDocs 中查找索引
            
            this.selDocs.splice(sel,1);
            this.loadActive(dialog);
        },
        // 首选项对话框
        mPrf() {
            app.execDialog(prefsDlg);
        },
        // 合并文档更改
        mgDs(dialog) {
            const results = dialog.store();
            const ix = this.getIndex(results.mgDs);
            if (undefined === ix) return;
            
            // 更新信息
            const currDocs = Object.keys( results.mgDs );
            dialog.load({ mDDt: this.getDocInfo(currDocs[ix])});
        },
        
		loadActive(dialog) {
            const results = dialog.store();
            const data = {};
            
            // 获取当前选中的文档名称列表
            const currDocs = []; //this.selDocs.map( i => this.docList[i].name );
            // 获取剩余文档名称列表
            const openDocs = [];
            
            this.docList.forEach( (d,i) => {
                if ( this.selDocs.includes(i) ) {
                    currDocs.push( d.name );
                } else {
                    openDocs.push( d.name );
                }
            }, this);
            // 更新哪个项目被选中
            let mgSel = this.getIndex(results.mgDs);
            mgSel = (!mgSel || mgSel >= currDocs.length) ? 0 : mgSel;
            let opSel = this.getIndex(results.opDs);
            data.mgDs = this.getListboxArray(currDocs, mgSel);
            data.opDs = this.getListboxArray(openDocs, (opSel >= openDocs.length) ? 0 : opSel);
            
            // 从选中的合并文件获取数据
            data.mDDt = this.getDocInfo(currDocs[mgSel]);
        
			dialog.load(data);
		},
        getDocInfo( name ) {
            let docIx = this.docList.findIndex( d => (name == d.name));

            let data = this.docList[docIx]?.path ?? '';
            // 需要直接获取附加信息
            const selDoc = docs.getDocs( [docIx] )[0];

            if ( selDoc?.info ) {
                data += '\n' + __('页数: %1', 'mergeAnnots', selDoc.numPages ?? '');
                data += '\n' + __('修改日期: %1', 'mergeAnnots', selDoc.info.ModDate.toLocaleString() ?? '');
                data += '\n' + __('标题: %1', 'mergeAnnots', selDoc.info.Title ?? '');
                data += '\n' + __('作者: %1', 'mergeAnnots', selDoc.info.Authors ?? '');
            } else {
                data += '\n' + __('文件未打开 - 请查看合并设置。', 'mergeAnnots');
            }
            return data;
        },
		getIndex(elements) {
			for(let i in elements) {
				if ( elements[i] > 0 ) {
					return elements[i]-1 ; // 0 based index
				}
			}
		},
        // 创建适合列表框的对象数组。selItem 是索引
        // 返回的数组是 {"Displayed option":-order,...}
        getListboxArray(vals, selItem=0) {
            let sub = {};
            for (let i=0; i<vals.length; i++) {
                // 如果是正数，则表示选中
                sub[vals[i]] = ((selItem == i)?1:-1)*(i+1);
            }
            return sub;
        },		// 对话框框描述
		description: {
			name: __("合并文档注释", 'mergeAnnots'), // 对话框框的标题
			elements:
			[ {
				type: "view",
                align_children: 'align_top',
				elements:
				[   {
                    // 第一列
                        type: "view",
                        align_children: "align_left",
                        elements:
                        [{
                            type: 'button', item_id: "mPrf", name: __("合并设置…", 'mergeAnnots'), bold:true
                        },{
                            type: "cluster",
                            name: __("要合并的文档：", 'mergeAnnots'),
                            align_children: "align_left",
                            elements:
                            [{
                                type: "view",
                                align_children: "align_row",
                                elements:
                                [{
                                    type: 'button', item_id: "ldDc", name: __("浏览…", 'mergeAnnots')
                                },{
                                //    type: 'button', item_id: "mPrf", name: __("Preferences…", 'mergeAnnots')
                                }]
                            },{
                                type: "list_box", item_id: "mgDs", width: 300, height: 120,
                            },{
                                type: 'static_text', name: '文件信息', item_id: 'mDDt', width:300, char_height:6, font: 'palette'
                            }]
                        }]
                    },{
                    // 中心列
                        type: "view",
                        align_children: "align_center",
                        elements:
                        [{
                            type: "gap", width: 20, height: 100
                        },{
                            type: "button", item_id: "adDc", name: "<", align: 'align_center', width: 20, bold: true
                        },{
                            type: "button", item_id: "rmDc", name: ">", align: 'align_center', width: 20, bold: true
                        }]
                    },{
                    // 右列
                        type: "cluster",
                        name: __("打开的文档：", 'mergeAnnots'),
                        align_children: "align_left",
                        elements:
                        [{
                            type: "view",
                            align_children: "align_row",
                            elements:
                            []
                        },{
                            type: "list_box", item_id: "opDs", width: 300, height: 325,
                        }]
                    },
                    
				] },
				{
					type: "ok_cancel"
				}
			]
		}
	};

    // 首选项对话框
    const prefsDlg = {
        data: {},
        // 不同合并选项的弹出窗口
        mergeOpts: {
            demo: [__('询问…', 'mergeAnnots'), __('跳过合并', 'mergeAnnots'), __('使用修改版', 'mergeAnnots'), __('删除', 'mergeAnnots')],
            mode: [__('询问…', 'mergeAnnots'), __('跳过合并', 'mergeAnnots'), __('删除', 'mergeAnnots'), __('使用修改版', 'mergeAnnots')],
            mobo: [__('询问…', 'mergeAnnots'), __('跳过合并', 'mergeAnnots'), __('使用最新的', 'mergeAnnots'), __('使用最旧的', 'mergeAnnots')],
            nebo: [__('询问…', 'mergeAnnots'), __('跳过合并', 'mergeAnnots'), __('使用最新的', 'mergeAnnots'), __('使用最旧的', 'mergeAnnots')],
        },
		initialize(dialog) {
            const data = {};
            // 设置弹出窗口
            for (let opt in this.mergeOpts) {
                data[opt] = this.getListboxArray(this.mergeOpts[opt], this.data[opt] || 0);
            }
            dialog.load(Object.assign(this.data, data));
            // 启用/禁用文件保存选项
            this.opBk(dialog);
		},
		// 当点击 OK 按钮时调用。
		commit(dialog) {
            const data = dialog.store();
            // 替换为索引
            for (let opt in this.mergeOpts) {
                data[opt] = this.getIndex(data[opt]);
            }
            this.data = data;
        },
        // 打开文件选项更改
        opBk(dialog) {
            const data = dialog.store();
            const enableOpt = {
                clBk: data.opBk
                };
            dialog.enable(enableOpt);
        },
        // 数据文件信息
        adMq() {
            app.alert({ nIcon:2,
                cTitle: __('数据文件信息', 'mergeAnnots'),
                cMsg:__("该脚本可以在文档中保存一个数据文件，以提高合并的速度和准确性。一个保存的数据文件是一个名为 '%1' 的文件附件，它允许以下改进：\n   1. 跟踪哪些注释已被删除：如果没有数据文件，脚本会假设如果一个注释在某个文档中缺失（即被删除），那么它在另一个文档中是新的，并将其添加回来（因此你需要在所有文档中手动删除一个注释才能合并）\n   2. 确定注释自上次合并后是否已更新：如果没有合并文件，它会假定所有内容都已更新，并将其修改日期与所有其他文件进行比较。这会减慢合并速度，但如果只有修改日期不同，它不会在PDF-XChange build 388之前的版本中更新注释。\n   3. (在PDF-XChange build 388之前的版本中) 跟踪修改日期：当脚本添加一个缺失的注释时，它无法设置修改日期，因此该注释在下一次合并中会显得更新；在某些情况下，这可能导致在后续合并中覆盖另一个PDF中的更改。（如果只有修改日期不同，它不会在PDF-XChange build 388之前的版本中更新注释。）\n   4. 可选择保存更改日志。", 'mergeAnnots', 'commentMergeData.txt')
            });
        },
        // 从列表框对象获取所选索引
        getIndex(elements) {
            for(let i in elements) {
                if ( elements[i] > 0 ) {
                    return elements[i]-1 ; // 0 based index
                }
            }
        },
        // 创建适合列表框的对象数组。selItem 是索引
        // 返回的数组是 {"Displayed option":-order,...}
        getListboxArray(vals, selItem=0) {
            let sub = {};
            for (let i=0; i<vals.length; i++) {
                // 如果有多个重复名称，则添加计数器
                let counter = '';
                if (sub[vals[i]]) {
                   let j=0;
                   while (sub[vals[i] + '_' + (++j) ]);
                   counter = '_' + j ;
                }
                // 如果是正数，则表示选中
                sub[vals[i] + counter] = ((selItem == i)?1:-1)*(i+1);
            }
            return sub;
        },
        description: {
            name: __("首选项", 'mergeAnnots'), // 对话框框的标题
            elements: // 子元素数组
            [ {
                type: "cluster",
                alignment: 'align_fill',
                align_children: 'align_left',
                width: 400,
                name: __('设置', 'mergeAnnots'), 
                elements:
                [   { type: 'check_box', name: __('自动打开合并列表中尚未打开的文档。', 'mergeAnnots'), width: 370, item_id: 'opBk',
                    },
                    { type: 'view', align_children: 'align_top', width: 370, elements:
                        [{ type: 'gap', width: 20 },
                         { type: 'check_box', name: __('在后台（隐藏）打开文档，合并后保存并关闭。', 'mergeAnnots'), width: 350, item_id: 'clBk',
                         }
                        ]
                    },
                    { type: 'view', align_children: 'align_top', width: 370, elements:
                        [{ type: 'check_box', name: __("为没有合并数据文件的文档创建一个新的数据文件。", 'mergeAnnots'), width: 350, item_id: 'adMg' },
                        { type: 'button', name: '?', item_id: 'adMq', width:10, height:14}
                        ]
                    },
                    { type: 'view', align_children: 'align_row', width: 370, elements:
                        [{ type: 'edit_text', alignment: 'align_right', width: 50, item_id: 'tmFz'
                        },
                        {  type: 'static_text', alignment: 'align_left', 
                           name: __("比较日期时的毫秒容差。", 'mergeAnnots'), width: 320
                        },]
                    }
                ]
              },{
                type: "cluster",
                alignment: 'align_fill',
                align_children: 'align_left',
                //width: 400,
                name: __('冲突', 'mergeAnnots'),
                elements:
                [   { type: 'check_box', name: __("为所有合并操作显示冲突对话框。", 'mergeAnnots'), width: 400, item_id: 'akMg'
                    },
                    { type: 'view', alignment: 'align_fill', align_children: 'align_top', elements:
                        [
                          { type: 'popup', width: 90, item_id: 'demo'},
                          { type: 'static_text', name: __('注释在第一个文档中被删除，在第二个文档中被修改', 'mergeAnnots'), width: 280}
                        ]
                    },
                    { type: 'view', alignment: 'align_fill', align_children: 'align_top', elements:
                        [
                        { type: 'popup', width: 90, item_id: 'mode'},
                        { type: 'static_text', name: __('注释在第一个文档中被修改，在第二个文档中被删除', 'mergeAnnots'), width: 280},
                        ]
                    },
                    { type: 'view', alignment: 'align_fill', align_children: 'align_top', elements:
                        [
                        { type: 'popup', width: 90, item_id: 'mobo'},
                        { type: 'static_text', name: __('注释在多个文档中被修改', 'mergeAnnots'), width: 280},
                        ]
                    },
                    { type: 'view', alignment: 'align_fill', align_children: 'align_top', elements:
                        [
                        { type: 'popup', width: 90, item_id: 'nebo'},
                        { type: 'static_text', name: __('注释在多个文档中都是新增的', 'mergeAnnots'), width: 280},
                        ]
                    },
                ]
              },{ type: "ok_cancel", align: 'align_right'}
            ]
        }
    };

	
	// **** 开始主脚本 ****
    
    // 加载保存的首选项
    const mergePrefs = PREFS.get();
    
    // 设置首选项对话框
    const prefDialogMap = new Map([
        [ 'opBk', 'openPath'],
        [ 'clBk', 'closeDoc'],
        [ 'adMg', 'addMergeData'],
        [ 'tmFz', 'timeFuzz'],
        [ 'akMg', 'askAllMerge'],
        [ 'demo', 'delmod'],
        [ 'mode', 'moddel'],
        [ 'mobo', 'modboth'],
        [ 'nebo', 'newboth']
    ]);
    // 将首选项应用于对话框
    prefDialogMap.forEach( (v,k) => prefsDlg.data[k] = mergePrefs.conf[v]);
    // 强制 timeFuzz 为数字
    mergePrefs.timeFuzz = parseInt(mergePrefs.timeFuzz) || 0;
    
    // 当前文档列表
	const docs = new DocHandler();
    // 添加保存在首选项中的文档，因为它们上次合并过
    pickDocs.selDocs = docs.getIndexes( mergePrefs.mergeDocs );
    //console.println(JSON.stringify(pickDocs.selDocs))
    
    // 当前文档的名称
    pickDocs.docList = docs.getNames();

 	// 运行对话框
	let diaResults = app.execDialog(pickDocs);
    
	if ("ok" != diaResults) return diaResults;
    
    let results = pickDocs.results;
    //console.println(JSON.stringify(results));
    // 从首选项对话框更新首选项
    prefDialogMap.forEach( (v,k) => mergePrefs.conf[v] = prefsDlg.data[k] );
    
    // 要合并的文档或路径列表
    let theDocs = docs.getDocs( results.mgDs );
   
    // 将路径保存到对话框
    PREFS.set( {mergeDocs: docs.getPaths( results.mgDs )} );
    
    // 执行合并
    diaResults = xutil.mergeDocComments( theDocs, mergePrefs.conf );
    
    return diaResults;
};
})();

/** 在全局作用域创建 'xutil' 实用工具对象，并尝试防止其被覆盖
  * @constant
*/
if ('undefined' == typeof xutil) {
    Object.defineProperty( globalThis, 'xutil', { value: {}, writable: false });
}


/** 在多个文档之间合并注释。
  *
  * @param [doc1, doc2, ...] mergeDocs - 要合并的文档。文档句柄数组或文档路径数组
  * @param {option: value, ...} options - 合并时要使用的选项
  *
  * @returns 布尔值，表示成功或失败
*/
/* globals _XUTIL_DEBUG_:true */
xutil.mergeDocComments = (function() {
  // 设置
  const MERGEDATANAME = 'commentMergeData.txt'; // 注释合并数据文件的名称
  const WRITEMODDATE = ("object" != typeof app.pxceVersion || app.pxceVersion[3] > 387); // 是否将修改日期写入注释
  let TIMEFUZZ = 0; // 比较日期时允许的毫秒模糊度
  let APPREGISTERED = true; // 只有在注册时才会尝试使用 copyStamp 函数
  
  // 设置特权函数
  const saveDoc = app.trustedFunction( ( doc, closeDoc = true ) => {
      app.beginPriv();
      doc.saveAs({cPath: doc.path, bPromptToOverwrite: false});
      app.endPriv();
      if (closeDoc) doc.closeDoc(false);
      return;
  });
  
  // 戳数据对javascript不可用，因此无法 addAnnot
  // 变通方法是复制页面，将其从复制的页面移动过来，然后删除复制的页面
  const copyStamp = app.trustedFunction( ( sPath, dDoc, sPage, dPage, stampName ) => {
      if (!APPREGISTERED) return;
      app.beginPriv();
      dDoc.insertPages( {nPage: dPage, cPath: sPath, nStart: sPage} );
      app.endPriv();
      //dDoc.bringToFront();
      //dDoc.pageNum = dPage+1;
      //console.println(dDoc.getAnnots( {nPage: dPage+1}).map(a => a.name));
      //app.alert('copied page\n' + [sPath, dDoc, sPage, dPage, stampName])
      const theStamp = dDoc.getAnnot( {nPage: dPage+1, cName: stampName} ); // 旧的 dDoc.getAnnots( {nPage: dPage+1}).find( a => stampName == a.name)
      if (theStamp) {
          // 将其移动到目标页面
          const newProps = {page: dPage};
          if (WRITEMODDATE) newProps.modDate = theStamp.modDate;
          theStamp.setProps( newProps );
      } else {
          console.println(__('error copying stamp %1 from %2', 'xutil', stampName, sPath));
      }
      // 出于某种原因不需要特权
      dDoc.deletePages( dPage+1 );
      return theStamp;
  });
  
  /////////////////////////
  /// 开始合并函数
  /////////////////////////
  return function( mergeDocs, options={} ) {
    TIMEFUZZ = parseInt(options.timeFuzz ?? TIMEFUZZ);
    if ('undefined' === typeof _XUTIL_DEBUG_) _XUTIL_DEBUG_ = false;
    // 检查哪些是文档，并打开其他的
    const openDocs = [];
    for (let d of mergeDocs) {

        if ("object" == typeof d && d.info) {
            openDocs.push(d);
        } else {
            // 假设 d 是有效路径 -- 也许这里应该使用 try...catch？
            // **注意** 除非用户允许了该位置或文件，否则 app.openDoc 会抛出安全警告。
            let od = options.openPath ? app.openDoc({
                cPath: d,
                bHidden: options.closeDoc, // 如果脚本将关闭它，则隐藏打开
            }) : null;
            // 如果什么都没打开，od 为 null
            if (od) {
                openDocs.push(od);
            } else {
                console.println(__("Couldn't open file '%1'", 'xutil', d));
            }
        }
    }
    
    // 冲突对话框
    const conflictDialog = {
        mergeActions:[], // 指向所有合并操作的指针
        conflicts:[], // 冲突列表
        colSizes: [ [30,'C'], 5, 15, [8,'R'], 10, [10,'C'], 30], // list_box 的列大小
        colHeaders: [ __('源文档', 'xutil'), __('页码', 'xutil'), __('主题', 'xutil'), __('冲突', 'xutil'), __('操作', 'xutil'), __('合并', 'xutil'), __('目标文档', 'xutil')],
        mergeTx: [ '??', __('跳过', 'xutil'), '>>>>>', '<<<<<' ],
        actionName: {
            'nochange': __('无变更', 'xutil'),
            'new': __('新增', 'xutil'), 
            'delete': __('删除', 'xutil'), 
            'update': __('更新', 'xutil')},
         stateName: {
            'nochange': __('未变更', 'xutil'),
            'none': __('不存在', 'xutil'), 
            'delete': __('已删除', 'xutil'), 
            'update': __('已更新', 'xutil')},
         conflictDescr: {
            delmod: __('注释在第一个文档中被删除，在第二个文档中被修改', 'xutil'),
            moddel: __('注释在第一个文档中被修改，在第二个文档中被删除', 'xutil'),
            modboth: __('注释在多个文档中被修改', 'xutil'),
            newboth: __('注释在多个文档中都是新增的', 'xutil')
            },
        initialize(dialog) {
            
            // 设置行生成器
            this.tc = new TextColumns(this.colSizes, '  ');
            // 用于粗体标题
            const tb = new TextColumns(this.colSizes, '  ', 1.03125); // 粗体文本略宽
            const dLoad = {
                cHdr: tb.row(this.colHeaders),
                shNC: !options.skipNoChange,
                };
            Object.assign( dLoad, this.loadConflicts( 0 ), this.getFooterDetails( 0 ));

            dialog.load(dLoad);
            
            //dialog.enable({shwD: 'new' !== this.conflicts[0].action, shwS: 'delete' !== this.conflicts[0].action});
        },
        validate() {
            // 检查是否所有冲突都已解决
            const resolved = !this.conflicts.some( c => 0 === c.docData.merge);
            // 返回 true 以继续执行 commit
            if (!resolved) {
                app.alert(__('所有标记为 %1 的合并必须解决才能继续合并。', 'xutil', this.mergeTx[0]));
            }
            return resolved;
        },
		commit() {
            // return 'ok'
        },
        // 跳过合并按钮
        sSkp (dialog) {
            this.applyMergeOpt( dialog, 1);
        },
        // 使用最新按钮
        sNew (dialog) {
            this.applyMergeOpt( dialog, 2);
        },
        // 设置源按钮
        sOld (dialog) {
            let sIx = this.getIndex(dialog.store().cLst);
            
            let dNum = this.conflicts[sIx].doc;
            //console.println(JSON.stringify(this.conflicts[sIx].mergeParent));
            this.conflicts[sIx].mergeParent.switchDoc( dNum );
            // 重新生成冲突
            this.conflicts = getDialogActionList( allMergeActions );
            dialog.load( this.loadConflicts( sIx ));
        },
        // 更改为所选行
        cLst(dialog) {
            let sIx = this.getIndex(dialog.store().cLst);
            if (undefined == sIx) return;
            
            //dialog.enable({shwD: 'new' !== this.conflicts[sIx].action, shwS: 'delete' !== this.conflicts[sIx].action});
            
            dialog.load(this.getFooterDetails( sIx ));
        },
        // 显示无变更选项
        shNC(dialog) {
            const data = dialog.store();
            let sIx = this.getIndex(data.cLst);
            const sIxTx = JSON.stringify( this.conflicts[ sIx ]);
            options.skipNoChange = !data.shNC;
            // 重新生成冲突
            this.conflicts = getDialogActionList( allMergeActions );
            // sIx 会改变 - 需要找到一种比较的方法
            sIx = this.conflicts.findIndex( c => sIxTx == JSON.stringify(c));
            dialog.load( this.loadConflicts( sIx < 0 ? 0 : sIx ));
        },
        // 缩放到注释按钮
        shwS(dialog) {
            this.zoomToAnn( dialog, 'sourceDoc', 'doc');
            //let sIx = this.getIndex(dialog.store().cLst);
            //let cf = this.conflicts[sIx];
            //
            //let ann = openDocs[ cf.sourceDoc ].getAnnot( cf.page, cf.annotName );
            //if (ann) {
            //    zoomAnn( ann, 0.4 );
            //} else {
            //    ann = openDocs[ cf.doc ].getAnnot( cf.page, cf.annotName );
            //    zoomAnn( ann, 0.4, openDocs[ cf.sourceDoc ] );
            //}
        },
        shwD(dialog) {
            this.zoomToAnn( dialog, 'doc', 'sourceDoc');
            //let sIx = this.getIndex(dialog.store().cLst);
            //let cf = this.conflicts[sIx];
            //
            //let ann = openDocs[ cf.doc ].getAnnot( cf.page, cf.annotName );
            //if (ann) {
            //    zoomAnn( ann, 0.4 );
            //} else {
            //    ann = openDocs[ cf.sourceDoc ].getAnnot( cf.page, cf.annotName );
            //    zoomAnn( ann, 0.4, openDocs[ cf.doc ] );
            //}
        },
        zoomToAnn( dialog, thisDoc, sourceDoc) {
            let sIx = this.getIndex(dialog.store().cLst);
            let cf = this.conflicts[sIx];
            
            let ann = openDocs[ cf[thisDoc] ].getAnnot( cf.page, cf.annotName );
            if (ann) {
                zoomAnn( ann, 0.4 );
            } else {
                ann = openDocs[ cf[sourceDoc] ].getAnnot( cf.page, cf.annotName );
                zoomAnn( ann, 0.4, openDocs[ cf[thisDoc] ] );
            }
        },
        getFooterDetails( sIx ) {
            const spc = ' '.repeat(5);
            const c = this.conflicts[sIx];
            //const info = c.docData; // ? c.conflict : c;
            // 获取冲突描述
            const conf = c.conf ? ( Array.isArray(c.conf) ? c.conf : [c.conf] ).map( cf => this.conflictDescr[cf] ) : '';
            let ftr = ( conf ? conf : __('无冲突','xutil')) +': "'+ (c.conf ??  '-') +'"';
            ftr += '\n' + __('操作: "%1"', 'xutil', this.actionName[c.action]);
            ftr += spc + __('标记类型: %1', 'xutil', c.type );
            ftr += spc + __('名称: %1', 'xutil', c.annotName);
            let detS = this.tc.padString(c.sourcePath, 60);
            detS += spc + __('作者: %1', 'xutil', c.sourceAuthor);
            detS += '\n' + __('状态: "%1"', 'xutil', this.stateName[c.sourceState]);
            detS += spc + __('修改于 %1', 'xutil', c.sourceMod.toLocaleString());
            let detD = this.tc.padString(c.path, 60);
            detD += spc + __('作者: %1', 'xutil',  c.author);
            detD += '\n' + __('状态: "%1"', 'xutil', this.stateName[c.state]);
            detD += spc + __('修改于 %1', 'xutil', c.modDate ? c.modDate.toLocaleString() : '-');
            
            return {cFtr: ftr, cFtS: detS, cFtD: detD};
        },
        // 处理添加合并选项
        applyMergeOpt( dialog, opt = 0) {
            let sIx = this.getIndex(dialog.store().cLst);
            if (undefined == sIx) return;
            this.conflicts[sIx].docData.merge = opt;
            // 可以尝试跳转到下一行 ??
            let nIx = sIx;
            while ( nIx < this.conflicts.length && 0 != this.conflicts[nIx].docData.merge ) nIx++;
            if ( nIx === this.conflicts.length ) nIx = sIx + 1;
            dialog.load( this.loadConflicts( ( nIx < this.conflicts.length ) ? nIx : 0));
        },
        // 为列表生成文本
        loadConflicts(currRow) {
            // newDocName, modDate  |  merge  | oldDocName, modDate | conflict | Annot.type
            let dTx = [];
            let rpt = '';
            for (const c of this.conflicts) {
                //console.println(JSON.stringify(c))
                let sourceName = c.sourcePath.split('/').pop();
                if (rpt === c.page+c.annotName+c.sourcePath) {
                    // 使用单个字符表示重复
                    sourceName = '\u3003'; //"─":1.315,"└":1.315,"〃":1.855
                }
                dTx.push( this.tc.row( [
                    sourceName, // 文件名
                    'p.' + (c.page + 1),
                    c.subject,
                    c.conf ?? '',
                    this.actionName[c.action],
                    this.mergeTx[c.docData.merge],
                    c.path.split('/').pop(), // 文件名
                    //c.conflict ? openDocs[ c.conflict.doc ].path : __('[ (%1) other documents ]', 'xutil', openDocs.length - 1)
                ]));
                rpt = c.page+c.annotName+c.sourcePath;
            }

            return {cLst: this.getListboxArray(dTx, currRow)};
        },
		getIndex(elements) {
			for(let i in elements) {
				if ( elements[i] > 0 ) {
					return elements[i]-1 ; // 0 based index
				}
			}
		},
        // 创建适合列表框的对象数组。selItem 是索引
        // 返回的数组是 {"Displayed option":-order,...}
        getListboxArray(vals, selItem=0) {
            let sub = {};
            for (let i=0; i<vals.length; i++) {
                // 如果有多个重复名称，则添加计数器
                let counter = '';
                if (sub[vals[i]]) {
                   let j=0;
                   while (sub[vals[i] + '_' + (++j) ]);
                   counter = '_' + j ;
                }
                // 如果是正数，则表示选中
                sub[vals[i] + counter] = ((selItem == i)?1:-1)*(i+1);
            }
            return sub;
        },
		description: {
			name: __("合并冲突", 'xutil'), // 对话框框的标题
			elements:
			[ {
                type: "view",
                align_children: "align_row",
                elements:
                [{  type: 'gap', width: 100
                },{
                    type: 'button', item_id: "sSkp", name: __("跳过合并", 'xutil'), bold: true
                },{
                    type: 'button', item_id: "sNew", name: __("> 使用源文档 >", 'xutil'), bold: true
                },{
                    type: 'button', item_id: "sOld", name: __("< 更改源文档 <", 'xutil'), bold: true
                },{
                    type: 'check_box', item_id: 'shNC', name: __("显示“无变更”操作。", 'xutil'), width: 300
                }]
            },{
                type: 'static_text', item_id: 'cHdr', name: 'Header', width: 750, bold: true
            },{
                type: "list_box", item_id: 'cLst', width: 750, height: 300
            },{
                type: 'static_text', item_id: 'cFtr', name: 'Details', width: 750, char_height: 2, bold: true
            },{
                type: "cluster",
                align_children: "align_top",
                name: __('源批注', 'xutil'),
                elements:
                [{  type: 'button', item_id: "shwS", name: __("显示", 'xutil')
                },{ type: 'static_text', item_id: 'cFtS', name: 'Source Document Details', width: 650, char_height: 2, alignment: 'align_fill'
                }]
            },{
                type: "cluster",
                align_children: "align_top",
                name: __('目标批注', 'xutil'),
                elements:
                [{  type: 'button', item_id: "shwD", name: __("显示", 'xutil')
                },{ type: 'static_text', item_id: 'cFtD', name: 'Source Document Details', width: 650, char_height: 2, alignment: 'align_fill'
                }]
            },{
                type: "ok_cancel"
            }]
        }
    };
    
    // 用于将文本排成列的类
    class TextColumns {
        /* jshint ignore:start */
        colSpacing;
        colBorder; // 放在列边框的字符
        colPad = ' ';
        hairSp = '\u200A'; // 用于填充部分 colPad 的发丝空格
        
/** 如果你有不同的字母表或字体，可以使用它来获取字体字符宽度！
  * 使用 canvas.measureText 计算并返回给定字体的给定文本的宽度（以像素为单位）。
  * 
  * @param {String} text 要渲染的文本。
  * @param {String} font 文本要渲染的 css 字体描述符（例如 "bold 14px verdana"）。
  * 
  * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
  *
function getTextWidth(text, font) {
  // 重用 canvas 对象以获得更好的性能
  const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  context.font = font;
  const metrics = context.measureText(text);
  return metrics.width;
}

function getCssStyle(element, prop) {
    return window.getComputedStyle(element, null).getPropertyValue(prop);
}

function getCanvasFont(el = document.body) {
  const fontWeight = getCssStyle(el, 'font-weight') || 'normal';
  const fontSize = getCssStyle(el, 'font-size') || '16px';
  const fontFamily = getCssStyle(el, 'font-family') || 'Times New Roman';
  
  return `${fontWeight} ${fontSize} ${fontFamily}`;
}

{
  const font = "normal 48pt Segoe UI";
  const alph = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ~!@#$%^&*()_+`1234567890-={}|[]\\:";\'<>?,./… \u2000\u2001\u2002\u2003\u2008\u2009\u200A\u2500\u2514\u3003'; // 末尾的各种类型的空格
  const cMap = {};
  const cBase = getTextWidth("0", font); // figure space
  for (let c of alph.split('')) {
    cMap[c] = Math.round( getTextWidth(c, font) / cBase * 1000) / 1000;
  }
  console.log( JSON.stringify( cMap ));
}
// 字符宽度函数结束        **/
        
        // 标准化为 "0" 的宽度
        static widthData = {"0":1,"1":1,"2":1,"3":1,"4":1,"5":1,"6":1,"7":1,"8":1,"9":1,"a":0.944,"b":1.091,"c":0.857,"d":1.092,"e":0.97,"f":0.581,"g":1.092,"h":1.05,"i":0.449,"j":0.449,"k":0.922,"l":0.449,"m":1.598,"n":1.05,"o":1.087,"p":1.091,"q":1.092,"r":0.645,"s":0.787,"t":0.629,"u":1.05,"v":0.888,"w":1.341,"x":0.851,"y":0.897,"z":0.839,"A":1.196,"B":1.063,"C":1.149,"D":1.301,"E":0.938,"F":0.906,"G":1.273,"H":1.317,"I":0.494,"J":0.662,"K":1.076,"L":0.873,"M":1.666,"N":1.388,"O":1.399,"P":1.039,"Q":1.399,"R":1.11,"S":0.986,"T":0.972,"U":1.274,"V":1.152,"W":1.733,"X":1.094,"Y":1.025,"Z":1.058,"~":1.269,"!":0.527,"@":1.772,"#":1.096,"$":1,"%":1.518,"^":1.269,"&":1.485,"*":0.773,"(":0.56,")":0.56,"_":0.77,"+":1.269,"`":0.497,"-":0.742,"=":1.269,"{":0.56,"}":0.56,"|":0.444,"[":0.56,"]":0.56,"\\":0.703,":":0.402,"\"":0.727,";":0.402,"'":0.427,"<":1.269,">":1.269,"?":0.831,",":0.402,".":0.402,"/":0.723,"…":1.36," ":0.46," ":0.928," ":1.855," ":0.928," ":1.855," ":0.402," ":0.371," ":0.232,"─":1.315,"└":1.315,"〃":1.855};
        /* jshint ignore:end */
        
        constructor( colSpacing, colBorder = ' ', factor = 1, proportional = true ) {
            this.colSpacing = colSpacing;
            this.colBorder = colBorder;
            this.proportional = proportional;
            this.factor = factor || 1;
            this.colPadLength = this.getLength(this.colPad);
            this.hairSpLength = this.getLength(this.hairSp);
        }
        
        // 返回比例长度
        getLength( tx ) {
            let length;
            if ('string' != typeof tx) {
                tx = ('undefined' === typeof tx) ? 'undefined' : tx.toString();
            } 
            if (this.proportional) {
                length = 0;
                for (let t of tx.split('')) {
                    length += this.constructor.widthData[t] || 1;
                    //if (!this.constructor.widthData[t]) console.println(`Not found char: "${t}"`)
                }
            } else {
                length = tx.length;
            }
            return length * this.factor;
        }
        
        row( strings ) {
            let rowString = '';
            this.colSpacing.forEach( (s,i) => {
                let type = Array.isArray(s) ? s[1] : 'L';
                let space = Array.isArray(s) ? s[0] : s;

                rowString += rowString ? this.colBorder : '';
                rowString += this.padString( strings[i], space, type);

            });
            return rowString;
        }
        // 宽度基于 widthData 中的 1.0 宽度比
        padString(tx, width, type = 'L') {
            tx = (tx ?? '').toString();
            // ls 和 rs 是 colPad 的重复次数
            let length = this.getLength( tx );
            // 不适合
            if (width < length) {
                tx = this.clipString( tx, width );
                length = this.getLength(tx);
                // 可能仍需要一个空格
            }
            let ls;
            let lhs;
            const hSpRato = this.colPadLength / this.hairSpLength;
            // colPadLength 的倍数
            // 需要四舍五入
            let rs = ( width - length) / this.colPadLength;
            // 剩余分数转到发丝空格
            switch (type.toUpperCase()) {
              case 'R':
                ls = parseInt( rs );
                lhs = this.proportional ? Math.round( (rs % 1) * hSpRato ) : 0;
                rs = 0;
                break;
              case 'C':
                ls = parseInt( rs/2 );
                lhs = this.proportional ? parseInt(((rs/2) % 1) * hSpRato ) : 0;
                break;
              default:
                ls = 0;
                lhs = 0;
            }
            //console.println([tx,length,ls,lhs,rs, this.colPadLength, this.hairSpLength])
            tx = this.hairSp.repeat( lhs ) + this.colPad.repeat( ls ) + tx;
            // 在右侧使用剩余空间
            let remainSps = rs - ls - lhs / hSpRato;
            tx += this.colPad.repeat( rs ? parseInt( remainSps ) : 0 );
            // 剩余分数
            tx += this.hairSp.repeat( (this.proportional && rs) ? Math.round(( remainSps % 1) * hSpRato) : 0 );
            
            return tx;
        }
        
        clipString (text, maxLen) {
            text = (text ?? '').toString();
            if (!maxLen) return text;
            let length = this.getLength( text );
            // 中间间隔符
            const midString = '…';
            //console.println([text,length,maxLen])
            if (length > maxLen) {

                let tStart =  text.slice(0, maxLen/2 );
                // 获取结束长度
                let ei; // endCharL 中的索引
                const endCharL = text.slice( text.length - tStart.length ).split('').map( c => this.getLength(c) );
                let tLength = this.getLength(tStart + midString);
                // 可以用 while() 变得更聪明，但可能会卡住？？
                //ei = endCharL.length;
                //while ( tLength += endCharL[--ei] <= maxLen );
                for (ei = endCharL.length; ei--;) {
                    if (tLength + endCharL[ei] > maxLen ) break;
                    tLength += endCharL[ei];
                }
                //console.println([tStart, midString, text.slice( text.length - endCharL.length + ei )])
                //console.println('endlength '+ text.slice( text.length - endLength )) 
                text = tStart + midString + text.slice( text.length - endCharL.length + ei +1 );
                //text += midString + text.slice( text.length - maxLen + lStart + 1 );
            }
            return text;
        }
    }
    
    ///////////////////////////////////////////////
    // 更新注释
    // 如果调用，假设所有冲突都已处理
    ///////////////////////////////////////////////
    function applyAnnotUpdate( actionData, sourceDoc, destDoc ) {
        //console.println('copying from '+sourceDoc.path)
        let { act, page, name, actionDate} = actionData;
        //console.println(JSON.stringify(actionData));
        
        let ann = destDoc.getAnnot({nPage:page, cName: name});
        //let ann = destAnns.find( a => a.name == name);
        let newProps;
        
        let sourceAnn = sourceDoc.getAnnot({nPage:page, cName: name});
        //console.println([act, page, name, actionDate]);
        
        let result = {}; // 不确定是否应该保存 actionDate？
        // @debug
        //console.println(act + ' ' + ann?.modDate + ' < ' + actionDate + ' :' + (ann?.modDate < actionDate) + ` ${name}`);
        
        switch (act) {
          case 'delete':
            if (ann && "object" === typeof ann) ann.destroy();
            // 设置标志以便从 mergeData 中移除
            result.deleted = true;
            break;
          case 'nochange':
            if (ann || !sourceAnn) return; // 没有结果因为未变更
            // 它是新的，所以添加它
            /* falls through */
          case 'update':
            if (ann) {
                newProps = getAnnotProps( sourceAnn, ann);

                if (Object.keys(newProps).length) {
                    //console.println('setting props '+JSON.stringify(newProps))
                    ann.setProps(newProps);
                } else {
                    // 如果保存的 mergedata modDate 比注释 modDate 旧，可能会发生这种情况
                    // 如果在这个文档上没有任何更改，但在其他文档上有，也会发生这种情况
                    if (_XUTIL_DEBUG_) console.println(__('Note: %1 marked "update" but no changed properties found in document %2.', 'xutil', sourceAnn?.name, destDoc?.path));

                    return;
                }
                break;
            }
            // 它不存在，所以添加它
            /* falls through */
          case 'new':
            if (_XUTIL_DEBUG_ && !sourceAnn) console.println('No source annot for action: ' + JSON.stringify(actionData) + '\nSourceDoc: ' + sourceDoc.path);
            // 获取新属性 - 如果可以设置，这包括 modDate
            newProps = getAnnotProps( sourceAnn );
            // 无法创建新戳，所以尝试复制
            if (APPREGISTERED && 'stamp' == sourceAnn.type.toLowerCase()) {
                // TODO 也许将来处理偏移页面
                let dPage = sourceAnn.page;
                // 这里不需要 newProps
                ann = copyStamp( sourceDoc.path, destDoc, sourceAnn.page, dPage, sourceAnn.name );
            } else {
                //console.println('copying '+sourceAnn.name+' from '+sourceDoc.name)
                ann = destDoc.addAnnot( newProps );
            }
            break;
        }
        
        if (!result.deleted) {
            if (!ann) {
                console.println(__('Annot copy failed.', 'xutil'));
                ann = {type: 'Annot copy failed'};
            }
            result = {
                type: ann.type,
                // 如果 newProps 存在，则使用其中的修改日期，
                //  如果不能设置 modDate，则使用 actionDate 作为保存的 modDate
                modDate: newProps?.modDate ? newProps.modDate : actionDate,
                creationDate: ann.creationDate,
                // 如果 newProps 有修改日期，则使用 now 作为合并日期
                //   否则设置 mergeDate = ann.modDate，以便下次脚本知道使用保存的 modDate
                mergeDate: newProps?.modDate ? newProps.modDate : ann.modDate,
                //deleted: false
            };
            //console.println('result: ' + JSON.stringify(result))
        }
        
        return result;
    }
    // 获取可以写入的注释属性
    // 只包含与 oldAnn 不同的注释（如果包含）
    function getAnnotProps( annot, oldAnn ) {
        // 只读属性列表
        const roProps = [ 'doc' ];
        // 更新文档
        if (oldAnn) {
            roProps.push( 'creationDate', 'name', 'type', 'seqNum' );
        }
        // 对于 PXE 387 及更早版本不能设置 modDate
        if (!WRITEMODDATE) {
            roProps.push('modDate');
        }
        
        let props = annot.getProps();
        for (let d of roProps) {
            delete props[d];
        }
        
        if (oldAnn) {
            let oldProps = oldAnn.getProps();
            for (let k in props) {
                if ( testEqual(oldProps[k], props[k]) ) {
                    delete props[k];
                }
            }
        }
        
        function testEqual( ob1, ob2 ) {
            // 日期可以比较
            if (ob1 instanceof Date && ob2 instanceof Date) {
                return ob1.getTime() === ob2.getTime();
            } else if ('object' == typeof ob1 && 'object' == typeof ob2) {
                for (let i in ob1) {
                    if (!testEqual( ob1[i], ob2[i] )) return false;
                }
            } else {
                return ob1 == ob2; // allow
            }
            return true;
        }
        
        return props;
    }
    // 注释合并操作存储
    class AnnotMergeAction {
        // 操作的对象格式：
        //   docs: Map {} of objects - index matches .doc:
        //     doc:    number index to openDocs[]
        //     modDate:
        //     conf:   conflict caused by this doc
        //     stat:   state of annot at beginning of merge ['none', 'delete', 'update', 'nochange']
        //     act:    action on this doc ['new', 'delete', 'update', 'nochange']
        //     merge:  override on the conflict (added by conflictDialog)
        //   sourceDoc:  index to current source document
        //   conflict: [] array of doc numbers (all data stored now in .docs)
        //   modBase: {} oldest document info
        //     doc:    index
        //     date:   modDate ! may be undefined !
        //   seq: sequence number of source
        // 由其他函数添加的属性
        //    mod: {} changed annotation properties to be applied
        
        // jshint ignore: start
        actions = {
            docs: new Map(),
            sourceDoc:  null, // start with dNum as source
            modBase: {}
        }
        // jshint ignore: end
        constructor() {
        }
        // 获取 dNum 在 .docs 中的句柄
        get ( nDoc ) {
            return this.actions.docs.get( nDoc );
        }
        // 仅将目标文档作为数组获取
        get dest() {
            const destDocs = [];
            this.actions.docs.forEach( (d,n) => {
                if (n !== this.actions.sourceDoc) destDocs.push(d);
            });
            return destDocs;
        }
        get modBase() {
            return this.actions.modBase;
        }
        set modBase( base ) {
            this.actions.modBase = base;
        }
        get act() {
            // 假设 sourceDoc act
            return this.source?.act;
        }
        // 也许有点破坏性？设置所有非源的内容
        set act( action ) {
            // 设置所有 - 稀疏数组
            for (let d of this.dest) {
                
                const docInfo = this.actions.docs[d];
                if (_XUTIL_DEBUG_) console.println(`Setting doc[${d}] from ${docInfo.act} to ${action}`);
                docInfo.act = action;
            }
        }
        // 获取 sourceDoc
        get source() {
            return this.get( this.actions.sourceDoc);
        }
        // 将 dNum 设置为源
        set source( dNum ) {
            this.actions.sourceDoc = dNum;
        }
        // 获取作为冲突的文档信息数组
        get conflicts() {
            if (!this.actions.conflict) return;
            const conflicts = this.actions.conflict.map( d => this.get( d ));
            return conflicts;
        }
        // 获取源的序列号
        get seq() {
            return this.get( this.actions.sourceDoc ).seq;
        }
        // 添加状态，如果最新则设置为源
        // this newer? yes -> this becomes source
        // this same age? source 'nochange' and this not 'nochange'? -> this becomes source.
        add( dNum, state, modDate, seq ) {
            let sourceInfo = this.source;
            if (sourceInfo && modDate && (modDate - sourceInfo.modDate) >= -TIMEFUZZ) {
                // 相等或更新
                if ( Math.abs(modDate - sourceInfo.modDate) <= TIMEFUZZ && ('nochange' === state )) {
                    // 相等 & this nochange
                    return this.addAction( dNum, state, modDate, seq );
                }
                //console.println('setting state source '+dNum+' date '+modDate )
                return this.setAction( dNum, state, modDate, seq );
            }
            // 源不存在，或与源相同或更旧
            return this.addAction( dNum, state, modDate, seq );
        }
        // 添加状态并设置为源
        // 也许这只是 addAction 加上对 switchDoc 的调用？
        setAction( dNum, state, modDate, seq ) {
            // 也许状态应该是 'nochange'？
            const resDoc = this.addAction( dNum, state, modDate, seq );
            //const oldSource = this.get( this.actions.sourceDoc );
            // **** ? 也许应该使用 this.switchDoc() *****
            //this.switchDoc( dNum );
            this.actions.sourceDoc =  dNum ;
            
            // 更新旧 sourceDoc 的状态
            //console.println("updating old source: "+state+ '... Number of docs: '+this.actions.docs.size)
            //this.stat = state;
            // ????? 设置所有其他操作 ??????
            //this.actions.stat = state;
            return resDoc;
        }
        // 添加一个状态
        // 为 dNum 破坏当前状态
        addAction( dNum, state, modDate, seq ) {
            // 设置操作对象
            if (null === this.actions.sourceDoc) this.source = dNum ;
            
            //const annActn = this.actions[name];
            // 获取 dNum 的句柄
            let docInfo = this.get( dNum );
            if (undefined === docInfo) {
                // 需要添加它
                //this.actions.docs.set( dNum, {} );
                //docInfo = this.actions.docs[ this.actions.docs.push({}) -1];
                docInfo = this.actions.docs.set( dNum, {} ).get( dNum );
            }
            // 设置并跟踪最旧日期
            let modBase = this.actions.modBase || {};
            if ( !modDate || !modBase.date || modBase.date > modDate ) {
                this.actions.modBase = {doc: dNum, date: modDate};
            }

            return Object.assign(docInfo, this.getActionOb(state, dNum, modDate, seq));
        }
        // 向文档添加属性:值对
        addProp( dNum, prop ) {
            const docInfo = this.get( dNum );
            if (!docInfo) return;
            Object.assign( docInfo, prop );
            
            const keys = Object.keys(prop);
            if (keys.length < 2) { // 一个或没有
                return docInfo[keys[0]];
            } else {
                return docInfo;          
            }

        }
        // 使文档 dNum 成为源
        switchDoc( dNum ) {
            const annAction = this.actions;
            // 在 dest 和 conflict 中搜索以找到 dNum
            const inDest = this.get( dNum ); //annActn.dest ? annActn.dest.find( d => dNum == d.doc ) : null;
            if (!inDest) {
                if (_XUTIL_DEBUG_) console.println(`.switchDoc failed. Doc ${dNum} not found.`);
                return;
            }
            // 切换文档时，这是操作的映射
            // 格式: 'current action for this' : 'action for dNum source' : 'action this gets'
            //     如果 'this gets' 是数组，格式: [this is newer, same, this older]
            const actionMirror = {
                'new': { 
                    'new': 'delete',
                    'update': 'new',
                    'delete': 'delete', //is this possible?
                    'nochange': 'new'
                },
                'update': { 
                    'new': 'delete',
                    'update': ['update', 'nochange', 'update'], // 实际上第一个是：revert
                    //'delete': is this possible?
                    'nochange': 'update'
                },
                'delete': { // 可能是 delete 因为源更旧
                    'new': 'new', // ?? maybe?
                    //'update':
                    'delete': ['new','nochange','update'],
                    'nochange': 'delete'
                },
                'nochange': { 
                    'new': 'delete',
                    'update': 'update', // 实际上：revert
                    'delete': 'new',
                    'nochange': 'nochange'
                    
                }
            };
            // 新源的映射
            // 格式: 'newsource stat' : 'oldsource act'
            const nsourceMirror = {
                'new': 'delete',
                'update': 'update',
                'delete': 'new',
                'nochange': 'nochange'
            };
            
            // 获取旧源文档
            const oldSource = annAction.sourceDoc;
            // 获取新源状态
            const newSourceStat = this.get( dNum ).act;
            // 将镜像应用于 sourceDoc
            this.get( oldSource ).act = nsourceMirror[ newSourceStat ];
            
            this.source = dNum ;
            // **TODO** 将冲突从 newSource 移动到 oldSource
            if (this.get( dNum ).conf) {
                // 也许会破坏旧的 conf 属性？
                this.get( oldSource ).conf = this.get( dNum ).conf;
                delete this.get( dNum ).conf;
                let i = this.actions.conflict.indexOf( dNum );
                this.actions.conflict[i] = oldSource;
            }
            // 不确定这是否是处理它的正确位置
            for ( let [aN, d] of annAction.docs) {
                if (aN === oldSource) continue; // 旧源的操作已完成
                
                let newAct = actionMirror[ d.act ][ newSourceStat ];
                
                if (Array.isArray(newAct)) {
                    let dateDiff = d.modDate - this.get( dNum ).modDate;
                    //console.println('thisdate - newsourcedate = '+dateDiff);
                    if (Math.abs(dateDiff) <= TIMEFUZZ) {
                        newAct = newAct[1];
                    } else if ( dateDiff > TIMEFUZZ ) { // d 更新
                        newAct = newAct[0];
                    } else { // 更旧
                        newAct = newAct[2];
                    }
                }
                
                // debug
                //console.println( `Old '${d.act}' --> [${dNum}].act = '${newAct}'`);
                if (_XUTIL_DEBUG_ && undefined === newAct) console.println( `Error: Map fails for old '${d.act}' --> [${dNum}].act = '${this.get( dNum ).act}'`);
                
                d.act = newAct;
            }
                 
        }
        // 将 dNum 添加到冲突列表，并将 conf 添加到文档信息
        //  conf 是冲突类型，dNum 是 openDocs[] 上的索引
        // 旧: {conf} 是要添加到冲突的属性 - 应该有一个 conf 属性
        addConflict( dNum, conf ) {
            
            // 获取文档操作或添加一个空操作
            const docActs = this.get( dNum ) || this.addAction( dNum );
            docActs.conf = conf;
            // 推入冲突
            if (!this.actions.conflict) this.actions.conflict = [];
            // 查看它是否已在列表中
            if (!this.actions.conflict.includes( dNum )) {
                this.actions.conflict.push(dNum);
            }
        }
        // 从数组中删除冲突 - confNum 是冲突的索引
        deleteConflict( confNum ) {
            const data = this.actions;
            // 从文档中删除
            delete data.docs.get( data.conflicts[ confNum ]).conf;
            // 从数组中删除
            data.conflicts.splice( confNum, 1 );
            // 如果为空，则删除冲突数组
            if (!data.conflicts.length) delete data.conflict;
        }
        // 这只是被推入 docs 的对象
        getActionOb(stat, doc, modDate, seq, conf) {
            if (conf) {
                return {stat, doc, modDate, seq, conf};
            } else {
                return {stat, doc, modDate, seq};
            }
        }
    }
    // 页面合并操作存储
    // 使用注释合并操作存储类
    // *TODO* 也许应该比较注释的名称和类型，或者制作名称-类型的组合以减少比较不同注释的机会。如果名称-类型相同，至少可以更新其中一个以匹配。否则，如果类型不同，则更新将失败。
    class PageMergeAction {
        // 操作的对象格式：
        // 'annotation name': instance of AnnotMergeAction() { }
        
        // 页面操作
        pgActions = {}; // jshint ignore: line
        constructor() {
        }
        // 获取操作
        get( name ) {
            return this.pgActions[name]; 
        }
        // 获取所有操作
        getAll() {
            return this.pgActions;
        }
        // 添加注释
        add( name ) {
            this.pgActions[ name ] = new AnnotMergeAction();
            return this.pgActions[ name ];
        }
        // 将所有状态 --> 转换为操作
        stateToAction() {
            //源状态: { this state : this action or conflict }
            // 冲突的操作是选项2（使用最新）的操作
            const actionMap = {
                'delete': { 
                    'delete':   { act: 'delete'},
                    'none':      { act: 'nochange'}, // 它在这个文档中不存在
                    'update':   { conf: 'moddel', act: 'delete'},
                    'nochange': { act: 'delete'}, // 不知何故这个修改日期比另一个注释新，但却是 nochange - 也许状态应该被认为是 'update'
                },
                //'none': { // 我认为源不能有这个状态 - none 没有注释（或者显然没有 modDate）所以永远不可能是源
                //    'delete': { conf: 'moddel'},
                //    'none': { act: 'new'},
                //    'update': { conf: 'modboth'},
                //    'nochange': { act: 'update'} //源获得了同一注释名称的更新版本
                //},
                'update': { 
                    'delete':   { conf: 'delmod', act: 'update'},
                    'none':     { act: 'new'},
                    'update':   { conf: 'modboth', act: 'update'},
                    'nochange': { act: 'update'}
                },
                'nochange': { //? 如果上面更改了，也许不可能 -- 所有操作与 update 相同
                    'delete':   { conf: 'delmod', act: 'update'},
                    'none':     { act: 'new'},
                    'update':   { conf: 'modboth', act: 'update'},
                // @todo? 取决于相对于源 modDate 的 modDate？
                    'nochange': { act: 'nochange'}
                }
            };
            //? 如果上面更改了，也许不可能 -- 所有操作与 update 相同
            // 源永远不应该是 'nochange'，除非所有具有相同 modDate 的其他文件也是 'nochange'
            //actionMap.nochange = actionMap.update;
            
            // 更新所有状态 -> 操作
            for (const nK in this.pgActions) {
                const annAct = this.pgActions[nK];
                
                // 处理源上的 'nochange' @TODO 应该移出这个方法
                if ('nochange' == annAct.source.stat) {
                    // 如果它比 modBase 更新，那么它是 update
                    // 如果其中一个操作是 'new'，那么它是 update
                    // annAct.modBase.date 将是 undefined 如果有新的操作
                    if (!annAct.modBase.date || (annAct.source.modDate - annAct.modBase.date) > TIMEFUZZ) {
                        annAct.source.stat = 'update';
                        //console.println('changed to update because newer than modBase')
                    } else {
                        // 检查是否有 'nochange' 以外的状态
                        const sMod = annAct.source.modDate;
                        
                        // 只在目标文档中查看具有相同 modDate 的 'nochange' 操作
                        let ncActs = false;
                        for (const d of annAct.dest) {
                            if (!d.modDate || (sMod - d.modDate) > TIMEFUZZ || ('nochange' !== d.stat && Math.abs(d.modDate - sMod) <= TIMEFUZZ)) {
                                ncActs = true;
                                break;
                            }
                        }
                        //console.println(`${ncActs}: change to update because it's newer than modbase?`)
                        if (ncActs) annAct.source.stat = 'update';
                    }
                }
                // 不需要更改源
                annAct.source.act = 'nochange';

                for ( const docD of annAct.dest ) {
                    // 如果它比 modBase 更新，则不能是 'nochange'
                    // @TODO 应该移出这个方法
                    if ('nochange' == docD.stat && (!annAct.modBase.date || (docD.modDate - annAct.modBase.date) > TIMEFUZZ )) {
                        docD.stat = 'update';
                    }
                    // @debug
                    if (_XUTIL_DEBUG_ && !actionMap[ annAct.source.stat ]?.[ docD.stat ]) {
                        console.println( __( 'Error: Could not get action for source annot state "%1" and this annot state "%2".', 'xutil', annAct.source.stat, docD.stat));
                        console.println( __( 'Source modDate: %1\nDest modDate: %2', 'xutil', annAct.source.modDate, docD.modDate));
                    }
                    
                    //  获取冲突或操作
                    const actConf = actionMap[ annAct.source.stat ]?.[ docD.stat ] || {};
                    // 应用于此文档
                    if ( actConf.conf ) {
                        // 必须使用方法
                        annAct.addConflict( docD.doc, actConf.conf );
                    }
                    // 从状态添加操作
                    docD.act = actConf.act;
                }
            } 
        }
    }
    
    // 返回所有合并操作的数组
    function getDialogActionList( allMergeActions, listAll = true ) {
        const confList = [];
        const nPages = allMergeActions.length;
        
        for (let p = 0; p < nPages; p++) {    
            const pageActions = allMergeActions[p];

            for ( let annotName in pageActions) {
                // pageActions 是一个通用对象
                const annotActions = pageActions[annotName];
                
                //let {act, docs, modDate, conflict} = pageActions.get( annotName );
                //let {docs} = annotActions.actions;
                // **todo** 如果此合并有任何冲突，它们都应该被列出？
                
                const sourceDoc = annotActions.source.doc;
                let sourceAnnot = openDocs[sourceDoc].getAnnot( p, annotName );

                for (let [,d] of annotActions.actions.docs) {
                    let {doc, modDate, conf, act, stat} = d;
                    
                    // 不要为源文档添加行
                    if (doc === sourceDoc) continue;
                    // 不要为 'nochange' 添加行
                    if ( options.skipNoChange && 'nochange' === act) continue;
                    
                    // 检查其他文档是否有冲突 - 返回所有冲突的数组
                    if (!conf) {
                        conf = annotActions.conflicts;
                        if (conf) conf = conf.map( d => d.conf );
                    }
                    // 最小的合并选项起决定作用
                    let mergeOpt = Array.isArray(conf) ?
                        Math.min( ...conf.map( c => options[c])) :
                        options[conf] ?? 2; // 无冲突时使用最新
                    
                    let docAnnot = openDocs[d.doc].getAnnot( p, annotName );
                    
                    if (!docAnnot) {    // 可能是一个新操作，所以没有注释
                        docAnnot = sourceAnnot;
                        // debug
                        if (_XUTIL_DEBUG_ && !sourceAnnot) {
                            console.println('No annotations in ' + d.doc + ' or ' + sourceDoc + ' annot:' + annotName );
                            console.println(JSON.stringify(annotActions.actions, mapReplacer));
                        }
                    }
                    
                    let {type, intent, author, subject} = docAnnot || {}; // || {type:'',intent:''};
                    // 需要获取冲突作者
                    //c.author = openDocs[c.doc].getAnnot( p, annotName ).author;
                    // 如果为此冲突 'ask'，则添加
                    if ( conf || listAll || 0 === mergeOpt ) {
                        // 在 pageActions 上创建 merge 属性
                        if (!d.merge) d.merge = mergeOpt;
                        
                        confList.push( {
                            action: act,
                            state: stat,
                            page: p,
                            annotName,
                            type: type + (intent && intent != type) ? ' ' + intent : '',
                            subject: subject,// || sourceAnnot.subject,
                            author,
                            modDate,
                            sourceDoc,
                            sourceMod: sourceAnnot?.modDate ?? modDate, // 可能是删除操作，所以没有源
                            sourceAuthor: sourceAnnot?.author ?? '',
                            sourceState: annotActions.source.stat,
                            doc, // 页面操作内的索引
                            conf, // 可能是数组
                            docData: d,
                            mergeParent: annotActions, // 这是合并信息
                            path: openDocs[ doc ].path,
                            sourcePath: openDocs[ sourceDoc ].path
                            });
                        // keep track
                        //mergeList.set(doc, true);
                    }
                }
            }
        }
        return confList;
    }

    // 缩放视图到注释
    function zoomAnn( annot, zFactor = 0.5, sourceDoc = null ) {
        if ( !annot?.doc && !sourceDoc) return;
        
        if ( !sourceDoc ) sourceDoc = annot.doc;
        
        sourceDoc.bringToFront();

        let pr = sourceDoc.pageWindowRect;
        let annBox = annot.rect;

        let coords = [(annBox[2] + annBox[0])/2, (annBox[3] + annBox[1])/2];
        let zm = [(pr[2] - pr[0])/(annBox[2] - annBox[0]), (pr[3] - pr[1])/(annBox[3] - annBox[1])];

        zm = Math.min( ...zm.map( z => Math.abs(z)));

        sourceDoc.pageNum = annot.page;
        sourceDoc.zoom = zm * zFactor * 100;
        sourceDoc.scroll(...coords);
    }

    
    // 来自 https://alexwlchan.net/2023/preserved-dates/ 的 JSON 替换和恢复函数
    const jsonDateReplacer = function (key) {
      return (this[key] instanceof Date) ?
        {
            value: this[key].toISOString(),
            type: 'Date',
        }
        : this[key];
    };
    const jsonDateReviver = function (key, value) {
      if (
        value !== null &&
        typeof value === 'object' &&
        Object.keys(value).length === 2 &&
        Object.keys(value).includes('type') &&
        Object.keys(value).includes('value') &&
        value.type === 'Date'
      ) {
        return new Date(value.value);
      } else {
        return value;
      }
    };
    // 用于 Map 的 JSON 替换函数
    const mapReplacer = function(key, value) {
        return (value instanceof Map) ? [...value] : value ;
    };
        
    // 如果存在，则获取先前的合并数据
    // - 合并数据是具有以下属性的对象：
    //      pages: 按页码组织，然后以注释名称为键的数组（也许保留为具有 name 属性的单个对象），
    //   具有属性：修改日期、创建日期、类型、合并日期

    const mergeData = {
        dataList:[],
        add(data) {
            this.dataList.push(data);
        },
        get() {
            // 也许应该返回一个副本？
            return this.dataList;
        },
        hasData(dNum) {
           return this.getDoc(dNum).length > 0;
        },
        getDoc(dNum) {
            return this.dataList[dNum] || [];
        },
        getPage(dNum, page) {
            return this.dataList[dNum].pages?.[page] || {};
        },
        delete(dNum, page, aName) {
            let doDelete = (this.dataList[dNum].pages && 
                this.dataList[dNum].pages[page] &&
                this.dataList[dNum].pages[page][aName]);
            
            if (doDelete) delete this.dataList[dNum].pages[page][aName];

            return doDelete;
        },
        edit(dNum, page, aName, value) {
            if (!this.dataList[dNum]) this.dataList[dNum] = [];
            if (!this.dataList[dNum].pages) this.dataList[dNum].pages = [];
            if (!this.dataList[dNum].pages[page]) this.dataList[dNum].pages[page] = {};
            this.dataList[dNum].pages[page][aName] = value;
        }
    };
        
    const docLogs = [];
    
    for (let d of openDocs) {
        // 可以遍历 .dataObjects 属性并查找，但 try catch 更容易
        let data;
        try {
            data = util.stringFromStream( d.getDataObjectContents( MERGEDATANAME ));
            data = JSON.parse(data, jsonDateReviver);
        } catch(e) {
            // 如果没有数据对象则失败
            data = {};
        }
        // 转换为数组并添加到 mergeData 数组
        mergeData.add( data );
    }
    
    ///////////////////////////////////////////////
    // 一次一页地遍历文档
    ///////////////////////////////////////////////
    // *TODO* 处理单页，或添加/删除/移动的页面
    let nPages;
    for (let d of openDocs) {
        if (nPages && nPages !== d.numPages) {
            if (2 === app.alert({
                cMsg: __('仅将合并前 %1 页。\n%3 中的页数 (%2) 与其他文档不匹配！\n\n按“取消”取消合并。', 'xutil', Math.min(nPages, d.numPages), d.numPages, d.path),
                nIcon: 0,
                nType: 1,
                cTitle: __('合并警告！', 'xutil'),
                oDoc: d
                })) {
                return 'Cancelled: Page number mismatch.';
            }
        }
        nPages = nPages ? Math.min(nPages, d.numPages) : d.numPages;
    }
    
    const allMergeActions = [];
    
    ///////////////////////////////////////////////////////////
    // 第一次遍历文档以建立操作列表
    ///////////////////////////////////////////////////////////
    for (let p = 0; p < nPages; p++) {
        // 操作按 page.annotName.documentNo.actionData 组织
        // 属性是 act, modDate, doc, conflict
        // 操作是 update, nochange, new, delete
        //  也许应该是 'action'，这是需要应用于此注释的操作 'update'(/revert), 'delete', 'nochange', 'new'
        //      和 'state'，它描述了自上次同步以来此注释发生了什么 'delete'(d), 'update'(d), 'nochange', 'new'
        
        // 冲突是：
        //  delmod: 删除后被修改
        //  moddel: 修改后被删除
        //  modboth: 两个文档都修改了
        //  newboth: 两个文档都添加了同名的注释
        const mergeActions = new PageMergeAction();
        
        // 构建操作（状态）列表
        
        for (let dNum = openDocs.length; dNum--; ) {
            const anns = openDocs[dNum].getAnnots(p) || [];
            
            //console.println(openDocs[dNum].path)
            //console.println(anns.length)
            // 获取此页的合并数据
            const pgMergeData = mergeData.getPage( dNum, p);
            // 检查是否已查看此注释
            const annList = new Set();
            ////////////////////////////////////////
            // 首先遍历页面注释
            ////////////////////////////////////////
            for (let a of anns) {
                let state;
                // 尝试获取此注释的数据
                let prevMgDa = pgMergeData[a.name];
                
                // 如果注释 modDate 与 mergeDate 匹配，则假设我们需要使用合并数据文件中的 modDate
                // 当前修改日期
                let cmd = (prevMgDa?.modDate && prevMgDa.mergeDate && Math.abs(prevMgDa.mergeDate - a.modDate) <= TIMEFUZZ) ? prevMgDa.modDate : a.modDate;
                //console.println(`Doc ${dNum} modDate: ${cmd}`);
                
                // 获取页面上的序列号
                let seq = a.seqNum;
                
                ////// 获取此文件的状态
                if (prevMgDa) {
                    // 好的，我们有合并数据
                    
                    // *TODO* 如果 prevMgDa.modDate 损坏，它将无法正确比较
                    //console.println( a.name + ':(cmd - prevMgDa.modDate) = ' + (cmd - prevMgDa.modDate) + ' = ' +prevMgDa.modDate+' - '+cmd)
                    //console.println(JSON.stringify(prevMgDa))
                    if ( (cmd - prevMgDa.modDate) > TIMEFUZZ ) { // prevMgDa.modDate < cmd
                        state = "update";                        
                    } else {
                        state = "nochange"; // 在此文档上只是没有更改
                    }
                } else {
                    // 没有此注释的记录
                    // *TODO* 如果没有数据文件，也许我们假设 "nochange"？
                    if (mergeData.hasData( dNum )) {
                        // 如果某个东西因为不在数据文件中而被检测为 'new'，它应该被赋予 'update' 作为状态
                        state = "update";
                    } else {
                        state = "nochange";
                    }
                }
                
                ////// 将状态添加到操作
                let savedAction = mergeActions.get( a.name ); //.actions[a.name];

                if (!savedAction) {
                    // 需要添加一个操作？
                    savedAction = mergeActions.add( a.name );
                    //console.println('Added '+a.name);
                }
                
                //console.println('resulting action: '+state)
                
                // 将操作（状态）添加到列表
                savedAction.add( dNum, state, cmd, seq);

                // 跟踪注释
                annList.add(a.name);
                //console.println(`Annot ${a.name} state is: ${state} because mergeDate: ${prevMgDa?.mergeDate} prev modDate: ${prevMgDa?.modDate} curr modDate: ${a.modDate}`);
            }
            
            ////////////////////////////////////////
            // 然后遍历页面合并数据以查看是否有任何删除
            ////////////////////////////////////////
            for (let n in pgMergeData) {
                // key n 是注释名称
                if ( !annList.has(n)) {
                    // 此注释在此文档中已被删除
                    // 这意味着 'delete others'，所以也许应该标记其他？
                    //console.println(JSON.stringify([n, dNum, "delete", pgMergeData[n].mergeDate]))
                    let annAction = mergeActions.get(n) || mergeActions.add(n);
                    // mergeDate 用作删除的时间 - 但它发生在 mergeDate 和现在之间的某个时间
                    annAction.add( dNum, "delete", pgMergeData[n].mergeDate);
                }
            }
        }
        ////////////////////////////////////////
        // 添加 'none' 状态 - 注释不存在
        ////////////////////////////////////////
        for (let n in mergeActions.getAll()) {
            for (let dNum = openDocs.length; dNum--; ) {
                let annAction = mergeActions.get(n);
                if (!annAction.get(dNum)) {
                    // 只添加操作 - 它不能是源
                    annAction.addAction( dNum, "none" );
                }
            }
        }
        

        /////////////////////////////////////////////////////
        // 此时，所有“操作”实际上都是“状态”
        // 下一步是使它们成为每个文档上的操作
        /////////////////////////////////////////////////////

        // @debug
        if (_XUTIL_DEBUG_) {
            console.println(JSON.stringify(mergeActions.getAll(),mapReplacer,2));
        }

        ////////////////////////////////////////
        // 将所有状态转换为操作
        ////////////////////////////////////////
        mergeActions.stateToAction();
        
        ////////////////////////////////////////
        // 保存为此页面生成的操作
        ////////////////////////////////////////
        allMergeActions.push( mergeActions.getAll() ); // 删除页面合并类
    }
    
    //////////////////////////////////////////////////
    // 开始处理冲突
    //////////////////////////////////////////////////
    for (let p = 0; p < nPages; p++) {
        const pageActions = allMergeActions[p];
        
        if (_XUTIL_DEBUG_) {
            console.println(JSON.stringify(pageActions,mapReplacer,2));
        }
        // 一些 mobo 冲突可以解决（不同的属性已更改）
        // 这需要为所有情况运行，因为它向操作添加了 mod 属性
        for (let annotName in pageActions) {
            const action = pageActions[annotName];
            let clearConflict = action.conflicts;
            
            // 将所有冲突输出到控制台
            if (clearConflict && _XUTIL_DEBUG_) {
                // 遍历冲突
                for (let cflt of clearConflict) {
                    //const cflt = action.get(c);
                    console.println(`Annot ${annotName} conflict ${cflt.act} >> ${cflt.conf}`);
                }
            }
            ///////////////////////////////
            // 尝试清除 modboth 冲突
            ///////////////////////////////
            
            if (clearConflict) clearConflict = clearConflict.some( a => 'modboth' == a.conf );
            
            // 跳过其余部分
            if (!clearConflict) continue;
            
            ///////////////////////////////////////////////////////////////////////////
            /************TODO*** 逻辑需要重新思考
            ///////////////////////////////////////////////////////////////////////////

            // 设置变量以检查修改的属性
            //let clearConflict = Array.isArray(confActs);
            //if ('update' === action.act) { // ********* 错误 ****** 应该直接查看文档属性
            // 获取更改的属性
            const sourceAnn = openDocs[ action.source.doc ].getAnnot( p, annotName );
            // 可以使用通用对象，但 Map 对我来说又新又闪亮
            const modPrCk = new Map();
            
            // *** 向操作添加 mod 属性 ***
            if (!action.mod) action.mod = {};

            //for (let destDocNum = 0; destDocNum < openDocs.length; destDocNum++ ) {
            //for (let d = 0; d < action.docs.length; d++ ) {
            for (let d = openDocs.length; d--;) {
                const actDoc = action.get(d);
                let mod;
                //let d = actDoc.doc;
                //let actDoc = action.get( d );
                //let destDocNum = actDoc.doc;
                if (action.sourceDoc === actDoc.doc) {
                    // modDate 可能需要更新
                    if (WRITEMODDATE) mod = {modDate: actDoc.modDate};
                } else {
                    //console.println(openDocs[destDocNum].path)
                    const destAnn = openDocs[actDoc.doc].getAnnot( p, annotName );
                    // 是否存在 'update' 时它在一个文档中不存在的情况？
                    mod = getAnnotProps( sourceAnn, destAnn );
                }

                
                // 检查这些属性是否在其他文档上更改
                //let modKeys = mod ? Object.keys(mod) : [];
                // 如果是，则仍然存在冲突
                if (clearConflict && mod) {
                    for (let p in mod) {
                        if (modPrCk.has(p) && modPrCk.get(p) != mod[p]) {
                            if (WRITEMODDATE && 'modDate' == p) {
                                if (modPrCk.get(p) < mod[p]) modPrCk.set(p, mod[p]);
                            } else {
                                console.println(openDocs[d].path+' stopped because second '+p+':'+mod[p])
                                clearConflict = false;
                                break; // 无需继续
                            }
                        } else {
                            console.println(openDocs[d].path+' adding '+p+':'+mod[p])
                            modPrCk.set(p, mod[p]);
                        }
                    }
                }
                // 更新 mod 属性
                if (clearConflict) {
                    if (mod) Object.assign( action.mod, mod );
                } else {
                    // 删除 mod 属性并退出循环
                    delete action.mod;
                    break;
                }
                
            }
                
            if (clearConflict) {
                // 可以清除 'modboth' 冲突
                const confList = action.conflicts;
                for (let c = confList.length; c-- ; ) {
                    //const confDoc = action.get( confList[c] );
                    if ('modboth' == action.get( confList[c] ).conf) {
                        action.deleteConflict( c );
                    }
                }

            }
            *********************************************/
        }   
    }
    //////// 冲突选项
          // 0 - 询问
          // 1 - 跳过合并
          // 2 - 使用最新
          // 3 - 使用最旧
    //const conflictOptions = { delmod, moddel, modboth, newboth }
    
    /////////////////////////
    // 为 'use oldest' 情况更新冲突
    /////////////////////////
    for (let p = 0; p < nPages; p++) {
        const pageActions = allMergeActions[p];
        for ( const aN in pageActions) {
            const aAct = pageActions[aN];
            for (let [, docAct] of aAct.actions.docs) {
                let mergeAct = options[docAct.conf]; // 也许未定义
                // 可能在对话框中被覆盖
                //if ( undefined !== docAct.merge ) mergeAct = docAct.merge;
                // **TODO******** 如果有多个冲突，最后一个将起作用，所以也许这应该作为初始构建操作的一部分？？？
                if (3 === mergeAct) {
                    aAct.switchDoc( docAct.doc );
                }
            }
        }
    }
    
    /////////////////////////
    // 运行冲突对话框
    /////////////////////////
    // 为询问选项设置对话框
    conflictDialog.mergeActions = allMergeActions;
    conflictDialog.conflicts = getDialogActionList( allMergeActions, options.askAllMerge );

    if (conflictDialog.conflicts.length) {
    
        // 运行对话框
        if ('ok' !== app.execDialog(conflictDialog)) return __("用户取消了合并！", "xutil");
    }
    
    //////////////////////////////////////////////////
    // 现在遍历操作并执行操作
    //////////////////////////////////////////////////
    for (let p = 0; p < nPages; p++) {
        const pageActions = allMergeActions[p];
        //console.println('updating documents...');
        // 操作键是注释名称
        // 应该按 seqNum 顺序进行
        const actionSeq = [];
        for ( let n in pageActions) {
            actionSeq.push( {name: n, seq: pageActions[n].seq} );
        }
        // 升序排序
        actionSeq.sort( (a,b) => a.seq - b.seq );
        for (let aN of actionSeq) {
            const aName = aN.name;
            const ann = pageActions[aName];
            // 对于每个文档，应用操作
            
            // ********TODO************
            // 最后更新的文档应该是当前文档？
            // 如果我们有四个文档，如何指示哪个被复制到另一个？
            // doc 1 是最新的
            // doc 2 复制到 doc 1
            // doc 3 复制到doc1？？？没有意义
            //    也许复制到 doc1 的文档现在占主导地位并复制到所有其他文档？即你在操作中交换 doc2 和 doc1 的位置。然后需要为冲突重新制作字符串。
            
            const sourceIndex = ann.source.doc;
            //console.println( 'working on '+aName+'\n'+JSON.stringify(ann));
            
            //for (let dNum = openDocs.length; dNum--; ) {
            for (const [dNum, docAct] of ann.actions.docs) {
                const LOG = docLogs[dNum] ?? ( docLogs[dNum] = [] ); 
                
                //const dNum = docAct.doc;
                //const d = openDocs[dNum];
                //console.println(dNum + ' ' + ann.act)
                // 为 mergedata 保存
                let savedData = mergeData.getPage( dNum, p )[aName];//mergeData[dNum].pages?.[p]?.[aName];
                let results;
                
                ///////////////////////////////////////
                // 执行操作
                ///////////////////////////////////////
                //console.println('\nresults: '+ aName);
                //console.println('action: '+ ann.act);
                
                // 获取文档操作
                //const docAct = ann.get( dNum );
                //console.println('doc:'+dNum+'\n'+JSON.stringify(docAct));
                
                // 有一些操作，不是源文档
                if (sourceIndex !== dNum ) { 
                    // **TODO** 仍然成立吗？：即使 'nochange' 也必须查看操作，以防它对于此文档是新的
                    
                    //////// 冲突选项
                    // 0 - 询问
                    // 1 - 跳过合并
                    // 2 - 使用最新
                    // 3 - 使用最旧
                    
                    /// 冲突适用于文档中的所有项目
                    let mergeAct = options[docAct.conf]; 
                    if (!mergeAct && ann.conflicts) {
                        mergeAct = Math.min( ...ann.conflicts.map( c => options[c]));
                        //ann.conflicts.reduce( (acc, dc) => {
                        //let r = options[dc.conf];
                        //return r < acc ? r : acc; }, options[ann.conflict[0]]);
                    }
                    // 可能在对话框中被覆盖
                    if ( undefined !== docAct.merge ) mergeAct = docAct.merge;
                    
                    let action = {
                        act: docAct.act,
                        page: p,
                        name: aName,
                        actionDate: docAct.modDate };
                    
                    let sourceDoc = openDocs[ sourceIndex ];
                    let destDoc = openDocs[ dNum ];
                    
                    if (1 == mergeAct) { // 也许未定义 --> 默认是 2
                        console.println( __( 'Merge skipped for: %1', "xutil", JSON.stringify(action)));
                        docAct.act = 'skip';
                    } else {
                        // @debug
                        if (_XUTIL_DEBUG_) console.println('Action ' +JSON.stringify(action, mapReplacer)+ ` source #${sourceIndex} dest #${dNum}`);
                        
                        results = applyAnnotUpdate( action, sourceDoc, destDoc );
                    }
                    
                    // *TODO* 添加更好的结果日志记录
                    if (results) {
                        LOG.push( new Date().toISOString() + '\n' + JSON.stringify( Object.assign( {doc: openDocs[dNum].path, docID: openDocs[dNum].docID }, action, results), null, 2) );
                    }
                } else { // 源文档
                    // 为 ann.doc 更新结果 / mergeData
                    //console.println('the action item')
                    // *****TODO****** 这应该是 'props'？
                    if (savedData) { // && 'update' === docAct.act
                        // 更新修改日期，以便下次不标记为 'update'
                        results = {
                            modDate: ann.modDate,
                        };
                    }
                    // 'new' 将没有结果，因为这是新的（在 mergeData 中也没有数据）
                }
                //console.println(JSON.stringify(results,null,2));
                
                ///////////////////////////////////////
                // 更新合并数据
                ///////////////////////////////////////
                // @todo: 也许应该使用结果来确定是否为 'delete', skipped 更新 mergeData
                if ('delete' === docAct.act) {
                    // 项目已删除，因此从数据中移除
                    mergeData.delete(dNum, p, aName);
                    
                } else if (results) {
                    // 更新合并数据
                    mergeData.edit(dNum, p, aName, Object.assign({}, savedData, results));
                    
                } else if (!savedData) { // 它不在 mergeData 中，并且没有更改 - 只需要添加到 merge data
                    // 获取注释
                    const annot = openDocs[dNum].getAnnot( p, aName );
                    //let annot = destAnns.find( a => a.name == aName);
                    
                    // 对于被跳过的 'new' 操作，注释可能不存在
                    if (annot) {
                        const newValue = {
                            type: annot.type,
                            modDate: annot.modDate,
                            creationDate: annot.creationDate,
                            mergeDate: new Date()
                            };
                        
                        mergeData.edit(dNum, p, aName, newValue);
                    }
                }
                //console.println(`Saved to mergeData[${dNum}].pages[${p}][${aName}]:\n` + JSON.stringify(mergeData[dNum].pages[p]?.[aName]));
                //console.println(`doc ${dNum} done: ` + JSON.stringify( mergeData ))
            }
        }
    }
    
    //////////////////////////////////
    // 保存合并数据
    //////////////////////////////////
    //console.println('saving merge data...');
    for (let dNum = openDocs.length; dNum--; ) {
        const data = Object.assign( {},
            mergeData.getDoc(dNum),
            {log: docLogs[dNum]} );
        let dataStr = JSON.stringify( data, jsonDateReplacer );
        // 查看数据对象是否存在
        const dobjs = openDocs[dNum].dataObjects;
        if ( dobjs?.some( e => e.name === MERGEDATANAME ) ) {

            openDocs[dNum].setDataObjectContents( {
                cName: MERGEDATANAME, 
                oStream:  util.streamFromString(dataStr, "utf-8")
                });
            if (_XUTIL_DEBUG_) console.println(`Updated data object in doc ${dNum} : `);

        } else if (options.addMergeData) {
            // 添加数据对象
            openDocs[dNum].createDataObject({ cName: MERGEDATANAME,
                cValue: dataStr,
                cMIMEType: "text/plain"});
            if (_XUTIL_DEBUG_) console.println(`Created data object in doc ${dNum} : `);
        }
    }

    
    // 保存并关闭已打开的文档
    for (let d of openDocs) {
        if (d.hidden) {
            // 需要特权函数来保存
            saveDoc(d, options.closeDoc);
        }
    }
    
    //if (_XUTIL_DEBUG_) console.println(LOG);
    return __('合并完成。', 'xutil');
  };
})();

// @debug
//_XUTIL_DEBUG_ = true;
//mergeDocComments();
