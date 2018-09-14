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


var CbmModel = function() {
	var content_id = 0;
	var pages = [];
	var page_hashes = [];
	var quiz = [];
	var curpage = 0;
	var edit_mode = false;
	var saved = false;

	function get_curhash() {
		if (edit_mode) return "q_" + curpage;
		return page_hashes[curpage];
	}

	function q_correct_count() {
		var inc_if_correct = function(acc, val) {
			return val.is_correct ? R.inc(acc) : acc;
		}
		return R.reduce(inc_if_correct, 0, quiz);
	}

	function get_curq() {
		var q = R.find(R.propEq('hash', get_curhash()), quiz);
		return q ? q : null;
	}

	function upsert_q(ans_txt, is_correct) {
		var q = get_curq();
		if (q) {
			q.ans_txt = ans_txt;
			q.is_correct = is_correct;
		} else {
			q = {
				hash: get_curhash(),
				ans_txt: ans_txt,
				is_correct: is_correct,
			};
			quiz.push(q);
		}
		send_q(q);
	}

	function qscore() {
		if (q_correct_count() == 0) return 0;
		return Math.floor(q_correct_count() / quiz.length * 100);
	}
	
	function send_q(q) {
		if (edit_mode) return;
		var person_id = Login.get('person_id');
		var is_correct = q.is_correct ? "true" : "false";
		var cbr = St.use('content/' + content_id + '/person/' + person_id + '/cb-record');
		var data = {
			"page_hash": get_curhash(),
			"is_correct": is_correct,
			"answer": q.ans_txt
		};
		cbr.set(data);
		cbr.send();
	}

	function save_score() {
		if (edit_mode || saved) return;
		var person_id = Login.get('person_id');
		var cr = St.use('content/' + content_id + '/person/' + person_id + '/record');
		cr.set({
			score: qscore()
		});
		cr.send();
		saved = true;
	}

	function save_complete() {
		if (edit_mode || saved) return;
		var person_id = Login.get('person_id');
		var cr = St.use('content/' + content_id + '/person/' + person_id + '/record');
		cr.set({ completed: "true" });
		cr.send();
		saved = true;
	}

	function check_page() {
		// (this is how new pages are created)
		if (curpage >= pages.length) {
			pages[curpage] = "New page\n\nThis is a new blank page.";
		}
	}


	// public interface
	return {
		get_body: function() {
			return pages.join("\n--page--\n");
		},
		set_hashes: function(h) {
			page_hashes = h;
		},
		set_body: function(b) {
			var body = b ? b : "New\n\nNew empty content.";
			pages = body.split("\n--page--\n");
		},
		set_content_id: function(cid) {
			content_id = cid;
		},
		get_page: function() {
			check_page();
			return {
				num: curpage + 1,
				body: pages[curpage],
				//lines: pages[curpage].split(/\r\n|\r|\n/),
				hash: get_curhash(),
				q: get_curq(),
			};
		},
		get_pagenum: function() {
			return curpage + 1;
		},
		get_pagecount: function() {
			return pages.length;
		},
		get_qscore: qscore,
		get_qcount: function() {
			quiz.length;
		},
		get_qcorrect: q_correct_count,
		get_qincorrect: function() {
			return quiz.length - q_correct_count();
		},
		is_next: function() {
			//if (edit_mode) return true;
			return curpage < pages.length - 1;
		},
		is_prev: function() {
			return curpage > 0;
		},
		go_next: function() {
			if (curpage < pages.length - 1 || edit_mode) {
				curpage++;
			}
		},
		go_prev: function() {
			if (curpage > 0) {
				curpage--;
			}
		},
		goto_start: function(){ curpage = 0; },
		edit_mode: function() { edit_mode = true; },
		is_edit_mode: function() {
			return edit_mode;
		},
		update_curpage: function(str) {
			pages[curpage] = str;
		},
		appendto_curpage: function(str, pos) {
			if (arguments.length == 2) {
				var s = pages[curpage];
				var beforeCursor = s.slice(0, pos);
				var afterCursor = s.slice(pos);
				pages[curpage] = s.slice(0,pos) + str + s.slice(pos);
			}
			else {
				pages[curpage] += str;
			}
		},
		answer_q: upsert_q,
		save_score: save_score,
		save_complete: save_complete,
		get_quiz: function(){ return quiz; },
	};
};

