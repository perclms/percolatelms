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


function Uploader(config) {
	var visible = true;
	var file_over = false;
	var file_uploading = false;
	var file_done = false;
	var file_name = "";
	var file_progress_string = "";

	// deal with hidden file input tag for file selection dialog
	var file_tag = null;

	function fileDropped(e) {
		e.preventDefault();
		file_over = false;
		upload(e.dataTransfer.files[0]); // if this breaks in other browsers, see about e.target in addition.  
	}

	function uploadDone(result_data) {
		file_uploading = false;
		file_done = true;
		if (config.callback) config.callback(result_data);
	}

	function uploadFail(result_data) {
		file_uploading = false;
		file_done = true;
		if (result_data && R.has("hypermedia", result_data)) {
			if (R.has("description", result_data.hypermedia)) {
				St.error = result_data.hypermedia.description;
				return;
			}
		}
		St.error = "There has been an unknown error while attempting to receive your file.";
	}

	function upload(file) {
		if(!file){
			St.error = "Cannot upload file due to UI error. Please try again.";
			return;
		}
		if(file.size > 4000000000){ // very roughly 4Gb
			St.error = "To upload files larger than 4Gb, please contact your LMS administrator.";
			return;
		}
		file_uploading = true;
		m.redraw();
		file_done = false;
		file_name = file.name;

		var formData = new FormData();
		formData.append("userfile", file);
		formData.append("purpose", config.purpose);
		formData.append("related_id", config.related_id);

		function configureRequest(xhr) {
			var auth_token = localStorage.getItem('auth_token');
			if (!R.isNil(auth_token)) {
				xhr.setRequestHeader('Authorization', "Bearer " + auth_token);
			}
			xhr.upload.addEventListener('progress', function(e) {
				var done = e.position || e.loaded;
				var total = e.totalSize || e.total;
				var percent = Math.round(done / total * 100);
				//file_progress_string = "" + done + "/" + total + " (" + percent + "%)";
				file_progress_string = "(" + percent + "%)";
				m.redraw();
			});
		}

		m.request({
			data: formData,
			serialize: function(value) { return value }, // do nothing
			method: "POST",
			url: "/api/files",
			config: configureRequest
		}).then(uploadDone, uploadFail);
	}

	function view() {
		if (!visible) return null;

		var file_tag_settings = {
			onchange: function(e){ upload(this.files[0]); },
			oncreate: function(vnode){ file_tag = vnode.dom; },
			style: { visibility: "hidden" },
		};

		// input type=file has an accept parameter which can take:
		// * file extension(s)
		// * MIME types
		// * video 
		https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attr-accept
		switch(config.purpose){
			case "person-thumb":
			case "content-thumb":
			case "site-logo":
			case "image":
				file_tag_settings.accept=".jpg,.jpeg,.png";
				break;
			case "video":
				file_tag_settings.accept=".mp4";
				break;
			case "scorm":
				file_tag_settings.accept=".zip";
				break;
			case "audio":
				file_tag_settings.accept=".mp3,.ogg";
				break;
			case "attachment":
				// accept all types!
				break;
		}

		return m(".filepicker", [
			m("input[type=file]", file_tag_settings),
			file_done ? m("b", { style: { transition: "opacity .25s ease-in-out" } }, file_name + " uploaded!") : "",
			file_uploading ? "Uploading " + file_name + " " + file_progress_string + "..." :
			m(".upload", {
				ondragover: function(e) { e.preventDefault(); file_over = true; },
				ondragleave: function(e) { e.preventDefault(); file_over = false; },
				ondrop: fileDropped,
				onclick: function () { file_tag.click(); },
				class: file_over ? "over" : "",
			}, [
				m("img", {src:imgs.uploader}),
				m(".instructions", config.instructions), 
			]),
		]);
	}

	// {ondragover:dragOver, 
	//  ondrop:dropped, 
	//  onclick:pickClicked, 
	//  ondragleave:dragOut, 

	return {
		view: view,
		show: function() { visible = true; },
		hide: function() { visible = false; },
		toggle: function() { visible = !visible; },
	}
}
