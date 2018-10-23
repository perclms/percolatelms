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

// define errors and types of exceptions

// system
class SystemError extends \Exception { }
class DbDuplicate extends SystemError { }
class NotFound extends SystemError { }
// user
class UserError extends \Exception { }
class AuthFailure extends UserError { }
class NotLoggedIn extends UserError { }
class NotAuthorized extends UserError { }
class ScormError extends UserError { }
class ZipError extends UserError { }
class NoTenant extends UserError { }



// register these universal error-handlers with PHP:

set_error_handler(function($num, $msg, $file, $line){
	// test with: $foo = $does_not_exist;
	lms_error_handler(new SystemError("$file:$line: $msg (via SEH)")); 
});
register_shutdown_function(function(){
	// test with: does_not_exist();
	if (! ($e = error_get_last())) return;
	lms_error_handler(new SystemError("{$e['file']}:{$e['line']}: {$e['message']} (via RSF)")); 
});



// error handling functions

function lms_error_handler($e){
	// auth and user errors:
	if( $e instanceof NotLoggedIn || 
		$e instanceof AuthFailure ||
		$e instanceof NotAuthorized ||
		$e instanceof UserError) users_error($e);

	// catch-all:
	system_error($e);
}

function system_error($e){
	// failsafe
	if(is_string($e)){
		Log::error("Backtrace: ".print_r(debug_backtrace(), true));
		$e = new SystemError("system_error() given string: $e\n(SEE BACKTRACE IN LOG!)");
	}

	$msg = $e->getMessage();
	$stamp = Log::error($msg);
	if (Conf::read('lms_env') != "dev") {
		// in production environment, we don't want to leak system errors
		$msg = "Sorry, there was a system error (reference code '{$stamp}').";
		// clone exception with new message:
		$e_type = get_class($e);
		$e = new $e_type($msg);
	}
	users_error($e);
}

function users_error($e){
	// don't do this if running from command-line
	if(php_sapi_name() == 'cli') return;

	$http_status = 400; // default, generic
	$msg = $e->getMessage();
	$error_type = get_class($e);

	// set header and http_status for auth errors:
	if( $e instanceof NotLoggedIn || 
		$e instanceof AuthFailure ||
		$e instanceof NotAuthorized ) {
		header('WWW-Authenticate: Bearer realm="perclms", error="invalid_request", ');
		$http_status = 401;
	}
	if($e instanceof NotAuthorized) $http_status = 403; // specifically

	// is actually a system error, return 500 status
	if($e instanceof SystemError) $http_status = 500;

	http_response_code($http_status);
	header('Content-type: application/json; charset=utf-8');
	echo json_encode([
		'hypermedia' => [
			'success' => false,
			'title' => "Error",
			'description' => $msg,
			'error_type' => $error_type,
		]
	]) . "\n";
	exit;
}
