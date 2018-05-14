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


var Records = function() {

	function oninit() {}

	function view() {
		return m(".report-page", [
			Main.viewTop(),
			m(".page-controls", [
				m(".title", "Records"),
				m(".cards", [
					m(".card.action", {onclick:function(){ m.route.set("/records/edit"); }}, [
						m(".title", "Manual entry"),
						m(".description", "Create or edit a person's record for a content item") ]),
					m(".card.action", {onclick:function(){ m.route.set("/records/content"); }}, [
						m(".title", "Content record report"),
						m(".description", "View all records for a content item") ]),
					m(".card.action", {onclick:function(){ m.route.set("/records/people"); }}, [
						m(".title", "Person record report"),
						m(".description", "View all records for a person") ]),
				]),
			]),
		]);
	}


	return {
		view: view,
		oninit: oninit,
	};
};


var RecordContent = function() {
	var content = null;
	var st_record = null; // THE records
	var clist_open = false;

	var content_picker = {
		callback: loadRecord,
		filter_prop: "title",
		filter_label: "Title",
		button_label: "Select a content item",
		placeholder_type: "content",
	};

	function oninit() {
		St.use("content").fetch().then(function(data) {
			// set the type of each item (needed for more complicated uses)
			data = data.map(function(i){ i.layout_type="content"; return i; });
			content_picker.original_list = data;
			content_picker.filtered_list = data;
			// check if we've been passed one in the route string
			var content_id = parseInt(m.route.param("content_id"));
			if (content_id){
				content_picker.selected_item = R.filter(R.propEq('content_id', content_id), data)[0];
				loadRecord();
			}
		});

	}


	function loadRecord() {
		var c = content_picker.selected_item;
		if (!c) return;

		st_record = St.use("content/" + c.content_id + "/records");
		st_record.fetch();
	}

	function viewARecord(r) {
		return m("tr", [
			m("td", r["title"]),
			m("td", r["name"]),
			m("td", r["username"]),
			m("td", r["score"]),
			m("td", r["passed"]),
			m("td", r["failed"]),
			m("td", r["started_ts"]),
			m("td", r["completed"] ? r["completed_ts"] : "No"),
			m("td", r["last_launched_ts"]),
			m("td", r["launch_count"]),
			m("td", r["duration_sec"]),
			m("td", r["frozen"]),
			m("td", m("a", {
				href: "/records/edit/person/" + r["person_id"] + "/content/" + r["content_id"],
				oncreate: m.route.link
			}, "Edit")),
		]);
	}

	function viewCbLink(){
		if(content_picker.selected_item.type!="cb") return null;
		var cid = content_picker.selected_item.content_id;
		return m("p", [
			"This was built using the LMS and may have more advanced quiz records.",
			m("a.link[href='/records/cb/"+cid+"']", {oncreate:m.route.link}, "View content builder quiz records.")
		]);
	}

	function viewRecords() {
		if (!content_picker.selected_item) return null;

		if (!st_record.get()) return "Loading...";

		return m(".manual-record", [
			m("h2", "Records"),
			viewCbLink(),
			m("table", [
				m("thead", [
					m("tr", [
						m("th", "Title"),
						m("th", "Name"),
						m("th", "Username"),
						m("th", "Score"),
						m("th", "Passed"),
						m("th", "Failed"),
						m("th", "Started"),
						m("th", "Completed"),
						m("th", "Last launched"),
						m("th", "Launch count"),
						m("th", "Duration (sec)"),
						m("th", "Frozen?"),
					]),
				]),
				m("tbody", st_record.get().map(viewARecord)),
			]),
		]);
	}


	function view() {
		return m(".record-content", [
			Main.viewTop(),
			m(".page-controls", [
				m(".title", "View or edit a record"),
				m(".cards", [
					Ut.viewPickerButton(content_picker),
				]),
				Ut.viewPickerStack(content_picker),
			]),
			viewRecords(),
		]);
	}

	return {
		view: view,
		oninit: oninit,
	};
};


