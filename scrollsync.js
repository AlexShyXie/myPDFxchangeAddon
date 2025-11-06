/** Script to synchronize two windows
    * Based on original script by benep and posted https://forum.pdf-xchange.com/viewtopic.php?p=167809#p167809
    * 
    * @author mathew bittleston
    * @license MIT
    *
    * @history <pre>
    * v1.4  2025-10-22  fix pan location when zoom changed (thanks to @BS2)
    * v1.3  2025-04-14  fix incorrect array method to find document index (thanks @Mo_Yous)
    * v1.2.1 keep track of which documents were selected so can edit sync easier, activate documents properly - fix the first document not being the correct one
    * v1.2 2025-04-03 fix bug with page changing backwards; try to handle scrolling in ribbon/continuous view when page sizes don't match (still doesn't work well); add option to scale scroll by page size so that two different pages move proportionally
    * v1.1 2025-03-20 Sync more than 2 docs; Don't disable the page number input for doc1; add alert if sync cancelled by too few docs using menu cMarked to run the check, misc dialog cleanup, save page delta instead of looking at change (for different sized pages, but ribbon view will still be weird)
    * v1.0 2025-03-17 Code rewrite: Use closures (use PXE's setInterval or xutil), added options in dialog, add translation, tweak icon, wrap around during page changes, add to ribbon UI, allow skipping some dialogs, tried debugging ribbon view mode with different size pages
    * v0.6.1 2025-03-11 if changes don't stick, save that to the state, so it doesn't get pushed back
    * v0.6 2025-03-04 Update in preparation for rewrite to individually set zoom, pan, etc. Resolve drifting issue.
    * v0.5.1 2024-08-15 Use documentFileName for case where no docID was assigned, add question for sync cancel, fix some JSlint
    * v0.5 2024-08-15 Different alert if documents have same ID, checkbox option for vert split
    * v0.4 2024-04-18 Changed icon to 40x40, set cMarked while tool is active
    * v0.3 2024-04-09 applied menu item to show side by side
    * v0.2 2024-04-09 changed global to xutil, added trusted function for documents, added menu item
    * </pre>
    * @todo: limit scrollX scrollY to page dimensions; if more than two documents, maybe don't cancel sync if one closes
    *
    * @requires: xutil if < PXCE build 393
*/

/* globals xutil */
/* globals __:true */
// in case no 1ang.js
if ('undefined' === typeof __ ) __ = (t,d,...args) => (args || []).reduce( ( a, r, i) => a.replace( new RegExp('(^|[^%])%' + (i+1), 'g'), '$1'+r), t);

var myIcon = {count:0, width:40, height:40, read:function(nBytes=this.data.length/2){return this.data.slice(this.count,this.count+=2*nBytes);}, data:(a=>{let[b,c]=a.split(":");c=c?.match(/.{8}/g);let d=(a,b)=>a.replace(/./g,a=>parseInt(a,10+b)-b);return b.replace(/([g-p]+)([0-9a-f]+|[q-z]+)/gi,(a,b,e)=>(/[q-z]/.test(e)?c[d(e,26)]:e).repeat(d(b,16)));})("oqiuhoqiuhnqhuirhuhmqhuirhuhlqhukrhuhkqhukrhuhjqhumrhuhiqhumrhuhhqhuirhqirhuirhuhgqhuirhuirhuirhupqhuiriqiriqirhuoqhuiriqiriqirhupqhrjqirjqhrhgqhrjqirjqhrhkqirhoqirhgqhsyhrumvhsshstithszh80D3D3D3mqhsyhrumvhsshstithszhFFB0B0B0mqhrunvhsshtqhthtrhtshttmqhrunvhsthtqhthtrhtshttmqivmsirhrqhtuiyhtvlqivmsirhrqhtuiyhtvlqivmsirhtwjyhrvlqivmsirhtwjyhrvlqivishFFE7F1DDisuhtxixhtykyhtzkqivmsixhtykyhtzkqivisisuhuqhsvhxhrwhurkyhrxh40F1F1F1jqivmshxhrwhurkyhrxkqivishsuhuqisvirhuslyhutjqiviskwirhuslyhutjqivishtxisvhFFDFECD1irhuuhuvkyhuwhuxiqiviskwirhuuhuvkyhuwhuxiqivmsixishrrhrxjyhuyiqivmsixishrrhrxjyhuyiqivmsixjshuzhvqhryhyhvrh80D6D6D6hqivmsixjshuzhvqhryhyhvrh40D6D6D6hqhvhrziskwiriwjshvshrvhyhvthqhvhrziskwirjwhrrhshvshrvhyhvthqhrzhtiskwiriwhrrhFFFCFCFChswhshswhvuhryhqhrzhtiskwirkwhrrhshswhvuhryhqitmsixhslrqishFF7D7D7DhqitmsixoshthqitmsixmrqhrthshthqitmsixhshrtmshthqitiskwirmwhFFF8F8F8hshthqitiskwirhrrhshzhFFECC34EhzhFFFEFCF7ishthqitiskwirmwishthqitiskwirishzhsxhsqhzishthqitmshFFBDD6F8hrwkrqkshthqitmsixhshzhsxhsqisrishthqitmshxhrwkrqkshthqitmsixhFFEFD07AhsxhsqjsrishthqitiskwirmwishthqitiskwirhFFF2D585hsqjsrhzishthqitiskwirmwishthqitiskwirhFFFEFCF8hzisrhzhFFFEFDFAishthqitmsixhrtkrqhshrthshthqitlshrtixoshthqitmsixoshthqitmsixoshthqhrsntirpthqhrsntirpthqhvvhrsmtirothrsh20D9D9D9hvvhrsmtirothFF858585pqirhoqirhkqhrjqirjqhrhgqhrjqirjqhrpqhuiriqiriqirhuoqhuiriqiriqirhupqhuirhqirhuirhuhgqhuirhuirhuirhuhhqhumrhuhiqhumrhuhjqhukrhuhkqhukrhuhlqhuirhuhmqhuirhuhnqiuhoqiuhgq:00000000FF42A5F5FFFFFFFFFF8080808042A5F5FF9F9F9FFF9E9E9EFFC0D8FAFF616161FFF0CF74FFFEFEFEFFD5D5D580898989FFFBFBFB80A3A3A3FF848484FFBFD7FAFF767676FF636363FF909090FFE8B629FFE5AC0AFF7CA2D0FF719BCBFFA4CA7CFF7CB342FFFDFDFDFFEBC04740DBDBDBFF737373FF6794C6FF7C7C7CFF626262FF787878FF8F8F8F80D5D5D5FFC9C9C9FFE3EFD7FF79797980C7C7C7FF8CBC5AFF676767FF98989880B8B8B8FFF6F6F6FF9B9B9BFF6B6B6B40EBEBEB80A7A7A7FFF9F9F9FFACACACFF656565FFE3E3E3FF7A7A7AFFBEBEBE40D9D9D9")};
app.addToolButton({
    cName: 'syncDocs.btn',
    oIcon: myIcon,
    //cLabel: __( "Sync", 'scrollSync'),
    cExec: 'scrollSync();',
    cTooltext: __( "Toggle synchronizing the view of two documents. Select tool again to cancel sync.", 'scrollSync'),
    cEnable: 'event.rc = (event.target != null)', // at least one document
    cMarked: 'event.rc = scrollSync?.isActive && scrollSync.isActive();', // hilight tool button while the tool is running
    //nPos: -1
});

