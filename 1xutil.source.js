/** Additional utilites for PDF javascript
  *
  * <pre>version history:
  *  x0.9   2025-08-21 add xutil.version; defaults to built-in interval and timeout functions for build 397+ (xutil.usePXEinterval = false to force the xutil version)
  *  v0.8.1 2025-08-06 Clearly cite license
  *  v0.8   2025-07-30 Add GetPageRectangle class; add methods for working with point coordinates rotatePoint(), rotateCoords(), getBounds(), bxCtr()
  *  v0.7   2025-04-04 PXEmacro revisions, getNewAnn revisions, added xutil.addBookmark()
  *  v0.6   2025-03-31 fix alphabetize function; add methods dealphabetize, deromanize, fromNumberType
  *  v0.5   2024-12-12 fix bugs and add return function for cancel in getNewAnn(), add parameter to setTimeout so can request an ID (makes dealing with cancelling timeouts in running intervals easier)
  *  v0.4   2024-12-03 changed parameters supplied to timeout and interval return functions, code cleanup
  *  v0.3   2024-05-08 added xutil.PXEmacro()
  *  v0.2   2024-05-03 added xutil.getNewAnn()
  *  v0.1.1 2024-04-28 added _XUTIL_DEBUG_ option
  *  v0.1.0 2024-04-12 </pre>
  *
  * @example
  * // xutil will display additional console debug info if you set the global variable _XUTIL_DEBUG_ = true
  * _XUTIL_DEBUG_ = true
  *
  * @author mathew bittleston
  * @license MIT
  *
  * @namespace xutil
**/

// generate jsdoc
//>jsdoc -c __jsDocConfig.json xutil.source.js xutil.colorUtils.source.js xutil.stampUtils.source.js 

// create the 'xutil' utility object at the global scope, and try to prevent its overwriting

if ('undefined' === typeof xutil) {
    Object.defineProperty( globalThis, 'xutil', { value: {}, writable: false });
}

// version
{
    const version = { 
        get xutil() {return [0,9,0];},
        get getNewAnn() {return [0,6,0];},
        get PXEmacro() {return [0,4,0];},
        get addBookmark() {return [3,0,0];},
        get GetPageRectangle() {return [1,0,0];}
    };
    
    if (!xutil.version) xutil.version = {};
    Object.assign( xutil.version, version );
}

////////////////////////////////////////////////////////////////////////////////////////
/// custom xutil.setInterval and xutil.setTimeout (note same capitalization as core js)
////////////////////////////////////////////////////////////////////////////////////////

// interval, timeout were updated to allow functions in build 393
// but disabled because setInterval crashes if cancelled inside interval until build 397
xutil.usePXEinterval = ('object' === typeof app.pxceVersion && app.pxceVersion[3] > 396);

/** Set a repeating interval: xutil.setInterval()
  * If a string is supplied for the func argument, then it just calls the built in interval/timeout functions
  * need to use xutil.clearTimeout() to clear the global variable
  *
  * @example xutil.setInterval( iFunc, nMilliseconds, ...additionalArgs )
  *   // where additionalArgs are optional additional args passed directly to iFunc
  * @arguments passed to iFunc ( ...additionalArgs )
  *     
  * @function
  * @param {function} iFunc - The function to call at nMilliseconds
  * @param {integer} nMilliseconds - The time period in milliseconds
  * @param [arg1, ...argN] - Additional arguments which are passed through to the function
  *   if no additionalArgs supplied, then 'this' (current document) is supplied to the return function
  *      <i>Note: This may not be the same document as when the timout/interval was set up!</i>
  * @param {integer} [args[0].intervalID] - try to set this as the interval/timeout number (must use args object to use this)
  *
  * @returns {integer} - The value which identifies the timer created (zero if fails)
  * 
*/
xutil.setInterval = function(...args) {
    return xutil.setupTimeoutFunction( 'Interval', args );
};      

/** Set a timeout: xutil.setTimeout()
  * @see {@link xutil.setInterval} for details
  * @function
  * @param {function} iFunc - The function to call at nMilliseconds
  * @param {integer} nMilliseconds - The time period in milliseconds
  * @param [arg1, ...argN] - Additional arguments which are passed through to the function
  *
  * @returns {integer} - The value which identifies the timer created (zero if fails)
  * 
*/
xutil.setTimeout = function(...args) {
    return xutil.setupTimeoutFunction( 'Timeout', args );
};

/** Utility function for setTimeout() and setInterval().
  * @param {string} type - Either "interval" or "timeout" case insensitive
  * @param args - arguments to be passed on to the interval or timeout function
  * @param [args[0].intervalID] - try to set this as the interval number
  * @private
**/

