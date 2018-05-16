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

class ResPeopleIdHome extends \HummingJay\Resource{ 
	public $title = "Home Data";
	public $description = "GET a bundle of data describing a person's home 'page' with enrollments, records, welcome message, etc.";

	public function GET($server){
		$person_id = $server->params['person_id'];

		$bundle = [];

		// get records and enrollments

		$sql = "
		SELECT * FROM content WHERE content_id IN 
			(SELECT content_id FROM erule WHERE person_id = :person_id)

		UNION

		SELECT * FROM content WHERE content_id IN 
			(SELECT content_id FROM erule WHERE person_tag IN 
				(SELECT unnest(tags) FROM person WHERE person_id = :person_id))

		UNION

		SELECT * FROM content WHERE 
			(SELECT array_agg(content_tag) FROM erule WHERE person_id = :person_id) 
			&& tags

		UNION

		SELECT * FROM content WHERE tags && 
			(SELECT array_agg(content_tag) FROM erule WHERE person_tag IN 
				(SELECT unnest(tags) FROM person WHERE person_id = :person_id))

		UNION

		SELECT * FROM content WHERE author = :person_id

		UNION

		SELECT * FROM content WHERE content_id IN
			(SELECT content_id FROM content_record WHERE person_id = :person_id)
		;";

		$db = Db::raw($sql, ['person_id'=>$person_id]);
		$bundle["content"] = $db->fetchAll();

		// get records
		$db = Db::from("content_record", ['person_id'=>$person_id]);
		$bundle["records"] = $db->fetchAll();

		// get config
		$db = Db::select(["config.value"], 1); // hard-coded config id 1
		$bundle["config"] = json_decode($db->fetchColumn());
		
		// get welcome content id (if any)
		$db = Db::select('content.content_id', ['title'=>'Welcome', 'type'=>'cb']);
		if($db->rowCount() < 1){
			$bundle["welcome_exists"] = false; 
		}
		else{
			$bundle["welcome_exists"] = true;
			$bundle["welcome_id"] = $db->fetchColumn();
		}

		// check if catalog contains items or not
		$db = Db::select('content.content_id', "'\$catalog' = ANY (tags)");
		if($db->rowCount() < 1){
			$bundle["catalog_exists"] = false; 
		}
		else{
			$bundle["catalog_exists"] = true;
			$bundle["catalog_count"] = $db->rowCount();
		}

		$server->addResponseData($bundle);
		return $server;
	}
}
