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


var PeopleComponent = function() {
	var raw_list = St.use("people");
	var filtered_list = null;
	var viewEditThumb = viewThumb(editClick);
	var tags = null;

	function oninit() {
		raw_list.fetch().then(function(list) {
			list = Ut.sortAlphaBy("name", list);
			filtered_list = list;
			tags = Tags(list, {
				filter_on_click: true,
				on_filter: onFilter
			});
		});
	}

	function onFilter(list) {
		filtered_list = list;
	}

	function editClick(person) {
		m.route.set("/people/" + person.person_id);
	}

	function viewThumb(onclick) {
		return function(person) {
			function click(){ if(onclick){ onclick(person); }};
			return m(".card.person", { onclick: click }, [
				viewAvatar(person),
				m(".name", person.name),
				m(".username", person.username),
			]);
		};
	}

	function viewAvatar(person) {
		var path = "/api/files/" + person.thumb_file_id + "/" + person.thumb_fname;
		if (R.isNil(person.thumb_file_id)) {
			path = imgs.default_avatar;
		}
		if (person.avatar) path = person.avatar;
		return m("img.avatar", {
			src: path
		});
	}

	function view() {
		return [
			Main.viewTop(),
			m(".page-controls", [
				m(".title", "People"),
				m("a[href=/people/new]", {oncreate: m.route.link}, "Add person"),
				m("br"),
				m("a[href=/people/import]", {oncreate: m.route.link}, "Import people"),
				R.isNil(tags) ? null : tags.viewThumbList(),
				m("a.link[href=/people/metatags]", { oncreate: m.route.link }, "Manage metatags"),
			]),
			R.isNil(filtered_list) ? m("p", "Loading...") :
			m(".cards", R.map(viewEditThumb, filtered_list)),
			Main.viewBottom(),
		];
	}

	return {
		view: view,
		oninit: oninit, // mithril module
		viewThumb: viewThumb,
		viewAvatar: viewAvatar,
	};
};
var People = PeopleComponent();



