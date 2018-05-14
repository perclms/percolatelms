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


var Erules = function() {
	var rule_list = null;
	var new_erule_open = false;

	// marked for deletion:

	// pre-populate picker ui models
	var person_picker = {
		filter_prop: "name",
		filter_label: "Name",
		button_label: "Select a person or tag",
		placeholder_type: "person",
	};
	var content_picker = {
		filter_prop: "title",
		filter_label: "Title",
		button_label: "Select a content item or tag",
		placeholder_type: "content",
	};

	function oninit() {
		// this tool must get both full lists and everything is generated after that
		St.use("people").fetch().then(function(data) {
			// set the layout type of each item (needed for more complicated uses)
			var people = data.map(function(i){ i.layout_type="person"; return i; });
			var tags = Ut.tagsWithCountsFromObjList(people, "ptag");
			data = R.concat(people,tags);
			person_picker.original_list = data;
			person_picker.filtered_list = data;
		});
		St.use("content").fetch().then(function(data) {
			// set the layout type of each item (needed for more complicated uses)
			var content = data.map(function(i){ i.layout_type="content"; return i; });
			var tags = Ut.tagsWithCountsFromObjList(content, "ctag");
			data = R.concat(content,tags);
			content_picker.original_list = data;
			content_picker.filtered_list = data;
		});

		St.use("erules").fetch().then(function(data) {
			rule_list = data;
		});
	}

	// TODO: consider moving this to Tags module
	function extractTags(list) {
		var isNothing = R.either(R.isNil, R.isEmpty);
		var tagprop = R.map(R.prop('tags'));
		var taglist = R.map(R.split(','));
		var nonempty = R.reject(isNothing);
		return R.compose(R.uniq, R.unnest, taglist, nonempty, tagprop)(list);
	};

	function save_new() {
		new_erule_open = false;
		var erule = St.use("erules");
		var new_rule = {};

		if (person_picker.selected_item.layout_type=="ptag") {
			new_rule.person_tag = person_picker.selected_item.name; // because we finagled it so
		} else {
			new_rule.person_id = person_picker.selected_item.person_id;
		}

		if (content_picker.selected_item.layout_type=="ctag") {
			new_rule.content_tag = content_picker.selected_item.title; // because we finagled it so
		} else {
			new_rule.content_id = content_picker.selected_item.content_id;
		}

		// push onto list to give user feedback
		rule_list.push(new_rule);

		erule.set(new_rule);
		erule.send();
	}

	function viewList() {
		if (!rule_list || 
				!person_picker.original_list || 
				!content_picker.original_list) return "Loading...";

		function viewrule(r) {
			var guts = [];
			if(r.person_id){
				var p = R.find(R.propEq('person_id', r.person_id), person_picker.original_list);
				if(!p) return m(".e", "Someone who no longer exists! (This rule is invalid)");
				//guts.push(Ut.viewPersonThumb(p));
				guts.push(m(".title", p.name));
			}
			if(r.person_tag){
				guts.push(m("span", "Any person with the tag "));
				guts.push(m(".title", '"'+r.person_tag+'"'));
			}

			guts.push(m("i.material-icons", "arrow_forward"));

			if(r.content_id){
				var c = R.find(R.propEq('content_id', r.content_id), content_picker.original_list);
				if(!c) return m(".e", "Content which no longer exists! (This rule is invalid)");
				//guts.push(Ut.viewContentThumb(c));
				guts.push(m(".title", c.title));
			}
			if(r.content_tag){
				guts.push(m("span", "Any content with the tag "));
				guts.push(m(".title", '"'+r.content_tag+'"'));
			}
			return m(".e", guts);
		}

		// sort so that person tag rules go first
		var has_ptag = R.propIs(String, 'person_tag');
		rule_list = R.sort(has_ptag, rule_list);

		return m(".erule-list", R.map(viewrule, rule_list));
	}

	function clickNew(){
		new_erule_open = !new_erule_open;
	}

	function viewCreateNew(){
		if(!new_erule_open) return null;
		return [
			m(".cards", [
				Ut.viewPickerButton(person_picker),
				Ut.viewPickerButton(content_picker),
			]),
			Ut.viewPickerStack(person_picker),
			Ut.viewPickerStack(content_picker),
			m('button.primary', { onclick: save_new }, "Save Rule"),
		];
	}

	function view() {
		return m(".erules", [
			Main.viewTop(),
			m(".page-controls", [
				m(".title", "Enrollment rules"),
				m("a.link", {onclick:clickNew}, "Create new enrollment rule"),
				viewCreateNew(),
			]),
			viewList(),
		]);
	}

	return {
		view: view,
		oninit: oninit,
	};
};
