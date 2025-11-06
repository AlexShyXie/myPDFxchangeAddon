/** Script to change color of all annotations with a dialog
  * tested on PDF-Xchange Editor v10.6
  * 
  * @author mathew
  * 
  * @history <pre>
  * v2.2   2025-08-04  fix: include a color in the annotations that is not in default or custom colors; update ClrUtx to v2.1.2
  * v2.1   2025-07-02  merge savedColors from this tool with xutil; make added rows not duplicate a color that is already shown; fix height of link text to allow wrapping
  * v2.0   2025-06-30  individually add rows for color to change; move all color functions to xutil.ClrUtx; use color picker with color boxes; make translateable; move to Add-in tools group in Home tab
  * v1.5.1 2024-06-28  fix bug where color is changed multiple times, code cleanup
  * v1.5   2024-06-26  fix bug with dropdown event causing recursion, moved menu item to sub-menu
  * v1.4.1 2024-04-21  try to clean miscellaneous chars in colors, fix bug when editing color names
  * v1.4   2024-04-21  add option to customize/delete saved color names, move global variable getter inside function
  * v1.3   2024-03-12  Add option for hex numbers for colors
  * v1.2   2023-09-20  Look at rich contents in all annotations
  * v1.1   2023-07-04  Fix to global variable access, revise icon
  * v1.0   2023-07-20  Initial release</pre>
  *
  * @requires depends on 1ang.js for translation function __(), xutil.ClrUtx for color functions and dialogs
  *
  * @todo remove saved prefs (not needed)
**/

// in case no 1ang.js
if ('undefined' === typeof __ ) __ = (t,d,...args) => (Array.isArray(args)?args:[args]).reduce( ( a, r, i) => a.replace( new RegExp('(^|[^%])%' + (i+1), 'g'), '$1'+r), t); // jshint ignore: line

