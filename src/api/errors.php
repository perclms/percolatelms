<?php

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

namespace Lms;

// define exceptions

// system
class SystemError extends \Exception { }
class DbDuplicate extends SystemError { }
class NotFound extends SystemError { }
class NoTenant extends SystemError { }
// user
class UserError extends \Exception { }
class AuthFailure extends UserError { }
class NotLoggedIn extends UserError { }
class NotAuthorized extends UserError { }
class ScormError extends UserError { }
class ZipError extends UserError { }



// catch all errors

set_error_handler(function($num, $msg, $file, $line){
	// test with: $foo = $does_not_exist;
	system_error("$file:$line: $msg (via seh)"); 
});
register_shutdown_function(function(){
	// test with: does_not_exist();
	if (! ($e = error_get_last())) return;
	system_error("{$e['file']}:{$e['line']}: {$e['message']} (via rsf)"); 
});



// error handling functions

function auth_error($http_status, $msg){
	header('WWW-Authenticate: Bearer realm="perclms", error="invalid_request", ');
	error($http_status, $msg);
}

function system_error($msg){
	$stamp = Log::error($msg);
	if (Conf::read('lms_env') != "dev") {
		// in production environment, we don't want to leak system errors
		$msg = "Sorry, there was a system error (reference code '{$stamp}').";
	}
	error(500, $msg);
}

function error($http_status, $msg){
	// don't do this if running from command-line
	if(php_sapi_name() == 'cli') return;
	http_response_code($http_status);
	header('Content-type: application/json; charset=utf-8');
	echo json_encode([
		'hypermedia' => [
			'success' => false,
			'title' => "Error",
			'description' => $msg
		]
	]) . "\n";
	exit;
}
