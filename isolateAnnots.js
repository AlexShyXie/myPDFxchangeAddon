/**
  * Script to hide annotations temporarily by moving them out of the page

  * only tested on PDF-Xchange Editor v10.2
  * history:
  *  v0.3.1 2024-06-12 Add sub-menu Add-in Tools, increase icon size 40x40
  *  v0.3   2024-04-24 store location of annotations, don't rely on offset so doesn't lose them if something is undone, callout bug still present in 10.2.
  *  v0.2 Jul 20, 2023 code cleanup, move callout data, option whether to move locked
  *  v0.1 Jul 18, 2023 initial concept
*/

var myIcon = {count:0, width:40, height:40, read:function(nBytes=this.data.length/2){return this.data.slice(this.count,this.count+=2*nBytes)}, data:(a=>{let[b,c]=a.split(":");c&&(c=c.match(/.{8}/g));let d=(a,b)=>a.replace(/./g,a=>parseInt(a,10+b)-b);return b.replace(/([g-p]+)([0-9a-f]+|[q-z]+)/gi,(a,b,e)=>(/[q-z]/.test(e)?c[d(e,26)]:e).repeat(d(b,16)))})("jjkqhlriuiiqhlriuiiqjrhhxjriiqjrhhxjriiqjrhyhgzjriiqjriypzjriiqjrhhrqjrkthvhnqjrhhrqjrktivhmqjrhhrrjrjrsjtjqmsnqjrhhrrjrjrsjtkqmsmqiuhlrjrtjtnqkslqiuhlrjrtjtnqlshgqjthhwjtnqjshqispqjthhwjtnqjsiqisoqjthhwjtnqjshiqjthhwjtnqjshiqivhirujtjqisiqjshjqhvhjruitkqishqjsjkqlsjlqksjmqmsjkqmskhgq:00000000FF0A61B3FF42A5F5FF636972FF5491CAFF92969DFFFFFFFFFFD9ECF5FFACD5E7FFACD4E7FFB6DAEAFFC1DFEDFFF8F9FAFFEEF0F2FF464B52")};
// This adds a button to the Add-on Tools toolbar
app.addToolButton( {
  cName: "isolateAnnotations",
  cLabel: "Hide/Restore",
  oIcon: myIcon,
  cTooltext: "Isolate (Hide) or Restore annotations on this page",
  //cEnable: "(this.selectedAnnots && this.selectedAnnots.length)",
  cExec: "console.println(isolateAnnotations(this))" }
);

// This adds a menu item
/*
app.addSubMenu({ cName: "addTools", cUser: "Add-in Tools", cParent: "Tools", nPos: 0 });
app.addMenuItem( {
  cName: "isolateAnnotationsMenu",
  cUser: "Hide/Restore Annots",
  oIcon: myIcon,
  cParent: "addTools", // Change this to "Comments" to put in the Comment menu, etc
  //nPos: 13,
  //cEnable: "event.rc = (this.selectedAnnots?.length)",
  cExec: "console.println(isolateAnnotations(this))" }
);
*/

// begin script

