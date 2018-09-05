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

class ResConfig extends \HummingJay\Resource{ 
	public $title = "LMS Configuration Data";
	public $description = "GET a bundle of data describing LMS config, post updates.";

	public function GET($server){
		$db = Db::select("config.value", 1); // hard-coded config_id of '1'
		$config = (array) json_decode($db->fetchColumn());
		$server->addResponseData($config);

		// deliver css if resource called with ?prop=css query string
		if(isset($_GET["prop"]) && $_GET["prop"] == "css"){
			header('Content-Type: text/css');
			if(isset($config["stylesheet_file_id"])){
				$fid = $config["stylesheet_file_id"];
				$fname = $config["stylesheet_logo_fname"];
				SvcStorage::serveFile($fid, $fname);
			}
			else{ 
				readfile("/lms/src/css/colors.css");
				exit;
			}
		}

		return $server;
	}


	public function POST($server){
		$person_info = Auth::require_token('$admin');

		// Note the hard-coded config_id of '1'
		// IDs will allow multiple configurations in the future, possibly addressing
		// the entire issue of having multiple look-and-feels for different sets of 
		// users (along with magic tags, probably)
		$db = Db::update('config', ["value" => json_encode($server->requestData)], 1); 
		return $server;
	}

}
