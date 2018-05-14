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


var LoginComponent = function() {
	var credentials = St.use("tokens");

	function oninit() {
	}

	function login_success(response_data) {
		set('logged_in', 'yes');
		set('tags', response_data.person_info.tags);
		set('auth_token', response_data.token);
		set('name', response_data.person_info.name);
		set('person_id', response_data.person_info.person_id);
		set('thumb_file_id', response_data.person_info.thumb_file_id);
		set('thumb_fname', response_data.person_info.thumb_fname);
		m.route.set('/home');
	}

	function login() {
		function failure(response_data) {
			St.error = "Sorry, your credentials were incorrect.";
		}
		credentials.send().then(login_success, failure);
	}

	function access_token_login(t){
		login_success(t);
	}

	function set(key, value){
		localStorage.setItem(key, value);
	}

	function get(key) {
		if (!is_logged_in()) return null;
		return localStorage.getItem(key);
	}

	function is_logged_in() {
		return localStorage.getItem("logged_in") == 'yes';
	}

	function is_admin(){
		return has_tag('$admin');
	}

	function has_tag(tagname) {
		var tags = Ut.tagstrToList(get("tags"));
		return R.contains(tagname, tags);
	}

	function logout() {
		m.route.set("/login");
		localStorage.clear();
	}

	function view() {
		return [
			Main.viewTop(),
			m(".dialog.form", [
				m(".title", "Login"),
				Ut.viewBoundInput("Username", credentials.prop('username')),
				Ut.viewBoundPassword("Password", credentials.prop('password')),
				m(".centered", [
					m("button.primary", { onclick: login }, "Log in"),
					m("br"),
					m("a", {href:"/forgot-pwd", oncreate: m.route.link}, "Forgot password or username"),
				]),
			]),
			Main.viewBottom(),
		];
	}

	return {
		view: view,
		oninit: oninit,
		logout: logout,
		get: get,
		set: set,
		has_tag: has_tag,
		is_admin: is_admin,
		is_logged_in: is_logged_in,
		access_token_login: access_token_login,
	};
};

var Login = LoginComponent();




var ForgotPwd = function() {
	var acctok = St.use("tokens/access");
	var btntxt = "";
	
	function oninit() {
		btntxt = "Request change password email";
		acctok.set({username:"", email:""});
	}

	function request_email() {
		btntxt = "Sending...";
		m.redraw();
		acctok.send().then(function() {
			btntxt = "Email sent";
			sending_change_pwd = false;
		});
	}

	function view() {
		return [
			Main.viewTop(),
			Ut.viewBoundInput("Username", acctok.prop('username')),
			m("p", "or"),
			Ut.viewBoundInput("Email address", acctok.prop('email')),
			m("button", { onclick: request_email }, btntxt),
			Main.viewBottom(),
		];
	}

	return {
		view: view,
		oninit: oninit,
	};
};




var ChangePwd = function() {
	var access_token = "";
	var credentials = St.use("tokens");
	var message = "";

	function oninit() {
		access_token = m.route.param("access_token");
		message = "Logging in using access token "+access_token+"...";
		credentials.set({ access_token: access_token });
		credentials.send().then(success, failure);
	}

	function success(response_data) {
		Login.access_token_login(response_data);
		m.route.set('/people/me');
	}

	function failure(response_data) {
		if(response_data.hypermedia && response_data.hypermedia.description){
			message = "Sorry, unable to grant access: "+response_data.hypermedia.description;
		}
		else {
			message = "Sorry, unable to grant access. Please make sure the link is intact and perhaps try generating a new one.";
		}
	}

	function view() {
		return [
			m("p", message),
			Main.viewBottom(),
		];
	}

	return {
		view: view,
		oninit: oninit,
	};
};

