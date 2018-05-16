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

class ResCbRecord extends \HummingJay\Resource{ 
	public $title = "Content Builder Record";
	public $description = "Get the complete list of Content Builder records for this content and this person, or post a new one";

	public function GET($server){
		$content_id = $server->params['content_id'];
		$person_id = $server->params['person_id'];
		$db = Db::from("cb_record", ['content_id'=>$content_id, 'person_id'=>$person_id]);

		$server->addResponseData($db->fetchAll());
		return $server;
	}

	// new or update existing item
	public function POST($server){
		$content_id = $server->params['content_id'];
		$person_id = $server->params['person_id'];

		$d = $server->requestData;
		$page_hash = $d->page_hash;
		unset($d->page_hash);
		$d->answered_ts = 'NOW()';

		// whitelist/validate input
		$d = Validate::cb_record($d);

		$db = Db::upsert('cb_record', $d, ["content_id"=>$content_id, "person_id"=>$person_id, "page_hash"=>$page_hash]);



		return $server;
	}
}
