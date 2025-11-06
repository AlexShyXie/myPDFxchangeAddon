/* add a find/replace menu item
	v1.2 Mar 15, 2024	case sensitive option, save searches
	v1.1 Mar 14, 2024	replace also on popups
	v1.0 Mar 14, 2024	Initial release
一次性查找并替换PDF文件中所有注释（批注、高亮、文本框等）里的文字。
*/

app.addMenuItem( {
	cName: "findReplaceAnnTx",
	cUser: "Find/Replace…",
	cParent: "Edit",
	nPos: 21, // after Find... in the Edit menu. The position could easily be wrong!
	//cEnable: "event.rc = (event.target != null);",
	cExec: 'replaceAnnotTx.run(this)'}
);

app.addToolButton({
    cName: "findReplaceAnnTx",
    cIconID: 'cmd.document.replaceFonts',
    cLabel: "Find/Replace…",
    cExec: 'replaceAnnotTx.run(this)',
    cTooltext: "Find and Replace",
    cEnable: "event.rc = (event.target != null);",
    nPos: -1
});


// using a generic object
var replaceAnnotTx = {
	SAVE_LENGTH : 10, // Number of search terms to save
	dialog: {
		data:{},
		initialize: function (dialog) {
			let def = this.data;
			
			if ( !Object.keys(def).length ) {
				def = { "ftxt": "", "rtxt": "", "usRE": false, "casS": false };
			} else {
				["ftxt","rtxt"].forEach( i => def[i] = this.dd( def[i] ));
			}
			dialog.load( def );
		},
		commit:function (dialog) { // called when OK pressed
			this.data = dialog.store();
		},
		// make dropdown object
		dd:function(arr) {
			let ob = { "":1 }; // blank as selected item
			if (! Array.isArray(arr))
				arr = [arr];
			for (let i in arr) {
				ob[arr[i]] = -2-i;
			}
			return ob;
		},
		description: {
			name: "Find & Replace", // Dialog box title
			align_children: "align_left",
			elements:
			[
				{
					type: "cluster",
					name: "Search and Replace expressions",
					align_children: "align_left",
					elements:
					[
						{
							type: "view",
							align_children: "align_row",
							elements:
							[
								{
									type: "static_text",
									name: "Find:",
									alignment: "align_right",
									width:50
								},
								{
									item_id: "ftxt",
									type: "edit_text",
									PopupEdit: true,
									alignment: "align_left",
									width:300
								}
							]
						},
						{
							type: "view",
							align_children: "align_row",
							elements:
							[
								{
									type: "static_text",
									name: "Replace:",
									alignment: "align_right",
									width:50
								},
								{
									item_id: "rtxt",
									type: "edit_text",
									PopupEdit: true,
									alignment: "align_left",
									width:300
								}
							]
						},
						{
							type: "check_box",
							name: "Regular Expression",
							//char_width: 25,
							item_id: "usRE"
						},
						{
							type: "check_box",
							name: "Case Sensitive",
							//char_width: 25,
							item_id: "casS"
						},
					]
				},
				{
					alignment: "align_right",
					type: "ok_cancel",
					ok_name: "Ok",
					cancel_name: "Cancel"
				}
			]
		}
	},
	
	// *** run the dialog ***
	run: function(t) {
		// load globals
		let globals = this.global.get();
		Object.assign(this.dialog.data, globals);
		if ("ok" == app.execDialog(this.dialog)) {
			console.println( this.doReplace( t, this.dialog.data ));
			// save the data
			this.global.set( this.mkArrays( globals ) );
		} else {
			return "User Cancelled";
		}
	},

	// save the search data as arrays
	mkArrays: function ( gData ) {
		let setObs = ["ftxt","rtxt"]; // fields to make into arrays
		let newData = this.dialog.data; // assume this has been initialized
		// build arrays
		if (gData) {
			for (let i of setObs) {
				let arr = gData[i];
				if (arr) {
					if ( !Array.isArray(arr) )
						arr = [ arr ];
					// the dialog returns a string from PopupEdit in newData[i]
					if ( -1 == arr.indexOf( newData[i] ) ) {
						newData[i] = [newData[i]].concat( arr );
					} else {
						// it's already in there, so just save previous version
						newData[i] = arr;
					}
					// newData[i] is now an array
					if ( newData[i].length > this.SAVE_LENGTH )
						newData[i] = newData[i].slice(0,this.SAVE_LENGTH);
				}
			}
		}
		return newData;
	},

	doReplace: function( t, results ) {
		let fSrc = results["ftxt"];
		if ( "" == fSrc) return "Nothing to change"; // don't search for empty string
		
		// build regex
		let useRex = results["usRE"];
		// this is a bit messy because if there are actually regex expressions, it will still use them
		fSrc = useRex ? fSrc : fSrc.replace(/([\.\(\)\\\|\[\]\{\}\+\-\*\$\^\,\?])/g,"\\$1");
		let caseSens = results["casS"] ? "":"i";
		let fRE = new RegExp(fSrc,"g" + caseSens );
		let reTx =  results["rtxt"]; //useRex ? results["rtxt"] : results["rtxt"].replace(/\$/g,'\\$');
		// Step through all pages and replace
		// try to get selected annotations
		let anns = t.selectedAnnots;
		// if nothing selected, get all annotations
		if (0==anns.length)
			anns = t.getAnnots();
		let replacements = 0;
		for (let ann of anns){
			let aProps = ann.richContents;
			// maybe use aProps.reduce( (a,i) => a+i.text,'') on the rich text before the find replace?
			// a possible solution: http://james.padolsey.com/javascript/replacing-text-in-the-dom-solved/
			// uses an index on the joined text for each match, which then is replaced sequentially on the elements
			if (aProps.length>0) {
				// working with rich contents
				let changed = false;
				for (let i=0; i<aProps.length; i++) {
					if (aProps[i] && fRE.test(aProps[i].text)) {
						aProps[i].text = aProps[i].text.replace(fRE,reTx);
						changed = true;
						replacements++;
					}
				}
				if (changed) ann.richContents = aProps;
			} else {
				// no rich contents
				aProps = ann.contents;
				if (aProps && fRE.test(aProps)){
					aProps=aProps.replace(fRE,reTx);
					ann.contents = aProps;
					replacements++;
				}
			}
		}
		return "Replaced in "+replacements+" locations.";
	}
}
// Add trusted functions to access global variables
replaceAnnotTx.global = new class {
	constructor(name) {
		this.get = app.trustedFunction(() => {
			app.beginPriv();
			try{
			if ( global[name] )
				return JSON.parse( global[name] );
			}catch{
				console.println("Error accessing global variable '"+name+"'. Try:\n either uncheck 'Enable global object security policy',\n or (preferably) edit the file 'GlobData': Delete the line that begins with /D after the line \n/"+name+" <<");
			}});
		this.set = app.trustedFunction( value => {
			app.beginPriv();
			try{
			global[name] = JSON.stringify( value );
			global.setPersistent( name, true);
			}catch{}});
	}
}("FindReplaceGlobalVals")