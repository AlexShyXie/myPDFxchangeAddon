/** View Navigator: 视图导航器
  *
  * @author Mathew Bittleston
  * @license MIT
  * @version 1.1
  *
  * 【核心功能】
  * 这个脚本允许你保存PDF文档的当前“视图状态”（包括页码、缩放级别和页面位置），
  * 并可以随时快速返回到任何一个已保存的视图。这比传统书签更强大，因为它记录了
  * 完整的视觉状态，而不仅仅是页码。
  *
  * 【主要用法】
  * 1. 保存当前视图:
  *    - 快捷键: `F5`
  *    - 菜单: View -> Saved Views -> Save View
  *    - 将你当前所在的精确位置（页码+缩放）保存到列表中。
  *
  * 2. 返回上一个视图:
  *    - 快捷键: `Ctrl+F5`
  *    - 菜单: View -> Saved Views -> Back [N]
  *    - 立即跳转回最近一次保存的视图，并将其从列表中移除。可连续使用。
  *
  * 3. 管理所有视图:
  *    - 快捷键: `Ctrl+Shift+F5`
  *    - 菜单: View -> Saved Views -> Select...
  *    - 打开一个管理窗口，你可以查看、跳转、删除、重排序所有已保存的视图，
  *      也可以在不同打开的PDF之间切换管理。
  *
  * 【高级设置】
  * 在管理窗口 (`Ctrl+Shift+F5`) 的左上角下拉菜单中，可以配置：
  * - 避免保存重复视图。
  * - 开启“自动添加视图”模式：当你翻页或缩放的幅度超过设定阈值时，自动保存视图。
  * - 设置自动保存的“翻页阈值”和“缩放阈值”。
  *
  * History<pre>
  * v1.1  2025-10-30  option to automatically add when zoom/page changed by certain amount; add dropdown for options; fix some dialog issues; avoid adding duplicate views
  * v1.0  2025-10-29  Add keyboard shortcuts; export translation strings domain 'viewNavigator'; add custom icons
  * v0.2  2025-10-28  Add menu (would work better as an async dialog)
  * v0.1  2025-10-27  Initial version</pre>
  *
  * @todo save the views in doc.info along with the document
**/

/* globals __:true */
// in case no 1ang.js
if ('undefined' === typeof __ ) __ = (t,d,...args) => (args || []).reduce( ( a, r, i) => a.replace( new RegExp('(^|[^%])%' + (i+1), 'g'), '$1'+r), t);

