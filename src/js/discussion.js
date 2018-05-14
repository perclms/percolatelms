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



var DiscussionPlayer = function() {
	var comments = null;
	var comments_ordered = null;
	var reply_to_id = null;
	var new_comment = stream();
	var new_reply = stream();
	var store;

	function oninit(vnode) {
		if (vnode.attrs.test_discussion) {
			// for testing and/or style guide
			comments = vnode.attrs.test_discussion;
			makeTree();
			return;
		}

		if (!vnode.attrs.content_id) return null;
		var content_id = vnode.attrs.content_id;

		store = St.use("content/" + content_id + "/comments");
		store.fetch().then(function() {
			comments = store.get();
			makeTree()
		});
	}

	function makeTree() {
		// since we limit the reply depth artificially to one level
		// we can simply "sort" (well, "group, really") by replies_to
		// as long as we keep the chronology.

		var grouped = [];

		// utility to get the original ancestor of a comment
		var getAncestorId = function(c) {
			if (!c.replies_to) return c.comment_id;
			return getAncestorId(R.find(R.propEq('comment_id', c.replies_to), comments));
		}

		// make group_string property in all comments (to be sorted by)
		comments.forEach(function(c) {
			if (c.group) return; // already have it
			c.group = getAncestorId(c);
		});

		// sort function orders by group, then by comment_id
		var sort = function(a, b) {
			if (a.group == b.group) return a.comment_id - b.comment_id;
			return a.group - b.group;
		}
		comments_ordered = R.sort(sort, comments);
	}

	function saveComment(replies_to) {
		return function() {
			var body = new_comment();
			if (replies_to){
				body = new_reply();
			}
			var c = {
				body: body,
				replies_to: replies_to
			};
			store.set(c);
			store.send().then(function(response_data) {
				c.comment_id = response_data.new_id;
				c.name = localStorage.getItem('name');
				c.thumb_file_id = localStorage.getItem('thumb_file_id');
				c.thumb_fname = localStorage.getItem('thumb_fname');

				c.created = 'Just now';
				comments.push(c);
				makeTree();
				reply_to_id = null;
				reply_to_name = null;
				new_comment("");
				new_reply("");
			});
		};
	}

	function reply(c) {
		return function() {
			// if we are replying to a reply, then this is actually
			// going to be another reply to the parent comment.
			reply_to_id = c.comment_id;
			reply_to_name = c.name;
			new_reply(reply_to_name + ", ");
		}
	}


	function viewReplyForm(reply_to) {
		return m(".form.reply", [
			m("br"),
			m("textarea", { onchange: m.withAttr('value', new_reply)}, new_reply()),
			m(".centered", 
				m("button.primary", { onclick: saveComment(reply_to) }, "Reply")
			),
		]);
	}

	function viewNewCommentForm() {
		return m(".form", [
			m("textarea", { onchange: m.withAttr('value', new_comment)}, new_comment()),
			m(".centered", 
				m("button.primary", { onclick: saveComment(null) }, "Add comment")
			),
		]);
	}


	function viewComment(c) {
		var indent = c.replies_to === null ? '' : '.indent';

		// process body of comment (transform links, etc.)
		var body = [];
		var tokens = Ut.tokenize(c.body, { link:/<player\/\d+:"[^"]*">/ }, 'normal');
		for (var i in tokens) {
			var token = tokens[i];
			switch (token.type) {
				case "normal": body.push(token.token); break;
				case "link": body.push(Ut.makeLink(token.token)); break;
			}
		}

		return m(".comment" + indent, [
			m(".avatar", People.viewAvatar(c)), // the comment contains the people info we need to do this!
			m(".body", [
				m("a.reply-link.link", { onclick: reply(c) }, "reply"),
				m(".name", c.name),
				m(".date", c.created),
				m("p", body),
				reply_to_id === c.comment_id ? viewReplyForm(c.comment_id) : null,
			]),
		]);
	}

	function view() {
		if (comments_ordered === null) return m("p", "Loading comments...");
		return m(".discussion-container", [
			m(".discussion", [
				m(".count", "Comments ("+comments_ordered.length+")"),
				R.map(viewComment, comments_ordered),
			]),
			m("h3", "Add a comment to the discussion"),
			viewNewCommentForm(null),
		]);
	}

	return {
		view: view,
		oninit: oninit
	}; // mithril module
};
