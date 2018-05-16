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

class ResTokensAccess extends \HummingJay\Resource{ 
	public $title = "Email an access token";
	public $description = "POST to email a temporary auth token to this person - lookup by username, email address, or person_id";

	public function POST($server){
		$d = $server->requestData;

		$token = Auth::pwd_token($d);
		$token_decoded = Auth::decode_token($token);

		if(!strpos($token_decoded->email, "@")){
			return $server->hyperStatus(500, "Sorry, the username was found, but there is no email address associated with it.  A 'forgot password' link cannot be sent. You'll need to contact your LMS administrator.");
		}

		SvcEmail::send(
			$token_decoded->email, 
			"LMS Password Change Request", 
			"https://".Tenants::getHostname()."/#!/change-pwd/{$token}\n\nSincerely, The LMS"
		);

		$server->addResponseData(["email_addr_length"=>strlen($token_decoded->email)]);

		return $server;
	}
}

