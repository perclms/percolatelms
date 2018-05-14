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


var St = {};
St.error = null;
//St.err = function(e){ St.error = e; };
St.api_prefix = "/api/";


St.use = function(uri) {
	var mydata = null;
	var myset = function(value) {
		mydata = value;
		return value;
	}
	return {
		get: function() {
			return mydata;
		},
		set: myset,
		fetch: function() {
			return St.raw_request('GET', uri, null).then(myset);
		},
		send: function() {
			return St.raw_request('POST', uri, mydata);
		},
		del: function() {
			return St.raw_request('DELETE', uri, null);
		},
		prop: function(name) {
			return {
				get: function() {
					return mydata ? mydata[name] : null;
				},
				set: function(value) {
					// if mydata isn't an object, no harm can come from making it one
					if (R.type(mydata) != "Object") mydata = {};
					mydata[name] = value;
				},
			}
		}
	}
}

///  network stuff follows
////////////////////////////////////////////////////////////

St.request_config = function(xhr) {
	var auth_token = localStorage.getItem('auth_token');
	if (!R.isNil(auth_token)) {
		xhr.setRequestHeader('Authorization', "Bearer " + auth_token);
	}
}
St.request_fail_default = function(method, uri, response_data) {
	var descr = "Sorry, something went wrong between here and the server. Perhaps refresh and try again?";
	if (response_data && response_data.hypermedia && response_data.hypermedia.description) {
		descr = response_data.hypermedia.description;
	}
	// great for debugging, but not so user-friendly:
	//St.error = "Response to " + method + " " + uri + ": " + descr;
	St.error = descr;
};

St.raw_request = function(method, uri, data) {
	var req = {
		method: method,
		url: St.api_prefix + uri,
		data: data,
		config: St.request_config,
	};
	var retval = m.request(req);
	// handle errors with default handler:
	retval.then(null, function(e) {
		St.request_fail_default(req.method, req.url, e);
	});
	return retval;
};