// tool data and custom icon
var myIcon = {count:0, width:40, height:40, read:function(nBytes=this.data.length/2){return this.data.slice(this.count,this.count+=2*nBytes);}, data:(a=>{let[b,c]=a.split(":");c=c?.match(/.{8}/g);let d=(a,b)=>a.replace(/./g,a=>parseInt(a,10+b)-b);return b.replace(/([g-p]+)([0-9a-f]+|[q-z]+)/gi,(a,b,e)=>(/[q-z]/.test(e)?c[d(e,26)]:e).repeat(d(b,16)));})("oiqhgwiqhgtiqhgxmqhgwiqhgtiqhgxmqivsistmwiqivtotiqirvoxmqivsistmwiqivtotiqirvoxmqivuivvistivwiwiqivxirymtiqirzirvmxmqivuivvistivwiwiqivxirymtiqirzirvmxmqivyisuivziwqiwiqisviswiryktiqkrzirvkxmqivyisuivziwqiwiqisviswiryktiqkrzirvkxmqiwrksuiwsiwiqisvissiswiryitiqmrzirvixmqiwrksuiwsiwiqisvissiswiryitiqmrzirvixomqhgyiqhgriqmzisxizmqhgyiqhgriqjzhFF2E2E2EhzhsxhFFFCA285hFFFD9878hFFFAAF98hzmqirwoyiqiwtisymriqiszizhsxhFFFD9A7BjsshFFFAAB92mqirwoyiqiwtisymriqiszhzhsxhFFFAD69AhuuksshFFFAA58AlqisqirwmyiqiwuisrisykriqiszhuvhFFFDDF82htqhFFFBD796huuisshwvhthFFFAA083kqisqirwmyiqiwuisrisykriqhszhuvhFFFBE094jtqhFFFCD796huuhwvjthFFFAA990jqitrisqirwkyiqitsisisrkriqhuvhrqhuwhwwjtqhFFFBD084hFFFE7042jthwxhuiqitrisqirwkyiqitsisisrkrhqhuhrqishuwhwwhtqhFFFFDA64htthwyjthFFFC8864huiqktrisqirwiyiqktsisisrirhuhrqkshuwhFFFCDB7DjtthwyhthwxhujqktrisqirwiyiqktsisisrhrhFFFFDBC2hrqlshrrhuxhwzjtthFFFACA7ChuikqhuhrqlshrrirhuxhwzhtthFFFDD85FhuikqhuhrqlshrrkrhuxhFFFBD775humqirsivitukviqmtvhtwhrqlshrrlrhrtirumqirsivitukviqltvhtwhrqlshrrlrhrtjrumqirxirsivituiviqixqitvhtwhrqlshrrlrhrtkrumqirxirsivituiviqixqhtvhtwhrqlshrrlrhrtlrumqixrirxirskviqixshxthFFF9D5A9lshrrlrhrtmrumqixrirxirskviqixshxthuyhxujshrrlrhrthxvmrumqitxityirxirsiviqhtzhuqhFFF6E3D2hurhuyhxuhshrrlrhrthxwhusiutkrumqitxityirxirsiviqhtzhuqhFFF8DDC4iurhuyhFFF9CE99lrhrthxviusiutkrumqktxityirxirsiqhtzhuqjurhxxhuzhxyjrhrthxwhusmutirumqktxityirxirsiqhtzhuqhFFF4D6BChurhxxivqhuzhxyhrhrthuiusmutiruhpqh87B2B2B2hzhFFF3D0B1kvqhuzhFFF8CB91hujgqhvrizhFFF3CAA6hvqhFFF8D2B0hFFF6DEC9iujhqhzhvrh87A0A0A0kuloq:00000000FFFFA726FFFFBD5CFFFF704387FFFFFFFF79B23CFF42A5F5FFD70C50FF7D55C2FF000000FFFDC066FFFFB241FF85B850FFFDAE3AFFFFFFFFFFF73C68FF8E6DC9FF9CC671FFFF7A51FFFF597DFF9D80D1FFFFB850FFFF9372FF47A7F5FF71BBF7FFFF9271FFFF906EFFC0C0C0FFFFA92CFF323232FFFFDF7BFFAD96D7FFFFBC59FFFFD54FFF7BB23FFFFDDF87FFFEF1D2FFBBD5A2FFABCE8AFFFDE291FFFEF2D5FFFAD9BC8EFFFFFFBEFFFFFFFFFE9471FFC3C3C3FFFDBF60FFFDAA2CFFF9D8BBFFF8CCA5FFF9CDA687000000FF84C0F6FFFF794FFF89C4F6FF66B6F6FF3FA4F5FFFF8F6DFF8AC4F7FF65B5F6FF44A6F5FF8CC5F6FF65B5F7FFFFB74DFFFFBD5BFFFF8159FFFBE08FFFFD7D55FFFBCA74FFFCD66BFFFEE392FFABCD8AFFFEE28DFFFFF2D5FFF9D5A7E0FFFFFFCAFFFFFFFFF9D3B1FFF9C88B")};
// This adds a button to the Add-on Tools toolbar
app.addToolButton( {
	cName: "changeColorAllTool",
	cLabel: __("Colors…", 'changeColorsAll'),
	oIcon: myIcon,
	cTooltext: __("Change Colors of Annotations…", 'changeColorsAll'),
	cEnable: "event.rc = (event.target != null)",
    cExec: "changeColorsAll(this)"
});
// This adds a menu item inside Add-in Tools
myIcon.count=0; // reset icon
// app.addSubMenu({
    // cName: "addTools",
    // cUser: "Add-in Tools",
    // cParent: "Tools",
    // nPos: 0,
    // cRbParent: "Home",
    // bNewRbGroup: true,
    // nRbGroupStyle: 2