xutil.setupTimeoutFunction = function( type, args ) {
    // if string, pass on to built-in functions
    let intScript = args[0].iFunc ?? args[0].iFunc ?? args[0];
    
    if ( "string" === typeof intScript || xutil.usePXEinterval ) {
        let debugMsg = xutil.usePXEinterval ?
            'PDF-XChange build 393 allows functions. Calling built-in app.' :
            'String parameter cExpr provided. Calling built-in app.';
        if ( "interval" === type.toLowerCase()) {
            if ('undefined' !== typeof _XUTIL_DEBUG_ && _XUTIL_DEBUG_) console.println(debugMsg + 'setInterval()');
            return app.setInterval(...args);
        } else {
            if ('undefined' !== typeof _XUTIL_DEBUG_ && _XUTIL_DEBUG_) console.println(debugMsg + 'setTimeOut()');
            return app.setTimeOut(...args);
        }    
    }
    
    // create variable at global scope
    if ('undefined' === typeof _xutil_IntervalData) {
        /** @global
          * @private */
        globalThis._xutil_IntervalData = [];
    }
    const data = _xutil_IntervalData;
    // get the requested interval number
    let intervalNo = (args[0].intervalID ?? 1) - 1;

    switch (type.toLowerCase()) {
      case "timeout":
      case "interval":
        if (intScript === jshelp) paramHelp(type);
        // get passed arguments
        //intScript = args[0].iFunc ?? args[0]; // already done above
        const rptMils = args[0].nMilliseconds || args[1] || 10; // don't accept zero
        // find next interval
        while ( data[intervalNo] ) intervalNo++;
        // get any additional arguments
        const addArgs = args[0].cArgs ?? args.slice(2);
        // create object for return function
        data[intervalNo] = { func: intScript, args: addArgs, type:type.toLowerCase() };
        // string argument to send to built in functions
        const argScript = "xutil.handleTimeoutFunction(this," + (intervalNo) + ")"; // sending index, not ID
        // start interval
        if ( "timeout" === type.toLowerCase() ){
                data[intervalNo].id = app.setTimeOut( argScript, rptMils );
        } else {
                data[intervalNo].id = app.setInterval( argScript, rptMils );
        }
        // interval ID is 1 or greater if set up
        intervalNo += 1;
        break;
      default:
        if ('undefined' !== typeof _XUTIL_DEBUG_ && _XUTIL_DEBUG_) console.println('Only "Interval" or "Timeout" accepted. Unknown type: '+type);
    }

    if ('undefined' !== typeof _XUTIL_DEBUG_ && _XUTIL_DEBUG_ && intervalNo) console.println(`${type} ${intervalNo} started.`);
    
    return intervalNo;

    // help function
    function paramHelp(app) { throw new Error(`HelpError: Help
xutil.set${app}
====> iFunc: callback function
====> nMilliseconds: integer
====> [...cArgs: ] arguments to callback function`, {cause:'HelpError'});
    }

};

/** Utility function for setTimeout() and setInterval().
  * This handles the timeout or interval and calls the function supplied
  * @param {object} doc - The current document object
  * @param {integer} intervalIx - The interval/timeout number
  * @private
*/
xutil.handleTimeoutFunction = function( doc, intervalIx ) {
    const data = _xutil_IntervalData;
    let ix = parseInt(intervalIx); // may come as a string - this is the zero based index, not ID
    if (data[ix]) {
        // get this first so that it can be cleared before the timeout function is called
        const tf = data[ix];
        // clear data if it's a timeout and hasn't already been cleared
        if ( data[ix] && 'timeout' === data[ix].type ) delete data[ix]; // leave a gap
        
        if ( tf.args.length ) {
            tf.func( ...data[ix].args );
        } else {
            tf.func( doc );
        }
    } else {
        if ('undefined' !== typeof _XUTIL_DEBUG_ && _XUTIL_DEBUG_) console.println('Unknown timeout/interval index "'+intervalIx+'"');
    }
};

/** Clear a timeout or interval.
  * If an object is passed, it will just pass this on to app.clearTimeout()
  *
  * Either clearTimeout() or clearInterval() may be used because it just looks at the intervalID.
  *     <i>It is a bit different than core clearInterval() because if nothing is passed, it will clear the most recent interval/timeout</i>
  *
  * @param {integer} [intervalID] - The value which identifies the timer created (returned by setInterval() or setTimeout())
  * 
*/
xutil.clearTimeout = function( intervalID ) {
    // interval timeout were updated to allow functions in build 393
    if (xutil.usePXEinterval) {
        if ('undefined' !== typeof _XUTIL_DEBUG_ && _XUTIL_DEBUG_) console.println('PXCE > build 392. Calling built-in app.clearTimeOut().');
        return app.clearTimeOut( intervalID );
    }
    
    if (intervalID === jshelp) paramHelp();

    const data = _xutil_IntervalData || []; // in case undefined
    let ix;
    let debugMsg = '';
    
    switch ( typeof intervalID ) {
      case 'undefined':
        ix = data.length;
        while (ix && !data[--ix] ) {}
        debugMsg += 'No intervalID provided. Clearing ID#' + (ix + 1) + '.\n';
        break;
      case 'object':
        // could either be the built-in interval object, or a generic object
        // with .oInterval or .oTime containing the interval
        if ( intervalID.oInterval ) {
            intervalID = intervalID.oInterval;
        } else if ( intervalID.oTime ) {
            intervalID = intervalID.oTime;
        }
        
        // if it's still an object, just call the built-in timeout
        if ('object' === typeof intervalID) {
            if ('undefined' !== typeof _XUTIL_DEBUG_ && _XUTIL_DEBUG_) console.println('Object provided. Calling built-in app.clearTimeOut().');
            return app.clearTimeOut( intervalID );
        }
        /* falls through */
      default:
        ix = parseInt(intervalID) - 1;
    }
    // call built-in functions
    if ( data[ix] ) {
        if ( 'timeout' === data[ix].type ) {
            app.clearTimeOut( data[ix].id );
        } else {
            app.clearInterval( data[ix].id );
        }
        debugMsg += `Cleared ${data[ix].type} number ${intervalID}.`;
        // clear the interval data and leave a gap because other intervals have an index number
        delete data[ix];
    } else {
        debugMsg += `There is no Timeout/Interval number ${intervalID}. Nothing cleared.`;
    }
    
    return ('undefined' !== typeof _XUTIL_DEBUG_ && _XUTIL_DEBUG_) ? console.println( debugMsg ) : null;
    
    // help function
    function paramHelp() { throw new Error(`HelpError: Help
xutil.clearTimeout, xutil.clearInterval
====> [intervalID: integer] ID returned when timeout was set`, {cause:'HelpError'});
    }
    
};