var PersonEd = function() {
	var uploader = null;
	var person;
	var person_id=0;
	var home_visible = false;
	var sending_change_pwd = "";
	var editing_self = false;
	var metatags = St.use('people/metatags'); // to apply mt to this person on save

	function oninit() {
		sending_change_pwd = "Send change password email";
		metatags.fetch();

		var new_type = m.route.param("type");
		if(m.route.get()=="/people/new"){
			person_id = "new";
			var person_obj = {
				name: "",
				username: "",
				password: "",
				email: "",
				tags: "",
			};
			person = St.use("people");
			person.set(person_obj);
		}
		else if (m.route.param("person_id")) {
			person_id = m.route.param("person_id");
			if (person_id == "me"){
			   editing_self = true;
			   person_id = Login.get('person_id');
			}
			else {
				editing_self = false;
			}
			person = St.use("people/" + person_id);
			person.fetch().then(function() {
				// password isn't sent back from server (obviously)
				// so we need to set the field to a blank string first
				var p = person.get();
				p.password = "";
				person.set(p);
				person_id = p.person_id;
			});
		}
		else {
			St.error = "Person editor summoned without a person_id.";
			person_id = 0;
		   	return;
		}



		uploader = Uploader({
			instructions: "Drop image here or click to upload.",
			purpose: "person-thumb",
			related_id: person_id,
			callback: afterUpload,
		});

		home_visible = false;
	}

	function afterUpload(result_data) {
		var p = person.get();
		p.thumb_fname = result_data.launch_fname;
		p.thumb_file_id = result_data.file_id;
		person.set(p);
		if(Login.get('person_id') == person.get().person_id){
			Login.set('thumb_file_id', p.thumb_file_id);
			Login.set('thumb_fname', p.thumb_fname);
		}
	}

	function applyMetaTags(){
		var mtags = metatags.get().metatags;
		if(!mtags) return;
		var curtags = Ut.tagstrToList(person.prop("tags").get());
		if(curtags == '') return;
		// TODO: yes, this should be generalized and exist in only
		// one place: metatags proper
		// The trick is: this is the clever one and the most tested!
		function rule_fits(mt){
			function and_or(word, a, b){
				if(word=="AND") { return a && b; };
				if(word=="OR") { return a || b; };
			}
			var rule = mt.rule.match(/(\S+)\s+(AND|OR)\s+(\S+)/);
			var has_tag1=R.contains(rule[1], curtags);
			var andor=rule[2];
			var has_tag2=R.contains(rule[3], curtags);
			return and_or(andor, has_tag1, has_tag2);
		}
		function prepend_star(t){ return "*"+t; }
		function is_new(t){ return R.not(R.contains(t, curtags)); }
		var mt_to_add = R.filter(rule_fits, mtags);
		mt_to_add = R.uniq(R.map(R.prop("tag_name"), mt_to_add));
		mt_to_add = R.map(prepend_star, mt_to_add);
		mt_to_add = R.filter(is_new, mt_to_add);
		var newtags = R.concat(curtags, mt_to_add);
		var newtagstr = R.join(',', newtags);
		person.prop("tags").set(newtagstr);
	}

	function save() {
		applyMetaTags();
		if(Login.get('person_id') == person.get().person_id){
			Login.set('name', person.get().name);
		}
		if(person_id=="new" || person.prop("password").get().length > 0){
			// enforce new user password
			if(person.prop("password").get().length < 4){
				St.error="New user password must be at least 4 characters long. Longer passwords are generally more secure.";
				return;
			}
		}
		person.send().then(function() {
			if(Login.is_admin()){
				m.route.set("/people");
			} else {
				m.route.set("/home");
			}
		});
	}

	function changepwd() {
		sending_change_pwd = "Sending...";
		m.redraw();
		var acctok = St.use("tokens/access");
		acctok.set({person_id:person.get().person_id});
		acctok.send().then(function() {
			sending_change_pwd = "Email sent";
		});
	}

	function viewHome() {
		if (!home_visible) return null;

		return m(Home, { person_id: person.get().person_id });
	}

	function viewAdminControls(){
		if(!Login.is_admin()) return null;

		return [
			m("a.link", { href: "/records/people/" + person_id, oncreate: m.route.link }, "View records"),
		];
	}

	function viewIsFrozen(){
		var tags = Ut.tagstrToList(person.get().tags);
		if(R.contains('$frozen', tags)){
			return m('h2.danger', 'This person is frozen');
		}
		else {
			return null;
		}
	}

	function viewLastLogin(){
		var last_login = person.get().last_login;
		if(!last_login) return null;
		var lld = moment(last_login);
		var lldf = lld.format('MMM Do, YYYY');
		return m("div", {style:{float: 'right'}}, "Last logged in: "+lldf);
	}

	function view() {
		if (person_id == 0) return m("p", "Person editor requires person_id.");
		if (R.isNil(person.get())) return Ut.viewLoading();
		var cancel = function(){
			if (editing_self) {
				m.route.set("/home");
			}
			else {
				m.route.set("/people");
			}
		}
		var dialog_title = (person_id==0 ? "Create New" : "Edit "+person.prop('name').get());
		var thumb = person.get().thumb_file_id ? "/api/files/" + person.get().thumb_file_id + "/" + person.get().thumb_fname : imgs.default_avatar;
		return m(".people-edit", [
			Main.viewTop(),
			m(".dialog", [
				m(".title", dialog_title),
				m(".form", [
					viewIsFrozen(),
					viewLastLogin(),
					People.viewAvatar(person.get()),
					uploader.view(),
					m("br"),
					Ut.viewBoundInput("Name", person.prop('name')),
					Ut.viewBoundInput("Username", person.prop('username')),
					Ut.viewBoundPassword("Password", person.prop('password')),
					person_id != "new" && Login.is_admin() ? [
						m("button.primary", { onclick: changepwd }, sending_change_pwd),
					] : null,
					Ut.viewBoundInput("Email", person.prop('email')),
					Login.is_admin() ? Ut.viewBoundInput("Tags", person.prop('tags')) : null,
					m("button.primary", { onclick: save }, "Save"),
					m("button", { onclick: cancel }, "Cancel"),
					viewAdminControls(),
				]),
			]),
		]);
	}

	return {
		view: view,
		oninit: oninit,
		save: save,
	}; // mithril module
};





