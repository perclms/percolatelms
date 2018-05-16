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

class ResCb extends \HummingJay\Resource{ 
	public $title = "This is a content-builder resource - it contains all of the pages in the content.";
	public $description = "You can GET the content builder pages or POST an update.";


	private function make_hashes($body){
		foreach (explode("--page--", $body) as $b) {
			// strip ALL whitespace so that changes
			// to whitespace do not change the page's
			// signature
			$b = preg_replace('/\s+/', '', $b);

			// md5 hash for a quick page signature
			$hashes[] = md5($b);
		}
		return $hashes;
	}

	public function GET($server){
		$content_id = $server->params['content_id'];
		$db = Db::from("cb", ["content_id"=>$content_id]);

		$data = $db->fetch();
		$data["page_hashes"] = self::make_hashes($data["body"]);

		$server->addResponseData($data);
		return $server;
	}

	public function POST($server){
		$person_info = Auth::require_token();
		//$person_info = Auth::require_token('$admin');

		$content_id = $server->params['content_id'];

		$d = $server->requestData;

		// whitelist/validate input
		$d = Validate::cb($d);

		$db = Db::from('cb', ["content_id"=>$content_id]);
		if($db->rowCount()){
			$db = Db::update('cb', $d, ["content_id"=>$content_id]);
		}
		else{
			$d['content_id'] = $content_id;
			$db = Db::insert('cb', $d, false);
		}

		return $server;
	}
}

