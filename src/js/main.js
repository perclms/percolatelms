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


// global static path
var static_prefix = "https://s3.amazonaws.com/static.perclms.com/common/ui/"; 
// lookup for paths
var imgs = {
	cb: static_prefix+"icon_cb.svg", 
	comment: static_prefix+"icon_discussion.svg",
	lpath: static_prefix+"icon_lpath.svg",
	scorm: static_prefix+"icon_scorm.svg",
	default_logo: static_prefix+"default_logo.svg",
	default_thumb: static_prefix+"default_thumb.svg",
	default_avatar: static_prefix+"default_avatar.svg",
	ptag: static_prefix+"icon_ptag.svg",
	ctag: static_prefix+"icon_ctag.svg",
	uploader: static_prefix+"icon_uploader.svg",
};

var MainComponent = function() {
	var site_config = null;
	var me_menu_hidden = stream(true);

	loadSiteConfig(); // call as soon as this "module" loads

	function loadSiteConfig(){
		var config = St.use("config");
		config.fetch().then(function(data){
			var c = config.get();
			site_config = c;

			// immediately set page title
			document.title = c.title;
		});
	}

	function customConfig(key){
		if(typeof CustomConfig == "undefined") return null;
		return CustomConfig.get(key);
	}

	function siteConfig(){
		return site_config;
	}

	function clearError() {
		St.error = null;
	}

	function viewError() {
		if (!St.error) return null;
		return m(".error-box.danger", [
				m("button", { onclick: clearError }, "Close"),
				St.error,
		]);
	}

	function viewLogoImg(){
		var logosrc = imgs.default_logo;
		if(site_config && site_config.logo_file_id){
			logosrc = "/api/files/"+site_config.logo_file_id+"/"+site_config.logo_fname;
		}

		return m('img', { src: logosrc });
	}

	function viewTop() {
		function clickLogo(){
			var default_route = Login.is_logged_in() ? "/home" : "/login";
			m.route.set(default_route);
		}

		return m(".top", [
			m(".topbar", [
				viewError(),
				m(".logo", {onclick:clickLogo}, viewLogoImg()),
				m(".menubar", [
					viewMenu(),
					viewMe(),
				]),
				m(".border"),
			]),
			viewMeMenu(),
		]);
	}

	function viewBottom() {
		return [
			m(".foot", ""),
		];
	}

	function viewMe() {
		if (!Login.is_logged_in()) return null;
		var tid = Login.get('thumb_file_id');
		var path = "/api/files/" + tid + "/" + Login.get('thumb_fname');
		var img = m("img.avatar", { src: path });
		if(!tid || tid == "null") img = m("i.material-icons", "face");
		//var moreclass = (me_menu_hidden ? "" : ".expanded");
		return m(".item.me", {onclick: Ut.toggleProp(me_menu_hidden)}, [
			img,
			m("i.material-icons", "arrow_drop_down"),
		]);
	}
	
	function viewMeMenu() {
		if (!Login.is_logged_in()) return null;
		if(me_menu_hidden()) return null;
		return m(".me-menu", {onclick:Ut.toggleProp(me_menu_hidden)}, [
			m("a.link.me-item", {href: "/people/me", oncreate: m.route.link}, [
				m("i.material-icons", "person"), 
				m("span", "Edit profile"),
			]),
			m("a.link.me-item", { onclick: Login.logout }, [
				m("i.material-icons", "exit_to_app"), 
				m("span", "Logout"),
			]),
		]);
	}

	function viewMenu() {
		if (!Login.is_logged_in()) return null;

		function make_route_link(r, title, icon, requires_admin) {
			if (requires_admin && !Login.is_admin()) return null;
			var route_path_tail = /\/(\w+)/.exec(m.route.get());
			var current_route = route_path_tail ? route_path_tail[1] : "";
			var curclass = (current_route == r ? "current" : "");
			return m(".item", {class:curclass, onclick:function(){m.route.set("/"+r)}}, [
					m("i.material-icons", icon),
					m("b", title),
			]);
		}

		return [
			make_route_link("home", "Home", "dashboard"),
			make_route_link("content", "Content", "folder", "requires_admin"),
			make_route_link("people", "People", "people", "requires_admin"),
			make_route_link("enroll", "Enroll", "assignment", "requires_admin"),
			make_route_link("records", "Records", "insert_chart", "requires_admin"),
			make_route_link("config", "settings", "settings", "requires_admin"),
		];
	}

	return {
		viewTop: viewTop,
		viewBottom: viewBottom,
		viewError: viewError,
		loadSiteConfig: loadSiteConfig,
		siteConfig: siteConfig,
		viewLogoImg: viewLogoImg,
		customConfig: customConfig,
	};
};

var Main = MainComponent();




// special component for displaying error message about no tenant!

function NoTenant(){
	var box_style = {
		width:"500px",
		margin:"2em auto",
		background:"white",
		borderRadius:"4px",
		boxShadow:"4px  4px 4px #CCC"};
	var head_style = {
		background:"#666",
		color:"#FFF",
		fontSize:"30px",
		textAlign:"center", 
		borderRadius:"4px 4px 0 0", 
		padding:"1em"};
	var para_style = {margin:"2em"};
	var logo_style = {width:"300px",margin:"1em auto",display:"block"}
	var imgsrc = "https://s3.amazonaws.com/static.perclms.com/common/ui/default_logo.svg";

	function view(){
		return m(".box", {style:box_style}, [
		   m(".head", {style:head_style}, "No LMS Here"),
		   m("img", {src:imgsrc,style:logo_style}),
		   m("p", {style:para_style}, St.noTenantMessage),
		   m("br"),
		]);
	}

	return {
		view:view
	};
}
