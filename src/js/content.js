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


var ContentComponent = function() {
	var raw_list = St.use("content");
	var filtered_list = null;
	var tags = null;
	var uploader = null;
	var type_counts = {
		cb: 0,
		comment: 0,
		lpath: 0,
		scorm: 0,
	};

	// for new content mini-form

	function oninit() {
		raw_list.fetch().then(function(list) {
			list = Ut.sortAlphaBy("title", list);
			list = injectTypesAsTags(list);
			filtered_list = list;
			//tags = Tags(list, onFilter);
			tags = Tags(list, {
				filter_on_click: true,
				on_filter: onFilter
			});
		});
	}

	function onFilter(list) {
		filtered_list = list;
	}

	function injectTypesAsTags(list) {
		function injectTag(c) {
			if (c.tags != "") c.tags += ",";
			if (c.type == "scorm") {
				c.tags += "$scorm";
				type_counts.scorm++;
			}
			if (c.type == "cb") {
				c.tags += "$content-builder";
				type_counts.cb++;
			}
			if (c.type == "comment") {
				c.tags += "$discussion";
				type_counts.comment++;
			}
			if (c.type == "lpath") {
				c.tags += "$learning-path";
				type_counts.lpath++;
			}
			return c;
		}
		return R.map(injectTag, list);
	}

	function editClick(content) {
		m.route.set("/content/" +Ut.encodeId(content.content_id));
	}

	function viewThumb(config) {
		return function(content) {
			var records = null;
			var element_props = {};
			element_props.config = function(el) { el.content_ref = content; };
			element_props.key = content.content_id;
			if (config.onclick) {
				element_props.onclick = function() { 
					config.onclick(content);
				};
			}
			if (config.onselected_display) {
				element_props.onclick = function() {
					if(content.ui_selected){
						content.ui_selected = false;
					}
					else{
						content.ui_selected = true;
					}
				}
			}
			if (config.records) records = config.records(content);
			var type = "";
			switch(content.type){
				case "comment": type = "Discussion"; break;
				case "scorm": type = "SCORM Course"; break;
				case "cb": type = "Content"; break;
				case "lpath": type = "Learning Path"; break;
			}
			if (config.onselected_display && content.ui_selected) {
				return config.onselected_display(content);
			}
			var desc_maxlen = 120;
			var trunc_desc = content.description.substring(0,desc_maxlen);
			if(content.description.length > desc_maxlen) trunc_desc += "...";
			return m(".card.content", element_props, [
				viewThumbImg(content),
				m(".type", [ 
					m("img", { src: imgs[content.type] }),
					m("span", type),
				]),
				m("div.title", content.title),
				m("div.description", trunc_desc),
				records,
			]);
		};
	}

	function viewThumbImg(content) {
		var path = "/api/files/" + content.thumb_file_id + "/" + content.thumb_fname;
		if (R.isNil(content.thumb_file_id)) {
			path = imgs.default_thumb;
		}
		if (content.thumb) path = content.thumb;
		return m("img.thumb", { src: path });
	}

	function submitNew2() {
		// this exists to prototype the new mini-form
		submitNew(new_type(), new_title());
	}

	function submitNew(type, title) { 
		var newc = St.use("content");
		newc.set({
			type: type,
			title: title,
		});
		newc.send().then(function(data) {
			m.route.set("/content/" + Ut.encodeId(data.new_id));
		});
	}

	function viewDiscussionTypeLink(){
		if(Main.customConfig('show_discussion_type') === false) return null;
		return [
			m("a.link[href='/content/new/comment']",{oncreate: m.route.link}, "Create Discussion"),
			" | ",
		];
	}


	function view() {
		return [
			Main.viewTop(),
			//viewContentTypeMenu(),
			m(".page-controls", [
				m(".title", "Content"),
				m("p", [ 
					m("a.link[href='/content/new/cb']",{oncreate: m.route.link}, "Content Builder"),
					" | ",
					m("a.link[href='/content/new/scorm']",{oncreate: m.route.link}, "Upload Scorm"),
					" | ",
					viewDiscussionTypeLink(),
					m("a.link[href='/content/new/lpath']",{oncreate: m.route.link}, "Create Learning Path"),
				]),
				R.isNil(tags) ? null : [ m("h3", "Tags"), tags.viewThumbList(), ],
			]),
			R.isNil(filtered_list) ? m("p", "Loading...") :
			m(".cards", R.map(viewThumb({onclick:editClick}), filtered_list)),
			Main.viewBottom(),
		];
	}

	return {
		view: view,
		oninit: oninit,
		viewThumb: viewThumb,
		viewThumbImg: viewThumbImg,
		submitNew: submitNew,
	};
};