/** Clear an interval.
  * @see xutil.clearTimeout
  * @function
**/

xutil.clearInterval = xutil.clearTimeout;

/***** End timeout functions *****/

/** Get an annotation as soon as it's drawn
  *
  * <pre>history:
  * v0.6 remove separate timeOut
  * v0.5 returns interval and timeout IDs so that can be cancelled, fix parameters as object, resolve bugs with cancelling during getting annotation
  * v0.4 convert to xutil.getNewAnn()
  * v0.3 use custom xutil.setInterval and xutil.setTimeout functions
  * doesn't realize if the document gets switched -- keeps running on original doc in background</pre>
  *
  * @returns {array} with one value interval ID
  * 
  * @todo This would be easier to use if set up as an async function, needs an easy way to be cancelled
  *
  *
  * @param {function} rFunc - return function (argument supplied is the newly drawn annotation, or nothing on failure)
  * @param {object} [oDoc] - document getting the annotation
  * @param {string} [cMenuItem] - the menu item to call with app.execMenuItem (default: "cmd.tool.annot.square")
  * @param {integer} [tInterval] - interval to check for changes (default: 100 ms)
  * @param {integer} [tWait] - time to wait before displaying dialog asking if more time is needed or cancel (zero to never display, default: 30000)
  * @param {string} [toMsg] - text of message to display after tWait (default: "Do you want more time?")
  * @param {function} [cFunc] - return function on cancel/fail
  *
  * @example // return function has one parameter to take the new annotation
  * function rFunc( newAnn ) {
  *     if (newAnn) {
  *         console.println('The new annotation is a ' + newAnn.type);
  *     } else {
  *         console.println('Nothing drawn');
  *     }
  * }
  * // start the drawing (default is a rectangle)
  * xutil.getNewAnn( rFunc );
  * 
**/

xutil.getNewAnn = function ( ...args ) {
    // display help
    if (args[0] === jshelp) return paramHelp();
    // return function is required
    let returnFunction = args[0].rFunc || args[0];

    if ('function' !== typeof returnFunction) throw new Error('Parameter error: xutil.getNewAnn(): Return function {rFunc} is required.');

    let doc = args[0].oDoc || args[1];
    // tool to activate
    let toolItem = args[0].cMenuItem ?? args[2] ?? "cmd.tool.annot.square";
    // interval to check at - cannot be zero
    let interval = args[0].tInterval || args[3] || 100;
    // timeout to ask if user wants to cancel, zero to have no timeout
    let timeout = args[0].tWait ?? args[4] ?? 30000;
    // timeout message
    let toMsg = args[0].toMsg ?? args[5] ?? "Do you want more time?";
    // cancel function
    let cancelFunction = args[0].cFunc ?? args[6] ?? null;
    // timeout title
    const toTitle = "Draw markup";
    // message to display in console
    const cmdMsg = `Waiting for new annotation ${toolItem}...`;
    // these variables hold the interval data in closure
    let ANNDATA;
    // this keeps track of how long the interval has been running
    let intervalTimer = new Date();

    // start the interval
    let intervalID = xutil.setInterval( function getNextAnnot(d) {
        // check if ran out of time
        const endEditing = timeout && (new Date() - intervalTimer) > timeout;
        
        if ( endEditing) {
            // pause doing anything (so this doesn't pop up multiple times)
            xutil.clearInterval(intervalID);
            if ( 1 === app.alert({cMsg:toMsg, nIcon:2, nType:1, cTitle:toTitle})) {
                // restart the timer
                intervalTimer = new Date();
                intervalID = xutil.setInterval( getNextAnnot, interval);
                // start the tool - should still be running
                //app.execMenuItem( toolItem );
            } else {
                // cancel and return
                if ('undefined' !== typeof _XUTIL_DEBUG_ && _XUTIL_DEBUG_) console.println("Cancelled.");
                xutil.clearInterval(intervalID);
                if (cancelFunction) cancelFunction();
            }
            
        } else {
            //intervalID saved to clear at end
            let p = (doc || d).pageNum;
            let anns = (doc || d).getAnnots({
                nPage: p,
                nSortBy: ANSB_ModDate
                });
            if ( !anns )
                anns = [];
            if (!ANNDATA || ANNDATA.p !== p || ANNDATA.c > anns.length) {
                // switched pages or annotation got deleted
                ANNDATA = {
                    p: p,
                    c: anns.length,
                };
            } else if (ANNDATA.c < anns.length) {
                // if multiple annotations are added at once, this will only get one of them
                xutil.clearInterval(intervalID);
                // send to function
                returnFunction(anns[0]);
            }
        }
    }, interval );
    
    // start the tool
    app.execMenuItem( toolItem );
    if ('undefined' !== typeof _XUTIL_DEBUG_ && _XUTIL_DEBUG_) console.println(cmdMsg);
    // return the interval id
    return [intervalID];
    // help function
    function paramHelp() { throw new Error(`HelpError: Help
xutil.getNewAnn
====> rFunc: return function
====> [oDoc: object] document
====> [cMenuItem: string] menu item to start
====> [tInterval: integer] milliseconds
====> [tWait: integer] milliseconds
====> [toMsg: string] alert after tWait`, {cause:'HelpError'});
    }
};

