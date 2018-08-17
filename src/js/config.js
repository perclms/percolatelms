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


var Config = function() {
	var config = St.use("config");
	var logo_uploader = null;
	var show_logo_uploader = true;
	var css_uploader = null;
	var show_css_uploader = true;

	function oninit() {
		config.fetch();

		logo_uploader = Uploader({
			instructions: "Drop logo image here or click to upload.",
			purpose: "site-logo",
			callback: function(result_data){
				var d = result_data;
				var c = config.get();
				c.logo_fname = d.launch_fname;
				c.logo_file_id = d.file_id;
				// show_logo_uploader = false;
				Main.loadSiteConfig();
			}
		});
		css_uploader = Uploader({
			instructions: "Drop CSS file here or click to upload.",
			purpose: "stylesheet",
			callback: function(result_data){
				show_css_uploader = false;
			}
		});
	}

	function save() {
		config.send().then(function() {
			Main.loadSiteConfig();
			m.route.set("/home/");
		});
	}

	function view() {
		return [
			Main.viewTop(),
			m(".dialog", [
				m(".title", "Configure LMS appearance and settings"),
				m("h3", "Current logo"),
				m(".logo-preview", Main.viewLogoImg()),
				m("h3", "Upload new logo"),
				m("p", "You can upload a new logo in .png, .jpg, or .gif formats.  It is recommended that your logo be approximately 40px tall."),
				show_logo_uploader ? logo_uploader.view() : null,
				m("h3", "Custom title"),
				Ut.viewBoundInput("Web browser page title", config.prop('title')),
				m("h3", "Custom CSS stylesheet"),
				//Ut.viewBoundInput("Stylesheet selection", config.prop('css')),
				show_css_uploader ? css_uploader.view() : "New CSS uploaded. Refresh your browser to see the changes. (Note: you may need to use CTRL+F5 to 'hard refresh')",
				m("br"),
				m("button", { onclick: save }, "Save"),
			]),
			Main.viewBottom(),
		];
	}

	return {
		view: view,
		oninit: oninit
	}; // mithril module
};