var PeopleMetaTags = function() {
	var new_dialog_open = false;
	var people = St.use('people');
	var tags;
	var metatags = St.use('people/metatags');
	var new_metatag = {};
	var test_results = [];

	function oninit() {
		people.fetch().then(setup_tags);
		metatags.fetch();
		new_metatag.tag_name = stream("new-metatag");
		new_metatag.rule = stream("");
	}

	function setup_tags() {
		tags = Tags(people.get(), {
			on_click: tag_clicked
		});
	}

	function tag_clicked(t) {
		var r = new_metatag.rule();
		new_metatag.rule(r + " " + t);
	}

	function person_tags(p) {
		return R.split(',', R.trim(p.tags));
	}

	function syntax_check(rule){
		var okay = true;
		var bits = R.split(/\s/, rule);
		if (bits.length != 3) okay=false;
		if (bits[1] != "AND" && bits[1] != "OR") okay=false;
		if(!okay) St.error = "Sorry, the rule must be in the form \"tag1 AND tag2\" or \"tag1 OR tag2\".";
	}

	function save_new() {
		var ruletxt = R.trim(new_metatag.rule());
		syntax_check(ruletxt);

		// the meta-tag name is prepended with a '*' when stored
		var t = '*' + new_metatag.tag_name();

		// first, run test to get the list of people
		test();

		// loop through the people, check that the tag doesn't already exist
		// (test wouldn't do this, because that would be confusing when making the rule)
		// and then upload the person with the new tags property to the people api
		function add_tag_and_save(p) {
			var ptags = person_tags(p);
			if (R.contains(t, ptags)) {
				St.error = "The '"+t+"' tag name is already in use.";
				return;
			}
			ptags.push(t);
			p.tags = R.join(',', ptags);
			var uri = "people/" + p.person_id;
			var P = St.use(uri);
			P.set(p);
			P.send();
		}

		R.map(add_tag_and_save, test_results);


		// now save the meta-tag itself

		var st_mt = St.use('people/metatags');
		st_mt.set({
			tag_name: new_metatag.tag_name(),
			rule: new_metatag.rule(),
		});
		st_mt.send().then(function(new_id) {
			// meta-tag saved...
			new_dialog_open = false;
			metatags.fetch();
		});
	}

	function viewMetatags() {
		var mtags = metatags.get();
		if (R.isNil(mtags)) return "Loading meta tags...";

		return m(".metatags", [
			m("h1", "People metatags"),
			R.map(function(t) {
				return m("p", [
					m("ul.tags", m("li", t.tag_name+" = "+t.rule)),
				]);
			}, mtags.metatags),
		]);
	}

	function test() {
		var ruletxt = R.trim(new_metatag.rule());
		syntax_check(ruletxt);

		var r = R.split(' ', ruletxt);

		// NOTE: any changes to this should also be made in 
		// PersonEd because it has a sort-of copy of this
		// Of course, that should be corrected ASAP
		
		function test_person(p) {
			if(!p.tags) return false;
			var ptags = R.split(',', R.trim(p.tags));
			if (r[1] == "AND") return test_and(r[0], r[2], ptags);
			if (r[1] == "OR") return test_or(r[0], r[2], ptags);
		}
		test_results = R.filter(test_person, people.get());
		if(R.isEmpty(test_results)) test_results = [{name:"No matches"}];
	}

	function test_and(tag1, tag2, tags) {
		return R.contains(tag1, tags) && R.contains(tag2, tags);
	}

	function test_or(tag1, tag2, tags) {
		return R.contains(tag1, tags) || R.contains(tag2, tags);
	}

	function clickNew(){
		new_dialog_open = !new_dialog_open;
	}

	function viewNewDialog(){
		if(!new_dialog_open) return null;

		return m(".dialog", [
				m(".title", "Create a new metatag"),
				m(".form", [
					m("label", "Name:"),
					m("input[type=text]", { onchange: m.withAttr('value', new_metatag.tag_name), value: new_metatag.tag_name() }),
					m("label", "Rule:"),
					m("input[type=text]", { onchange: m.withAttr('value', new_metatag.rule), value: new_metatag.rule() }),
					m("i", "Rules must be in the form \"tag1 AND tag2\" or \"tag1 OR tag2\"."),
				]),
				test_results.map(function(p) { return m("p", p.name); }),
				m(".tags", [
					m("button", { onclick: function() { tag_clicked("AND"); } }, "AND"),
					m("button", { onclick: function() { tag_clicked("OR"); } }, "OR"),
				]),
				R.isNil(tags) ? null : tags.viewThumbList(),
				m("button", { onclick: test }, "test"),
				m("button.primary", { onclick: save_new }, "Apply and Save"),
			]);
	}

	function view() {
		var mtags = metatags.get();
		return m(".metatags", [
			Main.viewTop(),
			m(".page-controls", [
				m("h2", "Metatags"),
				m("a.link", {onclick:clickNew}, "Create new metatag"),
			]),
			viewNewDialog(),
			viewMetatags(),
		]);
	}

	return {
		view: view,
		oninit: oninit
	}; // mithril module
};