/***** End getNewAnn function *****/



/** PDFX-Change macros class for javascript
  *
  * </br>Note: SeqNum is a sequence for the current instance, and starts at 1
  *
  * <pre>version history:
  * v0.4 added static properties numberStyles, numberCodes & popupList; added methods initializePopup, handlePopup
  * v0.3 added dealphabetize, deromanize. Fixed alphabetize
  * v0.2 minor code cleanup
  * v0.1 initially made to work with bookmark name regions script
  * supports a limited number of macros</pre>
  *
  * @example
  * const newMacro = new xutil.PXEmacro(this, this.pageNum); // this.pageNum === 2
  * // get supported macros array
  * const macroNames = newMacro.names;
  * // replace macros on someText
  * let someText = 'This text is on page %[Page] of %[PagesCount]';
  * console.println(newMacro.apply(someText));
  * // >This text is on page 3 of 7
  * // update page number keeping sequence number (page number must be updated manually)
  * newMacro.page = this.pageNum++;
  * console.println(newMacro.apply(someText));
  * // >This text is on page 4 of 7
**/


xutil.PXEmacro = class {
    static mNames = ['SeqNum', 'Page', 'PagesCount', 'Label', 'FileName', 'Date']; // jshint ignore: line
    static mOpts = [':type;start', ':type;start', ':type;start', '', '', ':format'];
    static numberStyles = ['1, 2, 3 …', 'i, ii, iii …', 'I, II, III …', 'a, b, c …', 'A, B, C …'];
    static numberCodes = ['1', 'r', 'R', 'c', 'C'];
    /** page number - zero based, must be updated to update the page in the macro replacement (macro replaces %[Page] with this number + 1)
      * @type {integer} 
    **/
    page;
    // sequence number for this instance
    //seq; // should be undefined to get start
    // the document this instance works with
    doc;
    
    /** @param {object} doc - the document to reference with this class.
      *                       If you use new PXEmacro(jshelp) it will output help text
      * @param {integer} [page] - the starting page number (zero based)
    **/
    constructor(doc, page) {
        if (doc === jshelp) this.paramHelp();
        
        this.doc = doc;
        this.page = page ?? (doc?.pageNum ?? 0);
    }
    /** The names of all supported macros as an array
      * @type {array}
    **/
    static get names() {
        let names = this.mNames.map( (n, i) => `%[${n}${this.mOpts[i]}]`);
        return names;
    }
    get names() {
        return this.constructor.names;
    }
    /** array of macro names, with […] as the first item
    **/
    static get popupList() {
        return ['[…]'].concat(this.names);
    }
    /** initialize a popup dialog handler
      * @param {array} [addRows] - additional rows to add to a dialog
    **/
    initializePopup( addRows ) {
        this.pop = this.constructor.popupList.concat( addRows );
        return this.pop;
    }
    
    /** Apply the macros to sourceText
      * @param {string} sourceText - the text possibly containing macros
      * @returns {string} the text with all macros replaced
    */
    apply(sourceText) {
        if (sourceText === jshelp) this.paramHelp();
        
        let replTx = sourceText;
        // call methods for each of mNames that match
        for (let m of this.constructor.mNames) {
            let rX = new RegExp(`%\\[${m}:?(.*?)(;(.*?))?\\]`,'g');
            
            replTx = replTx.replace(rX, (r, p1, p2, p3) => this[m](p1, p3, p2));
        }
        return replTx;
    }
    // sequential number
    SeqNum(type, start) {
        if ('undefined' === typeof this.seq) {
            this.seq = start ?? 1; // sequence starts at 1
        }
        let val = this.seq++;
        
        return this.numberType(val, type);
    }
    // page number
    Page(type, start) {
        // @todo would be better to supply the page number
        let val = this.page + 1;
        if (start) val += start;
        
        return this.numberType(val, type);
    }
    PagesCount(type, start) {
        let val = this.doc.numPages;
        if (start) val += start;
        
        return this.numberType(val, type);
    }
    Label() {
        return this.doc.getPageLabel(this.page);
    }
    FileName() {
        return this.doc.documentFileName;
    }
    Date(format, p3, p2) {
        let d = new Date();
        // need to capture semicolon as part of format
        let fStr = format + (p2 ?? '');
        return util.printd(fStr, d);
    }
    
    // utility methods
    
    /** handle change to popup in a dialog
      * @param {object} dialog - the dialog object
      * @param {string} popIId - the item_id of the popup field
      * @param {string} txtIId - item_id of the text field to add the popup result to
    **/
    handlePopup(dialog, popIId, txtIId) {
        // popup dialog for page number options
        const macroOptions = {
            data:{},
            
            initialize(dialog) {
                let defaults = { 'styl': this.getListboxArray(xutil.PXEmacro.numberStyles), 'fNum': 1, 'nLen': 1};
                dialog.load(defaults);
            },
            
            commit(dialog) {
                let data = dialog.store();
                let styl = this.getIndex(data.styl);
                // zero means the style is numeric and padded by zero length nLen
                this.data = { 'styl': (styl ? xutil.PXEmacro.numberCodes[styl] : data.nLen),
                    'fNum': data.fNum };
            },
            
            styl(dialog) {
                let data = dialog.store();
                // only enable for item zero
                let dLoad = {'nLen': !this.getIndex(data.styl)};
                dialog.enable(dLoad);
            },
            
            // returns the index number of the first item with positive number value
            getIndex: function (elements) {
                for (let i in elements) {
                    if ( elements[i] > 0 ) {
                        return elements[i]-1; //i ; the index is the text of the dropdown
                    }
                }
            },
            // create object array suitable for the listbox. selItem is index
            // returned array is {"Displayed option":-order,...}
            getListboxArray: function(vals, selItem=0) {
                let sub = {};
                for (let i=0; i<vals.length; i++) {
                    // positive number if selected
                    sub[vals[i]] = ((selItem === i)?1:-1)*(i+1);
                }
                return sub;
            },
            
            description: {
                name: __( "Page Number Options", 'xutil'), // Dialog box title
                align_children: "align_left",
                elements:
                [{  type: 'view', align_children: 'align_row', elements:
                    [{  type: 'static_text', name: __( 'Number Style:', 'xutil'), width: 90, alignment: 'align_right',
                    },{ type: 'popup', width: 59, item_id: 'styl',
                    }]
                },
                {  type: 'view', align_children: 'align_row', elements:
                    [{  type: 'static_text', name: __( 'First Number:', 'xutil'), width: 90, alignment: 'align_right',
                    },{ type: 'edit_text', SpinEdit: true, width: 65, item_id: 'fNum',
                    }]
                },
                {  type: 'view', align_children: 'align_row', elements:
                    [{  type: 'static_text', name: __( 'Number Length:', 'xutil'), width: 90, alignment: 'align_right',
                    },{ type: 'edit_text', SpinEdit: true, width: 65, item_id: 'nLen',
                    }]
                },
                {   type: "ok_cancel"}]
            }
        };
        
        
        const data = dialog.store();
        let ix = macroOptions.getIndex(data[popIId]);
        // only do if index > 0
        if (ix) {
            const dLoad = {};
            const mx = this.pop;
            // @todo macro options for date
            let macroOpts = ix < 4 ? app.execDialog(macroOptions) : 'no options';
            switch(macroOpts) {
              case 'ok':
                // add macro + options to text field
                dLoad[txtIId] = data[txtIId] + mx[ix].replace('type', macroOptions.data.styl).replace('start', macroOptions.data.fNum);
                break;
              case 'no options':
                dLoad[txtIId] = data[txtIId] + mx[ix];
                // no break;
            }
            // reset the popup
            dLoad[popIId] = macroOptions.getListboxArray(mx);
            dialog.load(dLoad);
        }
        return ix;
    }
    

    // apply number type changes - starts at 1
    numberType(val, type) {
        if (type && !isNaN(type)) return util.printf(`%0${type}d`,val);
        if (isNaN(val)) return '';
        switch (type) {
          case 'r':
            val = this.romanize(val);
            break;
          case 'R':
            val = this.romanize(val).toUpperCase();
            break;
          case 'c':
            val = this.alphabetize(val -1);
            break;
          case 'C':
             val = this.alphabetize(val -1).toUpperCase();
            break;
        }
        return val;
    }
    // reverse number type changes starts at 1
    // @todo handle decimal points ie 01.20.30
    fromNumberType(val, type) {
        if (type && !isNaN(type)) return val;
        //if (isNaN(val)) return '';
        switch (type) {
          case 'r':
          case 'R':
            val = this.deromanize(val);
            break;
          case 'c':
          case 'C':
            val = this.dealphabetize(val) +1;
        }
        return val;
    }
    // @returns lower case
    // Starts at 0 === a but -1 === -a !
    // from a script by @AdamL posted at https://stackoverflow.com/a/21231012/29355257
    alphabetize(val) {
        // always start column at 1
        let column = val < 0 ? -val : val + 1;
        let letter = '';
        while (column > 0) {
            let temp = (column - 1) % 26;
            letter = String.fromCharCode(temp + 97) + letter;
            column = (column - temp - 1) / 26;
        }
        return (val < 0 ? '-' : '') + letter;
    }
    
    // from alpha to number
    // a === 0
    dealphabetize(str) {
        if ('string' !== typeof str) return str;
        if (/[^-a-z]/gi.test(str.trim())) return NaN;
        let arr = str.trim().replace('-','').split('');
        let val = arr.reduce( (a,v) => (a*26 + parseInt(v,36) - 9), 0);
        return str.trim().charAt(0) === '-' ? -val : val-1;
    }
    // from https://blog.stevenlevithan.com/archives/javascript-roman-numeral-converter
    romanize(num) {
        if (isNaN(num)) return NaN;
        let digits = String(+num).split("");
        let key = ["","c","cc","ccc","cd","d","dc","dcc","dccc","cm",
            "","x","xx","xxx","xl","l","lx","lxx","lxxx","xc",
            "","i","ii","iii","iv","v","vi","vii","viii","ix"];
        let roman = "";
        let i = 3;
        while (i--) {
            roman = (key[+digits.pop() + (i * 10)] || "") + roman;
        }
        return Array(+digits.join("") + 1).join("m") + roman;
    }
    // based on https://www.geeksforgeeks.org/javascript-program-for-converting-roman-numerals-to-decimal-lying-between-1-to-3999/
    deromanize(str) {
        if (/[^IVXLCDM]/gi.test(str)) return str; // contains non-roman characters
        const rVals = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000 };
        let res = 0;
        let len = str.length;

        for (let i = 0; i < len; i++) {
            // Getting value of symbol s[i]
            let s1 = rVals[ str.charAt(i).toUpperCase()];
            // Getting value of symbol s[i+1]
            if (i + 1 < len) {
                let s2 = rVals[ str.charAt(i + 1).toUpperCase()];
                // Comparing both values
                if (s1 >= s2) {
                    res += s1;
                } else {
                    res += s2 - s1;
                    i++;
                }
            } else {
                res += s1;
            }
        }
        return res;
    }
    // parameter help
    paramHelp() { throw new Error(`HelpError: Help
new xutil.PXEmacro
====> doc: object - document object to query
====> [page: integer] - page number
   .page: integer - R/W page number
   .apply(sourceText)
====> sourceText: string - string to apply macros to
xutil.PXEmacro.names: returns array of supported macros`, {cause:'HelpError'});
    }
};

