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

require 'autoloaders.php';

try {
$api = new \HummingJay\HummingJay([
	"/" => "\Lms\ResRoot",
	"/erules" => "\Lms\ResErules",
	"/config" => "\Lms\ResConfig",
	"/files" => "\Lms\ResFiles",
	"/files/{fid}/{fname--->}" => "\Lms\ResFilesIdFname",
	"/content" => "\Lms\ResContent",
	"/content/{content_id}" => "\Lms\ResContentId",
	"/content/{content_id}/comments" => "\Lms\ResComments",
	"/content/{content_id}/comments/{comment_id}" => "\Lms\ResCommentsId",
	"/content/{content_id}/cb" => "\Lms\ResCb",
	"/content/{content_id}/lpath" => "\Lms\ResLpath",
	"/content/{content_id}/records" => "\Lms\ResContentIdRecords",
	"/content/{content_id}/cb-records" => "\Lms\ResCbRecords",
	"/content/{content_id}/person/{person_id}/record" => "\Lms\ResRecord",
	"/content/{content_id}/person/{person_id}/cb-record" => "\Lms\ResCbRecord",
	"/catalog" => "\Lms\ResCatalog",
	"/mirror" => "\Lms\ResMirror",
	"/people" => "\Lms\ResPeople",
	"/people/metatags" => "\Lms\ResMetatags",
	"/people/{person_id}" => "\Lms\ResPeopleId",
	"/people/{person_id}/home" => "\Lms\ResPeopleIdHome",
	"/people/{person_id}/records" => "\Lms\ResPeopleIdRecords",
	"/people/{person_id}/content/{content_id}/scorm" => "\Lms\ResScorm",
	"/people/{person_id}/content/{content_id}/record" => "\Lms\ResRecord",
	"/people/{person_id}/content/{content_id}/cb-record" => "\Lms\ResCbRecord",
	"/people/{person_id}/content/{content_id}/certificate.pdf" => "\Lms\ResCertificate",
	"/tokens" => "\Lms\ResTokens",
	"/tokens/access" => "\Lms\ResTokensAccess",
]);
}// end try
catch (\Exception $e) { lms_error_handler($e); }

