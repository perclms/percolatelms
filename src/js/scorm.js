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


var ScormPlayer = function() {
	var data = null;
	var LOG = [];
	var inspector_visible = false;
	var content_id;
	var launch_fid;
	var launch_fname;
	var scorm_resource = null;

	function oninit(vnode) {
		if (!vnode.attrs.content_id) {
			St.error = "Scorm player summoned without content_id.";
			content_id = 0;
			return;
		}

		content_id = vnode.attrs.content_id;

		// call API() function to generate course-facing API
		window.API = API(); // scorm 1.2
		window.API_1484_11 = API(); // scorm 2004

		var person_id = Login.get('person_id');
		scorm_resource = St.use("people/" + person_id + "/content/" + content_id + "/scorm");

		initializeScorm();
	}


	function initializeScorm() {
		// reset stuff for this fresh run:
		data = null;
		LOG = [];
		inspector_visible = false;

		// load stored scorm values from api
		scorm_resource.fetch().then(function(val) {
			var addrw = R.merge({
				reads: 0,
				writes: 0
			});
			data = R.map(addrw, val);
			launch_fid = get('sys.launch_fid');
			launch_fname = get('sys.launch_fname');
		});
	}


	function log(fn, arg1, arg2, output) {
		LOG.push({
			fn: fn,
			arg1: arg1,
			arg2: arg2,
			output: output
		});
		if (inspector_visible) m.redraw();
	}

	function findOrCreate(key) {
		var found = R.find(R.propEq('key', key), data);
		if (found) return found;
		var newitem = {
			key: key,
			value: '',
			source: 'new',
			reads: 0,
			writes: 0
		};
		data.push(newitem);
		return newitem;
	}

	function set(key, val) {
		var item = findOrCreate(key);
		item.writes++;
		if (item.source != 'new') item.source = (item.value == val ? 'unchanged' : 'changed');
		item.value = val;
		save(); // spam the server with whatever course gives us if values are changed
		return "true";
	}

	function get(key) {
		var item = findOrCreate(key);
		if (item.source == "new") item.source = "not-set";
		item.reads++;
		make_count(item);
		make_children(item);
		return item.value;
	}

	function make_count(item) {
		// generated key count from stored values 
		var m = /(^.*\.)_count$/.exec(item.key);
		if (!m) return;
		var re = new RegExp(m[1] + '(\\d+)'); // prefix followed by digits
		var highest = function(top, item) {
			return (test = item.key.match(re)) ? R.max(parseInt(test[1]), top) : top;
		};
		item.value = R.reduce(highest, 0, data) + 1; // +1 because they're 0-indexed
		item.source = 'computed';
	}

	function make_children(item) {
		// generate child item name list from list of possibilities (which is silly!)
		var m = /\.([^.]*)\._children$/.exec(item.key);
		if (!m) return;
		var prefix = m[1];
		item.value = {
			"comments_from_learner": "comment,location,timestamp",
			"comments_from_lms": "comment,location,timestamp",
			"interactions": "id,type,objectives,timestamp,correct_responses,weighting,learner_response,result,latency,description",
			"learner_preference": "",
			"objectives": "id,score,success_status,completion_status,description",
			"score": "scaled,raw,min,max"
		}[m[1]];
		item.source = 'computed';
	}

	function API() {
		// create SCO-facing API containing both 1.2 and 2004 methods
		var api = {};
		var logAnd = R.curry(function(fn, names) {
			R.forEach(function(name) {
				api[name] = function(arg1, arg2) {
					var output = fn(arg1, arg2);
					log(name, arg1, arg2, output);
					return output;
				};
			}, names);
		});
		var logAndTrue = logAnd(function() {
			return "true";
		});
		var logAndGet = logAnd(function(key) {
			return get(key);
		});
		var logAndSet = logAnd(function(key, val) {
			return set(key, val);
		});
		var logAndZero = logAnd(function() {
			return "0";
		});
		var logAndStr = logAnd(function(code) {
			return "";
		});
		logAndTrue(['LMSInitialize', 'Initialize', 'LMSFinish', 'Terminate', 'LMSCommit', 'Commit']);
		logAndGet(['LMSGetValue', 'GetValue']);
		logAndSet(['LMSSetValue', 'SetValue']);
		logAndZero(['LMSGetLastError', 'GetLastError']);
		logAndStr(['LMSGetErrorString', 'GetErrorString', 'LMSGetDiagnostic', 'GetDiagnostic']);
		return api;
	}

	function debug(c){
		// print change set c
		c.forEach(function(s){
			console.log("key:",s.key, " value:",s.value);
		});
	}

	function save() {
		var changed = R.filter(function(item) {
			return item.source == 'changed' || item.source == 'new';
		}, data);
		if (!R.isEmpty(changed)) {
			//debug(changed);
			scorm_resource.set(changed);
			scorm_resource.send();
		}
	}

	function viewInspector() {
		if (!inspector_visible) return null; // for the css layout
		if (!data) return "No SCORM data to view.";
		return m("td.inspector", [
			m("table.scorm-data", [
				m("thead", m("tr", [
					m("th", "SCORM Key"),
					m("th", "Value"),
					m("th", "Source"),
					m("th", "Reads"),
					m("th", "Writes"),
				])),
				m("tbody", data.map(function(d) {
					var truncval = d.value;
					if (d.value && String(d.value).length > 50)
						truncval = d.value.substring(0, 50) + "...(see log)";
					return m("tr", [
						m("td", d.key),
						m("td", "'" + truncval + "'"),
						m("td", {
							class: d.source
						}, d.source),
						m("td", d.reads ? d.reads : ''),
						m("td", d.writes ? d.writes : ''),
					]);
				})),
			]),
			m(".scorm-log", [
				m("h3", "SCORM communication log"),
				m("p", "Waiting for course to initiate communication..."),
				LOG.map(function(l) {
					var isSet = l.fn == "SetValue" || l.fn == "LMSSetValue";
					var c = isSet ? "SetValue" : "";
					var arg1 = l.arg1 ? "'" + l.arg1 + "'" : '';
					var arg2 = l.arg2 ? ", '" + l.arg2 + "'" : '';
					var output = !isSet ? " returned '" + l.output + "'" : '';
					return m("p", {
						class: c
					}, l.fn + "(" + arg1 + arg2 + ")" + output);
				}),
			]),
		]);
	}

	function toggleScormView() {
		inspector_visible = !inspector_visible;
	}

	function view() {
		if (content_id == 0) return m("p", "Scorm player requires content_id.");
		if (!launch_fid) return m("p", "Determining SCORM launch file...");
		var is_admin = Login.is_admin();
		var has_scorm_insp_tag = Login.has_tag('$scorm-inspector'); 
		var can_view_scorm_inspector = (is_admin || has_scorm_insp_tag);
		var player_style = {};
		var href = "/api/files/" + launch_fid + "/" + launch_fname;

		return m(".scorm-player", [
			m("table", m("tr", [
				viewInspector(),
				m("td.scorm-course", m("iframe.player", { src: href, key:1 })),
			])),
			can_view_scorm_inspector ? m("button", { onclick: toggleScormView }, "Toggle SCORM Viewer") : null,
		]);
	}

	return {
		view: view,
		oninit: oninit
	}; // mithril module
};




var ScormEd = function() {
	var uploader = null;
	var content_id;
	var edit = false;
	var content_id;
	var view_player = false;
	var view_content_link = stream(false);

	function oninit() {
		if (!m.route.param("content_id")){
			St.error = "Scorm editor summoned without a content_id.";
			content_id = 0;
		   	return;
		}
		content_id = Ut.decodeId(m.route.param("content_id"));

		uploader = Uploader({
			instructions: "Drop file here or click to select file to upload.",
			purpose: "scorm",
			related_id: content_id,
			callback: function(result_data) {
				m.route.set("/content/"+Ut.encodeId(content_id));
			},
		});
	}

	function view() {
		if (content_id == 0) return m("p", "Scorm editor requires content_id.");
		return m(".scorm-uploader", [
			Main.viewTop(),
			m(".dialog", [
				m(".title", "Upload SCORM"),
				m("p", "Upload your SCORM content (.zip file) by dragging a file over the drop zone or by clicking on it to select your file."),
				uploader.view(),
			]),
			Main.viewBottom(),
		]);
	}

	return {
		view: view,
		oninit: oninit
	}; // mithril module
};