/***** End PXEmacro class *****/



/** add a bookmark that uses built-in bookmark properties at current page/zoom/position (ie not bookmark.setAction())
    * v3.0 no longer looks at name, uses saved array of bookmarks and .includes() to check
    * @returns the added bookmark or null
    *
    * @param {string} bkmName - name for the new bookmark
    * @param {object} doc - the document to add the bookmark
    * @param {boolean} [reTry] - number of times to try to find the added bookmark (because app.execMenuItem happens asynchronously, the bookmark may not be added immediately)
    *
    * @todo: convert to async function
  **/
  
xutil.addBookmark = function( bkmName, doc, reTry=2 ) {
    const bkCrawl = (bks) => {
        const bkN = [];
        
        for (let b of bks??[]) {

            if (b.children?.length) {
                bkN.push( ...bkCrawl( b.children));
            } else {
                bkN.push( b );
            }
        
        }
        return bkN;
    };
    // go through current bookmarks and look for one that was added (start at the end)
    function bkRename( bkmName, oldBks, bks) {
        // work from the end - hopefully find faster
        for (let i = bks.length; i--;) {
            // check children first
            if (bks[i].children?.length) {
                const renamed = bkRename( bkmName, oldBks, bks[i].children);
                if (renamed) return renamed;
            } else if (!oldBks.includes(bks[i])) {
                // found it
                bks[i].name = bkmName;
                return bks[i];
            }
        }
        return;
    }
    // need to get list of current bookmarks
    const bkList = bkCrawl( doc.bookmarkRoot.children);
    app.execMenuItem('cmd.addBookmark', doc);
    // the above happens asynchronously, so may need to wait to rename new bookmark?
    // this won't return the bookmark though - need async
    //xutil.setTimeout( bkRename, 100, bkmName, bkList);
    let addedBk;
    while (reTry-- && !addedBk) {
        addedBk = bkRename( bkmName, bkList, doc.bookmarkRoot.children);
    }
    return addedBk;
    
};