function isolateAnnotations(t) {
  // settings
  const ISOLATE_DIST = [ 50, 50 ]; // additional pts to move annotations past crop box
  const ISOLATE_LOCKED = true;  // false to leave locked comments alone
  // selected annotation functions
  class AnnotationSelection {
    anns; // all selected annotations to move
    currPg; // page number to work on
    mDfiles = []; // annotations that contain data about isolated annotations on currPg
    mDNames = []; // names of all isolated annotation data
    isolateNoteName = "IsolatedAnnotationsData"; // Name used on annot with data
    doNotInc = ["Redact"]; // List of annotation types to IGNORE in move
    mvDist; // Distance to move [dx,dy]
    doc; // link to document object
    
    constructor (t) {
      this.currPg = t.pageNum;
      this.doc = t;
      if ( t.getAnnots({nPage:this.currPg}) ) {
        this.setAnns( t );
        this.findMvT( t );
        this.setMvDist( t );
      }
    }
    // get distance to move objects off the page
    // ** TODO ** go through all annotations to check if their rects are outside the crop box
    setMvDist ( t ) {
      const cBox = "Crop"; // box to use
      // get page box
      let pgBox = t.getPageBox({ cBox:cBox, nPage:t.pageNum });
      
      let pgOffset = [ pgBox[2] - pgBox[0], pgBox[1] - pgBox[3] ];
      // move it by the additional isolate distance
      this.mvDist = this.mvRect( pgOffset, ISOLATE_DIST );
    }
    // find text object containing moved annotation data
    findMvT ( t ) {
      for (let a of t.getAnnots()) {
        if ( a.name.substring( 0, this.isolateNoteName.length ) == this.isolateNoteName ) {
          if ( this.currPg == a.page ) 
            this.mDfiles.push( a );
          this.mDNames.push ( a.name );
        }
      }
    }
    // set up the annotations to move
    setAnns ( t ) {
      let annArr = t.selectedAnnots.filter( anFilter, this );
      if (!annArr?.length) { // nothing selected - get the annotations on this page
        annArr = t.getAnnots({nPage:t.pageNum}).filter( anFilter, this );
      }
      this.anns = annArr;
      // to be used on filter of annotations
      function anFilter ( ann ) {
        for (let dN of this.doNotInc) {
          if ( ann.type == dN || ( !ISOLATE_LOCKED && ann.lock )) return false;
        }
        return true;
      }
    }
    // restore the annotation locations
    restoreAnns() {
      let aR = 0;
      for ( let pgData of this.mDfiles ) {
        let { pgOffset, movedAnns, locations } = JSON.parse(pgData.contents);
        for (let n in movedAnns) {
          // try to get the moved annotation
          let mA = this.doc.getAnnot({nPage:pgData.page, cName: movedAnns[n]});
          // maybe it was deleted??
          if (mA) {
            // move it back
            if (locations && locations[n]) {
              // use saved rect if it exists
              mA.setProps( locations[n] );
              // set twice: workaround bug with selection bounds
              if ("FreeTextCallout" == mA.intent) mA.setProps( locations[n] );
            } else {
              //(maybe moved in older version)
              this.mvAnn( mA, this.Smult( pgOffset, -1 ) );
            }
            aR++;
          }
        }
        // remove the text data element
        pgData.destroy();
      }
      app.alert({cMsg: `${aR} Annotations Restored.`, nIcon: 3});
      return `Annotations Restored: ${aR}`;
    }
    // isolate (move off the page) the annotations
    isolateAnns() {
      if ( !this.anns?.length ) return; // nothing to move
      let pgOffset = this.mvDist;
      // move the annotations
      let annNames = [];
      let annRects = [];
      for (let ann of this.anns ) {
        // save original location
        annRects.push( this.annData( ann ) );
        // save name
        annNames.push( ann.name );
        
        this.mvAnn( ann, pgOffset );
      }
      // add text data element
      let pgDataStr = JSON.stringify({pgOffset:pgOffset, movedAnns:annNames, locations:annRects});
      let pgDataRect = pgOffset.concat( pgOffset.map( v => v+20 ));
      // add the added hidden annotation
      this.doc.addAnnot({type:"Text",
        page:this.doc.pageNum,
        name:this.getNoteName(),
        rect:pgDataRect,
        noView: true,
        toggleNoView: false,
        hidden: true,
        contents: pgDataStr,
        author: "Isolate Annotation Tool",
        subject: "Hide/Restore Data"
      });
      
      app.alert({ cMsg: annNames.length+' Annotations have been moved off the page.\nSelect this tool again to restore them to their original locations.',
        nIcon: 1, oDoc: this.doc });
      
      return `Annotations Isolated: ${annNames.length}`;
    }
    // get rect data
    annData( ann ) {
      let data = { rect:ann.rect };
      if ("FreeTextCallout" == ann.intent) {
        data.callout = ann.callout;
      }
      return data;
    }
    // move an annotation by offs [dx,dy]
    mvAnn( ann, offs ) {
      let mvData = { rect: this.mvRect( ann.rect, offs ) };
      switch ( ann.intent ) {
        case "FreeTextCallout":
          mvData.callout = this.mvRect( ann.callout, offs );
          // set twice: workaround bug with selection bounds
          ann.setProps( mvData );
          break;
      }
      ann.setProps( mvData );
    }
    getNoteName() {
      let nName;
      let i = 0;
      do {
        nName = this.isolateNoteName + util.printf("%02d",i++); // increment i
      } while ( this.mDNames.find( x => x == nName ) )
      return nName;
    }
    // moves [x1,y1,x2,y2] by [dx,dy]
    mvRect ( rect, mv ) {
      return rect.map( (c,i) => c + mv[i%2] );
    }
    // multiply array by scalar
    Smult( arr, scalar ) {
      return arr.map( el => el * scalar );
    }
    
  }
  let result;
  const mvAnns = new AnnotationSelection( t );
  
  // @todo would be nice to be able to add to the isolated annotations, but
  //   problem is can't deselect after they've been isolated, so keep isolating
  //   hidden annots. Would need to check if the annots are on the page as well.
  if (mvAnns.mDfiles.length) {
    // restore annotations
    result = mvAnns.restoreAnns();
  } else if (mvAnns.anns?.length) {
    // hide annotations
    result = mvAnns.isolateAnns();
  }
  
  if ( !result ) {
    result = "No Annotations to Isolate on this page.";
    app.alert({ cMsg: result, cTitle: "Nothing Found", nIcon: 2, nType: 0 });
  }
  return result;
}