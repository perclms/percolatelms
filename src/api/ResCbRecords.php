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

class ResCbRecords extends \HummingJay\Resource{ 
	public $title = "Content Builder Records";
	public $description = "Get the complete list of Content Builder records for this content";

	public function GET($server){
		$content_id = $server->params['content_id'];
		$db = Db::from("cb_record", ['content_id'=>$content_id]);

		$server->addResponseData($db->fetchAll());
		return $server;
	}
}