/***** End addBookmark function *****/

/** get rectangles in user space with fixes to handle view rotation and pages offset from [0,0]
  * </br>
  * v1.0 2025-07-29 change fromRotated to include the page offset & remove from toDUS
  *
  * @param {object} doc - the document that the rectangle is for
  * @param {integer} [page] - page for the rectangle (defaults to doc.pageNum)
  *
  * @example
  * // set up for current page
  * const page = this.pageNum;
  * const rx = new xutil.GetPageRectangle(this, page);
  * // draw a rectangle around the page perimeter
  * this.addAnnot({type: "Square", page, rect: rx.transform( this.getPageBox("Crop", page)) });
  * // draw an arrow up to the right top corner using relative coordinates
  * const align = [0,0]; // top right
  * let points = [[-234,-162],[0,0]]; // relative coordinates
  * // convert the relative points to default user space coordinates
  * points = rx.fromRel(points, align);
  * this.addAnnot({ type: "Line", page, arrowEnd: "OpenArrow", points });
**/
xutil.GetPageRectangle = class  {
    // default user space = annotations
    // rotated user space = forms, links, pageBox
    
    //mx;       // fromRotated page matrix
    //rotation; // page rotation + view rotation
    //DUSBox;   // unrotated crop box (default user space)
    //DUSMedia; // unrotated media box (default user space)
    //pageRect; // page rectangle in default user space
    //cropBox;  // page Crop box (rotated user space)
    //mediaBox; // page Media box (rotated user space)
    //zeroOff;  // page offset in default user space
    
    constructor( doc, page ) {
        //this.doc = doc;
        if ('undefined' === typeof page) page = doc.pageNum;

        this.rotation = this.getPgRotation( doc, page, true );
        this.cropBox = doc.getPageBox( {cBox: "Crop", nPage: page, bRotated: true});
        this.mediaBox = doc.getPageBox( {cBox: "Media", nPage: page, bRotated: true});
        // bRotated: false only PXE >=10.3 otherwise it will be the same as above
        this.DUSBox = doc.getPageBox( {cBox: "Crop", nPage: page, bRotated: false});
        this.DUSMedia = doc.getPageBox( {cBox: "Media", nPage: page, bRotated: false});

        this.mx = this.fromRotated(doc, page);
    }
    // change built-in function to include view rotation and zero offset
    fromRotated(doc, page) {
        page = page ?? 0;
        const mx = new Matrix2D(1, 0, 0, 1, 0, 0);
        const cropBox = this.cropBox;
        const mediaBox = this.mediaBox; //this.addPoint( this.mediaBox, xyOff, -1);
        const mbHeight = mediaBox[1] - mediaBox[3];
        const mbWidth = mediaBox[2] - mediaBox[0];
        // try to include offset (PXCE >=10.3 build 386)
        // need to pre-rotate the offset though.
        const xyOff = this.rotate90(mx, (360 - this.rotation) % 360).transform( this.zeroOff);

        const m = new Matrix2D(1, 0, 0, 1, cropBox[0] - mediaBox[0] + xyOff[0], cropBox[3] - mediaBox[3] + xyOff[1]);
        switch (this.rotation) {
          case 90:
            return mx.concat(this.rotate90(m, 90).translate(mbHeight, 0));
          case 180:
            return mx.concat(this.rotate90(m, 180).translate(mbWidth, mbHeight));
          case 270:
            return mx.concat(this.rotate90(m, 270).translate(0, mbWidth));
        }
        return mx.concat(m);
    }
    /** simplify Matrix2D.rotate() method to eliminate sin and cos
      * for less floating point mess at 90 degree rotations
    **/
    rotate90(matrix,angle) {
        let vals = [1, 0, 0, 1, 0, 0];
        switch (angle) {
          case 90:
            vals = [0, 1, -1, 0, 0, 0];
            break;
          case 180:
            vals = [-1, 0, 0, -1, 0, 0];
            break;
          case 270:
            vals = [0, -1, 1, 0, 0, 0];
        }
        return matrix.concat(new Matrix2D(...vals));
    }
    /** get page rotation
    */
    getPgRotation( doc, page, view = false, reverse = 1 ) {
        // try to figure out up or down based on page rotation
        let pgRotation = doc.getPageRotation( {nPage:page} );
        // try to include the view rotation PXCE build xxx+
        if (view && doc.viewState.pageViewRotation) {
            pgRotation += doc.viewState.pageViewRotation;
        }
        // make sure 0-360
        pgRotation = (reverse * pgRotation) % 360;
        // no negative rotations
        while (pgRotation < 0) {
            pgRotation += 360;
        }
        return pgRotation;
    }

    /** The page rectangle in default user coords
    */
    get pageRect() {
        return this.toDUS(this.cropBox);
    }
    /** The zero offset of the page in default user coords
    */
    get zeroOff() {
        let [x,,,y] = ('object' === typeof app.pxceVersion && app.pxceVersion[3] > 385) ? this.DUSMedia : [0,0,0,0]; // change from DUSBox
        return [x,y];
    }
    /** get the corner coordinates in rotated user space
        * @param {array} align - [horiz, vert] where
        *     horiz: 0-2   right,center,left
        *     vert:  0-2   top,middle,bottom
    */
    corner( align ) {
        // multipliers to use for corner
        const mult = [ [1,0], [0.5,0.5], [0,1]];
        
        const pgRec = this.cropBox;            
        const axCoords = align.map( (a,i) => mult[a][1-i] * pgRec[i] + mult[a][i] * pgRec[i+2]);

        return axCoords;
    }
    /** get coordinates of a relative rectangle in rotated user coords
        * @param {array} coords - the coordinates in relative coordinates
        * @param {array} align  - the corner [h,v] alignment
    */
    fromRel( coords, align ) {
        // alignment not rotated here first
        const corner = this.corner(align);

        let newCds = this.addPoint( coords, corner, 1); //coords.map( (c,i) => Array.isArray(c) ? this.fromRel( c, align) : 1*corner[i%2] + c );
        // if it's a rectangle, the corners may be in the wrong places
        if (!Array.isArray(coords[0]) && this.rotation % 180) {
            newCds.push(...newCds.slice(0,2));
            newCds.splice(0,2);
        }
        // try to include offset (PXCE >=10.3)
        //newCds = this.addPoint( newCds, this.zeroOff, -1);

        return this.toDUS( newCds );
    }
    /** get relative coordinates of a rectangle or series of points in rotated user coords
        * @param {array} coords - the coordinates in default user space (annotations)
        * @param {array} align  - the corner [h,v] alignment
        * @param {integer} coordRotation - the rotation of the coordinates given
    */
    toRel( coords, align, coordRotation = 0 ) {
        // rotate the coordinates about their center point
        if (coordRotation) {
            coords = xutil.rotateCoords( coords, -coordRotation, xutil.bxCtr(coords));
        }

        const corner = this.corner(align);

        const newCds = this.addPoint( this.fromDUS(coords), corner, -1);
        // if it's a rectangle, the corners may be in the wrong places
        if (!Array.isArray(coords[0]) && this.rotation % 180) {
            newCds.push(...newCds.slice(0,2));
            newCds.splice(0,2);
        }
        return newCds ;
    }
    /** add or subtract from a point
        * @param {array} coords  a series of points, or point pairs
        * @param {array} point   [x,y] to add to points
        * optional @param mult {real} multiplier on coords before adding to points
    */
    addPoint( coords, point, mult=1 ) {
        return coords.map( (c,i) => Array.isArray(c) ? this.addPoint( c, point, mult) : (mult * point[i%2] + c) );
    }
    /** convert coordinates to default user space (annotations)
        * @param oldRect {array} rect coordinates
        * @param reverse {bool}    convert to rotated user space (forms)
        * 
    */
    toDUS( oldRect, reverse = false ) {
        let rect;
        if (reverse) {
            // page offset is in default user space
            //rect = this.addPoint(oldRect, this.zeroOff, -1);
            rect = this.mx.invert().transform(oldRect);
        } else {
            rect = this.mx.transform(oldRect);
            // page offset
            //rect = this.addPoint(rect, this.zeroOff);
        }
        
        return rect;
    }
    // toDUS with reverse=true
    fromDUS( oldRect ) {
        return this.toDUS( oldRect, true );
    }
    /** rotate corner alignment to current rotation
        * @param oldAlign the corner array
    */
    rotAlign( oldAlign, rotation = this.rotation ) {
        //let rotation = this.rotation;
        // defaults for 0 degrees
        let align = oldAlign;

        switch ( rotation ) {
            case 90:
            align = [ oldAlign[1], 2 - oldAlign[0] ];
            break;
            case 180:
            align = [ 2 - oldAlign[0], 2 - oldAlign[1] ];
            break;
            case 270:
            align = [ 2 - oldAlign[1], oldAlign[0] ];
            break;
        }

        return align;
    }
};