var Cbm = null; //CbmModel();



var CbPlayer = function() {
	var content = null;
	var is_welcome = false;

	function oninit(vnode) {
		Cbm = CbmModel();
		if (vnode.attrs.test_cb) {
			// for testing and/or style guide
			Cbm.edit_mode(); // don't send scores, etc.
			Cbm.set_body(vnode.attrs.test_cb);
			Cbm.goto_start();
			content = {};
			return;
		}


		if(!vnode.attrs.content){
			St.error = "CbPlayer component not given content object.";
			return;
		}
		content = vnode.attrs.content;
		is_welcome = false;
		is_welcome = vnode.attrs.is_welcome;
		var content_id = vnode.attrs.content.content_id;
		Cbm.set_content_id(content_id);
		var cb = St.use('content/' + content_id  + '/cb');
		cb.fetch().then(function(data) {
			if (!data) return;
			Cbm.set_body(data.body);
			Cbm.set_hashes(data.page_hashes);
			Cbm.goto_start();
		});
	}

	function view() {
		if(!content) return m("p", "Not valid.");

		function single_page(){
			return Cbm.get_pagenum() == 1 && !Cbm.is_next();		
		}
		function prevbtn(){
			if(single_page()) return null;
			if(Cbm.is_prev()) { 
				return m("button", {onclick: Cbm.go_prev}, "Back");
			}
			else {
				return m("button", {disabled: "disabled"}, "Back");
			}
		}
		function nextbtn(){
			if(single_page()) return null;
			if(Cbm.is_next()) { 
				return m("button", {onclick: Cbm.go_next}, "Next");
			}
			else {
				return m("button", {disabled: "disabled"}, "Next");
			}
		}

		// return bare form if is welcome
		if(is_welcome){
			return m(".welcome", [
				m(".content-builder-player", [
					m(CbPage, Cbm),
					prevbtn(),  // nav buttons on the off chance that it's multi-page
					nextbtn(),
				]),
				m(".welcome-bottom-bar"),
			]);
		}

		// normal
		return m(".dialog.content-builder-player", [
			m(".title", content.title),
			m(CbPage, Cbm),
			prevbtn(),
			m("span.message", "Page " + Cbm.get_pagenum() + " of " + Cbm.get_pagecount()),
			nextbtn(),
		]);
	}

	return {
		view: view,
		oninit: oninit,
	};
};