// add to ribbon
myIcon.count = 0;
app.addMenuItem( {
	cName: 'syncDocs',
	oIcon: myIcon,
	cUser: __( "Sync Views", 'scrollSync'),
	cTooltext: __( "Toggle synchronizing the view of two documents. Select tool again to cancel sync.", 'scrollSync'),
    cParent: 'View',
    nPos: 'cmd.compareDocs',
    cRbParent: 'rbar.view.pageDisplay.part2', // add to ribbon
    cEnable: 'event.rc = (event.target != null)', // at least one document
	cMarked: 'event.rc = scrollSync?.isActive && scrollSync.isActive();',
	cExec: 'scrollSync();'
});


var scrollSync = (function() {
    // needs priveliged function to access global variables
    class GlobalVals {
        // holds the current prefs
        values; // jshint ignore:line
        constructor(name, defaults) {
            this.load = app.trustedFunction(() => {
                app.beginPriv();
                if ( global[name] )
                return JSON.parse( global[name] );
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
        set(newValues) {
            this.save( Object.assign( this.values, newValues ));
        }
    }
    // method to get or set preferences
    const PREFS = new GlobalVals( 'scrollSync', {
        // defaults
        'ckPan': true, // check panning (position)
        'ckZoom': true, // check zoom
        'ckRotation': true, // check page view rotation
        'ckPageLayout': true, // check page layout 
        'ckPage': true, // check page changes
        'ckPageNo': false, // check page number
        'setVertSplit': true,
        'setHorzSplit': false,
        'scaleOvsPgs': true, // scale position when page sizes differ
        // Prompts - falsy for alert
        'syncRunning': false, // sync is running offer to cancel
        'syncCancelled': false, // alert that sync was cancelled
        'diffDocs': false, // alert that you need to select two different documents
        'tooFewDocs': false, // alert for too few documents
        'warnDocIDs': false, // alert for identical doc IDs
    });
    
    // settings
    const syncInterval = 30; // milliseconds to check for moved doc
    
    // global variables
    // to hold currently synced pdfs
    const docs = [];
    // to hold the last viewState for each pdf
    const states = [];
    // to hold doc IDs (for check that one hasn't closed)
    const docIDs = [];
    // to hold page number deltas
    const pDeltas = [];
    // to store the interval object
    let timer;
    // to store the index to the currently selected documents
    let diaIxs = [];

    // interval timeout were updated to allow functions in build 393
    const usePXEinterval = ('object' === typeof app.pxceVersion && app.pxceVersion[3] > 392);
    //console.println('using PXEversion? ' + usePXEinterval)
    //const clearInterval =  usePXEinterval ? app.clearInterval : xutil.clearInterval;
    //const setInterval = usePXEinterval ? app.setInterval : xutil.setInterval;
    
    // add priveliged function to get active docs
    const activeDocs = app.trustedFunction(() => {
        app.beginPriv();
        return app.activeDocs;
    });
    
    return () => {
        // array of currently active documents
        const currDocList = activeDocs();
        
        // get the global variables
        const syncPrefs = PREFS.get();
        
        // for hide dialog check box
        const ckHide = { cMsg: __( "Do not show this message again.", 'scrollSync'), bInitialValue: false };
        
        // for the menu to check if it's active - also will clear the interval if a document goes missing
        // returns true for active
        scrollSync.isActive = ()=> !!(timer && checkSync());
        
        // returns false if document is missing
        // globals: docs
        function checkSync() {
            // no need to check if no timer
            if (!timer) return; // falsy
            // save last valid document
            let cnt = 0;
            let vDoc;
            for (let d of docs) {
                const docID = getID( d );
                if (docIDs.includes(docID)) {
                    cnt++;
                    vDoc = d;
                }
            }
            // depending which document was active when the sync started, the interval may have been cancelled anyway
            // @todo fewer than 2 synced documents open
            if (cnt < docs.length) {
                // cancel sync
                clearReset();
                
                if (!syncPrefs.syncCancelled && vDoc) {
                    // activate the last valid doc because timeouts get eliminated as soon as a document gets closed
                    vDoc.bringToFront();
                    // using closure
                    const cnclAlert = ()=>{
                        app.alert({ cMsg: __("Synchronisation of views cancelled because of missing document.", 'scrollSync'),
                            //nType: 0, //ok
                            cTitle: __( "Sync Cancelled", 'scrollSync'),
                            oCheckbox: ckHide });
                        syncPrefs.syncCancelled = ckHide.bAfterValue;
                        // save preferences!
                        PREFS.save( syncPrefs );
                    };
                    // use timeout because this may be called from cMarked menu event
                    if (usePXEinterval) {
                        app.setTimeOut( cnclAlert, 1);
                    } else {
                        xutil.setTimeout( cnclAlert, 1);
                    }
                } else {
                    console.println(__("Synchronisation of views cancelled because of missing document.", 'scrollSync'));
                }
                return false;
            }
            return true;
        }
        
        // added for case where docID has not been assigned by pdf creator
        // uses file name as proxy
        function getID( doc ) {
            // doc may be dead
            try {
                return doc.docID.join('') || doc.documentFileName;
            } catch {
                return '';
            }
        }
        
        // set up docs and docIDs arrays to selected documents
        // globals: docs, docIDs, currDocList
        function setDocs( dialogIxs, docNames) {
            docIDs.length = 0;
            docs.length = 0;
            // @todo move out of dialog
            //console.println("Setting up docs array")
            for (let currix of dialogIxs) {
                // selected document
                let docN = currDocList[ currix ];
                docs.push(docN);
                //console.println(JSON.stringify([currix,Object.keys(currDocList)]))
                
                let docID = getID( docN );
                // warning of identical document ID
                if ( docIDs.includes( docID)) {
                    
                    // find name of matching document
                    let diaix = docIDs.indexOf(docID);
                    
                    const warn = __( 'Warning: Documents "%1" and "%2" have the same document IDs.', 'scrollSync', docNames[currix], docNames[diaix]);
                    
                    if (!syncPrefs.warnDocIDs) {
                        const res = app.alert({ cMsg: warn,
                            nType: 1, //ok cancel
                            cTitle: __( "Sync Views", 'scrollSync'),
                            oCheckbox: ckHide });
                        syncPrefs.warnDocIDs = ckHide.bAfterValue;
                        if (2 === res) return false;
                    } else {
                        console.println( warn);
                    }
                }
                docIDs.push( docID);
            }
            return true;
        }
        
        // set up states to current values
        // globals: states, docs, syncPrefs
        // @todo initial sync of page numbers, zoom, etc
        function setStates() {
            const vsStates =  getVsStates(syncPrefs, syncPrefs.ckPageNo);
            // reset states
            states.length = 0;
            for (let i in docs) {
                // @todo: check which need to be overridden by doc1
                const overrides = {};
                if (i) {
                    vsStates.forEach( ov => overrides[ov] = docs[0].viewState[ov]);
                }
                states[i] = Object.assign({},docs[i].viewState, overrides);
            }
        }
        
        // set up page deltas to current delta from doc1
        // globals docs, pDeltas
        function setPgDeltas() {
            pDeltas.length = 0;
            const d1Pg = docs[0].pageNum;
            for (let dix in docs) {
                pDeltas[dix] = d1Pg - docs[dix].pageNum;
            }
        }
        
        // clear the interval and reset variables
        function clearReset() {
            
            if (usePXEinterval) {
                app.clearInterval(timer);
            } else {
                xutil.clearInterval(timer);
            }
            //clearInterval(timer);
            timer = null;
            // reset docs
            docs.length = 0;
            // reset tabgroups
            if (syncPrefs.setVertSplit || syncPrefs.setHorzSplit) app.execMenuItem('cmd.window.allDocsToOneTabGroup');
        }
        
        // get which states to sync as array
        function getVsStates(pref, wPage = true) {
            const vsCheck = [];
            // check zoom
            if (pref.ckZoom) {
                vsCheck.push( 'pageViewZoom', 'pageViewZoomType'); // maybe remove zoomType
            }
            // check pan
            if (pref.ckPan) {
                vsCheck.push( 'pageViewY', 'pageViewX');
            }
            // check rotation
            if (pref.ckRotation) {
                vsCheck.push( 'pageViewRotation');
            }
            // check layout
            if (pref.ckPageLayout) {
                vsCheck.push( 'pageViewLayoutMode');
            }
            // check page change
            if (wPage && pref.ckPage) {
                vsCheck.push( 'pageViewRow', 'pageViewPageNum'); //, 'pageViewPageNum'
            }
            return vsCheck;
        }
        
        // function run by the interval
        function doSync(prefs, docs, states, pDeltas) {

            try {
                const updateDoc = new Set();
                // for deciding if the changes are big enough to warrant updating
                const isChanged = (delta, d, property) => {
                    const minDelta = ('pageViewY' === property || 'pageViewX' === property) ? 1 / d.viewState.pageViewZoom : 0.001;
                    return Math.abs(delta) > minDelta;
                };
                const vsCheck =  getVsStates(prefs);
                
                // monitor resolution
                const resolution = 96;
                // screen dimensions
                const scDims = docs.map( d => {
                    const [px0,py0,px1,py1] = d.pageWindowRect;
                    return [px1-px0, py1-py0].map( v => v * (72/resolution) / d.viewState.pageViewZoom);
                });
                
                // page dimensions
                // this would be out of date on all other documents if page changed
                const pgDims = docs.map( d => {
                    // get this page box
                    const pBox = d.getPageBox('Crop', d.viewState.pageViewRow);
                    return [pBox[2]-pBox[0], pBox[1]-pBox[3]];
                });

                /** page proportions
                  * @param v - value to scale
                  * @param i - base document index (the one that v is from)
                  * @param j - destination document index
                  * @param xy - 0 = x, 1 = y
                **/
                const pgProportion = (v,i,j,xy) => {
                    // screen dims - ignore if a document fits fully in the screen
                    let di = scDims[i][xy];
                    let dj = scDims[j][xy];
                    if ( pgDims[i][xy] <= scDims[i][xy] || pgDims[j][xy] <= scDims[j][xy]) {
                        di = 0;
                        dj = 0;
                    }
                    // scale the coordinates
                    let sc = (!prefs.scaleOvsPgs || i === j) ? v : (v * (pgDims[j][xy] - dj) / ( pgDims[i][xy] - di));
                    // keep the position maxed at the page dimension
                    if (sc > pgDims[j][xy]) {
                        sc = pgDims[j][xy];
                    }
                    return sc;
                };
                // BX or BY mapping
                const XY = { 
                    'pageViewX': { B: 'pageViewBX', i: 0},
                    'pageViewY': { B: 'pageViewBY', i: 1},
                };

                for (let i in docs) {
                    // Properties of viewState (build 394):
                    // pageViewLayoutMode, pageViewZoom, pageViewZoomType, pageViewRow, pageViewX, pageViewY, pageViewBX, pageViewBY, pageViewPageNum, pageViewRotation, ocgStates, overViewPos
                    

                    // check and update
                    for (let p of vsCheck) {
                        // this viewstate property value for doc i
                        let vs = docs[i].viewState[p];
                        
                        if ( (('pageViewX' === p || 'pageViewY' === p)  && updateDoc.has('pageViewZoom')) || isChanged(vs - states[i][p], docs[i], p)) {

                            // update all document saved viewstates
                            for (let j in docs) {
                                // save state
                                let val;
                                switch (p) {
                                  case 'pageViewX':
                                  case 'pageViewY':
                                    // need to adjust proportion later, once the zoom has been updated
                                    val = vs; //pgProportion( vs, i, j, XY[p].i);
                                    // add the border states
                                    states[j][XY[p].B] = docs[i].viewState[XY[p].B];
                                    break;
                            //      case 'pageViewZoom':
                            // This doesn't work because moving the page changes the page number - maybe could overwrite the state directly?
                            //        val = syncPrefs.scaleOvsPgs ? vs / Math.min(pgProportion( 1, i, j, 0), pgProportion( 1, i, j, 1)) : vs;
                            //        break;
                                    // check page number
                                  case 'pageViewPageNum':
                                  case 'pageViewRow':
                                    if (!prefs.ckPageNo && i !== j ) {
                                        // this is the delta between the current document and document i
                                        const pgD = pDeltas[i] - pDeltas[j];
                                        // pageViewRow may be less than PageNum when in ribbon view and the position is greater than the page size
                                        // may need to go around
                                        val = (vs + pgD) % docs[j].numPages;
                                        break;
                                    }
                                    /* falls through */
                                  default:
                                    val = vs;
                                }
                                // save which properties are updated
                                updateDoc.add(p);
                                //if (!updateDoc.includes(p)) updateDoc.push(p);
                                //console.println(`State "${p}" changing in doc ${i} new value "${val}" from ` + states[j][p])
                                states[j][p] = val;
                            }
                        }
                    }
                    // doc[i] has changed, so update the others
                    if (updateDoc.size) {

                        //console.println(`doc ${i} caused a change`)
                        // the screen dimensions need to be scaled if the source document has scaled
                        // scale them and then adjust the x and y coordinates
                        if (updateDoc.has('pageViewZoom')) {
                            for (let j in docs) {
                                if ( i === j) continue;
                                // scale the screen sizes
                                const prop =  states[i]['pageViewZoom'] / docs[j].viewState['pageViewZoom'];
                                scDims[i] = scDims[i].map( d => d * prop);
                                // scale page coordinates
                                ['pageViewX', 'pageViewY'].forEach( p => states[j][p] = pgProportion( states[j][p], i, j, XY[p].i));
                            }
                        }
                        
                        // update the other document viewstates
                        for (let j in docs) {
                            if ( i === j) continue;
                            
                            // items that we're not looking at should not get overridden
                            // update states with all items that are not in vsCheck
                            for (let p in states[i]) {
                                switch (p) {
                                  // these are not explicitly in vsCheck
                                  case 'pageViewBX':
                                  case 'pageViewBY':
                                    if (prefs.ckPan || updateDoc.has('pageViewZoom')) continue;
                                    break;
                                  default:
                                    if (vsCheck.includes(p)) continue;
                                }
                                // overwrite by current (ie don't change)
                                states[j][p] = docs[j].viewState[p];
                            }
                            
                            // update viewstate
                            docs[j].viewState = states[j];
                            // the new viewState may not stick (ie view is out of page range)
                            // save back to states so that it doesn't push the changed document back at next interval
                            for (let p of vsCheck) {
                                // isChanged means that the two values are different, so it didn't stick
                                if ( isChanged( docs[j].viewState[p] - states[j][p], docs[j], p)) {
                                    //console.println('reverting doc ' + j + ' property ' + p);
                                    states[j][p] = docs[j].viewState[p]; 
                                }
                            }
                        }
                        // don't need to check other documents for changes
                        break;
                    }
                }
            } catch (err) {
                clearReset();
                console.println(__("There was an unexpected error! See below for more information.", 'scrollSync'));
                console.println(JSON.stringify(err));
            }
        }
        
        // reset the 'do not ask' boxes
        function resetAllPrompts() {
            const promptOpts = [ 'syncRunning', 'diffDocs', 'tooFewDocs', 'syncCancelled', 'warnDocIDs'];
            promptOpts.forEach( p => syncPrefs[p] = false );
            app.alert( {cMsg: __( "All \"%1\" boxes are reset.", 'scrollSync', ckHide.cMsg),
                nIcon: 3, //Status
                cTitle: __( "Sync Views", 'scrollSync') });
        }
        
        /** search through object
          * @param {object} obj - the object to search
          * @param {string} prop - the property to check
          * @param {string} val  - the property value to compare
          * @param {string} elements - the property that contains sub-arrays
          * @returns first child object with prop === val; or undefined if not found
        **/
        function getObj( obj, prop, val, elements = 'elements' ) {
            let found;
            if ( obj[prop] === val ) return obj;

            if ( obj[elements]) {
                for (let e in obj[elements]) {
                    // recursively check
                    found = getObj( obj[elements][e], prop, val );
                    if (found) break;
                }
            }

            return found;
        }
        
        ////////////////////////////////
        //   main function
        ////////////////////////////////

        if (null != timer) { // jshint ignore:line
            // dialog to check if user wants to cancel sync or edit it
            const csDialog = {
                initialize () {
                },
                // ok button
                commit (dialog) {
                    this.results = dialog.store();
                    // return 'ok'
                },
                // other button
                other (dialog) {
                    this.results = dialog.store();
                    dialog.end('edit');
                },
                description: {
                    name: __( "Sync Views", 'scrollSync'),
                    elements: [
                        { type: 'static_text', name: __( "Synchronization is currently running. Do you want to Stop it or Edit the sync?", 'scrollSync'), bold: true, width: 340 },
                        { type: 'check_box', item_id: 'snRn', name: __( "Do not show this message again.", 'scrollSync'), width: 340 },
                        //{ type: "ok_cancel_other", ok_name: "Stop Sync", other_name: "Edit Sync" }
                    ]
                }
            };
            // only offer to Edit sync if there are enough documents
            if (currDocList.length < 2) {
                csDialog.description.elements.splice(1,0,{ type: 'ok_cancel', ok_name: __( "Stop Sync", 'scrollSync') });
            } else {
                csDialog.description.elements.splice(1,0,{ type: 'ok_cancel_other', ok_name: __( "Stop Sync", 'scrollSync'), other_name: __( "Edit Sync", 'scrollSync') });
            }
            // maybe skip this dialog
            const diaResult = syncPrefs.syncRunning ? ['','ok','edit'][syncPrefs.syncRunning] : app.execDialog(csDialog);
 
            switch (diaResult) {
              case 'ok':
                clearReset();
                if (csDialog.results?.snRn) syncPrefs.syncRunning = 1;
                /* falls through */
              case 'cancel':
                return;
              case 'edit':
                clearReset();
                if (csDialog.results?.snRn) syncPrefs.syncRunning = 2;
            }
        } else {
            if (currDocList.length < 2) {
                if (!syncPrefs.tooFewDocs) {
                    app.alert({cMsg: __( "There need to be at least two opened documents.", 'scrollSync'),
                        nIcon:1,
                        cTitle: __( "Sync Views", 'scrollSync'),
                        oCheckbox: ckHide });
                    syncPrefs.tooFewDocs = ckHide.bAfterValue;
                }
                return console.println( __( "Less than two documents", 'scrollSync'));
            }
        }
        
        // set up preferences dialog
        const prefDialogMap = new Map([
            [ 'ckXY', 'ckPan'],
            [ 'scOP', 'scaleOvsPgs'],
            [ 'ckZm', 'ckZoom'],
            [ 'ckRt', 'ckRotation'],
            [ 'ckLy', 'ckPageLayout'],
            [ 'ckPg', 'ckPage'],
            [ 'ckPN', 'ckPageNo'],
            [ 'stpv', 'setVertSplit'],
            [ 'stph', 'setHorzSplit'],
        ]);
        // number of documents to show
        let nDiaDocs = 2;
        // array of document dialog boxes
        const diaBoxes = [];

        // dialog object
        const dialog = {
            docList: [], // array of file names
            //diaBoxes: ['lst1', 'lst2'],
            results: {},
            initialize (dialog) {
                // set up document name list
                let newDocs = 1;
                const fName = (d) => (d.documentFileName.length ? d.documentFileName : __("New Document %1", 'scrollSync', newDocs++));
                this.docList = currDocList.map( fName);
                // add number of pages to file name
                const docsWithPgs = this.docList.map( (n,i) => n + __(" (%1 pages)", 'scrollSync', currDocList[i].numPages));
                
                const dLoad = {};
                // load the dropdowns
                
                diaBoxes.forEach( (k,i) => {
                    // try to find current docs if there are any
                    //let ix = docs.length ? currDocList.indexOf( docs[i] ) : i;
                    //if (ix < 0) ix = i;
                    // diaIxs should have index of previously picked documents
                    let ix = (diaIxs[i] ?? i) % currDocList.length;
                    //console.println(ix + ' : ' +JSON.stringify(diaIxs))
                    dLoad[k] = this.getListboxArray( docsWithPgs, ix);
                    // get page numbers
                    dLoad['pgs' + (i+1)] = currDocList[ix].pageNum + 1;
                });
                // apply prefs to dialog
                prefDialogMap.forEach( (v,k) => dLoad[k] = syncPrefs[v]);
                // set page numbers
                Object.assign( dLoad, this.updatePageNumber( dLoad, dLoad.ckPN));
                
                dialog.load(dLoad);
                // enable page number check box
                this.ckPg(dialog);
                // enable add document
                dialog.enable({'addD': nDiaDocs < currDocList.length});
                // hide delete buttons if two documents
                if (nDiaDocs < 3) {
                    const dHide = {};
                    diaBoxes.forEach( (k,i)=> dHide[`del${i}`] = false);
                    dialog.visible(dHide);
                }
            },
            commit (dialog) {
                this.results = dialog.store();
                
                // get doc ids
                for (let k of diaBoxes) {
                    this.results[k] = this.getIndex(this.results[k]);
                }
                // return 'ok'
            },
            validate (dialog) {
                const data = dialog.store();
                const prevs = [];
                
                let failedValidate = false;
                for (let k of diaBoxes) {
                    let docN = this.getIndex(data[k]);
                    
                    if (prevs.includes( docN )) {
                        failedValidate = true;
                        break;
                    }
                    prevs.push(docN);
                }
                if (!failedValidate) return true;
                // identical documents picked
                
                if (!syncPrefs.diffDocs) {
                    app.alert({ cMsg:__( "Choose different files.", 'scrollSync'),
                        nType: 0, // 'ok'
                        cTitle: __( "Sync Views", 'scrollSync'),
                        oCheckbox: ckHide
                    });
                    syncPrefs.diffDocs = ckHide.bAfterValue;
                }
                return false;

            },
            // These functions added before dialog called
            //// change to document

            //// show the document & page

            //// change to page numbers

            //// delete document

            // change to documents
            chDocs(dialog, ix) {
                const list_box = 'lst' + ix;
                //const pg_prefix = 'pgs' + ix;
                
                const data = dialog.store();
                const d = this.getDocFromDia( data[list_box]);
                d.bringToFront();
                
                // update page number
                dialog.load( this.updatePageNumber( data, data.ckPN));
            },
            // delete document
            delDoc(dialog, ix) {
                // reduce number of documents
                nDiaDocs--;
                // remove this one from the list
                diaBoxes.splice(ix,1);
                this.commit(dialog);
                dialog.end('rev');
            },
            // add document
            addD(dialog) {
                nDiaDocs++;
                this.commit(dialog);
                dialog.end('rev');
            },
            // change to page change check box
            ckPg(dialog) {
                const data = dialog.store();
                const syncNumbers = data.ckPN && data.ckPg;
                const dEnable = this.enablePageNumbers( !syncNumbers);
                dEnable.ckPN = data.ckPg;
                dialog.enable( dEnable);
            },
            // change to page number sync box
            ckPN(dialog) {
                const data = dialog.store();
                const syncNumbers = data.ckPN && data.ckPg;
                // update the page numbers
                dialog.load( this.updatePageNumber( data, syncNumbers));
                // enable page number
                dialog.enable( this.enablePageNumbers( !syncNumbers));
            },
            enablePageNumbers( enable) {
                const pg_prefix = 'pgs';
                const dEnable = {};
                diaBoxes.forEach( (v,i) => {
                    // only change if i>0 (first document never disabled)
                    if (i) dEnable[ pg_prefix + i] = enable; //(i+1)
                });
                return dEnable;
            },
            // ix is index (suffix number)
            pgsChange( dialog, ix) {
                const list_box = 'lst';
                const page_box = 'pgs';
                const data = dialog.store();
                const dLoad = {};
                // update page in documents and on the dialog
                for (let i = diaBoxes.length; i--;) {
                    // if pages are synced, update all documents
                    if ( !(data.ckPN || i === ix)) continue;
                    
                    const d = this.getDocFromDia( data[list_box + i]); //(i+1)

                    let selectedPage = parseInt(data[page_box + ix]); //(ix+1)
                    // cannot go beyond number of pages in document
                    if (selectedPage > d.numPages) {
                        selectedPage = d.numPages;
                    } else if (selectedPage < 1) {
                        selectedPage = 1;
                    }
                    dLoad[page_box + i] = selectedPage; //(i+1)
                    
                    if (i === ix) d.bringToFront();
                    d.pageNum = selectedPage - 1;
                }
                dialog.load( dLoad );
            },
            // change to vert/horiz check box
            stpv(dialog) {
                if (dialog.store().stpv) dialog.load({'stph': false});
            },
            stph(dialog) {
                if (dialog.store().stph) dialog.load({'stpv': false});
            },
            // reset prompts
            xDia(){
                resetAllPrompts();
            },
            // returns object to be loaded into dialog
            updatePageNumber( data, syncNumbers = false) {
                const pg_prefix = 'pgs';
                
                const dLoad = {};
                diaBoxes.forEach( (d,i) => {
                    // index to selected document or document 1 if 
                    let iData = data[ syncNumbers ? diaBoxes[0] : d ];
                    
                    dLoad[pg_prefix + i] = this.getDocFromDia(iData).pageNum + 1; //(1 + i)
                });

                return dLoad;
            },
            // get document from dialog box data
            getDocFromDia ( diaData ) {
                let docix = this.getIndex( diaData );
                return currDocList[docix];
            },
            // get selected index from list box object
            getIndex( elements) {
                const ixs = []; // allow list for multi_select PXE > 392
                for(let i in elements) {
                    if ( elements[i] > 0 ) {
                        ixs.push( elements[i]-1 ); // 0 based index
                    }
                }
                //return ixs; // **** always returns an array ******
                return ixs.length > 1 ? ixs : ixs[0];
            },
            // create object array suitable for the listbox. selItem is index
            // returned array is {"Displayed option":-order,...}
            // allows multiple selections
            getListboxArray(vals, selItem=0) {
                let sub = {};
                if (!Array.isArray(selItem)) selItem = [selItem];
                for (let i=0; i<vals.length; i++) {
                    // if multiple duplicate names, add counter
                    let counter = '';
                    if (sub[vals[i]]) {
                        let j=0;
                        while (sub[vals[i] + '_' + (++j) ]);
                        counter = '_' + j ;
                    }
                    // positive number if selected
                    sub[vals[i] + counter] = (selItem.includes(i) ? 1 : -1) * ( i + 1);
                }
                return sub;
            },
            description: { name: __( "Sync Views", 'scrollSync'), align_children: 'align_left', elements: [
                { type: 'static_text', name: __( "Choose which documents to sync:", 'scrollSync'), bold: true, width: 380 },
                // to hold the document pickers
                { type: 'view', item_id: 'dHdr', width: 380, elements: []},
                // add a document
                { type: 'button', item_id: 'addD', name: '+', font: 'title', bold: true, width: 22, height: 22 },
                { type: 'cluster', name: __( "Settings", 'scrollSync'), align_children: 'align_distribute', alignment: 'align_fill', elements: [
                    { type: 'view', align_children: 'align_left', elements: [
                        { type: 'check_box', item_id: 'ckXY', name: __( "Sync page position (pan)", 'scrollSync'), width: 180 },
                        { type: 'check_box', item_id: 'ckZm', name: __( "Sync page zoom", 'scrollSync'), width: 180 },
                        { type: 'check_box', item_id: 'ckRt', name: __( "Sync view rotation", 'scrollSync'), width: 180 },
                        { type: 'check_box', item_id: 'ckLy', name: __( "Sync view layout", 'scrollSync'), width: 180 },
                        { type: 'check_box', item_id: 'ckPg', name: __( "Sync changing pages", 'scrollSync'), width: 180 },
                        { type: 'view', align_children: 'align_row', elements:
                            [{ type: 'gap', width: 15},
                                { type: 'check_box', item_id: 'ckPN', name: __( "Also sync page numbers", 'scrollSync'), width: 160 }
                            ]},
                    ]},
                    { type: 'view', align_children: 'align_left', elements: [
                        { type: 'static_text', separator: 1, name: __( "View", 'scrollSync'), width: 180},
                        { type: 'check_box', item_id: 'stpv', name: __( "Open vertical split view", 'scrollSync'), width: 180 },
                        { type: 'check_box', item_id: 'stph', name: __( "Open horizontal split view", 'scrollSync'), width: 180 },
                        { type: 'check_box', item_id: 'scOP', name: __( "Scale view if page sizes differ", 'scrollSync'), width: 180 },
                        { type: 'static_text', separator: 1, name: __( "Prompts", 'scrollSync'), width: 180},
                        { type: 'button', name: __( "Reset dialogs", 'scrollSync'), item_id: 'xDia'},
                    ]},
                ]},
                { type: 'ok_cancel', ok_name: __( "Sync", 'scrollSync') }
            ]}
        };
        
        const pickerTemplate = (ix) => {
            return { type: 'cluster', align_children: 'align_left', elements: [ //, name: __( "Doc %1", 'scrollSync', 1)
                { type: 'popup', item_id: `lst${ix}`, width: 370 },
                { type: 'view', align_children: 'align_row', elements: [
                    { type: 'button', name: '‒', item_id: `del${ix}`, font: 'title', bold: true, width: 22, height: 22},
                    { type: 'button', name: __( "Show", 'scrollSync'), item_id: `shw${ix}`},
                    { type: 'static_text', name: __( "Starting page:", 'scrollSync'), alignment: 'align_right', width: 120},
                    { type: 'edit_text', item_id: `pgs${ix}`, alignment: 'align_left', SpinEdit: true},
                ]}
            ]};
        };
        /////////////////////
        // run the dialog
        /////////////////////
        let diaResult = 'rev';
        while ('rev' === diaResult) {
            // set up dialog
            const pickBase = getObj( dialog.description, 'item_id', 'dHdr');
            // remove any pickers from dialog
            pickBase.elements.length = 0;
            diaBoxes.length = 0;
            for (let i = 0; i < nDiaDocs; i++) {
                // diaBoxes list
                diaBoxes.push( `lst${i}`);
                // add picker to dialog
                pickBase.elements.push( pickerTemplate(i));
                // add functions to dialog
                // change to document
                dialog[`lst${i}`] = (dia)=>dialog.chDocs(dia, i);
                // show the document & page
                dialog[`shw${i}`] = (dia)=>dialog.pgsChange(dia, i);
                // change to page numbers
                dialog[`pgs${i}`] = (dia)=>dialog.pgsChange(dia, i);
                // delete document
                if (nDiaDocs > 2) {
                    dialog[`del${i}`] = (dia)=>dialog.delDoc(dia, i);
                }
            }
            diaResult = app.execDialog(dialog);
            // one of the diaboxes may have been deleted
            diaIxs = diaBoxes.map( k => dialog.results[k]);
        }
        if ( diaResult !== 'ok') return "User cancelled";
        
        // write back prefs
        prefDialogMap.forEach( (v,k) => syncPrefs[v] = dialog.results[k]);

        // update global docs, docIDs
        
        if (!setDocs( diaIxs, dialog.docList)) return "User cancelled";
        
        // set up states
        setStates();
        
        // set up page deltas
        setPgDeltas();
        
        // save preferences
        PREFS.save( syncPrefs );
        
        // bring documents to front and split pages
        // work from end
        for( let i=docs.length; i--;) {
            const d = docs[i];
            d.bringToFront();
            // don't move doc 0 to new tab group!
            if (i && syncPrefs.setVertSplit) {
                app.execMenuItem('cmd.window.activeDocToNewVertTabGroup');
            } else if (i && syncPrefs.setHorzSplit) {
                app.execMenuItem('cmd.window.activeDocToNewHorzTabGroup');
            }
        }

        // start interval
        // repeated code - can't assign function to variable or even use ternary operator
        if (usePXEinterval) {
            timer = app.setInterval( function() {

                if (!checkSync()) return; // cancelled
                if (null != timer) { // jshint ignore:line
                    
                    doSync(syncPrefs, docs, states, pDeltas);
                }
            }, syncInterval);  
        } else {
            timer = xutil.setInterval( function() {

                if (!checkSync()) return; // cancelled
                if (null != timer) { // jshint ignore:line
                    
                    doSync(syncPrefs, docs, states, pDeltas);
                }
            }, syncInterval);
        }
        
    };
})();


