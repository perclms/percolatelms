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

class ResFilesIdFname extends \HummingJay\Resource{ 
	public $title = "A File";
	public $description = "A particular file uploaded to the LMS.";
	public $decodeJson = false; // NOTE: since we're sending a file and not any JSON data, we don't want to try to decode


	public function GET($server){
		$fid = $server->params["fid"];
		$fname = $server->params["fname"];
		$db = Db::from('file', $fid);
		if(empty($db->fetch())) return $server->setStatus(404);

		//Log::info("Serving file_id '$fid', fname '$fname'");

		// serveFile() will end the session, so we do not need to return $server
		SvcStorage::serveFile($fid, $fname);
	}

}