var CbEd = function() {
	var cb_api;
	var content_id = 0;
	var image_uploader = null;
	var video_uploader = null;
	var audio_uploader = null;
	var attachment_uploader = null;
	//var pagenum = 0;
	//var page_hashes = [];
	//var pages = null;
	var is_saved = true; 
	var is_saving = false; 
	var import_export_visible = false;
	var edit_area_element = null;
	var edit_area_cursor = 0;
	var require_cursor_move = false;

	function oninit() {
		Cbm = CbmModel();
		if (!m.route.param("content_id")){
			St.error = "Content editor summoned without a content_id.";
			content_id = 0;
		   	return;
		}
		content_id = Ut.decodeId(m.route.param("content_id"));
		/*content_api = St.use("content/" + content_id);
		content_api.fetch().then(function(data){
			content = content_api.get();
		});
		*/

		//content_id = data.content_id;

		Cbm.edit_mode(); // don't send scores, etc.

		cb_api = St.use('content/' + content_id + '/cb');
		cb_api.fetch().then(function(data) {
			if (!data) return;
			Cbm.set_body(data.body);
			Cbm.set_hashes(data.page_hashes);
			Cbm.goto_start();
		});

		image_uploader = Uploader({
			instructions: "Drop image here or click to upload.",
			purpose: "image",
			callback: function(d) {
				insertTxt("<image/"+d.file_id+"/"+d.launch_fname+">");
				image_uploader.hide();
				is_saved = false;
			},
		});
		image_uploader.hide();

		audio_uploader = Uploader({
			instructions: "Drop MP3 audio file here or click to upload.",
			purpose: "audio",
			callback: function(d) {
				insertTxt("\n<audio/"+d.file_id+"/"+d.launch_fname+">\n");
				audio_uploader.hide();
				is_saved = false;
			},
		});
		audio_uploader.hide();

		video_uploader = Uploader({
			instructions: "Drop MPEG4 video here or click to upload.",
			purpose: "video",
			callback: function(d) {
				insertTxt("\n<video/"+d.file_id+"/"+d.launch_fname+">\n");
				video_uploader.hide();
				is_saved = false;
			},
		});
		video_uploader.hide();

		attachment_uploader = Uploader({
			instructions: "Drop file here or click to upload.",
			purpose: "attachment",
			callback: function(d) {
				insertTxt("\n<attachment/"+d.file_id+"/"+d.launch_fname+">\n");
				attachment_uploader.hide();
				is_saved = false;
			},
		});
		attachment_uploader.hide();
	}


	function save(andexit) {
		is_saved = true;
		is_saving = true;
		var body = Cbm.get_body();
		var temp = cb_api.get();
		cb_api.set({
			body: body
		});
		cb_api.send().then(function(result) {
			is_saving = false;
			if(andexit=="andexit"){
				m.route.set("/content/" +Ut.encodeId(content_id));
			}
		});
	}

	function saveAndExit(){
		save("andexit");
	}

	/*
	function viewImportExport() {
		if (!import_export_visible) return null;

		var body = Cbm.get_body();
		var oninput = m.withAttr("value", function(v) {
			body = v;
		});

		function import_body(body) {
			Cbm.get_body(body);
			is_saved = false;
		}

		return m(".import-export", [
			m("h2", "Import/Export Course"),
			m("textarea", {
				oninput: oninput,
				style: {
					height: "10em"
				}
			}, body),
			m("button", {
				onclick: import_body
			}, "Import"),
			" ",
			m("button", {
				onclick: function() {
					alert("not implemented.")
				}
			}, "Export"),
			m("hr"),
			m("br"),
		]);
	}
	*/

	function quiz_hacker_view() {
		var quiz = Cbm.get_quiz();
		if (quiz.length < 1) return null;
		return m(".cb-quiz-hacker-view", [
			m("h3", "Quiz Inspector"),
			m("table", {
				style: {
					width: "100%"
				}
			}, [
				m("thead", [m("tr", [
					m("th", "Unique Question ID"),
					m("th", "Ans Txt"),
					m("th", "Correct?"),
				])]),
				R.map(function(q) {
					return m("tr", [
						m("td", q.hash),
						m("td", q.ans_txt),
						m("td", q.is_correct),
					]);
				}, quiz),
			]),
			m("br"),
			m("b", "Score: "+Cbm.get_qscore()+"%"),
		]);
	}

	function insertTxt(txt){
		var orig_pos = edit_area_element.selectionEnd;
		edit_area_cursor = orig_pos+txt.length;
		Cbm.appendto_curpage(txt, orig_pos);
		require_cursor_move = true;
	}

	function pageUpdate(str) {
		Cbm.update_curpage(str);
		is_saved = false;
	}

	function toggleImportExport() {
		import_export_visible = !import_export_visible;
	}

	function appendBtnClick(txt){
		return function(){ insertTxt(txt); }
	}

	function view() {
		if (content_id == 0) return m("p", "Content editor requires content_id.");

		var config_txt = {
			oncreate: function(vnode){ 
				edit_area_element = vnode.dom; 
			},
			onupdate: function(vnode){ 
				if(require_cursor_move){
					require_cursor_move = false;
					vnode.dom.setSelectionRange(edit_area_cursor, edit_area_cursor); 
				}
			},
			oninput: m.withAttr("value", pageUpdate),
		};
		var page = Cbm.get_page();

		function prevbtn(){
			if(Cbm.is_prev()) { 
				return m("button", {onclick: Cbm.go_prev}, "Back");
			}
			else {
				return m("button", {disabled: "disabled"}, "Back");
			}
		}
		function nextbtn(create_at_end){
			if(Cbm.is_next()) { 
				return m("button", {onclick: Cbm.go_next}, "Next");
			}
			else {
				return m("button", {disabled: "disabled"}, "Next");
			}
		}
		function create_next(){
			if(Cbm.is_next()) return null;
			return m("button.primary", {onclick: Cbm.go_next}, "Add page");
		}

		function view_save_state(){
			if(!is_saved){
				return m(".box.danger", "Changes not saved");
			}
			if(is_saving){
				return m(".box.info", "Saving...");
			}
			return null;
		}

		var multi_correct = appendBtnClick("\n[_] Incorrect choice text\n");
		var multi_incorrect = appendBtnClick("\n[x] Correct choice text\n");
		var textfield = appendBtnClick("\n[text entry]");
		var correct_fbk = appendBtnClick("\n[correct feedback] Your correct feedback here");
		var incorrect_fbk = appendBtnClick("\n[incorrect feedback] Your incorrect feedback here");
		var score = appendBtnClick("\n[score]\n[save score]\n");
		var complete = appendBtnClick("\n[complete]\n");

		function button(onclick, icon, label){
			return m(".cb-btn", [
					m("button", {onclick: onclick}, m("i.material-icons", icon)),
					m(".label", label),
			]);
		}

		return m(".content-builder", [ 
			Main.viewTop(),
			m(".dialog.form", [
				m(".title", "Content Builder"),
				m("p", "Use the buttons below to add items to your content. Use the preview area below to see how the page will be rendered."),
				m(".cb-button-area", [
					m("div", [
						m("p", "Display elements"),
						m(".cb-button-cluster", [
							button(image_uploader.toggle, "add_a_photo", "Image"),
							button(audio_uploader.toggle, "audiotrack", "Audio"),
							button(video_uploader.toggle, "videocam", "Video"),
							button(attachment_uploader.toggle, "attach_file", "Attachment"),
						]),
					]),
					m("div", [
						m("p", "Quiz/survey elements"),
						m(".cb-button-cluster", [
							button(multi_correct, "radio_button_unchecked", "Incorrect choice"),
							button(multi_incorrect, "radio_button_checked", "Correct choice"),
							button(textfield, "edit", "Text field"),
							button(correct_fbk, "check", "Correct feedback"),
							button(incorrect_fbk, "close", "Incorrect feedback"),
							button(score, "flag", "Score"),
							button(complete, "flag", "Complete"),
						]),
					]),
				]),
				//m("button", { onclick: toggleImportExport }, "Import/Export"), " ",
				//viewImportExport(),
				image_uploader.view(),
				audio_uploader.view(),
				video_uploader.view(),
				attachment_uploader.view(),
				m("textarea", config_txt, page.body),
				m(".cb-bottom-button-area", [
					m(".cb-bottom-left", [
						prevbtn(),
						m("span.message", "Page " + Cbm.get_pagenum()),
						nextbtn(),
					]),
					m(".cb-bottom-right", [
						create_next(),
						m("button.primary", { onclick: save }, "Save"),
						m("button.primary", { onclick: saveAndExit }, "Save and Exit"),
						view_save_state(),
					]),
				]),
			]),
			m(".dialog", [
				m(".title", "Preview"),
				m(CbPage, Cbm),
				quiz_hacker_view(),
				prevbtn(),
				m("span.message", "Page " + Cbm.get_pagenum()),
				nextbtn(),
				m("br.clear"),
			]),
			Main.viewBottom(),
		]);
	}

	return {
		view: view,
		oninit: oninit,
	};
};









