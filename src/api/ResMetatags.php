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

class ResMetatags extends \HummingJay\Resource{ 
	public $title = "Meta-tags";
	public $description = "Add, edit, or remove meta-tags (which are tag-based rules that insert a new tag)";

	public function GET($server){

		$db = Db::from("person_metatag");
		$results['metatags'] = $db->fetchAll();

		$server->addResponseData($results);
		return $server;
	}

	// new (to collection)
	public function POST($server){
		$d = $server->requestData;

		// whitelist/validate input
		$d = Validate::person_metatag($d);

		$db = Db::insert('person_metatag', $d);
		$person_metatag_id = $db;

		return $server->addResponseData([
			'id_name'=>'person_metatag_id',
			'new_id'=>$person_metatag_id,
		]);
	}
}
