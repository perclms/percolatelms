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

class ResCatalog extends \HummingJay\Resource{ 
	public $title = "Catalog";
	public $description = "Catalog of content/courses available.";

	public function GET($server){
		// NOTE not pulling from content_v because it converts
		// the tags column from psql array to comma-separated list
		// and then we can't use the ANY command to filter for
		// the $catalog tag.  Premature conversion is probably
		// a mistake anyway.
		$db = Db::from("content", "'\$catalog' = ANY (tags)");

		$server->addResponseData($db->fetchAll());
		return $server;
	}
}

