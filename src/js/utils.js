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


var Ut = {};

Ut.toggleProp = function(prop){
	return function(){
		prop(!prop());
	}
}

Ut.uniqueCounter = 0;
Ut.uniqueId = function(){
	Ut.uniqueCounter++;
	return "id"+Ut.uniqueCounter;
}

Ut.encodeId = function(n){
	return (n * 798738217).toString().split("").reverse().join("");
}

Ut.decodeId = function(n){
	return parseInt(n.split("").reverse().join("")) / 798738217;
}


Ut.viewBoundInput = function(title, prop) {
	var id = Ut.uniqueId();
	return [
		m("label", {for:id}, title),
		m("input", {
			type: "text",
			id: id,
			onchange: m.withAttr("value", prop.set),
			value: prop.get(),
		}),
	];
}

Ut.viewBoundPassword = function(title, prop) {
	return m("label", [title,
		m("input[type='password']", {
			onchange: m.withAttr("value", prop.set),
			value: prop.get(),
		})
	]);
}

Ut.viewBoundTextarea = function(title, prop) {
	return m("label", [title,
		m("textarea", {
			onchange: m.withAttr("value", prop.set),
			value: prop.get(),
		})
	]);
}

Ut.sortAlphaBy = function(prop, list) {
	return R.sortBy(R.prop(prop), list);
}

Ut.autocomplete = function(datasets) {
	var filter_str = "";

	function resetFilter() {
		filter_str = "";
		filter();
	}

	function makeView(ds) {
		return ds.view({
			onclick:function(item) {
				ds.callback(item);
				resetFilter();
			},
		});
	}

	function viewDataset(ds) {
		return R.map(makeView(ds), ds.filtered_data);
	}

	function filter() {
		// shortcut out of here if we're filtering by blank string!
		if (filter_str == "") {
			R.forEach(function(ds) {
				ds.filtered_data = [];
			}, datasets);
			return;
		}

		// do real filtering!
		var rx = new RegExp(filter_str, "i");
		R.forEach(function(ds) {
			var matches = function(item) {
				return rx.test(ds.getFilterText(item));
			}
			ds.filtered_data = R.filter(matches, ds.data.get());
		}, datasets);
	}

	var updateFilter = m.withAttr("value", function(str) {
		filter_str = str;
		filter();
	});

	function view() {
		return [
			m("input", {
				oninput: updateFilter,
				value: filter_str
			}),
			m(".list-small", R.map(viewDataset, datasets)),
		];
	}


	// run resetFilter() to create the blank 
	// filtered_data arrays initially!
	resetFilter();

	return {
		reset_filter: resetFilter,
		view: view,
	}
};



// extract and view thumbnailst

Ut.viewPersonThumb = function(obj){
	var def = img.default_avatar;
	if(R.isNil(obj.thumb_file_id)) return m("img.thumb", { src: def });
	return Ut.viewThumb(obj.thumb_file_id, obj.thumb_fname);
}

Ut.viewContentThumb = function(obj){
	var def = img.default_thumb; 
	if(R.isNil(obj.thumb_file_id)) return m("img.thumb", { src: def });
	return Ut.viewThumb(obj.thumb_file_id, obj.thumb_fname);
}

Ut.viewThumb = function(fid, fname){
	var path = "/api/files/" + fid + "/" + fname;
	return m("img.thumb", { src: path });
}





// tags
Ut.tagstrToList = function(tagstr){
	if(!tagstr) return [];
	// remove {} from around list if it's there
	tagstr = tagstr.replace(/^{/, '');
	tagstr = tagstr.replace(/}$/, '');
	return R.map(R.trim, tagstr.split(','));
}

Ut.tagsWithCountsFromObjList = function(list, optional_layout_type){
	// optional_layout_type is for stack display (like pickers)
	var isNothing = R.either(R.isNil, R.isEmpty);
	var tagprop = R.map(R.prop('tags'));
	var taglist = R.map(R.split(','));
	var nonempty = R.reject(isNothing);
	var countem = R.countBy(R.identity);
	var objectify = R.map(function(pair){
		// pair is [['tagA',3],['tagB',5]] and comes from R.toPairs()
		return {
			name: pair[0],
			title: pair[0],
			count: pair[1],
			layout_type: optional_layout_type, 
		}
	});
	return R.compose(objectify, R.toPairs, countem, R.unnest, taglist, nonempty, tagprop)(list);
};

/*
 * Tiny tokenizer (for transforming content, discussion comments, etc.)
 *
 * From https://gist.github.com/borgar/451393
 *
 * - Accepts a subject string and an object of regular expressions for parsing
 * - Returns an array of token objects
 *
 * tokenize('this is text.', { word:/\w+/, whitespace:/\s+/, punctuation:/[^\w\s]/ }, 'invalid');
 * result => [{ token="this", type="word" },{ token=" ", type="whitespace" }, Object { token="is", type="word" }, ... ]
 *
 */
