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

class ResRoot extends \HummingJay\Resource{ 
	public $title = "LMS API root resource";
	public $description = "Welcome to the LMS API.";

	public function GET($server){
		header('Content-Type: text/html; charset=utf-8');
		echo <<<'EOD'
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>LMS API</title>
</head>
<body>
	<h1>LMS API</h1>
	<p>Welcome, application developers!  The Percolate LMS 
	uses an hm-json (hypermedia JSON) REST API.  You can 
	browse the API directly via hypermedia in your browser.</p>
	<p><a href="/browser.html#/api">Click here</a></p>
</body>
</html>		
EOD;
		exit;
	}


}
