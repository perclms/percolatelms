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
	public $title = "Assignments";
	public $description = "These are one-to-one relationships between people and content. They contain scores, 'last viewed' dates and times, etc. You can post combinations of person_id, content_id, and tag names (either person or content tags) as JSON data to this resource to create an enrollment rule.  A GET on this resource returns the raw person and content IDs for all of the enrollment rules in the LMS.";

	public function GET($server){
		$person_info = Auth::require_token('$admin');
		
		$db = Db::select(['erule.content_id', 'erule.person_id']);

		$server->addResponseData($db->fetchAll());
		return $server;
	}

	public function POST($server){
		$person_info = Auth::require_token('$admin');
		$d = $server->requestData;


		if(property_exists($d, 'person_id') && property_exists($d, 'content_id')){
			$person_id = Db::insert('erule', [
				'person_id'=>$d->person_id,
				'content_id'=>$d->content_id,
			], false ); // false, does not return id
		}
		else{
			return $server->hyperStatus(400, "You must provide a person_id and content_id for the erule.");
		}

		return $server;
	}
}