var PeopleImport = function() {
	var uploader = null;
	var import_results = null;
	var view_raw = false;

	function oninit() {
		uploader = Uploader({
			instructions: "Drop CSV file here or click to upload.",
			purpose: "people-import",
			callback: afterUpload,
		});
	}

	function afterUpload(result_data) {
		uploader.hide();
		import_results = result_data.imported;
	}

	function viewImportResults(){
		if(!import_results) return null;
	
		// create csv for download!	
		var head="name,email,tags,username,info,pid,access_link\n";
		var raw_csv = import_results.reduce(function(txt,p){
			p = p.map(function(z){return '"'+z+'"'}); // quote
			return txt+p.join(",")+"\n"; // comma-separate
		}, head);
		var raw_csv_uri = encodeURIComponent(raw_csv);
		var raw_csv_data = "data:text/csv;charset=utf-8,"+raw_csv_uri;

		return m(".import-results", [
			m("table", [
				m("thead", m("tr", [
					m("th", "Name"),
					m("th", "Email"),
					m("th", "Username"),
					m("th", "Access link"),
				])),
				import_results.map(function(p){
					var mt = "mailto:"+p[1];
					return m("tr",
						m("td", p[0]),
						m("td", m("a", {href:mt}, p[1])),
						m("td", p[3]),
						m("td", m("a", {href:p[6]}, "link")),
					);
				}),
			]),
			m("a", {href:raw_csv_data, download:"import-results.csv"}, "Download these results as a CSV"),
			" (Recommended)",
		]);
	}

	function viewRawResults(){
		if(!view_raw) return null;
		var head="name,email,tags,username,info,pid,access_link\n";
		return m("textarea", import_results.reduce(function(csvtxt,p){
			p = p.map(function(z){return '"'+z+'"'}); // quote
			return csvtxt+p.join(","); // comma-separate
		}, head));
	}

	function view() {
		return m(".people-import", [
			Main.viewTop(),
			m(".dialog", [
				m(".title", "Import People"),
				m("p", "To import more than one person at a time, you can submit a CSV file.  CSV stands for 'Comma-Separated Values' and is a common interchange format for tabular data such as spreadsheets. Most spreadsheet programs can import and export the CSV format."),
				m("a", {href:"person-import-example.csv"}, "Download sample CSV file"),
				m("p", "Only the 'name' column is required."),
				m("h3", "Upload CSV file to start import"),
				uploader.view(),
				viewImportResults(),
			]),
		]);
	}

	return {
		view: view,
		oninit: oninit,
	}; // mithril module
};


