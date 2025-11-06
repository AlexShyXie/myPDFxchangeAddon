/** Tool to generate a report of all or selected annotations
  * @author mathew
  *
  * @history<pre>
  * v1.2.1 2025-07-07 bug fix - cEnable expression was causing application crash when no document active; use v2.1.1 of xutil.ClrUtx
  * v1.2 2025-06-09 add break between text outputs; add pageLabel to output properties list; option whether to show property labels
  * v1.1 2025-06-02 fix missing domain for string "points"; add preview & check of currency; fix bugs with comma decimal point; add info dialog for printf options
  * v1.0 2025-05-15 add a separate dialog for settings; separate sum, count and output; sum currency & numbers; enter page numbers to report; sort annot properties list; separate sums by length, area, number, text, blank; add newline when combining text; get text from richContents if there is any; option whether to include blank, text, currency contents in sums; get multiple numbers or currency inside a single comment; user editable regex for currency and some presets
  * v0.1 2025-05-07 first version - Inspired by https://forum.pdf-xchange.com/viewtopic.php?t=45812 and https://forum.pdf-xchange.com/viewtopic.php?t=27327
  *
  * @requires xutil.ClrUtx for color names, 1ang.js for translations
  * @todo add break between different text outputs; change currency to "tags" so can sum lists and use the text as tags; option whether to include property name in each summary heading; don't include summary headings if there's nothing to output; 
**/

// in case no 1ang.js
if ('undefined' === typeof __ ) __ = (t,d,...args) => (Array.isArray(args)?args:[args]).reduce( ( a, r, i) => a.replace( new RegExp('(^|[^%])%' + (i+1), 'g'), '$1'+r), t); // jshint ignore: line

var myIcon = {count:0, width:48, height:48, read:function(nBytes=this.data.length/2){return this.data.slice(this.count,this.count+=2*nBytes);}, data:(a=>{let[b,c]=a.split(":");c=c?.match(/.{8}/g);let d=(a,b)=>a.replace(/./g,a=>parseInt(a,10+b)-b);return b.replace(/([g-p]+)([0-9a-f]+|[q-z]+)/gi,(a,b,e)=>(/[q-z]/.test(e)?c[d(e,26)]:e).repeat(d(b,16)));})("hqhrwhrxiouithryhyhjqhrwipulthyhiqhrxioumthryhiqiouothiqinupthiqimuhgthiqmuhprrlrsmthiqmuhorrmrsmthiqijuhjthiqiiuhkthiqihuhlthiqiguhmthiqmuhjrrhhrsmthiqmuhirrhirsmthiqhnuhpthiqhmuigthiqhlunthFFFDD453hrzhlrhxoqhkuothrzhnrhxnqmunrrprsirhlshsqhrhxmqmumrrhgrsirhjshzhrtjrmqhhuhhtirhjshrtkrh80818181lqhguhitirhjshrulrhxkqpuhjtirhjshrumrkqhrxnuhktirhjshFFFBFBFBhrulrh80848484jqhrwmuhltirishivhFFFCFCFChrthsqkrhxjqhrwhrxjuhmtirishivjshrukrhgqkthsrithymqirjsjvnshvjshzhrthFF848484irhxpqkthFFB3C147hthynqirksjvhjshruirhxoqkthwhsrmqhwhqhFFF9F9F9hrlsjvhishzhrtiroqktiwmqiwhzhFFF5F5F5msjvhjsiroqktiwhrvlqiwhrqhznsjvhisiroqjthyhqjwhrvjqjwhrqhznsjvhhsiroqjtiqhrvhgwhrqhzmsivhisiroqhthFFFFD657hyjqhrvhgwhFFBBD79DlsivhjsiroqhthylqhFF80B547pwhrqksivhksiroqhynqhrviwhFF7EB444kwhrqksivhlsirigqjwhrqksivhmsirigqiwhrqksivoshvosirigqiwhshFFF6F6F6ishivosirigqhwhqhFFFDFDFDhrishivosiriiqirishivosiriiqiriisiriiqiriisiriiqiriisiriiqiriisiriiqiriisiriiqhxikrhxijqhxiirhxhq:00000000FF808080FFFFFFFFFFFFD54FFFFFDF7BFF42A5F5FF7CB3428080808080FFD54FFFFEFEFEFFBED9A1FFEBC047FFE5AC0AFFCCCCCCFF9B9B9B807CB34280FFDF7BFFFEE07FFFFFD759FFB9B095FF828282FFDCCD54")};

app.addMenuItem( {
	cName: "annotationReport",
	cUser: __("Report Comments…", 'annotReport'),
    cTooltext: __("Generate a text summary report of comments in this document. The summary can be limited to selected comments or specific pages.", 'annotReport'),
	oIcon: myIcon,
    //cIconID: 'cmd.comments.summarize',
	cParent: "Comments",
    nPos: 'cmd.comments.summarize',
	cRbParent: 'rbar.comment.manage',
	cEnable: 'event.rc = (event.target != null) && this?.getAnnots();',
    cExec: "annotationReport(this)"
});


