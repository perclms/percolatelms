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



var mrs = m.route.set;
m.route.set = function(path, data, options){
	mrs(path, data, options);
	window.scrollTo(0,0);
}
var mrl = m.route.link;
m.route.link = function(vnode){
	mrl(vnode);
	window.scrollTo(0,0);
}


var default_route = Login.is_logged_in() ? "/home" : "/login";

m.route(document.body, default_route, {
	"/login": Login,
	"/home": Home,
	"/player/:content_id": Player,
	"/catalog": Catalog,
	"/change-pwd/:access_token": ChangePwd,
	"/forgot-pwd": ForgotPwd,
	"/content": Content,
	"/content/new/:type": ContentEd,
	"/content/:content_id": ContentViewer,
	"/content/:content_id/edit": ContentEd,
	"/content/:content_id/edit-cb": CbEd,
	"/content/:content_id/edit-scorm": ScormEd,
	"/content/:content_id/edit-lpath": LpathEd,
	"/people": People,
	"/people/metatags": PeopleMetaTags,
	"/people/new": PersonEd,
	"/people/import": PeopleImport,
	"/people/:person_id": PersonEd,
	"/enroll": Erules,
	"/records": Records,
	"/records/edit": RecordEdit,
	"/records/edit/person/:person_id/content/:content_id": RecordEdit,
	"/records/content": RecordContent,
	"/records/people": RecordPeople,
	"/records/cb": RecordCb,
	"/records/cb/:content_id": RecordCb,
	"/records/content/:content_id": RecordContent,
	"/records/people/:person_id": RecordPeople,
	"/config": Config,
	"/no-tenant": NoTenant,
});

