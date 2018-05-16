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

class ResPeopleId extends \HummingJay\Resource{ 
	public $title = "A user account";
	public $description = "";

	public function GET($server){
		// require person being viewed or require admin
		$person_id = $server->params['person_id'];
		$person_info = Auth::require_token();
		if($person_info->person_id != $person_id){
			Auth::require_token('$admin');
		}

		$db = Db::from('person_full_v', ['person_id'=>$person_id]);

		$server->addResponseData($db->fetch());
		return $server;
	}

	public function POST($server){
		// require person being edited or require admin
		$person_id = $server->params['person_id'];
		$person_info = Auth::require_token();
		if($person_info->person_id != $person_id){
			Auth::require_token('$admin');
		}


		$d = $server->requestData;

		// if a new password was sent, hash it
		if(isset($d->password)){
		   	if($d->password != ""){
				$d->password = Auth::hash_password($d->password);
			} else {
				unset($d->password);
			}
		}

		// remove avatar properties, they're not set here!
		unset($d->thumb_file_id);
		unset($d->thumb_fname);


		if(property_exists($d, 'tags')){
			$d->tags = '{'.$d->tags.'}';
		} 

		// we cannot set id to anything, even the same value, due to DB contraints!
		unset($d->person_id);

		$db = Db::update('person', $d, $person_id);
		return $server;
	}
}

