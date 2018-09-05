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



var StyleGuide = function() {

	// Faux data for style guide 
	// =====================================================================
	function lorem(chars){
		return "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.".substr(0, chars);
	}
	var imgpath = "https://s3.amazonaws.com/static.perclms.com/common/sample/";
	var content = [
		{ type:"cb", title:"Inexpensive Solutions", description:lorem(15), thumb:"course1.jpg"},
		{ type:"scorm", title:"Becoming a manager", description:lorem(225), thumb:"course2.jpg"},
		{ type:"comment", title:"Discuss management basics", description:lorem(45), thumb:"course3.jpg"},
		{ type:"lpath", title:"Sales Learning Path", description:lorem(65), thumb:"course4.jpg"},
		{ type:"cb", title:"Required Orientation Training", description:lorem(5), thumb:"course5.jpg"},
	];
	content = R.map(function(c){ c.thumb = imgpath+c.thumb; return c; }, content);
	var people = [
		{ name:"Lawrence Conners Wadlow Jefferson, III",layout_type:"person", avatar:"person1.jpg" },
		{ name:"Lenita Serino",layout_type:"person", avatar:"person2.jpg"},
		{ name:"Ethan Ludlow",layout_type:"person", avatar:"person3.jpg"},
		{ name:"Lucina Dennie",layout_type:"person", avatar:"person4.jpg"},
		{ name:"Anette Puffer",layout_type:"person", avatar:"person5.jpg"},
	];
	people = R.map(function(p){ 
		p.avatar = imgpath+p.avatar; 
		p.username = p.name.replace(/\s/g,'').toLowerCase(); 
		return p; 
	}, people);
	var tags = ["tag1", "tag2", "longer-tag3", "tag4", "t6", "longest-tag-ever7", "tag8"];
	var uploader = Uploader({
		instructions: "Drop image here or click to upload.",
		purpose: "person-thumb",
		related_id: 0,
		callback: function(){},
	});
	var people_picker = {
		callback: null,
		filter_prop: "name",
		filter_label: "Name",
		button_label: "Select a person",
		placeholder_type: "person",
		original_list: people,
		filtered_list: people,
	};
	var discussion = [{"comment_id":12,"content_id":11,"replies_to":null,"person_id":1,"body":lorem(100),"created":"2017-10-19 16:47:52.821548","deleted":false,"name":"Robert Police","thumb_file_id":null,"thumb_fname":null},{"comment_id":13,"content_id":11,"replies_to":12,"person_id":3,"body":lorem(59),"created":"2017-10-19 16:51:51.78435","deleted":false,"name":"Susan Turk","thumb_file_id":null,"thumb_fname":null},{"comment_id":17,"content_id":11,"replies_to":null,"person_id":3,"body":lorem(200),"created":"2018-01-22 17:23:52.929806","deleted":false,"name":"Franto Fitzborgen","thumb_file_id":null,"thumb_fname":null}];

	// =====================================================================
	



	function oninit(vnode) {}

	function view(){
		return m(".style-guide", [

			Main.viewTop(),

			// page controls with actions and tags

			m(".page-controls", [
				m(".title", "Style guide"),
				m("p", lorem(400)),
				m(".actions", [
					m(".title", "Actions"),
					m("a.link", {onclick:function(){St.error=lorem(100);}}, "View error box"), 
					m("a.link", "Another action link"),
				]),
				m("br"),
				m(".title", "Tags"), 
				m("ul.tags", R.map(function(t){return m("li", t);}, tags)),
				m(".title", "Picker and stack"),
				// picker and stack view
				m(".cards", [ Ut.viewPickerButton(people_picker), ]),
				Ut.viewPickerStack(people_picker),
			]),



			// content item list 

			m(".cards", R.map(Content.viewThumb({}), content)),
			m(".cards-bottom", m("button.more", "Load more")),


			// people list
			
			m(".cards", R.map(People.viewThumb(null), people)),
			m(".cards-bottom", m("button.more", "Load more")),

			// admin dashboard with report cards


			m(".page-controls", [
				m(".title", "Admin dashboard"),
				m(".cards", [
					m(".card.action", [ m(".title", "Manual entry"), m(".description", "Create or edit a person's record for a content item") ]),
				]),
			]),



			// dialog box with form
			


			m(".dialog", [
				m(".title", "A dialog box"),
				m("p", lorem(200)),
				m(".form", [
					m("label", lorem(10)),
					m("input[type=text]", {placeholder:"style requires type=text"}),
					m("label", lorem(18)),
					m("input[type=text]"),
					m("button.primary", "Save"),
					m("button", "Cancel"),
				]),
				m("p", lorem(200)),
				uploader.view(),
				m("br"),
			]),




			// welcome content 

			m(".page-controls", [
				m(".content-builder-player", [
					m(".cb-page", [
						m("h1", "Welcome title"),
						m("p", lorem(200)),
						m(".cb-cols", [
							m(".col", [ m("p", lorem(50)), m("p", lorem(150)) ]),
							m(".col", [ m("img", {src:imgpath+"course2.jpg"}) ]),
						]),
					]),
				]),
			]),



			// "content view" dialog and a discussion
			
			m(".dialog", [
				m(".title", "Discussion"),
				m("img.thumb", {src:imgpath+"course3.jpg"}),
				m(".description", lorem(140)),
				m(".sub.title", "Actions"),
				m("a.link", "Edit title, etc."),
				m(DiscussionPlayer, {test_discussion:discussion}),
			]),



			// stand-alone player top bar and cb content

			Player().viewTopbar(),
			m(CbPlayer, {test_cb:"Course content\n\n"+lorem(300)+"\n\n"+lorem(180)}),


			// color quick reference
			
			m("hr"),
			m(".dialog", [
				m(".title", "Color Quick Reference"),
				m("p", "This portion contains all items from the customizable color stylesheet in order."),
				m("a", {href:'#'}, "Anchor link"),
				m("p", "Bordered table:"),
				m("table", m("tbody", [
					m("tr", m("th", "table.bordered th")),
					m("tr", m("td", "table.bordered")),
					m("tr", m("td", "table.bordered")),
					m("tr", m("td", "table.bordered")),
				])),
				m("p", "Striped table:"),
				m("table.striped", m("tbody", [
					m("tr", m("td", "table.striped")),
					m("tr", m("td", "table.striped")),
					m("tr", m("td", "table.striped")),
					m("tr", m("td", "table.striped")),
				])),
				m("input[type=text]", {value:"text input"}),
				m("br"),
				m("textarea", "textarea"),
				m("br"),
				m("input[disabled=disabled]", {value:"disabled input"}),
				m("br"),
				m("button", "button"),
				m("button.primary", "button.primary"),
				m("button[disabled=disabled]", "button.disabled"),
				m(".topbar", [
					m("p", ".topbar"),
					m(".menubar", [
						m("p", ".menubar"),
						m(".item", ".item"),
						m(".item.current", ".item.current"),
						m(".item.me", [
							m("span", ".me"),
						]),
					]),
				]),
				m(".me-menu", [
					m("a.link.me-item", ".me-item"),
				]),
				m(".page-controls", [
					m(".title", ".page controls .title"),
				]),
				m(".danger", ".danger"),
				m("a.link", {onclick:function(){St.error=lorem(100);}}, "click here for .error-box"), 
				m(".stackitem", ".stackitem"),
				m("p", "this all in a .dialog box already, also see top for .dialog .title"),
				m(".dialog-controls", ".dialog-controls"),
				m("ul.tags", [
					m("li", "ul.tags li"),
					m("li.selected", "ul.tags li.selected"),
				]),
				m(".upload", [
					m("p", ".upload"),
					m("i", "i(con)"),
					m(".instructions", ".instructions"),
				]),
				m(".card", [
					m("p", ".card"),
					m(".type", ".type"),
				]),
				m(".card.action", [
					m("p", ".card.action"),
				]),
				m(".cards-bottom", [
					m("p", ".cards-bottom"),
					m(".more", ".more"),
				]),
				m(".erule-list", [
					m("p", ".erule-list"),
					m(".e", ".e"),
					m(".e", ".e"),
				]),
				m(".cb-btn", m(".label", ".cb-btn .label")),
				m(".cb-quiz-hacker-view", ".cb-quiz-hacker-view"),
				m(".discussion", [
					m("p", ".discussion"),
					m(".comment", [
						m("p", ".comment"),
						m(".date", ".date"),
						m(".reply-link", ".reply-link"),
					]),
				]),
				m(".player-topbar", [
					m("a", ".player-topbar a"),
				]),
				m("br"),
				m(".player", m(".welcome-bottom-bar", ".player .welcome-bottom-bar")),
			]),

			Main.viewBottom(),
		]);
	}
	return {view:view, oninit:oninit};
};