// to expose viewThumb, viewThumbImg, submitNew
// outside of using Content AS a component...
Content = ContentComponent();



var ContentViewer = function() {
	var content;
	var content_id;
	var view_content_link = stream(false);
	var tags = null;
	var record = null;

	function loadContent(vnode){
		if (!vnode.attrs.content_id){
			St.error = "Content viewer summoned without a content_id.";
			content_id = 0;
		   	return;
		}

		new_content_id = Ut.decodeId(vnode.attrs.content_id);
		if(new_content_id == content_id) return;

		content_id = new_content_id;
		content = St.use("content/" + content_id);
		content.fetch().then(function(data){
			content = content.get();
			tags = Tags([content], {filter_on_click: false});
		});
		var me = Login.get('person_id');
		var st_record = St.use("people/"+me+"/content/"+content_id+"/record");
		st_record.fetch().then(function(data){
			record = st_record.get();
		});
	}

	function onupdate(vnode) {
		loadContent(vnode);
	}

	function oninit(vnode) {
		loadContent(vnode);
	}

	function viewContentLink(){
		var text = "Show link";
		var result = [ m("a.link", {onclick:Ut.toggleProp(view_content_link)}, text) ];
		if (view_content_link()){
			var id = Ut.encodeId(content.content_id);
			var title = content.title;
			result.push(m(".form", m("input[type=text]", {value:"<player/"+id+":\""+title+"\">"})));
		}
		result.push(m("br"));
		return result;
	}

	function view() {
		if (content_id == 0) return m("p", "Content viewer requires content_id.");
		if(R.isNil(content)) return [ Main.viewTop(), m("p", "Loading...") ];

		// determine if user can view edit link
		var is_admin = Login.is_admin();
		var can_edit = (content.author == Login.get('person_id') || is_admin);


		function viewDiscussion(){
			if(content.type != 'comment') return null;
			return m(DiscussionPlayer, {content_id: content_id});
		}

		function viewLpath(){
			if(content.type != 'lpath') return null;
			return m(LpathPlayer, {content_id: content_id});
		}

		function viewLaunchBtn(){
			if(content.type == "lpath" || content.type == "comment") return null;

			// if it's scorm, show a launch button only if we have a scorm file!
			if(content.type == "scorm" && !content.scorm_uploaded) {
				return null;
			}

			return m(".centered", [ 
				m("button.primary", {onclick:function(){
					m.route.set("/player/"+Ut.encodeId(content_id));
				}}, "Launch"), 
			]);
		}

		function viewRecord(){
			if(!record) return null;
			var r = record;
			return m("table.mini-report", [
				m("thead", [
					m("tr", [
						m("th", "Title"),
						m("th", "Name"),
						m("th", "Score"),
						m("th", "Passed"),
						m("th", "Failed"),
						m("th", "Started"),
						m("th", "Completed"),
						m("th", "Last launched"),
						m("th", "Launch count"),
						m("th", "Duration (sec)"),
					]),
				]),
				m("tbody", 
					("tr", [
						m("td", r["title"]),
						m("td", r["name"]),
						m("td", r["score"]),
						m("td", r["passed"]),
						m("td", r["failed"]),
						m("td", r["started_ts"]),
						m("td", r["completed"] ? r["completed_ts"] : "No"),
						m("td", r["last_launched_ts"]),
						m("td", r["launch_count"]),
						m("td", r["duration_sec"]),
					])
				),
			]);
		}

		function viewTags(){
			if(R.isNil(tags) ||  !is_admin) return null;
			return [ m("h3", "Tags"), tags.viewThumbList(), ];
		}

		function viewEditLinks(can_edit){
			if(!can_edit) return null;
			var output = [];
			var encid = Ut.encodeId(content_id);

			// edit title, description, tags
			var edit_tags_txt = (is_admin ? ", tags" : "");
			output.push(
				m("a.link", 
					{ href: "/content/" + encid + "/edit", oncreate: m.route.link }, 
					"Edit title, description" + edit_tags_txt
				)
			);
			output.push(m("br"));

			if(content.type == 'scorm'){
				output.push(
					m("a.link", 
						{ href: "/content/" + encid + "/edit-scorm", oncreate: m.route.link }, 
						"Upload SCORM module"
					)
				);
				output.push(m("br"));
			}
			if(content.type == 'lpath'){
				output.push(
					m("a.link", 
						{ href: "/content/" + encid + "/edit-lpath", oncreate: m.route.link }, 
						"Edit learning path"
					)
				);
				output.push(m("br"));
			}
			if(content.type == 'cb'){
				output.push(
					m("a.link", 
						{ href: "/content/" + encid + "/edit-cb", oncreate: m.route.link }, 
						"Edit content"
					)
				);
				output.push(m("br"));
			}

			return output;
		}

		function viewCertificateLink(){
			if (!record) return null;
			if(Main.customConfig('show_print_cert') === false) return null;
			var tags = Ut.tagstrToList(content.tags);
			if(!R.contains('$certificate', tags) || !record['completed']) return null;
			var me = Login.get('person_id');
			var cid = content.content_id;
			var url = "/api/people/"+me+"/content/"+cid+"/certificate.pdf";
			return m("a.link",{href:url,target:"_blank"}, "Download certificate (PDF)");
		}

		return m(".content-viewer", [
			Main.viewTop(),
			m(".dialog", [
				m(".title", content.title),
				Content.viewThumbImg(content),
				m(".description", content.description),
				viewTags(),
				m("h3", "Actions"),
				viewEditLinks(can_edit),
				viewContentLink(),
				viewCertificateLink(),
				m("br"),
				is_admin ? m("a.link", { href: "/records/content/" + content_id, oncreate: m.route.link }, "View records") : null,
				m("br.clear"),

				viewDiscussion(), //because
				viewLpath(), // also
				viewLaunchBtn(),
			]),
			viewRecord(),
			Main.viewBottom(),
		]);
	}

	return {
		view: view,
		onupdate: onupdate,
		oninit: oninit,
	}; // mithril module
};