var RecordPeople = function() {
	var person = null;
	var st_record = null; // THE records
	var plist_open = false;

	var people_picker = {
		callback: loadRecord,
		filter_prop: "name",
		filter_label: "Name",
		button_label: "Select a person",
		placeholder_type: "person",
	};

	function oninit() {
		St.use("people").fetch().then(function(data) {
			// set the type of each item (needed for more complicated uses)
			data = data.map(function(i){ i.layout_type="person"; return i; });
			people_picker.original_list = data;
			people_picker.filtered_list = data;
			// check if we've been passed one in the route string
			var person_id = parseInt(m.route.param("person_id"));
			if (person_id){
				people_picker.selected_item = R.filter(R.propEq('person_id', person_id), data)[0];
				loadRecord();
			}
		});

	}


	function loadRecord() {
		var c = people_picker.selected_item;
		if (!c) return;

		st_record = St.use("people/" + c.person_id + "/records");
		st_record.fetch();
	}

	function viewARecord(r) {
		return m("tr", [
			m("td", r["title"]),
			m("td", r["name"]),
			m("td", r["username"]),
			m("td", r["score"]),
			m("td", r["passed"]),
			m("td", r["failed"]),
			m("td", r["started_ts"]),
			m("td", r["completed"] ? r["completed_ts"] : "No"),
			m("td", r["last_launched_ts"]),
			m("td", r["launch_count"]),
			m("td", r["duration_sec"]),
			m("td", r["frozen"]),
			m("td", m("a", {
				href: "/records/edit/person/" + r["person_id"] + "/people/" + r["person_id"],
				oncreate: m.route.link
			}, "Edit")),
		]);
	}

	function viewCbLink(){
		if(people_picker.selected_item.type!="cb") return null;
		var cid = people_picker.selected_item.person_id;
		return m("p", [
			"This was built using the LMS and may have more advanced quiz records.",
			m("a.link[href='/records/cb/"+cid+"']", {oncreate:m.route.link}, "View content builder quiz records.")
		]);
	}

	function viewRecords() {
		if (!people_picker.selected_item) return null;

		if (!st_record.get()) return "Loading...";

		return m(".manual-record", [
			m("h2", "Records"),
			viewCbLink(),
			m("table", [
				m("thead", [
					m("tr", [
						m("th", "Title"),
						m("th", "Name"),
						m("th", "Username"),
						m("th", "Score"),
						m("th", "Passed"),
						m("th", "Failed"),
						m("th", "Started"),
						m("th", "Completed"),
						m("th", "Last launched"),
						m("th", "Launch count"),
						m("th", "Duration (sec)"),
						m("th", "Frozen?"),
					]),
				]),
				m("tbody", st_record.get().map(viewARecord)),
			]),
		]);
	}


	function view() {
		return m(".record-people", [
			Main.viewTop(),
			m(".page-controls", [
				m(".title", "View or edit a record"),
				m(".cards", [
					Ut.viewPickerButton(people_picker),
				]),
				Ut.viewPickerStack(people_picker),
			]),
			viewRecords(),
		]);
	}

	return {
		view: view,
		oninit: oninit,
	};
};


