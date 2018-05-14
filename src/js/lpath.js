// Percolate LMS
//
// Copyright (C) 2018 Michaels & Associates Docntrain, Ltd.
//
// This program is free software: you can redistribute it and/or modify it under
// the terms of the GNU General Public License as published by the Free Software
// Foundation, either version 3 of the License, or (at your option) any later
// version.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of  MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License along with
// this program.  If not, see <http://www.gnu.org/licenses/>.
//


var LpathEd = function() {
	var my_content_id;
	var lpath;
	var html_item_list_container = null;
	var addContentAutocomplete = null;
	var selected_id = null;

	function oninit() {
		if (!m.route.param("content_id")){
			St.error = "Learning path editor summoned without a content_id.";
			my_content_id = 0;
		   	return;
		}
		my_content_id = Ut.decodeId(m.route.param("content_id"));
		lpath = St.use("content/" + my_content_id + "/lpath");
		lpath.fetch();
		addContentAutocomplete = LpathAddContent(onAdd);
	}

	var sortConfig = {
		oncreate: function(vnode) {
			html_item_list_container = vnode.dom;
			Sortable.create(vnode.dom, {
				animation: 150,
				onUpdate: onSort
			});
		}
	};

	function viewThumb(c){
		function set_content_ref(vnode){
			vnode.dom.content_ref = c;
		}
		function select(){
			selected_id = c.content_id;
		}
		function cancel(){ 
			// probably clicked item and moved it with menu open
			if(!c){ St.error = "Sorry, the learning path list is confused. Please try again."; }
			selected_id = null;
		}

		function remove(){ 
			var lp = lpath.get();
			var list = lp.content;
			var index = R.findIndex(R.propEq('content_id', c.content_id), list);
			if(index == -1){
				// probably clicked item and moved it with menu open
				St.error = "Sorry, could not remove this item. Please try again."; 
			}

			// remove item at index
			lp.list = list.splice(index, 1);
			lpath.set(lp); // write back to store item
		}

		if(c.content_id == selected_id){
			return m(".stackitem", [
					m("i", "Remove "+c.title+"?"),
					m("button.primary", {onclick:remove}, "Remove"),
					m("button", {onclick:cancel}, "Cancel"),
			]);
		}
		return m(".stackitem", {oncreate:set_content_ref}, [
				Content.viewThumbImg(c),
				m(".title", c.title),
				m("a.link.action", {onclick:select}, "REMOVE"),
		]);
	}


/*
	var viewThumb = Content.viewThumb({
		onselected_display: function(c){

			function cancel(){ 
				// probably clicked item and moved it with menu open
				if(!c){ St.error = "Sorry, the learning path list is confused. Please try again."; }
				// see magic ui_selected prop in Content.viewThumb()
				c.ui_selected = false; 
			}

			function remove(){ 
				var lp = lpath.get();
				var list = lp.content;
				var index = R.findIndex(R.propEq('content_id', c.content_id), list);
				if(index == -1){
					// probably clicked item and moved it with menu open
					St.error = "Sorry, could not remove this item for some reason. Please try again."; 
				}

				// remove item at index
				lp.list = list.splice(index, 1);
				lpath.set(lp); // write back to store item
			}

			return m(".stackitem", [
					m("p", "Remove "+c.title+"?"),
					m("button.primary", {onclick:remove}, "Remove"),
					m("button", {onclick:cancel}, "Cancel"),
			]);
		}
	});
*/

	function onAdd(content) {
		var lp = lpath.get();
		lp.content.push(content);
		lpath.set(lp);
	}

	function onSort() {
		var lp = lpath.get();
		lp.content = R.map(R.prop('content_ref'), html_item_list_container.children);
		lpath.set(lp);
	}

	function save() {
		lpath.send().then(function(result) {
			m.route.set("/content/");
		});
	}

	function view() {
		if (my_content_id == 0) return m("p", "Learning path editor requires content_id.");
		if (R.isNil(lpath.get())) return m("p", "Loading...");
		return m(".lpath-ed", [
			Main.viewTop(),
			m(".dialog", [
				m(".title", "Add and remove content from this path"),
				m("p", "Click on an item to remove it. Drag items to re-order them. Be sure to click the save button to keep your changes."),
				m("button", { onclick: save }, "Save"),
				m("br"),
				m(".stack.sortable", sortConfig, lpath.get().content.map(viewThumb)),
				m("br"),
				addContentAutocomplete(),
			]),
			Main.viewBottom(),
		]);
	}

	return {
		view: view,
		oninit: oninit
	}; // mithril module
};





function LpathAddContent(onAdd) {
	var content = St.use("content");
	content.fetch();
	var doing_msg = null;

	var myAutocomplete = Ut.autocomplete([{
		data: content,
		view: Content.viewThumb,
		callback: onAdd,
		getFilterText: function(x) {
			return x.title;
		}
	}]);

	return function() {
		return [
			m("b", "Type a title to add content to this path:"),
			myAutocomplete.view(),
		];
	}
}



var LpathPlayer = function() {
	var lpath = null;
	var timerId = null;
	var content_id = 0;

	function oninit(vnode) {
		if (!m.route.param("content_id")){
			St.error = "Learning path player summoned without a content_id.";
			content_id = 0;
		   	return;
		}
		content_id = vnode.attrs.content_id;
		lpath = St.use("content/" + content_id + "/lpath");
		lpath.fetch();
	}

	function viewContent() {
		if (!lpath.get()) {
			return "Loading...";
		}

		var content = lpath.get().content;

		function click(c) {
			m.route.set("/content/"+Ut.encodeId(c.content_id));
		}

		return m(".cards", R.map(Content.viewThumb({onclick:click}), content));
	}

	function view() {
		if (content_id == 0) return m("p", "Learning path player requires content_id.");
		return m(".lpath-player", [
			viewContent(),
		]);
	}

	return {
		oninit: oninit,
		view: view,
	};
};