// });
// app.addMenuItem( {
	// cName: "changeColorAllMenu",
    // cUser: __("Change Colors…", 'changeColorsAll'),
    // cTooltext: __("Change Colors of Annotations…", 'changeColorsAll'),
	// oIcon: myIcon,
	// cParent: "addTools", // Add-in tools
	// //nPos: 13,
	// cEnable: "event.rc = (event.target != null)",
    // cExec: "changeColorsAll(this)" 
// });

// create function
var changeColorsAll = (function() {

    const CHANGE_COLORS_PREFS = ((name) => {
        let get = app.trustedFunction(() => {
            app.beginPriv();
            if ( global[name] )
            return JSON.parse( global[name] );
        });
        let set = app.trustedFunction( value => {
            app.beginPriv();
            global[name] = JSON.stringify( value );
            global.setPersistent( name, true);
        });
        return { get, set }; // changed to shorthand
    })("CHANGE_COLORS_PREFS");
    
    return function(doc) {
        
        //  ************************* Begin Object Utility ********************************
        const obUtil = {
            // get object with prop == val
            getObj: function ( obj, prop, val ) {
                let found;
                if  ( obj[prop] === val ) {
                    return obj;
                    } else {
                    if (obj.elements) {
                        for (let e in obj.elements) {
                            found = this.getObj( obj.elements[e], prop, val );
                            if (found) break;
                        }
                    }
                }
                return found;
            },
            // deletes from the front of ob.
            trimObj: function (ob,maxL) {
                
                let ol = Object.keys(ob).length - maxL;
                for (let i in ob) {
                    // trim length
                    if ( ol > 0 ) {
                        delete ob[i];
                        ol--;
                        } else {
                        break;
                    }
                }
                //return ob;
            },
        };
        
        // get all annotation objects - try to use selected annotations
        let annArr = doc.selectedAnnots;
        
        if (!annArr?.length) {
            annArr = doc.getAnnots();
            let noAnSel;
            if ( annArr?.length ) { // ie there are some annotations in the document
                noAnSel = app.alert({
                cMsg: __("No Annotations selected, do you want to change colors of all %1 annotations in the current document?", 'changeColorsAll', annArr.length),
                    cTitle: __("Changing ALL Annotations", 'changeColorsAll'),
                nIcon: 1, nType: 1 });
            }
            if ( 1 !== noAnSel ) {
                return "Nothing Selected";
            }
        }
        // try to get global variables
        let savedPrefs = CHANGE_COLORS_PREFS.get();
        
        if (!savedPrefs) {
            // defaults
            savedPrefs = {
                //savedColors:{}
                //dialog:{},
            };
        }
        

        // set up color object
        const cUtil = new xutil.ClrUtx({
            saveColors: true,
            aAnnots: annArr,
            //useHex: savedPrefs.useHex,
            mkName: false,
        });
        // array of the annotation color values
        let annotColors = Object.values( cUtil.annotCls );
        // some colors may not have defined names, so guess them
        let annotColorNames = Object.keys( cUtil.annotCls );

        // update from pre-v2 changeColors
        if (Object.keys( savedPrefs?.savedColors || {}).length) {
            console.println("changeColorsAll: Merging saved colors with xutil. This should be a one-time update.");
            // merge with cUtil
            const cSavedCls = cUtil.arraysToClrObs( cUtil.getSavedColors(false,false));
            cUtil.setSavedColors( Object.assign(cSavedCls, savedPrefs.savedColors));
            // remove colors from these prefs
            delete savedPrefs.savedColors;
        }
        
        // number of groups to show
        let nDiaGrps = 1;
        // array of group dialog boxes
        const diaBoxes = [];
        // to store the currently selected existing and new colors
        // - use first one as default
        let diaIxs = [];
        
        //  ************************* Begin Dialog ******************************** 
        const colorDialog = {
            data:{},    // dialog results

            
            initialize: function (dialog) {
                
                let dLoad = {};
                // color number format
                dLoad['rd02'] = !cUtil.useHex;

                // load all colors
                for (let i = 0; i < nDiaGrps; i++) {
                    const ix = i.toString(36);
                    // existing color, new color
                    dLoad[`cBx${ix}`] = this.colorBox( diaIxs[i].oldCl);
                    dLoad[`cNx${ix}`] = this.colorBox( diaIxs[i].newCl);
                    // load color string
                    dLoad[`cCx${ix}`] = cUtil.colArr256( diaIxs[i].newCl);
                }
                
                dialog.load( dLoad );
                // hide delete buttons if only one group
                const dHide = {};
                if (nDiaGrps < 2) dHide['del0'] = false;
                // hide add button if number of groups same as number of colors
                if (nDiaGrps >= annotColors.length) dHide['addG'] = false;

                if (Object.keys(dHide).length) dialog.visible(dHide);
            },
            commit:function (dialog) {
                this.data = dialog.store();
                // return "ok"
            },
            // pick old color
            pkOldColor( dialog, ix ) {
                // the current list of colo
                //let cClr = diaIxs[parseInt(ix,36)][0];
                // show color dialog
                let nClr = cUtil.colorPicker({
                    showNames: true, 
                    basicColors: [annotColorNames, annotColors],
                    selectedColor: diaIxs[parseInt(ix,36)].oldCl,
                    colorPickerText: __( "Select the Current Color to Replace:", 'changeColorsAll'),
                });
                if (nClr) {
                    diaIxs[parseInt(ix,36)].oldCl = nClr;
                    const dLoad = {
                        [`cBx${ix}`]: this.colorBox( nClr ),
                        [`cEx${ix}`]: cUtil.colName( nClr, true, true )
                    };
                    dialog.load(dLoad);
                }
            },
            // pick new color
            pkNewColor( dialog, ix ) {
                // maybe a custom color was added
                const cVals = diaIxs.map( c => c.newCl).concat(annotColors);
                
                const uColors = cUtil.addlClrs( cVals );
                // show color dialog
                let nClr = cUtil.colorPicker({
                    customColors: [Object.keys(uColors), Object.values(uColors)],
                    selectedColor: diaIxs[parseInt(ix,36)].newCl,
                });
                if (nClr) {
                    const dLoad = this.updateNewColor(dialog, ix, nClr);
                    dLoad[`cCx${ix}`] = cUtil.colArr256( nClr );
                    dialog.load(dLoad);
                }
            },
            // update new color
            updateNewColor(dialog, ix, nClr) {
                diaIxs[parseInt(ix,36)].newCl = nClr;
                return {
                    [`cNx${ix}`]: this.colorBox( nClr),
                    [`cMx${ix}`]: cUtil.colName( nClr, true, true ),
                };
            },
            // @todo handle transparency properly
            colorBox(clr) {
                const [opc] = xutil.ClrUtx.hexWithOpacity([clr]);
                return xutil.ClrUtx.colorBox( opc, 31, 30);
            },
            
            // returns the index number of the first item with positive number value
            getIndex: function (elements) {
                for (let i in elements) {
                    if ( elements[i] > 0 ) {
                        return elements[i]-1; //i ; the index is the text of the dropdown
                    }
                }
            },

            // color format changed
            rd01(dialog) {
                let data = dialog.store();
                if (cUtil.useHex !== data['rd01']) {
                    // update hexadecimal setting
                    //savedPrefs.useHex = data['rd01'];
                    cUtil.useHex = data['rd01'];
                    
                    const revs = {};
                    // change all input boxes
                    for (let i = 0; i < nDiaGrps; i++) {
                        let ix = i.toString(36);
                        let pickedClr = diaIxs[i].newCl;
                        revs[`cCx${ix}`] = cUtil.colArr256( pickedClr );
                    }

                    dialog.load( revs );
                
                }
            },
            rd02(dialog) {
                this.rd01(dialog);
            },
            // change to the custom color input box -- needs to be called from each box
            clrInput(dialog, butn) { 
                let results = dialog.store();
                
                const curClrs = diaIxs[parseInt(butn,36)];
                const nClr = cUtil.colFromStr( results[`cCx${butn}`]);
                // only update if changed
                if ( !cUtil.equal( curClrs.newCl, nClr) ) {
                    let dLoad = this.updateNewColor(dialog, butn, nClr);
                    
                    dialog.load( dLoad );
                }
            },
            
            // color format help
            cHlp() {
                cUtil.colorFormatHelp();
            },
            // delete group
            delG(dialog, ix) {
                // reduce number of documents
                nDiaGrps--;
                // remove this one from the list
                diaBoxes.splice(ix,1);
                diaIxs.splice(ix,1);
                this.commit(dialog);
                dialog.end('rev');
            },
            // add group
            addG(dialog) {
                nDiaGrps++;
                this.commit(dialog);
                dialog.end('rev');
            },
            
            description: {
                name: __("Replace Color", 'changeColorsAll'), // Dialog box title
                align_children: "align_left", width: 380, elements: [
                {  type: "cluster",
                    name: __(`%1 Annotations Selected (%2 total colors)`, 'changeColorsAll', annArr.length, annotColors.length), 
                    align_children: "align_left", elements: [
                    {  type: "view", align_children: "align_row", elements: [
                        {  type: "gap", width: 22 // for the delete button
                        },
                        {  type: "static_text", name: __("Current Color", 'changeColorsAll'), width: 140, bold: true
                        },
                        {  type: "static_text", name: "|", width: 5, height: 15, separator: 2
                        },
                        {  type: "static_text", name: __("Select New Color", 'changeColorsAll'), width: 125, bold: true
                        },
                        {  type: "gap", width: 10 // for the dropdown arrow
                        },
                        {  type: "static_text", name: __("Enter color:", 'changeColorsAll'), lignment: "align_left", width: 125, bold:true
                        }]
                    },
                    // to hold the color pickers
                    { type: 'view', item_id: 'gHdr', elements: []},
                    // add a group button
                    { type: 'button', item_id: 'addG', name: '+', font: 'title', bold: true, width: 22, height: 22 },
                    ]
                },
                { type: 'view',  align_children: 'align_row', elements: [
                    { type: 'static_text', name: __("Color format:", 'changeColorsAll') },
                    { type: 'radio', item_id: 'rd01', group_id: 'Cfmt', name: __("Hexadecimal", 'changeColorsAll') },
                    { type: 'radio', item_id: 'rd02', group_id: 'Cfmt', name: __("Decimal", 'changeColorsAll') },
                ]},                
                {   type: 'ok_cancel', alignment: 'align_right'}
                ]
            }
        };
        // multiple menu items
        const menuItem = (ix, eclrName, nclrName) => {
            return {  type:'view', align_children:'align_row', elements: [
                { type: 'button', name: '‒', item_id: `del${ix}`, font: 'title', bold: true, width: 22, height: 22},
                { type: 'image', width: 31, height:30, item_id: `cBx${ix}` },
                { type: 'link_text', name: eclrName, width:100, height:30, alignment: 'align_left', item_id: `cEx${ix}` }, // for the existing color
                { type: 'static_text', name: '|', width: 5, height: 30, separator: 2 },
                { type: 'image', width: 31, height:30, item_id: `cNx${ix}` },
                { type: 'link_text', name: nclrName, width:100, height:30, alignment: 'align_left', item_id: `cMx${ix}` }, // for the new color
                { type: 'edit_text', width:125, alignment: 'align_left', item_id: `cCx${ix}`},
                { type: 'button', item_id: 'cHlp', name: "?", height: 16, width: 12},
            ]};
        };

        
        // Logic:
        // Get colors of all selected annotations
        // Build menu > curr color > new color
        // Check if any of the colors are changed & dialog "OK"
        // Make a list of old color > new color
        // For each annotation
        //    go through old color > new color list
        //  change all colors of that annotation with one .setProps()
        
        
        // initialize dialog
        let diaResult = 'rev';

        while ('rev' === diaResult) {
            // set up dialog
            const pickBase = obUtil.getObj( colorDialog.description, 'item_id', 'gHdr');
            // remove any pickers from dialog
            pickBase.elements.length = 0;
            diaBoxes.length = 0;
            for (let i = 0; i < nDiaGrps; i++) {
                const ix = i.toString(36); // base 36 so can have 36 rows with single char

                // diaBoxes list
                diaBoxes.push( ix );
                
                // colors for this row
                if (!diaIxs[i]) {
                    let aIx = 0;
                    let annotPicked = diaIxs.map( d => annotColors.indexOf(d.oldCl));
                    while (annotPicked.includes(aIx) && aIx < annotColors.length) aIx++;

                    diaIxs[i] = {"oldCl": annotColors[aIx],"newCl": annotColors[aIx]};
                }
                const cNms = ['oldCl', 'newCl'].map( c => cUtil.colName(diaIxs[i][c], true, true));
                // add picker to dialog
                pickBase.elements.push( menuItem(ix, cNms[0], cNms[1]));
                
                // add functions to dialog
                // pick old color
                colorDialog[`cBx${ix}`] = (dia)=>colorDialog.pkOldColor(dia, ix);
                colorDialog[`cEx${ix}`] = (dia)=>colorDialog.pkOldColor(dia, ix);
                // pick new color
                colorDialog[`cNx${ix}`] = (dia)=>colorDialog.pkNewColor(dia, ix);
                colorDialog[`cMx${ix}`] = (dia)=>colorDialog.pkNewColor(dia, ix);
                // enter color string
                colorDialog[`cCx${ix}`] = (dia)=>colorDialog.clrInput(dia, ix);
                // delete group
                if (nDiaGrps > 1) {
                    colorDialog[`del${ix}`] = (dia)=>colorDialog.delG(dia, i);
                }
            }
            
            // start the dialog (again)
            diaResult = app.execDialog(colorDialog);
            // one of the diaboxes may have been deleted
            //diaIxs = diaBoxes.map( k => {"oldCl":colorDialog.oldColor[k], "newCl":colorDialog.newColor[k]});
        }
        if ( diaResult !== 'ok') return "User cancelled";
        
        ///////////////////////////////////////////////////////////
        ///////////////// BEGIN MAIN FUNCTION /////////////////////
        
        // make list of changed colors
        let chCols = [];
        for (let x of diaIxs) {
            // compare the new to existing colors
            
            //let newClr = cUtil.colFromStr( colorDialog.data["cC"+xx] );
            if ( !cUtil.equal( x.oldCl, x.newCl )) {
                chCols.push( x );
            }
        }
        
        if ( chCols.length ) {
            
            for (let ann of annArr) {
                let revs = {};
                // get colors from richContents
                if ( ann.richContents && ann.richContents.length ) {
                    let changed = false;
                    let spans = [];
                    for (let s in ann.richContents) {
                        spans[s] = ann.richContents[s];
                        for (let c of chCols) {
                            if ( cUtil.equal( spans[s].textColor, c.oldCl )) {
                                changed = true;
                                spans[s].textColor = c.newCl;
                                // only change once
                                break;
                            }
                        }
                    }
                    if (changed) revs["richContents"] = spans;
                }
                // get colors from array items props
                let props = [ "strokeColor", "fillColor" ];
                for (let prop of props) {
                    for (let c of chCols) {
                        // property may not exist for this annotation
                        if ( ann[prop] && cUtil.equal( ann[prop], c.oldCl )) {
                            revs[ prop ] = c.newCl;
                            // only change once
                            break;
                        }
                    }
                }
                // apply the revisions
                if (Object.keys(revs).length) ann.setProps( revs );
            }
            
        } else {
            console.println(diaResult = "No colors changed");
        }
        // update global variable
        CHANGE_COLORS_PREFS.set( savedPrefs );
        
        return diaResult;
    };
})();