var viewNavigator = (function() {
    /////////// private variables ///////////
    // trusted function to access global variables
    class GlobalVals {
        // holds the default prefs
        //values;
        constructor(name, defaults) {
            this.load = app.trustedFunction(() => {
                app.beginPriv();
                if ( null != global[name]) return JSON.parse( global[name]);
            });
            this.save = app.trustedFunction( value => {
                app.beginPriv();
                global[name] = JSON.stringify( value );
                global.setPersistent( name, true);
            });
            this.values = defaults;
        }
        
        get() {
            return Object.assign( this.values, this.load() );
        }
        set(newValues) { // can just save partial object
            this.save( Object.assign( this.load() || {}, newValues ));
        }
    }
    // method to get or set preferences
    const PREFS = new GlobalVals( 'viewNavigator', {
        autoSet: false, // automatically save a view when jump is larger than factors
        pgChange: 1, // number of pages
        zmChange: 3, // factor on zoom increase or decrease
        addUnique: true, // only add unique views
        //saveToDoc: false, // save the views in doc.info
    });
    let vnPrefs = PREFS.get();
    // save the views by document
    const savedViews = new WeakMap();
    // not sure when PXE started allowing changing the menu on the fly, so pre build 393 will just make this static
    const useStatic = ('object' === typeof app.pxceVersion && app.pxceVersion[3] < 393);
    // currently active documents
    const activeDocs = app.trustedFunction( () => {
        app.beginPriv();
        return app.activeDocs;
    });
    // auto-set interval
    let aSetInterval;
    // last recorded view by auto-set
    const lastView = new WeakMap();
    
    
    /////////// add menu items ///////////
    app.addSubMenu( {
        cName: 'viewNavigator',
        cUser: __("Saved Views", 'viewNavigator'),
        cParent: "View",
        nPos: "GoTo",
        cRbParent: "View", // ribbon
        nRbPos: "rbar.view.goto",
        bNewRbGroup: true,
        nRbGroupStyle: 2,
        bPrepend: false
    });
    var myIconEdit = {count:0, width:48, height:48, read:function(nBytes=this.data.length/2){return this.data.slice(this.count,this.count+=2*nBytes);}, data:(a=>{let[b,c]=a.split(":");c=c?.match(/.{8}/g);let d=(a,b)=>a.replace(/./g,a=>parseInt(a,10+b)-b);return b.replace(/([g-p]+)([0-9a-f]+|[q-z]+)/gi,(a,b,e)=>(/[q-z]/.test(e)?c[d(e,26)]:e).repeat(d(b,16)));})("poqhgrhmqhgrhiqhgrhmqhgrhiqirpqmvhnqirhiqirnqhgvhlqirhiqirjqirhkvhgqhgrnqirjqhrhmvpqhgrnqirjqmvmslvhwhhqirjqirnqiriqlvhgsivjwhgqirjqirnqirhqlvkskykskwhgqirjqirnqirhqkvjsoyjskwpqhirlqjvjsjyjzixiyjsjwhhqhgrkqjvksiyjzhxishxhyjskwhjqirjqirkqjvjsiykzhxishxiyjsjwhjqirjqirkqivksiylzixhrqiyksiwhjqirjqirkqivksiyjzlrqiyksiwhoqirkqjvjsiyizmrqiyjsjwhoqirkqjvksiymrqiyjskwhoqirlqjvjsjykrqjyjsjwhpqirlqkvjsoyjskwhpqirmqkvkskykskwioqkvhwhgslwipqivkwmsmwjhqhmwhgqkthpqhkwoqhgthnqhhwoqhkthoqmwpqhmtjhqktishgtiuipqlthxisotkukqiriiqltixismtlukqirihqmtixksjtnujqirihqmtjxkshtoujqirigqntjxmsouiqirjqirhlqntkxmsnuiqirjqirhlqntlxnsluiqirjqirhlqntlxoskuiqirjqirhlqntmxosjuiqhgrhiqntnxnsjuiqhirhhqmtmxhguoqirjqirhhqmtlxhhuoqirjqirhiqkthukxhhupqhgrpqjtiujxhiupqhgrhgqhtjujxhhuhlqirhkqjuixhhuhmqirhlqhkuhnqirhnqhguhpqhgrhiqkuhgq:00000000FF42A5F5FFFFFFFFFF9CC671FF7CB342FFB1B1B1FF989898FFEFEFEFFF7E5D00FF3F3F3FFF000000")};
    var myIconAdd = {count:0, width:48, height:48, read:function(nBytes=this.data.length/2){return this.data.slice(this.count,this.count+=2*nBytes);}, data:(a=>{let[b,c]=a.split(":");c=c?.match(/.{8}/g);let d=(a,b)=>a.replace(/./g,a=>parseInt(a,10+b)-b);return b.replace(/([g-p]+)([0-9a-f]+|[q-z]+)/gi,(a,b,e)=>(/[q-z]/.test(e)?c[d(e,26)]:e).repeat(d(b,16)));})("poqhgshmqhgshiqhgshmqhgshiqispqmvhnqishiqisnqhgvhlqishiqislqhkvhjqishiqiskqhmvhiqishiqisjqmvmrlvhwhhqishiqisiqlvhgrivjwhgqishiqishqlvkrkxkrkwhgqishiqishqkvjroxjrkwpqishlqjvjrjxjyizixjrjwilqjvkrixjyhzirhzhxjrkwikqjvjrixkyhzirhzixjrjwikqivkrixlyizhrqixkriwikqivkrixjylrqixkriwikqjvjrixiymrqixjrjwikqjvkrixmrqixjrkwilqjvjrjxkrqjxjrjwimqkvjroxjrkwinqkvkrkxkrkwioqkvhwhgrlwipqivkwmrmwjhqhmwhgqkuhpqhkwoqhguhnqhhwoqhkuhoqmwpqhmujhqouirmuitipqoukrkuktkqisiiqoukrjultkqisihqpukriuntjqisihqpukrhuotjqisigqhgukrhgtiqisigqluhkrltiqisigqkuhmrktiqisigqkuhmrktiqisigqluhkrltiqhgshiqpuhtkrhgtiqhgshjqnuitkrptimqmujtkrptinqkuktkrotioqjultkrotipqhuntirotjhqhmtjjqhktjmqhgtkhqkthgq:00000000FFFFFFFFFF42A5F5FF7CB342FF9CC671FFB1B1B1FF989898FF7E5D00FF3F3F3FFFEFEFEFFF000000")};
    var myIconBack = {count:0, width:48, height:48, read:function(nBytes=this.data.length/2){return this.data.slice(this.count,this.count+=2*nBytes);}, data:(a=>{let[b,c]=a.split(":");c=c?.match(/.{8}/g);let d=(a,b)=>a.replace(/./g,a=>parseInt(a,10+b)-b);return b.replace(/([g-p]+)([0-9a-f]+|[q-z]+)/gi,(a,b,e)=>(/[q-z]/.test(e)?c[d(e,26)]:e).repeat(d(b,16)));})("poqhgshmqhgshiqhgshmqhgshiqispqmvhnqishiqisnqhgvhlqishiqislqhkvhjqishiqiskqhmvhiqishiqisjqmvmrlvhwhhqishiqisiqlvhgrivjwhgqishiqishqlvkrkxkrkwhgqishiqishqkvjroxjrkwpqishlqjvjrjxjyizixjrjwilqjvkrixjyhzirhzhxjrkwikqjvjrixkyhzirhzixjrjwikqivkrixlyizhrqixkriwikqivkrixjylrqixkriwikqjvjrixiymrqixjrjwikqjvkrixmrqixjrkwilqjvjrjxkrqjxjrjwimqkvjroxjrkwinqkvkrkxkrkwioqkvhwhgrlwipqivkwmrmwjhqhmwhgqkthpqhkwoqhgthnqhhwoqhkthoqmwpqhmtjhqptjrktiuipqptkrjtkukqisiiqotkrjtlukqisihqotkrjtnujqisihqntkrjtoujqisigqntkrjthguiqisigqmtkrjthhuiqisigqltkrjthiuiqisigqltkrithjuiqisigqmtkrhkuiqhgshiqntkrhjuiqhgshjqntkrhhuimqmtiukrhguinqktkukrouioqjtmukrnuipqhtoujrmujhqhmujjqhkujmqhgukhqkuhgq:00000000FFFFFFFFFF42A5F5FF9CC671FF7CB342FFB1B1B1FF989898FF7E5D00FF3F3F3FFFEFEFEFFF000000")};
    app.addMenuItem( {
        cName: "viewNavigator_menu",
        cUser: __("Select…", 'viewNavigator'),
        cTooltext: __("List of Saved Views\n────────────────────────\nShows a list of the currently saved views so they can be selected, viewed, or deleted.", 'viewNavigator'),
        oIcon: myIconEdit,
        //cIconID: 'cmd.view.toolbar.menu',
        cParent: "viewNavigator",
        //nPos: "GoTo",
        cRbParent: "viewNavigator", // ribbon
        //nRbPos: -1,
        cHotkey: 'Ctrl+Shift+F5',
        //cEnable: "event.rc = (event.target != null);", // if no documents, it will still allow setting preferences
        cExec: 'viewNavigator.menu(this)'
    });
    app.addMenuItem( {
        cName: "viewNavigator_add",
        cUser: __("Save View", 'viewNavigator'),
        cTooltext: __("Save Current View\n────────────────────────\nSaves the current document view to a list so it can be restored later.", 'viewNavigator'),
        oIcon: myIconAdd,
        //cIconID: 'ico.add', //cmd.addBookmark
        cParent: "viewNavigator",
        //nPos: "viewNavigator_menu",
        cRbParent: "viewNavigator", // ribbon
        //nRbPos: 'viewNavigator_menu',
        cHotkey: 'F5',
        cEnable: "event.rc = (event.target != null);",
        cExec: 'viewNavigator.add(this)'
    });
    
    // Cannot add to ribbon for build before 388
    if ('object' === typeof app.pxceVersion && app.pxceVersion[3] < 388) {
        myIconEdit.count = 0;
        app.addToolButton( {
            cName: "viewNavigator_menuTB",
            cLabel:   __("Select…", 'viewNavigator'),
            cTooltext: __("List of Saved Views\n────────────────────────\nShows a list of the currently saved views so they can be selected, viewed, or deleted.", 'viewNavigator'),
            oIcon: myIconEdit,
            //cEnable: "event.rc = (event.target != null)",
            cExec: "viewNavigator.menu(this)"
        });
        myIconAdd.count = 0;
        app.addToolButton( {
            cName: "viewNavigator_addTB",
            cLabel:  __("Save View", 'viewNavigator'),
            cTooltext: __("Save Current View\n────────────────────────\nSaves the current document view to a list so it can be restored later.", 'viewNavigator'),
            oIcon: myIconAdd,
            cEnable: "event.rc = (event.target != null)",
            cExec: "viewNavigator.add(this)"
        });
        myIconBack.count = 0;
        app.addToolButton( {
            cName: "viewNavigator_previousTB",
            cLabel: __("Back %1", 'viewNavigator', ''), // reduce number of translations
            cTooltext: __("Go Back to Saved View\n────────────────────────\nRestores the last saved view for this document.", 'viewNavigator'),
            oIcon: myIconBack,
            cEnable: 'event.rc = !!viewNavigator.has(this);',
            cExec: 'viewNavigator.previous(this)'
        });
    }
    
    // make this a function so it can be updated
    const prevButton = app.trustedFunction( (nSaves) => {
        myIconBack.count = 0;
        app.beginPriv();
        app.addMenuItem( {
            cName: "viewNavigator_previous",
            cUser: __("Back %1", 'viewNavigator', nSaves ? `[${nSaves}]` : ''),
            cTooltext: __("Go Back to Saved View\n────────────────────────\nRestores the last saved view for this document.", 'viewNavigator'),
            oIcon: myIconBack,
            //cIconID: 'cmd.view.portfolio.view.nav.prev',
            cParent: "viewNavigator",
            nPos: "viewNavigator_add",
            cRbParent: "viewNavigator", // ribbon
            nRbPos: 'viewNavigator_add',
            cHotkey: 'Ctrl+F5',
            cEnable: 'event.rc = !!viewNavigator.has(this);',
            cExec: 'viewNavigator.previous(this)'
        });
        app.endPriv();
    });
    
    prevButton(0);

    /////////// private functions ///////////
    // load a viewstate (settingView is a flag to prevent the interval from saving a new view)
    let settingView = false;
    function load(doc,view){
        settingView = true;
        doc.viewState = view;
        lastView.set(doc, Object.create(view));
        settingView = false;
    }
    
    // start the interval
    function startAAInterval() {
        aSetInterval = app.setInterval("viewNavigator.docViewCheck();", 200);
    }
    
    // check if view is already in savedViews
    // returns index or -1 if not found
    function isUniqueView(savedViews, newView) {
        // combine six digits
        function toTx(view) {
            const ckProps = ['pageViewZoom', 'pageViewY', 'pageViewX', 'pageViewPageNum'];
            return ckProps.reduce( (a,p) => a + util.printf('%6f',view[p]), '');
        }
        const vTx = toTx(newView);
        
        return (savedViews || []).findIndex( v => vTx === toTx(v));
    }
    
    // toggle whether auto-add is on
    // returns true if it was changed
    function toggleAutoAdd(newAutoSet) {
        let aaChanged = true;
        if (newAutoSet) {
            // can only start the interval if there are no documents loaded
            if (activeDocs().length) {
                app.alert({
                    cTitle: __("Settings", 'viewNavigator'),
                    cMsg: __("Automatically adding views cannot be started while documents are open.\nIt will be enabled after the application is restarted.", 'viewNavigator'),
                    nIcon: 1,
                    nType: 0
                });
                aaChanged = false;
            } else {
                startAAInterval();
                vnPrefs.autoSet = newAutoSet;
            }
        } else {
            app.clearInterval(aSetInterval);
            vnPrefs.autoSet = newAutoSet;
        }
        // always update the preferences
        PREFS.set({autoSet: newAutoSet});
        return aaChanged;
    }
    
    // dialog to get values for preferences
    // returns true if the value is set
    function valDialog(pref, cQuestion, valCheck = ()=>true) {
        const rVal = app.response({
            cTitle: __("Settings", 'viewNavigator'),
            cQuestion,
            cDefault: vnPrefs[pref],
            cLabel: __("Enter 0 or leave blank to not use this trigger", 'viewNavigator'),
        });
        
        if (rVal !== null && !isNaN(rVal) && valCheck(rVal)) {
            vnPrefs[pref] = parseFloat(rVal) || 0;
            PREFS.set({[pref]: vnPrefs[pref]});
            return true;
        }
    }

    /////////// exported functions ///////////
    
    // add the current view
    // returns index of view in savedViews
    function add(doc, atIx, view = doc.viewState) {
        if (!savedViews.has(doc)) savedViews.set(doc,[]);
        // add at atIx
        if (undefined === atIx) atIx = savedViews.get(doc).length;
        // only add unique views
        if (vnPrefs.addUnique) {
            const oldIx = isUniqueView(savedViews.get(doc), view);
            if (oldIx >= 0) return oldIx;
        }
        
        savedViews.get(doc).splice(atIx, 0, Object.create(view));
        if (!useStatic) prevButton(savedViews.get(doc).length);
        //console.println("Added page view " + savedViews.get(doc).length)
        return atIx;
    }
    
    // returns number of saved views for this document
    function has(doc) {
        //if (!savedViews.has(doc)) return 0;
        return savedViews.get(doc)?.length;
    }
    
    // restore the most recently added view
    // @param {boolean} remove - removes view from the list if true
    function previous(doc, remove = true) {
        if (!has(doc)) return;
        if (remove) {
            load( doc, savedViews.get(doc).pop());
            //doc.viewState = savedViews.get(doc).pop();
        } else {
            load( doc, savedViews.get(doc).slice(-1));
            //doc.viewState = savedViews.get(doc).slice(-1);
        }
        prevButton(has(doc));
    }
    
    // show menu of saved views
    // would work much better if it could be non-modal
    function menu(doc) {
        // array of document names
        let i = 0;
        const aDocs = activeDocs();
        const docNames = aDocs.map( d => d.path?.split('/').pop() || d.name || __( "Untitled%1", 'viewNavigator', (i++ ? " " + i : '')));
        // array of saved views
        const sViews = d => (has(d) ? savedViews.get(d) : []);
        // the menu object
        const navMenu = {
            curD: 0, // currently active document index
            curIxs: new Set(), // currently selected indexes
            initialize(dialog) {
                // saved views
                const dLoad = this.vOb();
                // open documents
                this.curD = aDocs.indexOf(doc);
                dLoad['oDoc'] = this.getListboxArray(docNames, this.curD);
                // preferences
                dLoad['vPrf'] = this.prefArry();
                
                dialog.load(dLoad);
                
                // if the dialog is started with no open documents, disable most functions
                if (!aDocs.length) {
                    const dEnbl = {};
                    ['oDoc','mvUp', 'addV', 'mvDn', 'dVws', 'oDoc', 'sVws', 'selV'].forEach( k => dEnbl[k] = false);
                    dialog.enable(dEnbl);
                }
            },
            close(dialog) {
                dialog.end('close');
            },
            // returns a dialog object
            vOb(ix) {
                return Object.assign( this.tOb(), {'sVws': this.vText(ix)});
            },
            tOb() {
                return {
                    'sCnt': __( "%1 saved views ◦ %2 selected", 'viewNavigator', sViews(doc).length, this.curIxs.size),
                };
            },
            // text list of views
            vText(ix) {
                const vTxt = sViews(doc).map( v => {
                    let pLabel = doc.getPageLabel(v.pageViewPageNum);
                    pLabel = (1*pLabel === 1 + v.pageViewPageNum) ? __("p.%1", 'viewNavigator', pLabel) : pLabel;
                    // format string to use for listing the saved views
                    // %1 is the page number or label
                    // %2 is the zoom
                    return __( "%1 @ %2%", 'viewNavigator', pLabel, util.printf('%03.0f', 100 * v.pageViewZoom));
                });
                return this.getListboxArray(vTxt,ix);
            },
            // preferences array
            prefArry(ix=0) {
                const lsp = '\u2003 '; // long space
                return this.getListboxArray([
                    '…',
                    (vnPrefs.addUnique ? '✔ ' : lsp) + __("Avoid Duplicate Views", 'viewNavigator'),
                    (vnPrefs.autoSet ? '✔ ' : lsp) + __("Automatically Add Views", 'viewNavigator'),
                    lsp + __("Page Threshold: %1", 'viewNavigator', vnPrefs.pgChange),
                    lsp + __("Zoom Threshold: %1", 'viewNavigator', vnPrefs.zmChange),
                ],ix);
            },
            // change preferences
            vPrf(dialog) {
                const data = dialog.store();
                switch (this.getIndex(data['vPrf'])[0]) {
                  default: // no change
                    return;
                  case 1:
                    vnPrefs.addUnique = !vnPrefs.addUnique;
                    PREFS.set({'addUnique': vnPrefs.addUnique});
                    break;
                  case 2:
                    toggleAutoAdd(!vnPrefs.autoSet);
                    break;
                  case 3:
                    valDialog('pgChange', __("Number of pages to trigger a view save:", 'viewNavigator'));
                    break;
                  case 4:
                    valDialog('zmChange', __("Change in zoom to trigger a view save:", 'viewNavigator'), 
                        (v) => (v == 0 || v > 1)); // jshint ignore: line
                }
                // update dropdown
                dialog.load({'vPrf': this.prefArry()});
            },
            // add current view
            addV(dialog) {
                const data = dialog.store();
                let [ix] = this.getIndex(data['sVws']);
                // function also updates button
                ix = add(doc, ix);
                // update the list
                dialog.load(this.vOb(ix));
            },
            // switch documents
            oDoc(dialog){
                const data = dialog.store();
                let [ix] = this.getIndex(data['oDoc']);
                if (this.curD === ix || undefined === ix) return;
                
                // update doc
                this.curD = ix;
                doc = aDocs[ix];
                doc.bringToFront();
                // update the list
                dialog.load(this.vOb(ix));
                // update button
                prevButton(has(doc));
            },
            // load a view
            sVws(dialog) {
                const data = dialog.store();
                const ixs = this.getIndex(data['sVws']);
                if (ixs.length) {
                    // find any newly added indexes
                    const ixnw = ixs.find( v => !this.curIxs.has(v));
                    // can only show one view, so use the first one
                    if (undefined === ixnw) return;
                    
                    load( doc, savedViews.get(doc)[ixnw]);
                    //doc.viewState = savedViews.get(doc)[ixnw];
                }
                // save the updated list
                this.curIxs = new Set(ixs);
                // update text
                dialog.load(this.tOb());
            },
            // delete a view
            dVws(dialog) {
                const data = dialog.store();
                let ixs = this.getIndex(data['sVws']);
                if (!ixs.length) return;
                ixs.forEach( i => {
                    savedViews.get(doc).splice(i,1);
                });
                let ix = Math.max( ...ixs);
                ix = Math.max(0, Math.min(ix, savedViews.get(doc).length) - 1);
                // update the list
                dialog.load(this.vOb(ix));
                // update button
                prevButton(has(doc));
            },
            // move a view up
            mvUp(dialog) {
                this.moveStage(dialog,false);
            },
            // move a view down
            mvDn(dialog) {
                this.moveStage(dialog,true);
            },
            moveStage(dialog, down = true) {
                //const dResult = dialog.store();
                const data = dialog.store();
                let ixs = this.getIndex(data['sVws']);
                if (!ixs.length) return;

                const doMove = down ? (Math.max(...ixs) < savedViews.get(doc).length - 1) : (Math.min(...ixs) > 0);
                // can only move down if not already at bottom/top
                if (!doMove) return;

                ixs.forEach( (ix,i) => {
                    const sVws = savedViews.get(doc) || [];
                    sVws.splice(ix + (down ? 1 : -1), 0, sVws.splice(ix, 1)[0]);
                    savedViews.set(doc,sVws);
                    ixs[i] += (down ? 1 : -1);
                });
                // update the list
                const dLoad = {
                    'sVws': this.vText(ixs),
                };
                dialog.load(dLoad);
            },
            // returns the index number of the item(s) with positive number value - always returns array
            getIndex(elements) {
                return Object.values(elements).reduce( (a,e,i) => e>0 ? a.concat(i) : a , [] );
            },
            // create object array suitable for the listbox. selItem is index
            // returned array is {"Displayed option":-order,...}
            // allows multiple selections
            getListboxArray(vals, selItem) {
                let sub = {};
                if (!Array.isArray(selItem)) selItem = [selItem];
                vals.forEach( (v,i) => {
                    // if multiple duplicate names, add counter
                    let counter = '';
                    if (sub[v]) {
                        let j=0;
                        while (sub[v + '_' + (++j) ]);
                        counter = '_' + j ;
                    }
                    // positive number if selected
                    sub[v + counter] = (selItem.includes(i) ? 1 : -1) * ( i + 1);
                });
                return sub;
            },
            description: {
                name: __("Saved Views", 'viewNavigator'), // Title of the dialog box
                width: 220, first_tab: 'sVws', elements: [
                { type: "view", align_children: "align_row", elements: [
                    { type: "popup", item_id: "vPrf", height: 20, width: 10 },
                    { type: 'static_text', separator: 2, height: 20, width: 1},
                    { type: "button", item_id: "addV", name: "+", height: 20, width: 20, bold: true, font: 'title' },
                    { type: "button", item_id: "mvUp", name: "▲", height: 20, width: 20 },
                    { type: "button", item_id: "mvDn", name: "▼", height: 20, width: 20 },
                    { type: 'static_text', separator: 2, height: 20, width: 1},
                    { type: "button", item_id: "dVws", name: "‒", height: 20, width: 20, bold: true },
                    //{ type: 'gap', width: 50},
                    //{ type: "button", item_id: "close", name: "X", height: 20, width: 20 },
                ]},
                { type: 'popup', item_id: 'oDoc', width: 199},
                { type: "list_box", item_id: "sVws", width: 220, height: 400, multi_select: true },
                { type: 'static_text', item_id: "sCnt", width: 220, font: 'palette' }
            ]}
        };
        // for build < 393 it does not trigger change event on list box, so need to add a button
        if (useStatic) {
            // very fragile to any changes in the dialog
            navMenu.description.elements[0].elements.push(
                { type: 'static_text', separator: 2, height: 20, width: 1},
                { type: "button", item_id: "selV", name: "►", height: 20, width: 20, bold: true });
            navMenu.selV = function(dialog) {
                this.sVws(dialog);
            };
        }
        app.execDialog(navMenu);
    }
    // run by interval to check if views changed
    function docViewCheck() {
        const doc = app.doc;

        if (!doc || settingView || !vnPrefs.autoSet) return;
        
        if (lastView.has(doc)) {
            const zm = lastView.get(doc).pageViewZoom / doc.viewState.pageViewZoom || 1;
            // check page or zoom change
            switch (true) {
              default:
                break;
              case (vnPrefs.pgChange && vnPrefs.pgChange < Math.abs(lastView.get(doc).pageViewPageNum - doc.viewState.pageViewPageNum)):
              case (vnPrefs.zmChange && vnPrefs.zmChange < zm):
              case (vnPrefs.zmChange && vnPrefs.zmChange < 1/zm):

                add(doc, undefined, lastView.get(doc));
            }
            
        }

        lastView.set(doc, Object.create(doc.viewState));
    }
    
    // start interval
    if (vnPrefs.autoSet) startAAInterval();
    
    return {add,has,previous,menu,docViewCheck};
})();