var ContentEd = function() {
	var thumb_uploader = null;
	var content = null;
	var content_id = 0;
	var content_api = null;

	function oninit() {
		var new_type = m.route.param("type");
		content_id = m.route.param("content_id");
		if(new_type){
			content_id="new";
			content = {
				content_id: 0,
				title: "",
				type: new_type,
				description: "",
				tags: "",
			};
			if (new_type == "welcome") {
				content.type = "cb";
				content.title = "Welcome";
				content.description = "Learner welcome message (visible to all learners on the Home page).";
			}
			content_api = St.use("content");
			content_api.set(content);
		}
		else if(content_id) {
			content_id = Ut.decodeId(content_id);
			content_api = St.use("content/" + content_id);
			content_api.fetch().then(function(data){
				content = content_api.get();
			});
		}
		else {
			St.error = "Content editing summoned without a content_id or new content type.";
			content_id = 0;
		   	return;
		}

		// setup content thumbnail uploader
		thumb_uploader = Uploader({
			instructions: "Drop image here or click to upload new thumbnail.",
			purpose: "content-thumb",
			related_id: content_id,
			callback: function(result_data) {
				content.thumb_fname = result_data.launch_fname;
				content.thumb_file_id = result_data.file_id;
			},
		});
	}

	function save() {
		content_api.send().then(function(data) {
			if(content_id=="new"){
				content_id=data.new_id;
				content.content_id=data.new_id;
			}
			m.route.set("/content/"+Ut.encodeId(content.content_id));
		});
	}

	function view() {
		if (content_id == 0) return m("p", "Content editing requires content_id or new content type.");
		if(R.isNil(content)) return [ Main.viewTop(), m("p", "Loading...") ];

		var can_edit_tags = Login.is_admin();
		var dialog_title = (content_id=="new" ? "Create New" : "Edit "+content.title);
		return m(".content-edit", [
			Main.viewTop(),
			m(".dialog", [
				m(".title", dialog_title),
				Content.viewThumbImg(content),
				m("p", "Thumbnail image"),
				thumb_uploader.view(),
				m("p", "Thumbnail image dimensions: 280x225"),
				m(".form", [
					Ut.viewBoundInput("Title", content_api.prop('title')),
					Ut.viewBoundInput("Description", content_api.prop('description')),
					can_edit_tags ? Ut.viewBoundInput("Tags", content_api.prop('tags')) : null,
					m("button.primary", { onclick: save }, "Save"),
				]),
			]),
			Main.viewBottom(),
		]);
	}

	return {
		view: view,
		oninit: oninit
	}; // mithril module
};
