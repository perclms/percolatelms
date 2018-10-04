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


var Home = function() {
	var person_id;
	var bundle;
	var new_content_title_form = false;
	var new_title = stream("");
	var admin_view_welcome = false;
	var my_content_orig = null;
	var my_content_filtered = null;


	function oninit(vnode) {
		if (vnode.attrs.person_id) {
			person_id = vnode.attrs.person_id;
		}
		else if (Login.is_logged_in()) {
			person_id = Login.get('person_id');
		} 
		else {
			m.route.set("/login");
		}
		bundle = St.use("people/" + person_id + "/home");
		bundle.fetch().then(function(data){
			my_content_orig = bundle.get().content;	
			my_content_filtered = R.clone(my_content_orig);
		});

		admin_view_welcome = false;
	}
	
	function viewMyContent() {
		if (!my_content_filtered) {
			return "Loading...";
		}

		function click(c) {
			m.route.set("/content/"+Ut.encodeId(c.content_id));
		}

		function viewRecords(c){
			var rs = bundle.get().records;
			var r = R.find(R.propEq('content_id', c.content_id), rs);
			if(r){
				var rec = "";
				if(r.last_launched_ts){
					var d = moment(r.last_launched_ts);
					rec = "Last launched: "+d.format('MMM Do, YYYY');
				}
				return m(".records", ""+rec);
			}
			return null;
		}

		viewThumb = Content.viewThumb({onclick:click,records:viewRecords});

		// don't display Welcome in Home's content list!
		my_content_filtered = R.filter(function(c){ return (c.title!="Welcome"); }, my_content_filtered);

		return m(".cards", R.map(viewThumb, my_content_filtered));
	}

	function viewAdminControls(){
		if (!Login.is_admin()) return null;
		return null;
	}

	function viewWelcome(){
		var d = bundle.get();
		if (Login.is_admin()) {
			if (!d.welcome_exists){
				return [
					m("p", "There is no learner welcome message."),
					m("a[href=/content/new/welcome]", {oncreate:m.route.link}, "Click here to create one."),
				];
			}
			if (!admin_view_welcome){
				return m("a.link", {onclick:function(){admin_view_welcome=true;}}, "View learner welcome");
			}
		}
		if (!d.welcome_exists) return null;
		return m(Player, {embed_player: true, content_id:d.welcome_id, is_welcome:true});
	}


	function viewCatalogLink(bundle){
		if (!bundle.catalog_exists) return null;
		var count = (bundle.catalog_count == 1 ? "(1 item)" : "("+bundle.catalog_count+" items)");
		return m("div", m("a.link", { oncreate: m.route.link, href: "/catalog" }, "View catalog "+count));
	}

	function viewSearchBox(){
		var search = m.withAttr("value", function(s) {
			s = R.toLower(s);
			var gettxt = function(c){ return c.title+c.description; }
			var f = R.compose(R.contains(s), R.toLower, gettxt);
			my_content_filtered = R.filter(f, my_content_orig);
		});
		return m(".searchbox.input-with-icon", [
			m("input[type=text]", {oninput:search, placeholder:"content keywords"}),
			m("i.material-icons", "search"),
		]);
	}

	function viewLearnerBuildLink(){
		if(Main.customConfig('show_learner_build_content') === false) return null;
		return m("a[href=/content/new/cb]", {oncreate:m.route.link}, "Build new content");
	}

	function view() {
		if (!Login.is_logged_in()) return m("p", "Sorry, you are not logged in. Please refresh your browser.");
		var d = bundle.get();
		return m(".home", [
			Main.viewTop(), 

			!d ? "Loading..." : [
				m(".page-controls", [
					viewAdminControls(),
					viewWelcome(),

					m("h1", "Content Assigned to Me"),
					m("p", "Below are my content items, learning paths, and discussions."),
					viewSearchBox(),
					viewLearnerBuildLink(),
					viewCatalogLink(d),
					m("br.clear"),
				]),
				viewMyContent(),
			],
			Main.viewBottom(),
		]);
	}

	return {
		view: view,
		oninit: oninit,
	}; // mithril module
};