/***** End GetPageRectangle class *****/

/** rotate a point [x,y]
  * @param {array} point - [x,y] coordinates of a point
  * @param {number} degrees - angle to rotate the point
  * @param {array} [ctr] - the point to rotate around (default [0,0])
**/
xutil.rotatePoint = function(point, degrees, ctr) {
    let rads = degrees * Math.PI / 180;
    let [ x,y ] = point || [0,0];
    let [ x0,y0 ] = ctr || [0,0];

    let newx = (x - x0) * Math.cos(rads) - (y - y0) * Math.sin(rads) + x0;
    let newy = (x - x0) * Math.sin(rads) + (y - y0) * Math.cos(rads) + y0;
    return [newx, newy];
};

/** Rotate a shape
  *
  * @param {array} coords - the coordinate array to be rotated in form [x1,y1,x2,y2,...] or [[x1,y1],[x2,y2],...]
  * @param {number} degrees - angle to rotate the coordinates
  * @param {array} [ctr] - the point to rotate around (default [0,0])
**/
xutil.rotateCoords = function(coords, degrees, ctr) {
    if (degrees) {
        if (ctr === undefined) {
            // assume centerpoint
            ctr = [0,0];
        }
        let rotRec = [];
        let i=0;
        //for (let i=0; i<(coords.length - 1); i+=2) {
        while ( i<coords.length ) {
            if ( Array.isArray(coords[i]) ) {
                // keep as a pair
                rotRec.push( this.rotateRect(coords[i], degrees, ctr) );
                i++;
            } else {
                rotRec.push( ...this.rotatePoint( [coords[i],coords[i+1]], degrees, ctr ));
                i+=2;
            }
        }
        return rotRec;
    } else { // didn't need to rotate
        return coords;
    }
};

/** Get the min and max coordinates in the coordinates and return in rect format
  * @param {array} aRec - list of coordinates in form [x1,y1,x2,y2,...] or [[x1,y1],[x2,y2],...]
  * @returns bounds of coords [xmin,ymin,xmax,ymax]
**/
xutil.getBounds = function(aRec) {
    function maxMin(a,v,k) {
        if (undefined === a[k%2] || v < a[k%2]) {
            a[k%2] = v;
        }
        if (undefined === a[2 + k%2] || v > a[2 + k%2]){
            a[2 + k%2] = v;
        }
        return a;
    }
    // get bounds
    return aRec.flat().reduce( maxMin, []);
};

/** center of bounding box. 
  * @param {array} coords - coordinates in form [x1,y1,x2,y2] or [[x1,y1],[x2,y2],...]
**/
xutil.bxCtr = function(coords) {
    let tB = this.getBounds( coords );
    return [ (tB[0]+tB[2])/2, (tB[1]+tB[3])/2 ];
};



// jshint
/* globals _XUTIL_DEBUG_, _xutil_IntervalData, ANSB_ModDate */