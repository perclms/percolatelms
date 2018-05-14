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


var Player = function() {
	var content = null;
	var content_id = 0;
	var timerId = null;
	var timerTimestamp = 0;
	var record_resource = null;
	var is_embedded = false;
	var is_welcome = false;

	function oninit(vnode) {
		if (vnode.attrs.embed_player) {
			is_embedded = true;	
			content_id = vnode.attrs.content_id;
			is_welcome = vnode.attrs.is_welcome;
		}
		else if(m.route.param("content_id")){
			content_id = Ut.decodeId(m.route.param("content_id"));
			is_embedded = false;
			is_welcome = false;
		}
		else {
			St.error = "Player summoned without a content_id.";
			content_id = 0;
		   	return;
		}

		// load the content
		content = St.use("content/" + content_id);
		content.fetch();

		// start recording time, etc. for the current user...
		var person_id = Login.get('person_id');
		record_resource = St.use("people/" + person_id + "/content/" + content_id + "/record");

		function timerFired() { sendTime(); }
		timerId = window.setInterval(timerFired, 60000); // send a student timer update every 60 sec
		timerTimestamp = (new Date()).getTime();

		// increment the launch counter 
		record_resource.set({ launch_increment: true });
		record_resource.send();
	}

	function onremove() {
		// stop the timer!
		sendTime();
		if (timerId) window.clearInterval(timerId);
	}

	function sendTime() {
		var time = Math.round((((new Date()).getTime()) - timerTimestamp) / 1000);
		record_resource.set({
			seconds_to_add: time
		});
		record_resource.send();
		timerTimestamp = (new Date()).getTime();
	}

	function viewTopbar(){
		if(is_embedded) return null;
		return m(".player-topbar", [
			Main.viewError(),
			m("a.link", {href:"/home", oncreate: m.route.link}, [
				Main.viewLogoImg(),
				m("span", "Back to LMS"),
			]),
		]);
	}

	function viewLoading(){
		// player cannot use Ut.viewLoading()
		// it has too many different states
		return m(".player-loading", [
			viewTopbar(),
			m("p", "Loading..."),
		]);
	}

	function view() {
		if (content_id == 0) return m("p", "Content player requires content_id.");
		var c = content.get();
		if (R.isNil(c)) return viewLoading();

		var player = null;
		switch (c.type) {
		case 'comment': player = m(DiscussionPlayer, {content_id:c.content_id}); break;
		case 'scorm': player = m(ScormPlayer, {content_id:c.content_id}); break;
		case 'lpath': player = m(LpathPlayer, {content_id:c.content_id}); break;
		case 'cb': player = m(CbPlayer, {content: c, is_welcome:is_welcome}); break;
		default: St.error = "Player given content of unknown type '"+c.type+"'";
		}

		return m(".player", [
			viewTopbar(),
			m(".player", player),
		]);
	}

	return {
		view: view,
		viewTopbar: viewTopbar,
		oninit: oninit,
		onremove: onremove,
	};
};