var CbPage = function() {
	var page = "";
	var correct_ans = [];
	var ans_count = 0;
	var text_entry_contents = stream("");
	var token_idx = 0; // parser global!
	var tokens = null; // parser global!
	var in_list = false; // parser global!

	function oninit() {}

	function ans_txt() {
		Cbm.answer_q(text_entry_contents(), true);
	}

	function add_correct_ans(num){
		correct_ans.push(num);
		correct_ans = R.uniq(correct_ans);
	}

	function is_correct_ans(num){
		return R.contains(num, correct_ans);
	}

	function ans_multi(text, num) {
		return function() {
			var is_correct = is_correct_ans(num);
			Cbm.answer_q(text, is_correct);
		};
	}


	/* start parser
	 * ===================================================================
	 */
	var parse_objs = [
		{ 
			name: "normal",
			regex: null,
			func: function(t){
				return t.token; // plain text node
			},
		},
		{ 
			name: "blank_line",
			regex: /\n\s*\n/,
			func: function(t){
				eat_blanks();
				// after eat_blanks(), we always have to check
				// if we're at the end of the content!
				if(token_idx >= tokens.length) return null;

				// do we need to start a paragraph ?
				var type = tokens[token_idx].type;
				if (type == 'link' || type == 'normal') {
					return m("p", parse_until("blank_line|start_columns|column_split|end_columns|bullet|video|audio|radiobtn|text_entry|correct_feedback|incorrect_feedback"));
				}
				return null; // nope, other things aren't in paragraphs
			},
		},
		{ 
			name: "start_columns",
			regex: /<columns>/,
			func: function(t){
				// start a container and contain everything until end container
				return m(".cb-cols", [
						m(".col", parse_until("column_split")),
						m(".col", parse_until("end_columns")),
				]);
			},
		},
		{ 
			name: "column_split",
			regex: /<col>/,
			func: function(t){
				// start a container and contain everything until end container
				//return m(".cb-rightcol", parse_until("end_columns"));
				return null;
			},
		},
		{ 
			name: "end_columns",
			regex: /<end-columns>/,
			func: function(t){
				return null;
			},
		},
		{ 
			name: "bullet",
			//regex: /^\* (.*)\n/,
			regex: /(^\* |\n\* )/,
			func: function(t){
				var bullet = m("li", parse_until("bullet|blank_line"));
				if(in_list){
					return bullet;
				}
				else {
					in_list = true;
					var bullets = parse_until("blank_line");
					bullets.unshift(bullet); // put first bullet on list
					in_list = false;
					return m("ul", bullets);
				}
			},
		},
		{ 
			name: "strong",
			regex: /\*\*(\S[^*]*\S)\*\*/,
			func: function(t){
				return m("strong", t.matches[0]);
			},
		},
		{ 
			name: "em",
			regex: /\*(\S[^*]*\S)\*/,
			func: function(t){
				var txt = t.matches[0];
				return m("em", t.matches[0]);
			},
		},
		{ 
			name: "link",
			regex: /<player\/(\d+):"(.*)">/,
			func: function(t){
				var id = t.matches[0];
				var title = t.matches[1];
				return m("a[href=/player/"+id+"]", {oncreate:m.route.link}, title);
			},
		},
		{ 
			name: "image",
			regex: /<image\/(\d+)\/(.*)>/,
			func: function(t){
				var id = t.matches[0];
				var fname = t.matches[1];
				return m("img", { src: "/api/files/"+id+"/"+fname, });
			},
		},
		{ 
			name: "video",
			regex: /<video\/(\d+)\/(.*)>/,
			func: function(t){
				var id = t.matches[0];
				var fname = t.matches[1];
				return m(".video-player",
					m("video", {
						src: "/api/files/"+id+"/"+fname,
						controls: "controls",
						type: "video/mp4"
					}, m("p", "Your browser does not support the HTML5 video element."))
				);
			},
		},
		{ 
			name: "audio",
			regex: /<audio\/(\d+)\/(.*)>/,
			func: function(t){
				var id = t.matches[0];
				var fname = t.matches[1];
				return m(".audio-player",
					m("audio", {
						src: "/api/files/"+id+"/"+fname,
						controls: "controls"
					}, m("p", "Your browser does not support the HTML5 audio element."))
				);
			},
		},
		{ 
			name: "attachment",
			regex: /<attachment\/(\d+)\/(.*)>/,
			func: function(t){
				var id = t.matches[0];
				var fname = t.matches[1];
				return m("a.link", { href: "/api/files/"+id+"/"+fname, }, fname);
			},
		},
		{ 
			name: "radiobtn",
			regex: /\[(X|x|_)\]\s*(.+)\n/,
			func: function(t){
				var correctness = (t.matches[0] == "x" || t.matches[0] == "X");
				var ans_txt = t.matches[1];
				ans_count++; // just needs to be unique
				if (correctness) {
					add_correct_ans(ans_count);
				}
				var checked = (page.q && page.q.ans_txt == ans_txt);
				return m("label", [
					m("input", {
						type: 'radio',
						name: 'cbq_'+page.num,
						key: 'cbq_'+page.num+'_'+ans_count,
						oncreate: function(x){x.checked = checked;},
						onclick: ans_multi(ans_txt, ans_count),
					}),
					m("span[class='checkable']", ans_txt),
					m("br"),
				]);
			},
		},
		{ 
			name: "text_entry",
			regex: /\[text entry\]/,
			func: function(t){
				return [
					m("input", { oninput: m.withAttr('value', text_entry_contents) }),
					m("button", { onclick: ans_txt }, "Done"),
				];
			},
		},
		{ 
			name: "correct_feedback",
			regex: /\[correct feedback\]/,
			func: function(t){
				var txt = parse_until("blank_line|incorrect_feedback");
				if (page.q && page.q.is_correct) { return m(".box.success", txt); }
			},
		},
		{ 
			name: "incorrect_feedback",
			regex: /\[incorrect feedback\]/,
			func: function(t){
				var txt = parse_until("blank_line|correct_feedback");
				if (page.q && !page.q.is_correct) { return m(".box.danger", txt); }
			},
		},
		{ 
			name: "score",
			regex: /\[score\]/,
			func: function(t){
				return m("b", "" + Cbm.get_qscore() + "%");
			},
		},
		{ 
			name: "save_score",
			regex: /\[save score\]/,
			func: function(t){
				if (Cbm.is_edit_mode()) {
					return m("i", "(save score: not sending score in edit mode)");
				} else {
					Cbm.save_score();
				}
			},
		},
		{ 
			name: "complete",
			regex: /\[complete\]/,
			func: function(t){
				if (Cbm.is_edit_mode()) {
					return m("i", "(complete: not sending completion status in edit mode)");
				} else {
					Cbm.save_complete();
				}
			},
		},
	];

	// create a dictionary of token-matching patterns
	var patterns = R.reduce( function(acc, val){
			if (val.regex) {
				acc[val.name] = val.regex;
			}
			return acc;
		}, {}, parse_objs);

	// create a dictionary of token parsing functions
	var parsefuns = R.reduce( function(acc, val){
			acc[val.name] = val.func;
			return acc;
		}, {}, parse_objs);

	function eat_blanks(){
		while(tokens[token_idx] && tokens[token_idx].type == "blank_line") 
			token_idx++;
	}

	function found_ending(end_type, this_type){
		//end_type = end_type.split('|');
		return R.contains(this_type, end_type.split('|'));
		/*if(end_type == this_type) return true;
		if(end_type == "end_paragraph"){
			// these types do NOT end a paragraph:
			return !R.contains(this_type, [
				"normal",
				"link",
				"image",
				"attach",
			]);
		}
		return false;
		*/
	}



	// returns an array of output for all tokens until end type or end
	// does NOT consume the token of end_type (if any)
	var lvl = 0;
	function parse_until(end_type){
		lvl++;
		var out = [];
		while (token_idx < tokens.length) {
			var t = tokens[token_idx];
			if (found_ending(end_type, t.type)){
				lvl--;
			   	return out;
			}
			token_idx++; // MUST increment HERE!
			out.push(parsefuns[t.type](t));
		}
		return out;
	}
	/* end parser
	 * ===================================================================
	 */





	function view() {
		page = Cbm.get_page();
		correct_ans = [];
		ans_count = 0;
		var output = [];


		// pass patterns to the tokenizer - MAKE TOKENS!
		tokens = Ut.tokenize(page.body, patterns, 'normal');

		// PARSE TOKENS!
		token_idx = 0;
		// skip initial blank lines and then display title (if possible)
		eat_blanks();
		if (token_idx >= tokens.length) return m(".cb-page", m("i", "This page intentionally left blank."));
		output.push(m("h1", tokens[token_idx].token));
		token_idx++;

		// now do the rest...
		output = R.concat(output, parse_until("forever"));
		
		return m(".cb-page", output);
	}


	return {
		view: view,
		oninit: oninit,
	};
};
