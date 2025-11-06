//https://forum.pdf-xchange.com/viewtopic.php?t=44737&sid=f2528978e95e070d7d1d35ac65492461
//10.12.2024

// Add tool button for managing annotations
app.addToolButton({
    cName: "saveNoAnnots",
    cLabel: "Save NA",
	cIconID:'cmd.saveUnrestricted',
    cTooltext: "Open a dialog to save a copy without annotations.",
    cExec: "saveWithoutAnnots(this, true);" // Pass the active document (this) explicitly
});

/** script to save a copy of document without any annotations
  *
  * @param doc         - the document to save a copy of
  * @param closeNewDoc - true to close the new document after deleting all annotations (default false)
  * @param addSuffx    - optional suffix text to insert before .pdf (default '[clean]')
**/

var saveWithoutAnnots = app.trustedFunction( (doc, closeNewDoc = false, addSuffx = '[clean]') => {
    // get the old file path
    const oldPath = doc.path;
    // new path name
    const newPath = oldPath.replace(/(\.pdf)$/i, `${addSuffx}$1`);
    // the functions app.browseForDoc and doc.saveAs both require elevated privilege
    app.beginPriv();
        // first need to get a path
        let savePath = app.browseForDoc({bSave: true, cFilenameInit: newPath});
        // maybe user cancelled
        if (!savePath) return; 
        // *save as* (new file path)
        // save *copy* of current PDF to new file path  bCopy: true
        doc.saveAs({cPath: savePath.cPath, cFS: savePath.cFS, bCopy: true, bPromptToOverwrite: false});
    app.endPriv();
    
    // open new copy - if closeNewDoc then open it hidden
    // this needs to be enclosed in try because if user cancelles the security warning, then system throws an error
    const openDoc = (...params) => {
        try {
            return app.openDoc(...params);
        } catch(e) {
            console.println(e);
            return;
        }
    };
    const newCopyDoc = openDoc({ cPath: savePath.cPath, cFS: savePath.cFS, bHidden: closeNewDoc });
    // maybe a problem opening the new document?
    if (!newCopyDoc) {
        console.println(`Could not open file to delete the annotations in "${savePath.cPath}".`);
        return;
    }
    // delete all annotations/comments
    for (let a of newCopyDoc.getAnnots()) {
        a.destroy();
    }
    // save and if closeNewDoc close it
    app.execMenuItem('Save', newCopyDoc);    
    if (closeNewDoc) newCopyDoc.closeDoc(true);
    
    // return original file
    return doc;
});