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

class ResLpath extends \HummingJay\Resource{ 
	public $title = "A learning path";
	public $description = "";

	public function GET($server){
		$content_id = $server->params['content_id'];
		$db = Db::from('content', $content_id);
		$server->addResponseData($db->fetch());

		$db = Db::from('lpath_content_v', ['primary_content_id'=>$content_id]);
		$server->addResponseData(['content'=>$db->fetchAll()]);

		return $server;
	}

	public function POST($server){
		$primary_content_id = $server->params['content_id'];

		$d = $server->requestData;

		$db = Db::delete('lpath_content', ['primary_content_id'=>$primary_content_id]);

		$num=0;
		foreach($d->content as $c){
			$content_id = $c->content_id;
			$num++;
			// the final 'false' parameter indicates that we don't return a new id
			$db = Db::insert('lpath_content', [
				'primary_content_id'=>$primary_content_id, 
				'content_id'=>$content_id, 
				'num_order'=>$num
			], false);
		}

		return $server;
	}

}