Ut.tokenize = function(s, parsers, deftok){
  var m, r, l, t, tokens = [];
  while ( s ) {
    t = null;
    m = s.length;
    for ( var key in parsers ) {
      r = parsers[ key ].exec( s );
      // try to choose the best match if there are several
      // where "best" is the closest to the current starting point
      if ( r && ( r.index < m ) ) {
        t = {
          token: r[ 0 ],
          type: key,
          matches: r.slice( 1 )
        }
        m = r.index;
      }
    }
    if ( m ) {
      // there is text between last token and currently 
      // matched token - push that out as default or "unknown"
      tokens.push({
        token : s.substr( 0, m ),
        type  : deftok || 'unknown'
      });
    }
    if ( t ) {
      // push current token onto sequence
      tokens.push( t ); 
    }
    s = s.substr( m + (t ? t.token.length : 0) );
  }
  return tokens;
}



Ut.makeLink = function(link_str){
	var linkrx = /<player\/(\d+):"(.*)">/;
	var matches = linkrx.exec(link_str);
	var id = matches[1];
	var title = matches[2];
	return m("a[href=/player/"+id+"]", {oncreate: m.route.link}, title);
}





Ut.viewLoading = function(custom_message){
	return m(".loading", [
		Main.viewTop(),
		m(".dialog", m("p", (custom_message ? custom_message : "Loading..."))),
		Main.viewBottom(),
	]);
}



/*
 * {
 *   original_list  <--- from db but (any) tags normalized
 *   filtered_list
 *   button_label
 *   filter_label
 *   filter_prop
 *   placeholder_type ("person" | "content")
 *   callback (optional func)
 *   stack_open <--- auto
 *   being_selected <--- auto
 *   selected_item <--- auto
 * }
 *
 */


// universal list filter (aka 'search' box)
Ut.viewFilterBox = function(data){
	// data = { 
	//   original_list: [], 
	//   filtered_list: [], 
	//   filter_prop: "title", 
	//   filter_label: "Title", 
	// } 
	var applyFilter = m.withAttr("value", function(s) {
		s = R.toLower(s);
		var f = R.compose(R.contains(s), R.toLower, R.prop(data.filter_prop));
		data.filtered_list = R.filter(f, data.original_list);
	});
	return m(".input-with-icon", [
		m("input[type=text]", {oninput:applyFilter, placeholder:data.filter_label}),
		m("i.material-icons", "search"),
	]);
}


// universal people/content picker button
// see also universal picker stack below

Ut.viewPickerButton = function(data){
	// data = {
	//   original_list: [],
	//   filter_prop: "title",
	//   filter_label "Title",
	//   button_label "Select Content",
	// }  
	function click(){ data.stack_open = true; }
	function viewSelected(){
		var i = data.selected_item;
		if(!i){ 
			// return default placeholder for type
			switch(data.placeholder_type){
			case "person": return [
					m("img.avatar", {src:imgs.default_avatar}),
					m(".title", m.trust("&nbsp;")),
				];
				break;
			case "content": return [
					m("img.thumb", {src:imgs.default_thumb}),
					m(".title", m.trust("&nbsp;")),
				];
				break;
			}
		}
		// view the item selected using the layout appropriate to the type of item
		switch(i.layout_type){
		case "person": return [
				People.viewAvatar(i),
				m(".title", i.name),
			];
			break;
		case "content": return [
				Content.viewThumbImg(i),
				m(".title", i.title),
			];
			break;
		case "ptag": return [
				m("img.thumb", {src:imgs.ptag}),
				m(".title", i.name+" ("+i.count+")"),
			];
			break;
		case "ctag": return [
				m("img.thumb", {src:imgs.ctag}),
				m(".title", i.title+" ("+i.count+")"),
			];
			break;
		}
	}

	var cls = data.selected_item ? "" : ".primary";

	return m(".card.action.picker", [
		viewSelected(),
		m("button"+cls, {onclick: click}, data.button_label),
	]);
};


// universal picker stack
Ut.viewPickerStack = function(data){
	// data = { 
	//   original_list: [], 
	//   filtered_list: [], 
	//   filter_prop: "title", 
	//   filter_label: "Title", 
	//   callback: optional function
	//   stack_open
	//   selected_item
	// } 
	if(!data.stack_open) return null;
	if(!data.original_list) return "Loading...";

	function viewItem(item){
		function select(){ 
			data.stack_open = false;
			data.selected_item = item;
			if(data.callback) data.callback();
		}
		var v = "Stack item with no type.";
		var ptagt = m("img", {src:imgs.ptag});
		var ctagt = m("img", {src:imgs.ctag});
		if (item.layout_type=="person") v = [ People.viewAvatar(item), m(".title", item.name)];
		if (item.layout_type=="content") v = [ Content.viewThumbImg(item), m(".title", item.title)];
		if (item.layout_type=="ptag") v = [ ptagt, m(".title", item.name+" ("+item.count+")")];
		if (item.layout_type=="ctag") v = [ ctagt, m(".title", item.title+" ("+item.count+")")];
		return m(".stackitem.link", { onclick: select }, v);
	}
	return m(".picker", [
		m("p", data.button_label),
		Ut.viewFilterBox(data),
		m(".stack", R.map(viewItem, data.filtered_list)),
	]);
};