var annotationReport = (function() {
// pre-entered accounting formats
const acctFormats = { // 'Display name': ['exec regex', [-position, +position], [-printf,+printf]]
    '-$ 1,234.56, $ 1,234.56': ['-\\$\\s*([\\d,.]+)|\\$\\s*([\\d,.]+)', [1,2], ['-$%,0.2f','$%,0.2f']], // $ (Canada)
    '$ (1,234.56), $ 1,234.56': ['\\$\\s*\\(([\\d,.]+)\\)|\\$\\s*([\\d,.]+)', [1,2], ['$(%,0.2f)','$%,0.2f']], // $ (US)
    '$ -1,234.56, $ 1,234.56': ['\\$\\s*\\-\\s*([\\d,.]+)|\\$\\s*([\\d,.]+)', [1,2], ['$-%,0.2f','$%,0.2f']],
    '-CAD 1,234.56, CAD 1,234.56': ['-CAD\\s*([\\d,.]+)|CAD\\s*([\\d,.]+)', [1,2], ['-CAD %,0.2f','CAD %,0.2f']],
    'USD (1,234.56), USD 1,234.56': ['USD\\s*\\(([\\d,.]+)\\)|USD\\s*([\\d,.]+)', [1,2], ['USD (%,0.2f)','USD %,0.2f']],
    '-£ 1,234.56, £ 1,234.56': ['-£\\s*([\\d,.]+)|£\\s*([\\d,.]+)', [1,2], ['-£%,0.2f','£%,0.2f']], // £ (UK)
    '- 1,234.56 €, 1,234.56 €': ['-\\s*([\\d,.]+)\\s*€|\\s*([\\d,.]+)\\s*€', [1,2], ['-%,0.2f €','%,0.2f €']], // (Euro) €
    '€ (1,234.56), € 1,234.56': ['€\\s*\\(([\\d,.]+)\\)|€\\s*([\\d,.]+)', [1,2], ['€(%,0.2f)','€%,0.2f']], // € (Euro)
    '-¥ 1,234.56, ¥ 1,234.56': ['-¥\\s*([\\d,.]+)|¥\\s*([\\d,.]+)', [1,2], ['-¥%,0.2f','¥%,0.2f']], // ¥ (Japan)
    '¥ -1,234.56, ¥ 1,234.56': ['¥\\s*\\-\\s*([\\d,.]+)|¥\\s*([\\d,.]+)', [1,2], ['¥-%,0.2f','¥%,0.2f']], // ¥ (PRC)
};
// number formats
const nFormats = function(decSep, thouSep, hasTx=false ) {
    let sep = decSep.toString().trim() + thouSep.toString().trim();
    if (RegExp.escape) sep = RegExp.escape(sep);
    if (hasTx) {
        return `[^-\\s\\d${sep}]+`;
    }
    return `\\s*([-\\d${sep}]+)`;
};
// printf formats
const printfFormats = function(baseFormat, decSep, thouSep) {
    let nDecSep = 0;
    // 0 — Comma separated, period decimal point
    // 1 — No separator, period decimal point
    // 2 — Period separated, comma decimal point
    // 3 — No separator, comma decimal point
    if ( '' === thouSep.trim()) nDecSep += 1;
    if ( ',' === decSep.trim()) nDecSep += 2;
    if (!nDecSep) {
        return baseFormat;
    } // else
    const newFormat = Array.isArray(baseFormat) ?
        baseFormat.map( f => f.replace( /,0/g, ','+nDecSep)) :
        baseFormat.replace( /,0/g, ','+nDecSep);
    return newFormat;
};
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
const PREFS = new GlobalVals( 'annotReports', {
    // defaults
    'grpBy': ['author'], // group by
    'color': color.black, // report text color
    'fsTi': 1.2,    // font size multiplier for title
    'fsRt': 1.0,    // font size multiplier for report text
    'indt': 20,     // indent amount at each level
    'cNms': true,   // true to try to use color names
    'thSp': ',',    // thousands separator
    'dcSp': '.',    // decimal point
    'cyRE': acctFormats['$ (1,234.56), $ 1,234.56'][0], // regex for currency
    'cyNP': acctFormats['$ (1,234.56), $ 1,234.56'][1], // positions in regex: $1 is negative | $2 is positive
    'cyPF': acctFormats['$ (1,234.56), $ 1,234.56'][2], // util.printf format for negative, positive number
    'inCr': true,   // Include currency in sum
    'inTx': true,   // Include text in sum
    'inBl': false,  // Include blank
    'igTx': 0,      // allow text in contents when summing numbers: 1=allow, 0:skip if there's text
    'dThk': 0.2,   // Thickness of divider used between text output
    'dClr': 0.4,   // Color for the divider - this is a multiplier on color
});
return (doc) => {
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
    

    // try to handle German comma decimal
    function toDecimal( numStr, decSep, thouSep ) {
        if ('string' !== typeof numStr) return numStr;
        // remove thousands separator
        // convert decimal separator to .
        let decStr = numStr.replaceAll( thouSep, '').replaceAll(decSep, '.');

        return decStr;
    }

    // try to handle inch ft
    function fromUnits(tx, decSep = '.', thouSep = ',' ) {
        const RE = /(([0-9,.]+) *(ft|'))? *((([0-9]+ +)?([0-9]+\/[0-9]+)|([0-9,.]+)?) *(in|"|\D+))?/;
        // split is:
        //  $2 ft number
        //  $3 unit ft '
        //  $6 whole inch part of fraction
        //  $7 fraction
        //  $8 decimal number
        //  $9 unit in " m
        
        
        let val = 0;

        let vals = tx.split(RE);
        // fractions
        if (vals[7]) {
            let [n,d] = vals[7].split('/');
            val = n / (d ? d : 1);
        }
        // inches
        val += parseFloat(toDecimal(vals[8] ?? vals[6]), decSep, thouSep ) || 0;
        // feet
        val += 12 * (vals[2] || 0);
        // units
        const units = [vals[3],vals[9]];
        // done
        return {val, units};
    }
    
    // try to make nice string
    function nicerString(annot, prop, useNames ) {
        // property value
        // pageLabel is not a property
        let val = ('pageLabel' === prop) ? annot.doc.getPageLabel(annot.page) : annot[prop];
        if (val == null) return __("Undefined", 'annotReport');
        // returns a two digit hex for 0 <= val <= 1
        const hx2 = ( val) => Math.floor( val*255).toString(16).padStart(2,"0");
        // is it a color array?
        const isColor = (c) => {
            if (!Array.isArray(c)) return false;
            switch (c[0]) {
              case 'T':
              case 'G':
              case 'RGB':
              case 'CMYK':
                return true;
              default:
                return false;
            }
        };
        
        if (!prop && isColor(val)) prop = 'fillColor';
        
        let nicer;

        //if (isColor(val)) {
        switch (prop) {
          case 'fillColor':
          case 'strokeColor':
            if (val[0].toUpperCase() === 'T') return 'Transparent';
            // try to match with color names
            if (useNames && xutil && xutil.ClrUtx) {
                const clrOb = new xutil.ClrUtx(true);
                nicer = clrOb.colName(val);
            } else {
                const rgb = color.convert( val, 'RGB');
                nicer = '#' + rgb.slice(1).reduce( (acc,val) => acc + hx2( val), '').toUpperCase();
            }
            break;
          case 'page':
            nicer = +val + 1;
            break;
          case 'opacity':
            nicer = Math.round( val * 100) + '%';
            // workaround for string sorting
            //nicer = ' '.repeat( 4 - nicer.length) + nicer;
            break;
          default:
            nicer = val.toString();
        }
        
        return nicer;
    }
    
        // function to get list of page numbers from text listing page numbers
    function getPagesFromText( pgTxt, nPages ) {
        // split it at commas
        let pgD = pgTxt.replace(/(\d)\s+(\d)/g,'$1,$2').split(/[\s,]+/);
        // step through and get all pages
        // use generic object so don't repeat page numbers
        const allPgN = {};
        for (let p of pgD) {
            if ( /-/.test(p) ) {
                // it's a range
                let pp = p.split(/[-\s]+/);
                let pStart = parseInt(pp[0] ?? 0) || 1;
                if (pStart < 1) pStart = 1;
                let pEnd = parseInt(pp[1] ?? 0) || nPages;
                if (pEnd > nPages) pEnd = nPages;
                
                for (let i = pStart - 1; i < pEnd; i++) {
                    allPgN[i] = true;
                }
            } else {
                let pp = parseInt(p);
                if (pp) allPgN[ pp - 1] = true;
            }
        }
        // sort ascending
        return Object.keys(allPgN).map( v => parseInt(v)).sort( (a,b) => a-b );
    }
    // preferences dialog
    // global acctFormats
    // @returns true if user selects "OK", false if cancelled
    function prefDialog(prefs) {
        // the dialog object
        const pDialog = {
            numberProps: [__( "Sum comments containing solely numbers (skip if there's text)", 'annotReport'), __( "Find and Sum numbers in non-numeric text", 'annotReport')],
            initialize(dialog) {
                const dLoad = prefs;
                // printf needs JSON stringify
                dLoad['cyPF'] = JSON.stringify(prefs['cyPF']).slice(1,-1);
                // accounting formats
                let fTxt = ['$'].concat(Object.keys(acctFormats));
                dLoad['cyPS'] = this.getListboxArray( fTxt, 0);
                // number options
                dLoad['igTx'] = this.getListboxArray( this.numberProps, prefs['igTx']||0);
                
                dialog.load(dLoad);
                // preview currency format
                this.testCurrency(dialog);
                // don't show color option if no xutil
                dialog.enable({'cNms': !!(xutil?.ClrUtx)});
            },
            // make sure thousand and decimal separator are different
            validate(dialog) {
                const dStor = dialog.store();
                if (dStor['thSp'].trim() === dStor['dcSp'].trim()) {
                    app.alert(__( "Decimal (%1) and thousands (%2) separators must be different!", 'annotReport', dStor['dcSp'], dStor['thSp']));
                    return false;
                }
                // check if the regular expression has errors
                try {
                    RegExp(dStor['cyRE']);
                } catch(e) {
                    app.alert(__( "There is a problem with the regular expression entered for Accounting/Currency:\n%1", 'annotReport', e));
                    return false;
                }
                return true;
            },
            commit(dialog) {
                Object.assign(prefs, dialog.store());
                // printf
                try {
                    prefs['cyPF'] = JSON.parse('['+ prefs['cyPF'] +']');
                } catch {}
                // RE group
                prefs['cyNP'] = prefs['cyNP'].split(',').map(v => parseInt(v));
                // ignore text
                prefs['igTx'] = this.getIndex(prefs['igTx']);
                // return 'ok'
            },
            // pick accounting format
            cyPS(dialog) {
                const dRes = dialog.store();
                const ix = this.getIndex( dRes['cyPS'] );
                if (ix) {
                    const keys = Object.keys(dRes['cyPS']);
                    // change printf for decimals
                    const pf = printfFormats(acctFormats[keys[ix]][2], dRes['dcSp'], dRes['thSp']);
                    const dLoad = {
                        'cyRE': acctFormats[keys[ix]][0], // regex
                        'cyNP': acctFormats[keys[ix]][1], // pos
                        'cyPF': JSON.stringify( pf).slice(1,-1) // printf 
                    };
                    dialog.load(dLoad);
                    this.testCurrency(dialog);
                }
            },
            // test the currency whenever they change
            cyPF(dialog) {
                this.testCurrency(dialog);
            },
            cyNP(dialog) {
                this.testCurrency(dialog);
            },
            cyRE(dialog) {
                this.testCurrency(dialog);
            },
            testCurrency(dialog){
                const dVals = dialog.store();
                // didn't work to use   let currTxt
                this.currTxt = '';
                try {
                    let vals = [-1234.56, 1234.56];
                    const toDec = n => toDecimal(n, dVals.dcSp, dVals.thSp);
                    let pf = JSON.parse('['+ dVals['cyPF'] +']');
                    const strs = vals.map( v => util.printf((v<0 ? pf[0] : pf[1]), Math.abs(v)));
                    //console.println(JSON.stringify(strs))
                    this.currTxt += strs.join(', ');
                    const pos = dVals['cyNP'].split(',').map( v => parseInt(v));

                    const re = new RegExp(dVals['cyRE']);
                    //console.println(JSON.stringify(strs.map( s => re.exec(s))))
                    let testVals = strs.map( s => re.exec(s));
                    testVals = testVals.map( regexGroup => regexGroup[pos[0]] ? (-1 * toDec( regexGroup[pos[0]])) : (1 * toDec( regexGroup[pos[1]])));
                    // see if it made the round trip
                    if (testVals[0] !== vals[0] || testVals[1] !== vals[1]) {
                        // not equal
                        this.currTxt += __(" Error! - the values do not match: %1", 'annotReport', testVals.join(','));
                    } else {
                        this.currTxt += __("  OK!", 'annotReport');
                    }
                    
                } catch(e) {
                    console.println(e);
                    this.currTxt += ' ' + e;
                } finally {
                    dialog.load({'cyTx': this.currTxt});
                }
            },
            // help for util.printf
            pfHlp() {
                app.alert(__("Each conversion specification is constructed as follows:\n%[,nDecSep][cFlags][nWidth][.nPrecision]cConvChar\n\nThe following table describes the components of a conversion specification.\nnDecSep - A comma character (,) followed by a digit that indicates the decimal/separator format:\n    0 — Comma separated, period decimal point\n    1 — No separator, period decimal point\n    2 — Period separated, comma decimal point\n    3 — No separator, comma decimal point\n\ncFlags - Only valid for numeric conversions and consists of a number of characters (in any order), which will modify the specification:\n    + — Specifies that the number will always be formatted with a sign.\n    space — If the first character is not a sign, a space will be prefixed.\n    0 — Specifies padding to the field with leading zeros.\n    # — Specifies an alternate output form. For f, the output will always have a decimal point.\n\nnWidth - A number specifying a minimum field width. The converted argument is formatted to be at least this many characters wide, including the sign and decimal point, and may be wider if necessary. If the converted argument has fewer characters than the field width, it is padded on the left to make up the field width. The padding character is normally a space, but is 0 if the zero padding flag is present (cFlags contains 0).\n\nnPrecision - A period character (.) followed by a number that specifies the number of digits after the decimal point for float conversions.\n\ncConvChar - Indicates how the argument should be interpreted:\n    d — Integer (truncating if necessary)\n    f — Floating-point number\n    s — String\n    x — Integer (truncating if necessary) and formatted in unsigned hexadecimal notation", 'annotReport'),3);
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

            description: { name: "Options", elements:[
                { type: 'cluster', name: __("Contents to Include in Report", 'annotReport'), elements:[
                    { type: 'view', align_children: "align_row", elements: [
                        { type: 'check_box', item_id: 'inBl', name: __("Blank", 'annotReport'), width: 120},
                        { type: 'check_box', item_id: 'inTx', name: __("Text", 'annotReport'), width: 120},
                        { type: 'check_box', item_id: 'inCr', name: __("Currency", 'annotReport'), width: 120},
                    ]},
                    { type: 'popup', item_id: 'igTx', width: 400},
                ]},
                { type: 'check_box', item_id: 'cNms', name: __("Use color names", 'annotReport'), width: 150},
                { type: 'view', align_children: "align_row", elements: [
                    { type: 'static_text', name: __("Indent each Group:", 'annotReport'), alignment: 'align_right', width: 140 },
                    { type: 'edit_text', item_id: 'indt', width: 50},
                    { type: 'static_text', name: __("points", 'annotReport'), width: 50}
                ]},
                { type: 'view', align_children: "align_row", elements: [
                    { type: 'static_text', name: __("Title size multiplier:", 'annotReport'), alignment: 'align_right', width: 140 },
                    { type: 'edit_text', item_id: 'fsTi', width: 50},
                    { type: 'static_text', name: __("Report text multiplier:", 'annotReport'), alignment: 'align_right', width: 140 },
                    { type: 'edit_text', item_id: 'fsRt', width: 50}
                ]},
                { type: 'view', align_children: "align_row", elements: [
                    { type: 'static_text', name: __("Report divider thickness:", 'annotReport'), alignment: 'align_right', width: 140 },
                    { type: 'edit_text', item_id: 'dThk', width: 50}
                ]},
                { type: 'cluster', align_children: "align_row", elements: [
                    { type: 'static_text', name: __("Decimal point:", 'annotReport'), alignment: 'align_right', width: 100 },
                    { type: 'edit_text', item_id: 'dcSp', width: 30, bold: true},
                    { type: 'static_text', name: __("Thousands separator:", 'annotReport'), alignment: 'align_right', width: 120 },
                    { type: 'edit_text', item_id: 'thSp', width: 30, bold: true}
                ]},
                { type: 'static_text', name: __("Accounting/Currency Format", 'annotReport'), separator: 1, width: 420},
                { type: 'view', align_children: "align_row", elements: [
                    { type: 'popup', item_id: 'cyPS', width: 20},
                    { type: 'static_text', name: __("RegExp:", 'annotReport'), alignment: 'align_right', width: 50},
                    { type: 'edit_text', item_id: 'cyRE', width: 320},
                ]},
                { type: 'view', align_children: "align_row", elements: [
                    { type: 'static_text', name: __("-,+ RE group:", 'annotReport'), alignment: 'align_right', width: 90},
                    { type: 'edit_text', item_id: 'cyNP', width: 40},
                    { type: 'static_text', name: __("-,+ printf:", 'annotReport'), alignment: 'align_right', width: 70},
                    { type: 'edit_text', item_id: 'cyPF', width: 180},
                    { type: 'button', item_id: 'pfHlp', name: __("i", 'annotReport'), width: 16, height: 20, bold: true},
                ]},
                { type: 'static_text', item_id: 'cyTx', width: 420, bold: true },
                { type: 'ok_cancel'}]
            }
        };
        return 'ok' === app.execDialog(pDialog);
    }

    // get preferences
    const arPrefs = PREFS.get();
    
    // Get the comments in this document
    doc.syncAnnotScan();
    const selAnns = doc.selectedAnnots;
    if (selAnns.length) arPrefs.Scur = true;
    // @todo sort and filter here?
    const allAnns = doc.getAnnots();
    if (!allAnns) {
        app.alert(__("There are no comments in this document.", 'annotReport'));
        return;
    }
    
    // number of groups to show
    let nDiaGrps = arPrefs.grpBy?.length || 1;
    // array of group dialog boxes
    const diaBoxes = [];
    // set of annotation keys
    // should do this in handler for all/selected
    let annotKeys = new Set( allAnns.map(a => Object.keys(a)).flat(1));
    ['doc'].forEach(d => annotKeys.delete(d));
    // add in pageLabel
    annotKeys.add('pageLabel');
    // convert to sorted array
    annotKeys = [...annotKeys].sort();
    // to store the index of the current group
    let diaIxs = arPrefs.grpBy ? arPrefs.grpBy.map(g => annotKeys.indexOf(g)) : [0];
    
    
    // dialog
    const dialog = {
        results:{},
        sortBy: [__("Sort Ascending", 'annotReport'), __("Sort Descending", 'annotReport')],
        actions: [__("Sum values", 'annotReport'), __("Count values", 'annotReport'), __("Output values", 'annotReport')],
        initialize(dialog) {
            const dLoad = this.results;
            // check if there are any selected annots
            if (!selAnns.length) {
                dialog.enable({'Scur': false});
                dLoad['Mall'] = true;
                dLoad['Scur'] = false;
            }

            // load the dropdowns
            diaBoxes.forEach( (k,i) => {
                // previous index
                //console.println([(null != this.results[k]), annotKeys.indexOf(arPrefs.grpBy[i]),i % annotKeys.length])
                let ix = (diaIxs[i] ?? i) % annotKeys.length;
                //console.println(ix + ' : ' +JSON.stringify(diaIxs))
                //console.println(ix)
                dLoad[k] = this.getListboxArray( annotKeys, ix);
                // sort order
                let srt = `srt${i}`;
                ix = (this.results[srt] ?? 0) % this.sortBy.length;
                dLoad[srt] = this.getListboxArray( this.sortBy, ix);
            });
            // action
            dLoad['actn'] = this.getListboxArray( this.actions, this.results['actn']);
            
            dialog.load(dLoad);
            // hide delete buttons if only one group
            if (diaBoxes.length < 2) {
                const dHide = {'del0':false};
                //diaBoxes.forEach( (k,i)=> dHide[`del${i}`] = false);
                dialog.visible(dHide);
            }
        },
		commit(dialog) {
            Object.assign(this.results, dialog.store());
            diaBoxes.forEach ( (k,i) => {
                this.results[k] = this.getIndex(this.results[k]);
                this.results[`srt${i}`] = this.getIndex(this.results[`srt${i}`]);
            });
            // action
            this.results['actn'] = this.getIndex(this.results['actn']);
            // return 'ok'
        },
        // delete group
        delG(dialog, ix) {
            // reduce number of documents
            nDiaGrps--;
            // remove this one from the list
            diaBoxes.splice(ix,1);
            this.commit(dialog);
            dialog.end('rev');
        },
        // add group
        addG(dialog) {
            nDiaGrps++;
            this.commit(dialog);
            dialog.end('rev');
        },
        // edit page numbers
        pkPg(dialog) {
            const dRes = dialog.store()['pkPg'];
            // if empty select 'all' otherwise select 'pages'
            const dLoad = dRes ? {'mPgs':true} : {'Mall':true};
            dialog.load(dLoad);
        },
        // settings
        sttg() {
            prefDialog(arPrefs);
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

        description: { name: "Report of Markups", elements:[
            { type: "cluster",  name: __("Markups to include:", 'annotReport'), align_children: "align_row",
                elements: [
                {   type: "radio", name: __("Current Selection", 'annotReport'), groupid: "UseS", item_id: "Scur",
                },{ type: "radio", name: __("All markups", 'annotReport'), groupid: "UseS", item_id: "Mall",
                },{ type: "radio", name: __("Pages:", 'annotReport'), groupid: "UseS", item_id: "mPgs",
                },{ type: 'edit_text', item_id: 'pkPg', width: 120}
            ]},
            {   type: "static_text", name: __("Report Organization", 'annotReport'), bold: true, width: 420},
            {   type: "static_text", name: __("Group/organize the report by the following annotation parameters:", 'annotReport'), width: 420},
            // to hold the group pickers
            { type: 'view', item_id: 'gHdr', elements: []},
            // add a group
            { type: 'button', item_id: 'addG', name: '+', font: 'title', bold: true, width: 22, height: 22 },
            // action
            { type: "view",  align_children: "align_row", elements: [
                {   type: "static_text", name: __("Action:", 'annotReport'), alignment: 'align_right', bold: true, width: 100
                },{ type: "popup", item_id: "actn", width: 200
                },
            ]},

            { type: 'view', align_children: "align_row", elements: [
                { type: 'button', item_id: 'sttg', name: __("Options…", 'annotReport'), alignment: 'align_left'},
                { type: 'gap', width: 230 - __("Options…", 'annotReport').length * 5},
                { type: 'ok_cancel', alignment: 'align_right'}
            ]}
        ]}
    };

    
    const pickerTemplate = (ix) => {
        return { type: 'view', align_children: 'align_left', elements: [
            { type: 'view', align_children: 'align_row', elements: [
                { type: 'button', name: '‒', item_id: `del${ix}`, font: 'title', bold: true, width: 22, height: 22},
                { type: 'popup', item_id: `lst${ix}`, width: 200 },
                //{ type: 'static_text', name: __( "Sort:", 'annotReport'), alignment: 'align_right', width: 60},
                { type: 'popup', item_id: `srt${ix}`, width: 90},
                { type: 'check_box', item_id: `lbl${ix}`, name: __( "Label", 'annotReport')},
            ]}
        ]};
    };
    
    
    // global arPrefs
    function getAnnotGroups(report, anns, groups, gSort, groupLevel=0) {

        const inOutDent = arPrefs.indt;
        // use color name
        const clName = arPrefs.cNms;

        // first need to sort anns so that they can be grouped
        const sorter = (a,b) => {
            // values
            // sort by page number if pageLabel
            const va = 'pageLabel' === a[1] ? a[0].page : nicerString(...a,clName);
            const vb = 'pageLabel' === b[1] ? b[0].page : nicerString(...b,clName);
            if (!isNaN(va) && !isNaN(vb)) {
                // number sort
                return gSort[groupLevel] ? vb - va : va - vb;
            } else { // string sort
                if (gSort[groupLevel]) {
                    // descending
                    return vb.toLowerCase().localeCompare(va.toLowerCase());
                } //else
                return va.toLowerCase().localeCompare(vb.toLowerCase());
            }
        };
        
        // sorted by property groups[groupLevel]] value
        const srtAnns = anns.sort((a,b) => sorter( [a, groups[groupLevel]], [b, groups[groupLevel]]));
        //console.println('anns: '+srtAnns.length)
        // sort annots by intent (if that property is available)
        const byType = (a,b) => sorter(a.intent ? [a,'intent'] : [a, 'type'], b.intent ? [b, 'intent'] : [b, 'type']);
        // label for property
        const lbl = showLabel[groupLevel] ? groups[groupLevel] + ": " : '';
        let subGroup = [];
        let prevProp;
        for (let a of srtAnns) {
            // @todo need to be able to compare arrays
            if (prevProp === nicerString( a, groups[groupLevel])) {
                subGroup.push(a);
            } else if (subGroup.length) {
                // the property value has changed from last one
                // deal with previous subGroup
                if (groups.length - 1 > groupLevel) {
                    // recurse down a group
                    report.indent(inOutDent);
                    getAnnotGroups(report, subGroup, groups, gSort, groupLevel + 1);
                    report.outdent(inOutDent);
                } else {
                    // output the subGroup
                    report.indent(inOutDent);
                    writeToReport(report, subGroup.sort(byType), sumAct);
                    report.outdent(inOutDent);
                }
                // output the current property value
                report.writeText( lbl + nicerString( a, groups[groupLevel], clName ));
                // start a new group
                subGroup = [a];
            } else {
                // output the current property value
                report.writeText( lbl + nicerString( a, groups[groupLevel], clName ));
                subGroup = [a];
            }
            
            prevProp = nicerString( a, groups[groupLevel] );
            //console.println([subGroup.length, prevProp])
        }
        if (subGroup.length) {
            // may need to recurse down
            if (groups.length - 1 > groupLevel) {
                // recurse down a group
                report.indent(inOutDent);
                getAnnotGroups(report, subGroup, groups, gSort, groupLevel + 1);
                report.outdent(inOutDent);
            } else {
                // output the subGroup
                report.indent(inOutDent);
                writeToReport(report, subGroup.sort(byType), sumAct);
                report.outdent(inOutDent);
            }
        }
        
        //return info;
    }
    
    // returns text of sum
    function outputSum(type, {sum, units, count}) {
        const spacer = ' '; // was using \t but it made copying text difficult from the report
        let sumTx = `(${count}):${spacer}`;
        switch(units[0]) {
          case arPrefs.cyPF[0]:
            // currency
            try {
                sumTx += sum < 0 ? util.printf(units[0],-1 * sum) : util.printf(units[1],sum);
            } catch(e) {
                // catch formatting error with printf
                console.println( e );
                sumTx += sum;
            }
            break;
          case "'":
          case 'ft':
            sumTx += Math.floor(sum/12) + ' ' + units[0] + (units[1] ? ' ' + (sum % 12) +' '+ units[1] : '');
            break;
          default: // other length unit
            sumTx += sum + ' ' + (units[0] ?? '');
        }
        return type + spacer + sumTx;
    }

    
    // write annots to report
    // anns should be sorted by type

    function writeToReport(report, anns, sumAct) {
        //const divWidth = undefined;
        // to hold the sum/count
        const allVals = {};
        const getVals = (t) => {
            if (!allVals[t]) {
                allVals[t] = {units:'', sum:0, count:0};
            }
            return allVals[t];
        };
        // calculate the divide color
        const divideColor = arPrefs.color.map( (c,i) => i ? (1 - arPrefs.dClr + c * arPrefs.dClr) : c);
        
        // keep track if it's the first item
        let needsBreak;
        for (const a of anns) {
            // get text from richContents if there is any
            let aTxt = a.richContents?.length ?
                a.richContents.reduce( (a,v)=> a + v.text, '') :
                a.contents;

            switch (sumAct) { // sum, count, output
              case 2: // output string
                // skip blank text
                if (!(aTxt || arPrefs.inBl)) break;
                if (needsBreak) {
                    // try to set divide color
                    report.color = divideColor;
                    //report.writeText(divideColor)
                    report.divide(arPrefs.dThk);
                    report.color = arPrefs.color;
                } else {
                    needsBreak = true;
                }
                report.writeText(aTxt);
                break;
              case 1: // count
                getVals(a.intent || a.type).count ++;
                break;
              case 0: // sum
                // now check for what type of sum
                switch (a.intent || a.type) {
                  case 'LineDimension':
                  case 'PolyLineDimension': {
                    // get the linear dimension value
                    // the part after the newline only
                    let tx = aTxt.split(/[\r\n]+/).pop();
                    let val = fromUnits(tx, arPrefs.dcSp, arPrefs.thSp);
                    let vv = getVals(__("Length", 'annotReport'));
                    vv.units = val.units;
                    vv.sum += val.val;
                    vv.count ++;
                    break;
                  }
                  case 'PolygonDimension': {
                    // get the area dimension value
                    // the part after the newline only
                    let tx = aTxt.split(/[\r\n]+/).pop();
                    let RE = new RegExp( '([0-9'+arPrefs.dcSp + arPrefs.thSp+']+) *([^ ]+)');
                    let vals = tx.split(RE);
                    let vv = getVals(__("Area", 'annotReport'));
                    vv.units = [vals[2]];
                    vv.sum += parseFloat( toDecimal(vals[1], arPrefs.dcSp, arPrefs.thSp)) || 0;
                    vv.count ++;
                    break;
                  }
                  default: {
                    // currency
                    let RE = arPrefs.inCr ? new RegExp( arPrefs.cyRE, 'g') : null;
                    if (RE && RE.test(aTxt)) {
                        let vv = getVals(__("Currency", 'annotReport'));
                        // get amount
                        RE.lastIndex = 0;
                        do {
                            let vals = RE.exec(aTxt);
                            if (null == vals) break;
                            vv.units = arPrefs.cyPF;
                            // add value
                        vv.sum += vals[arPrefs.cyNP[0]] ? (-1 * toDecimal( vals[arPrefs.cyNP[0]], arPrefs.dcSp, arPrefs.thSp)) : (1 * toDecimal( vals[arPrefs.cyNP[1]], arPrefs.dcSp, arPrefs.thSp));
                            vv.count ++;
                        } while (RE.lastIndex);

                    } else {
                        // number or string
                        //let v = parseFloat(aTxt);
                        let RE = new RegExp( nFormats( arPrefs.dcSp, arPrefs.thSp), 'g');
                        // check if aTxt has non-numeric
                        // if arPrefs.igTx ===1 then no need to check if there's non-numeric values
                        let nonNumeric = !arPrefs.igTx && RegExp( nFormats( arPrefs.dcSp, arPrefs.thSp, true), 'g').test(aTxt);
                        if (!aTxt || nonNumeric || !RE.test(aTxt)) {
                            // text
                            //console.println([aTxt && arPrefs.inTx, aTxt, arPrefs.inTx])
                            if (aTxt && arPrefs.inTx) {
                                // text
                                let vv = getVals( __("Text", 'annotReport'));
                                vv.sum = (vv.sum ? vv.sum + '\n' : '') + aTxt;
                                vv.count ++;
                            } else if (arPrefs.inTx && arPrefs.inBl) {
                                getVals( __("Blank", 'annotReport')).count ++;
                            }

                        } else {
                            // number -- get all the numbers in the contents
                            RE.lastIndex = 0;
                            let vv = getVals(__("Number", 'annotReport'));
                            do {
                                // get a number and handle different decimal point
                                let v = RE.exec(aTxt)?.[1];
                                if (null == v) break;
                                v = parseFloat( toDecimal( v, arPrefs.dcSp, arPrefs.thSp)) ;
                                vv.sum += v;
                                vv.count ++;
                            } while (RE.lastIndex);
                        }
                    }
                  }
                } // end of switch
            } // end of switch
        }
        // output sum/count
        switch (sumAct) {
          case 2: // already output
            return;
          case 1: // count only
            for (let type in allVals) {
                report.writeText( `${type}: ${allVals[type].count}`);
            }
            break;
          case 0: // sum
            for (let type in allVals) {
                report.writeText( outputSum(type, allVals[type]));
            }
        }
    }
    
    /////////////////////
    // run the dialog
    /////////////////////
    
    dialog.results = arPrefs;
    
    let diaResult = 'rev';
    while ('rev' === diaResult) {
        // set up dialog
        const pickBase = getObj( dialog.description, 'item_id', 'gHdr');
        // remove any pickers from dialog
        pickBase.elements.length = 0;
        diaBoxes.length = 0;
        for (let i = 0; i < nDiaGrps; i++) {
            // group by
            dialog.results[`lst${i}`] = annotKeys.indexOf(arPrefs.grpBy[i]);
            // diaBoxes list
            diaBoxes.push( `lst${i}`);
            
            // add picker to dialog
            pickBase.elements.push( pickerTemplate(i));
            
            // add functions to dialog
            // delete group
            if (nDiaGrps > 1) {
                dialog[`del${i}`] = (dia)=>dialog.delG(dia, i);
            }
        }
        // start the dialog again
        diaResult = app.execDialog(dialog);
        // one of the diaboxes may have been deleted
        diaIxs = diaBoxes.map( k => dialog.results[k]);
    }
    if ( diaResult !== 'ok') return "User cancelled";

    // get summary order
    arPrefs.grpBy = diaBoxes.map( dKey => annotKeys[ arPrefs[ dKey]]);
    // get sort order
    const sortOrd = diaBoxes.map( (dKey,i) => arPrefs[`srt${i}`]);
    // get whether to show label
    const showLabel = diaBoxes.map( (dKey,i) => arPrefs[`lbl${i}`]);
    // get the annots array to use
    let annots;
    switch (true) {
      case arPrefs['Scur']: // current selection
        annots = selAnns;
        break;
      case arPrefs['mPgs']: // filter all by pages
        let pgList = getPagesFromText( arPrefs['pkPg'], doc.numPages );
        annots = allAnns.filter( a => pgList.includes(a.page));
        break;
      default:
        annots = allAnns;
    }

    // get what to do in summary
    const sumAct = arPrefs['actn'];
    
    // save prefs
    PREFS.set(arPrefs);
    
    // Open a new report
    /* globals Report */
    const rep = new Report();
    rep.color = arPrefs.color;
    
    rep.style = "NoteTitle";
    rep.size = arPrefs.fsTi;
    rep.writeText( doc.info.Title || doc.documentFileName );
    rep.writeText( __( "Summary of Comments By: %1", 'annotReport', arPrefs.grpBy.join(', ')));
    
    rep.style = "DefaultNoteText";
    rep.size = arPrefs.fsRt;
    rep.writeText( [__( "Summing Comment Values", 'annotReport'), __( "Counting Comments", 'annotReport'), __( "Printing Comment Values", 'annotReport')][sumAct]);
    rep.writeText(" ");
    rep.writeText( __( "Number of Comments Processed: %1", 'annotReport', annots.length));
    rep.writeText(" ");
    
    // output the information from the annotations
    getAnnotGroups( rep, annots, arPrefs.grpBy, sortOrd, 0);
    
    // Now open the report
    return rep.open(__( "Untitled Report", 'annotReport'));

};
})();