var RecordEdit = function() {
	var st_record = null; // THE record
	var saving = false;
	var saved = false;

	// pre-populate picker ui models
	var person_picker = {
		callback: loadRecord,
		filter_prop: "name",
		filter_label: "Name",
		button_label: "Select a person",
		placeholder_type: "person",
	};
	var content_picker = {
		callback: loadRecord,
		filter_prop: "title",
		filter_label: "Title",
		button_label: "Select a content item",
		placeholder_type: "content",
	};


	function oninit() {
		// this tool must get both full lists and everything is generated after that
		St.use("people").fetch().then(function(data) {
			// set the type of each item (needed for more complicated uses)
			data = data.map(function(i){ i.layout_type="person"; return i; });
			person_picker.original_list = data;
			person_picker.filtered_list = data;
			// check if we were given a person to select via the route
			var person_id = parseInt(m.route.param("person_id"));
			if (person_id){
				person_picker.selected_item = R.find(R.propEq('person_id', person_id), data);
				loadRecord(); // in case both person and content preselected
			}
		});
		St.use("content").fetch().then(function(data) {
			// set the type of each item (needed for more complicated uses)
			data = data.map(function(i){ i.layout_type="content"; return i; });
			content_picker.original_list = data;
			content_picker.filtered_list = data;
			var content_id = parseInt(m.route.param("content_id"));
			if (content_id){
				content_picker.selected_item = R.filter(R.propEq('content_id', content_id), data)[0];
				loadRecord(); // in case both person and content preselected
			}
		});
	}

	function loadRecord() {
		if (!person_picker.selected_item || !content_picker.selected_item) return;
		var pid = person_picker.selected_item.person_id;
		var cid = content_picker.selected_item.content_id;

		st_record = St.use("people/"+pid+"/content/"+cid+"/record");
		st_record.fetch();
	}

	function save() {
		saving = true;
		st_record.send().then(function() {
			saving = false;
			saved = true;
		});
	}

	function viewRecords() {
		if (!person_picker.selected_item || !content_picker.selected_item) return null;

		if (!st_record.get()) return "Loading...";

		return m(".manual-record.dialog", [
			m(".title", "Edit this record"),
			Ut.viewBoundInput("score", st_record.prop("score")),
			Ut.viewBoundInput("passed", st_record.prop("passed")),
			Ut.viewBoundInput("failed", st_record.prop("failed")),
			Ut.viewBoundInput("completed", st_record.prop("completed")),
			Ut.viewBoundInput("started_ts", st_record.prop("started_ts")),
			Ut.viewBoundInput("completed_ts", st_record.prop("completed_ts")),
			Ut.viewBoundInput("last_launched_ts", st_record.prop("last_launched_ts")),
			Ut.viewBoundInput("launch_count", st_record.prop("launch_count")),
			Ut.viewBoundInput("duration_sec", st_record.prop("duration_sec")),
			Ut.viewBoundInput("frozen", st_record.prop("frozen")),
			m("button", {
				onclick: save
			}, saving ? "Saving..." : "Save Changes"),
			m("span", saved ? "Saved" : ""),
		]);
	}



	function view() {
		return m(".record-tool", [
			Main.viewTop(),
			m(".page-controls", [
				m(".title", "Create or edit a record"),
				m(".cards", [
					Ut.viewPickerButton(person_picker),
					Ut.viewPickerButton(content_picker),
				]),
				Ut.viewPickerStack(person_picker),
				Ut.viewPickerStack(content_picker),
			]),
			viewRecords(),
		]);
	}

	return {
		view: view,
		oninit: oninit,
	};
};



var RecordCb = function() {
	var content = null;
	var selected_content = null;
	var st_record = null; // THE records
	var clist_open = false;

	var content_picker = {
		callback: loadRecord,
		filter_prop: "title",
		filter_label: "Title",
		button_label: "Select a content item",
		placeholder_type: "content",
	};

	function oninit() {
		St.use("content?type=cb").fetch().then(function(data) {
			// set the type of each item (needed for more complicated uses)
			data = data.map(function(i){ i.layout_type="content"; return i; });
			content_picker.original_list = data;
			content_picker.filtered_list = data;
			// check if we've been passed one in the route string
			var content_id = parseInt(m.route.param("content_id"));
			if (content_id){
				content_picker.selected_item = R.filter(R.propEq('content_id', content_id), data)[0];
				loadRecord();
			}
		});

	}


	function loadRecord() {
		var c = content_picker.selected_item;
		if (!c) return;

		st_record = St.use("content/" + c.content_id + "/cb-records");
		st_record.fetch();
	}

	function viewARecord(r) {
		return m("tr", [
			m("td", r["content_id"]),
			m("td", r["person_id"]),
			m("td", r["page_hash"]),
			m("td", r["answer"]),
			m("td", r["is_correct"]),
			m("td", r["answered_ts"]),
		]);
	}


	function viewRecords() {
		if (!content_picker.selected_item) return null;

		if (!st_record.get()) return "Loading...";

		return m(".manual-record", [
			m("h2", "Content builder quiz records"),
			m("table", [
				m("thead", [
					m("tr", [
						m("th", "Content Id"),
						m("th", "Person Id"),
						m("th", "page_hash"),
						m("th", "answer"),
						m("th", "is_correct"),
						m("th", "answered_ts"),
					]),
				]),
				m("tbody", st_record.get().map(viewARecord)),
			]),
		]);
	}


	function view() {
		return m(".record-content", [
			Main.viewTop(),
			m(".page-controls", [
				m(".title", "Select a content builder item"),
				m(".cards", [
					Ut.viewPickerButton(content_picker),
				]),
				Ut.viewPickerStack(content_picker),
			]),
			viewRecords(),
		]);
	}

	return {
		view: view,
		oninit: oninit,
	};
};
