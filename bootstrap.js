// Imports
const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import('resource://gre/modules/Services.jsm');

var sb_browser = Services.strings.createBundle('chrome://browser/locale/browser.properties');
var sb_tabbrowser = Services.strings.createBundle('chrome://browser/locale/tabbrowser.properties');

// Globals
const core = {
	addon: {
		name: 'Paste & Go with New Tab',
		id: 'Paste-Go-with-New-Tab@jetpack'
	}
};
const myMenuItemJson = ['xul:menuitem', {id: 'pastegowithnewtab_menuitem', label: sb_browser.GetStringFromName('pasteAndGo.label') + ' - ' + sb_tabbrowser.GetStringFromName('tabs.emptyTabTitle'), oncommand: onCommand}//,
							//['observes', {element:'toolbar-context-undoCloseTab', attribute:'hidden'}]
					   ];
const myMenuItemJson2 = ['xul:menuitem', {id: 'pastegowithnewtab_menuitem2', label: sb_browser.GetStringFromName('pasteAndGo.label') + ' - ' + sb_tabbrowser.GetStringFromName('tabs.emptyTabTitle'), oncommand: onCommand}//,
							//['observes', {element:'toolbar-context-undoCloseTab', attribute:'hidden'}]
					   ];


// START - Addon Functionalities
function onCommand(aEvent) {
	var aDOMWindow = aEvent.view;
	console.log('aDOMWindow:', aDOMWindow);
	
	var shiftNotDown_focusNewTab = Services.prefs.getBoolPref('browser.tabs.loadInBackground');
	var shiftDown_focusNewTab = !shiftNotDown_focusNewTab;
	
	var trans = Cc["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable);
	trans.addDataFlavor("text/unicode");
	Services.clipboard.getData(trans, Services.clipboard.kGlobalClipboard);
	var pastetextNsiSupports = {};
	var pastetextNsiSupportsLength = {};
	trans.getTransferData("text/unicode", pastetextNsiSupports, pastetextNsiSupportsLength);
	var pastetext = pastetextNsiSupports.value.QueryInterface(Ci.nsISupportsString).data;
	
	aDOMWindow.gBrowser.loadOneTab(pastetext, {
		inBackground: false, //aEvent.shiftKey ? shiftDown_focusNewTab : aEvent.shiftNotDown_focusNewTab,
		relatedToCurrent: false
	});
}
function addToWin(aDOMWindow) {
	var aTabsToolbar = aDOMWindow.document.getElementById('TabsToolbar');
	if (!aTabsToolbar) {
		return;
	}
	
	var context_sibling = aDOMWindow.document.getElementById('toolbar-context-undoCloseTab');
	context_sibling.parentNode.insertBefore(jsonToDOM(myMenuItemJson, aDOMWindow.document, {}), context_sibling.nextSibling);
	
	var context_sibling2 = aDOMWindow.document.getElementById('context_reloadTab');
	context_sibling2.parentNode.insertBefore(jsonToDOM(myMenuItemJson2, aDOMWindow.document, {}), context_sibling2.nextSibling);
}

function removeFromWin(aDOMWindow) {
	var aInstance_myMenuItem = aDOMWindow.document.getElementById('pastegowithnewtab_menuitem');
	if (aInstance_myMenuItem) {
		aInstance_myMenuItem.parentNode.removeChild(aInstance_myMenuItem);
	}
	var aInstance_myMenuItem2 = aDOMWindow.document.getElementById('pastegowithnewtab_menuitem2');
	if (aInstance_myMenuItem2) {
		aInstance_myMenuItem2.parentNode.removeChild(aInstance_myMenuItem2);
	}
}
// END - Addon Functionalities
/*start - windowlistener*/
var windowListener = {
	//DO NOT EDIT HERE
	onOpenWindow: function (aXULWindow) {
		// Wait for the window to finish loading
		var aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		aDOMWindow.addEventListener('load', function () {
			aDOMWindow.removeEventListener('load', arguments.callee, false);
			windowListener.loadIntoWindow(aDOMWindow);
		}, false);
	},
	onCloseWindow: function (aXULWindow) {},
	onWindowTitleChange: function (aXULWindow, aNewTitle) {},
	register: function () {
		
		// Load into any existing windows
		let DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			let aDOMWindow = DOMWindows.getNext();
			if (aDOMWindow.document.readyState == 'complete') { //on startup `aDOMWindow.document.readyState` is `uninitialized`
				windowListener.loadIntoWindow(aDOMWindow);
			} else {
				aDOMWindow.addEventListener('load', function () {
					aDOMWindow.removeEventListener('load', arguments.callee, false);
					windowListener.loadIntoWindow(aDOMWindow);
				}, false);
			}
		}
		// Listen to new windows
		Services.wm.addListener(windowListener);
	},
	unregister: function () {
		// Unload from any existing windows
		let DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			let aDOMWindow = DOMWindows.getNext();
			windowListener.unloadFromWindow(aDOMWindow);
		}
		/*
		for (var u in unloaders) {
			unloaders[u]();
		}
		*/
		//Stop listening so future added windows dont get this attached
		Services.wm.removeListener(windowListener);
	},
	//END - DO NOT EDIT HERE
	loadIntoWindow: function (aDOMWindow) {
		if (!aDOMWindow) { return }
		
		addToWin(aDOMWindow);
	},
	unloadFromWindow: function (aDOMWindow) {
		if (!aDOMWindow) { return }
		
		removeFromWin(aDOMWindow);
	}
};
/*end - windowlistener*/

function install() {}
function uninstall(aData, aReason) {}

function startup(aData, aReason) {
	
	//windowlistener more
	windowListener.register();
	//end windowlistener more
	
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) { return }
	
	//windowlistener more
	windowListener.unregister();
	//end windowlistener more
	
}

// start - common helper functions
function jsonToDOM(json, doc, nodes) {

    var namespaces = {
        html: 'http://www.w3.org/1999/xhtml',
        xul: 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul'
    };
    var defaultNamespace = namespaces.html;

    function namespace(name) {
        var m = /^(?:(.*):)?(.*)$/.exec(name);        
        return [namespaces[m[1]], m[2]];
    }

    function tag(name, attr) {
        if (Array.isArray(name)) {
            var frag = doc.createDocumentFragment();
            Array.forEach(arguments, function (arg) {
                if (!Array.isArray(arg[0]))
                    frag.appendChild(tag.apply(null, arg));
                else
                    arg.forEach(function (arg) {
                        frag.appendChild(tag.apply(null, arg));
                    });
            });
            return frag;
        }

        var args = Array.slice(arguments, 2);
        var vals = namespace(name);
        var elem = doc.createElementNS(vals[0] || defaultNamespace, vals[1]);

        for (var key in attr) {
            var val = attr[key];
            if (nodes && key == 'id')
                nodes[val] = elem;

            vals = namespace(key);
            if (typeof val == 'function')
                elem.addEventListener(key.replace(/^on/, ''), val, false);
            else
                elem.setAttributeNS(vals[0] || '', vals[1], val);
        }
        args.forEach(function(e) {
            try {
                elem.appendChild(
                                    Object.prototype.toString.call(e) == '[object Array]'
                                    ?
                                        tag.apply(null, e)
                                    :
                                        e instanceof doc.defaultView.Node
                                        ?
                                            e
                                        :
                                            doc.createTextNode(e)
                                );
            } catch (ex) {
                elem.appendChild(doc.createTextNode(ex));
            }
        });
        return elem;
    }
    return tag.apply(null, json);
}
// end - common helper functions