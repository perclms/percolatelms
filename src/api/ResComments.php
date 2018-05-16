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

class ResComments extends \HummingJay\Resource{ 
	public $title = "This is a comment tree belonging to a discussion";
	public $description = "You can GET the list or post a new comment.";

	public function GET($server){
		$person_info = Auth::require_token();

		$content_id = $server->params['content_id'];
		$db = Db::select([
			'comment.*', 
			'person.name', 
			'person.thumb_file_id', 
			'person.thumb_fname',
		], ["content_id"=>$content_id, "deleted"=>"false"]);

		$server->addResponseData($db->fetchAll());
		return $server;
	}

	public function POST($server){
		$person_info = Auth::require_token();

		$d = $server->requestData;
		// fill in the request with additional needed information about this comment
		$d->content_id = $server->params['content_id'];
		$d->person_id = $person_info->person_id;

		if(!$d->replies_to){ unset($d->replies_to); }
		
		// whitelist/validate input
		$d = Validate::comment($d);

		$db = Db::insert('comment', $d);

		return $server->addResponseData([
			'id_name'=>'comment_id',
			'new_id'=>$db,
		]);
	}
}

