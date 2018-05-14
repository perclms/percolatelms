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


var Catalog = function() {
	var raw_list = St.use("catalog");
	var filtered_list = null;
	var lpaths = St.use("lpaths");

	function oninit() {
		raw_list.fetch().then(function(list) {
			list = Ut.sortAlphaBy("title", list);
			filtered_list = list;
		});
	}

	function onFilter(list) {
		filtered_list = list;
	}

	function viewContent() {
		if (!filtered_list) {
			return "Loading...";
		}

		function click(c) {
			m.route.set("/content/"+Ut.encodeId(c.content_id));
		}

		viewThumb = Content.viewThumb({onclick:click});

		return m(".cards", R.map(viewThumb, filtered_list));
	}

	function view() {
		return [
			Main.viewTop(),
			m(".page-controls", [
					m(".title", "Catalog"),
			]),
			viewContent(),
			Main.viewBottom(),
		];
	}

	return {
		view: view,
		oninit: oninit, // mithril module
	};
};
