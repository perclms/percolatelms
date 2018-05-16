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

class ResRecord extends \HummingJay\Resource{ 
	public $title = "Record for content";
	public $description = "A person's record for a particular piece of content";


	// ==========================================================================
	// Static methods for other sub-content resources to write completion/score
	//
	public static function completed($person_id, $content_id){
		$keys = ['person_id'=>$person_id, 'content_id'=>$content_id];
		// we never set completed_ts outside of this function because we want to
		// record the first instance of being complete (scorm courses will be
		// particularly bad about spamming us with redundant info)
		
		// if this is already complete, do nothing!
		$db = Db::from('content_record', $keys);
		$record = $db->fetch();
		if($record['completed']) return;

		// now do the update
		$vals = ["completed"=>"true", "completed_ts"=>"NOW()"];
		$db = Db::update('content_record', $vals, $keys);
	}

	public static function score($person_id, $content_id, $score){
		$keys = ['person_id'=>$person_id, 'content_id'=>$content_id];
		$vals = ["score"=>$score];
		$db = Db::update('content_record', $vals, $keys);
	}
	// ==========================================================================


	public function GET($server){
		$person_id = $server->params['person_id'];
		$content_id = $server->params['content_id'];

		$db = Db::from('crecord_v', ['person_id'=>$person_id, 'content_id'=>$content_id]);
		$record = $db->fetch();

		$server->addData($record);

		return $server;
	}

	public function POST($server){
		$person_id = $server->params['person_id'];
		$content_id = $server->params['content_id'];
		$key = ['person_id'=>$person_id, 'content_id'=>$content_id];
		$d = $server->requestData;

		// will be a number (or not set, so 0 is good)
		$seconds_to_add = (isset($server->requestData->seconds_to_add) ? $server->requestData->seconds_to_add : 0);
		// will be a boolean (set or not set)
		$launch_increment = (isset($server->requestData->launch_increment));

		$db = Db::from('content_record', $key);
		$record = $db->fetch();

		if (!$record) {
			// third parameter for insert() is false because there is no content_record_id
			$vals = $key; // PHP copies arrays on assignment
			$vals["started_ts"]="NOW()"; // started time is...NOW!
			$db = Db::insert('content_record', $vals, false);
		}

		// whitelist/validate input
		$d = Validate::content_record($d);

		if($seconds_to_add){
			$d['duration_sec'] = $record["duration_sec"] + $seconds_to_add;
		}

		if($launch_increment){
			$d['launch_count'] = $record["launch_count"] + 1;
			$d['last_launched_ts'] = "NOW()";
		}

		if (!isset($d['frozen']) || $d['frozen'] != 'true') { 
			$d['frozen'] = 'false'; 
		}

		if (isset($d['completed']) && $d['completed'] = 'true'){
			self::completed($person_id, $content_id);
		}

		$db = Db::update('content_record', $d, $key);

		return $server;
	}
}

