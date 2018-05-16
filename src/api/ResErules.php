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

class ResErules extends \HummingJay\Resource{ 
	public $title = "Enrollment Rules";
	public $description = "Post a new rule with a person (or person tag) and content item (or content tag)";

	public function GET($server){
		$db = Db::from("erule");

		$server->addResponseData($db->fetchAll());
		return $server;
	}

	// new (to collection)
	public function POST($server){
		$d = $server->requestData;

		// whitelist/validate input
		$d = Validate::erule($d);

		$erule_id = Db::insert('erule', $d);

		return $server->addResponseData([
			'id_name'=>'erule_id',
			'new_id'=>$erule_id
		]);
	}
}
