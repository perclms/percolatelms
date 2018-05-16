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

class ResScorm extends \HummingJay\Resource{ 
	public $title = "Scorm for content";
	public $description = "Tracking for a particular piece of content";

	public function GET($server){
		$person_id = $server->params['person_id'];
		$content_id = $server->params['content_id'];
		//Log::info("SCORM GET pid $person_id, $content_id");
		$r = Scorm::getSettingsBundle($content_id, $person_id);
		$server->addResponseData($r);
		return $server;
	}

	public function POST($server){
		$person_id = $server->params['person_id'];
		$content_id = $server->params['content_id'];
		//Log::info("SCORM POST pid $person_id, $content_id");
		$r = Scorm::setValues($content_id, $person_id, $server->requestData);
		
		return $server;
	}
}
