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

class ResContentId extends \HummingJay\Resource{ 
	public $title = "A content item";
	public $description = "A specific piece of content";

	public function GET($server){
		$person_info = Auth::require_token();

		$content_id = $server->params['content_id'];
		$db = Db::from("content_v", ['content_id'=>$content_id]);

		$content = $db->fetch();
		$server->addResponseData($content);

		// if this is scorm content, see if we already have a launch file
		if($content["type"] == "scorm"){
			$db = Db::from("scorm_manifest", ['content_id'=>$content_id, 'key'=>'launch_fid']);
			$havefile = ($db->rowCount() > 0);
			$server->addResponseData(["scorm_uploaded"=>$havefile]);
		}

		return $server;
	}

	public function POST($server){
		// must be a logged-in user
		$person_info = Auth::require_token();
		$d = $server->requestData;

		// must EITHER be the author of this content
		$this_person_id = $person_info->person_id;
		$content_id = $server->params['content_id'];
		$db = Db::select('content.author', $content_id);
		$author = $db->fetchColumn();

		// OR must be an admin
		if ($this_person_id != $author) {
			Auth::require_token('$admin');
		}

		// whitelist/validate input
		$d = Validate::content($d);

		if(isset($d['tags'])){ 
			$d['tags'] = '{'.$server->requestData->tags.'}';
		}

		$db = Db::update('content', $d, $content_id);
		return $server;
	}
	
}

