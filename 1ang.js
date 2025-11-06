/** Script to provide internationalization
  * Based loosely on a php function in wordpress
  * returns the localized text if available, otherwise textToLocalize
  *
  * @usage
  * __(textToLocalize, domain, params...)
  *     params are replaced in text %n where n is the parameter number. Use %%1 to escape and show %1 in output
  *         __('test %1 is %2 with %1 repeated %3', null, 'first', 'second', 'third')
  *         returns: test first is second with first repeated third
  *     to avoid repeating domain, could define _() function inside script thus: const _ = (text, ...args) => __(text, 'sample', ...args);
  *
  * @todo   (?) Enable _ = new __('domain') to avoid having to repeat domain
  *
  * History
  *  
  *  v1.3   2024-09-29  Add try/catch to read file, fix trustedReadFile as global, move definition to globalThis
  *  v1.2   2024-09-24  Fix bug on regex for %n at beginning of string
  *  v1.1   2024-07-31  Fail silently if there's no translation file for a domain, add parameter documentation
  *  v1.0   2024-07-30  Add support for plurals using %1 as key
  *  v0.4   2024-07-29  Simplify param key to %1, %2 etc, moved TRANSLATIONDATASTORE to private variable
  *  v0.3   2024-07-26  changed comments in translation files to start with # and allowed whitespace before
  *  v0.2   2024-07-26  Fixed regular expression for %%s to not replace it
  *  v0.1   2024-07-26  Initial version
  *
**/

/** create the '__' function at the global scope, and try to prevent its overwriting
  * @constant
*/
if ('undefined' === typeof __) {
  Object.defineProperty( globalThis, '__', { writable: false, value: 
    (function() {
    // don't show errors if there's no translation file found
    const QUIET = true;
    // private variable to __() to cache translation data
    const TRANSLATIONDATASTORE = {};

    // make a trusted function to read the file
    const trustedReadFile = app.trustedFunction( function(fileName) {
        // try the user folder first
        let pathLocations = ["user", "app"];
        let theFile;
        for (let pl of pathLocations) {
            try { // to deal with permissions errors
            app.beginPriv();
            let filePath = app.getPath(pl,"javascript")+"/"+fileName;
            theFile = util.readFileIntoStream( filePath );
            app.endPriv();
            // theFile will have an object, even if no file was found
            if ( util.stringFromStream(theFile) ) break;
            }catch(e){}
        }
        // convert to string
        let theData = util.stringFromStream(theFile);
        // clear connection
        theFile = null;
        return theData;
    });
    
    // get translation data
    function getTranslationData(txtDomain) {
        if (!txtDomain) return;
        
        let translationData = TRANSLATIONDATASTORE[txtDomain];
        // try to get translation
        if (!translationData) {
            let filePath = 'translationData.' + txtDomain + '.json';
            translationData = trustedReadFile(filePath);
            // try to make into an object only if there was a file
            if (translationData || !QUIET) {
                try {
                    // strip comment lines starting with #
                    translationData = translationData.replace(/^\s*#.*[\r\n]+|[\r\n]+/gm,'');
                    // will throw an error if not valid JSON
                    translationData = JSON.parse(translationData);
                    // save for next time
                    TRANSLATIONDATASTORE[txtDomain] = translationData;
                } catch(e) {
                    console.println(`Error parsing the translation file '${filePath}': ${e}`);
                    translationData = null;
                }
            }
            
        //console.println(JSON.stringify(translationData))
        }
        return translationData;
    }
    
    /** @param origText  - text to be translated
      * @param txtDomain - translation domain
      * @param [...args] - optional parameters to substitute %n where n is 1 based parameter count
    **/
    return function(origText, txtDomain, ...args) {
        
        const translationData = getTranslationData(txtDomain) ?? {};
        
        // translate
        const language = translationData[app.language] ?? {};
        
        let translation = language[origText] ?? origText;
        //console.println("\n**** Original Text ***\n" + JSON.stringify(origText))
        
        // plurals
        if (Array.isArray(translation)) {
            let n = parseInt( args[0] ?? 0 );
            // default to last item
            if ( isNaN(n) || n < 1 || n > translation.length ) {
                n = translation.length;
            }
            // n is 1 based
            translation = translation[n - 1];
        }
      
        // replace args
        translation = args.reduce( ( a, r, i) => 
            a.replace( new RegExp('(^|[^%])%' + (i+1), 'g'), '$1'+r), translation);
        
        return translation;
    };
    })()
  });
}
