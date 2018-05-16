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

class ResContent extends \HummingJay\Resource{ 
	public $title = "Content items";
	public $description = "Content collection";

	public function GET($server){
		$type_filter = null;
		if(isset($_GET["type"])){
			$type_filter = ["type"=>$_GET["type"]];
		}
		$db = Db::from("content_v", $type_filter);

		$server->addResponseData($db->fetchAll());
		return $server;
	}

	public function POST($server){
		//$person_info = Auth::require_token('$admin');
		$person_info = Auth::require_token();
		$author = $person_info->person_id;
		$d = $server->requestData;

		// whitelist/validate input
		$d = Validate::content($d);
		if(isset($d["tags"])) $d["tags"] = "{{$d["tags"]}}";
		$d["author"] = $author;


		$content_id = Db::insert('content', $d);

		return $server->addResponseData([
			'id_name'=>'content_id',
			'new_id'=>$content_id,
		]);
	}
}

