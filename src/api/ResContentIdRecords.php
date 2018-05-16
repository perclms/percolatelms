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

class ResContentIdRecords extends \HummingJay\Resource{ 
	public $title = "Records for content";
	public $description = "All records for a particular piece of content";

	public function GET($server){
		$content_id = $server->params['content_id'];

		$fields = ['content.title', 'content_record.*', 'person.username', 'person.name'];
		$db = Db::from('crecord_v', ['content_id'=>$content_id]);
		$records = $db->fetchAll();

		$server->addData($records);

		return $server;
	}

}

