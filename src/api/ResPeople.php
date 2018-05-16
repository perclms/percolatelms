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

class ResPeople extends \HummingJay\Resource{ 
	public $title = "People";
	public $description = "Accounts for all people in the LMS.";

	public function GET($server){
		$person_info = Auth::require_token('$admin');
		
		$db = Db::from('person_v');

		$server->addResponseData($db->fetchAll());
		return $server;
	}

	public function POST($server){
		$person_info = Auth::require_token('$admin');
		$d = $server->requestData;

		// whitelist/validate input
		$d = Validate::person($d);
		$d["password"] = Auth::hash_password($d["password"]);
		if(isset($d["tags"])) $d["tags"] = "{{$d["tags"]}}";

		$new_id = Db::insert('person', $d);

		return $server->addResponseData([
			'id_name'=>'person_id',
			'new_id'=>$new_id,
		]);
	}
}
