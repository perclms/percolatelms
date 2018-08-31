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

class ResPeople extends \HummingJay\Resource{ 
	public $title = "People";
	public $description = "Accounts for all people in the LMS.";

	public function GET($server){
		$person_info = Auth::require_token('$admin');
		
		$db = Db::from('person_v');

		$server->addResponseData($db->fetchAll());
		return $server;
	}

	public function POST($server){
		$person_info = Auth::require_token('$admin');
		$d = $server->requestData;

		// whitelist/validate input
		$d = Validate::person($d);
		$d["password"] = Auth::hash_password($d["password"]);
		if(isset($d["tags"])) $d["tags"] = "{{$d["tags"]}}";

		$new_id = Db::insert('person', $d);

		return $server->addResponseData([
			'id_name'=>'person_id',
			'new_id'=>$new_id,
		]);
	}

	public static function import($fname, $server){
		$csv = fopen($fname, "r");
		if($csv === false) throw new SystemError("Could not open uploaded CSV file $fname.");
		$line = 0;
		$people = [];

		// get list of existing usernames from db
		$result=Db::select('person.username');
		$db_usernames=[];
		while($u=$result->fetchColumn()){
			$db_usernames[] = $u;
		}

		// field positions: name,email,tags,username,info
		$NAME=0; $EMAIL=1; $TAGS=2; $USERNAME=3; $INFO=4;

		// after insert we add the following:
		$PID=5; $ACCESSLINK=6;

		// get from csv
		// =================================================================
		while (($person = fgetcsv($csv))) {
			$line++;

			// check header row
			if($line == 1) {
				if($person === ['name', 'email', 'tags', 'username', 'info']){
					// skip header row
					continue; 
				} else {
					// Reject entire CSV if header doesn't match exactly.
					// It's usually nice to "be liberal in what you accept", 
					// but with a user import, it's nicer still to be strict.
					throw new UserError("CSV must have a first (header) row with exactly: name, email, tags, username, info.");
				}
			}

			// pre-process people from CSV
			// =================================================================

			// trim all values
			foreach($person as &$val){
				$val = trim($val);
			}

			// all lines must have 5 fields
			if(count($person) < 5){
				// might be wasteful of commas, but we really must insist
				// that all columns are accounted for
				throw new UserError("Row $line has less than 5 fields.");
			}

			// blank name? better check that this whole line is blank
			if($person[$NAME] == ''){
				foreach($person as $val) {
					if($val != ''){
						// uh oh! there is data here, but no name!
						throw new UserError("Row $line has data but nothing in the required 'name' column.");
					}
				}
			}

			// if we have an email, better make sure it at least has a '@' char
			if($person[$EMAIL] != ''){
				if(strpos($person[$EMAIL], '@') === false){
					// better throw an error - this will only cause trouble in the future
					throw new UserError("Row $line has what appears to be an invalid email address: '${person[$EMAIL]}'.");
				}
			}

			// tags
			// there's little we can do to differentiate between valid and invalid tags
			// so we'll just postgres-ify the filed as-is and hope for the best
			$person[$TAGS] = '{'.$person[$TAGS].'}';


			// blank username? okay, we'll make one
			if($person[$USERNAME] == ''){

				// try to use email 'local-part':
				$at = strpos($person[$EMAIL], '@');
				if($at !== false){
					// okay, we have one, let's use it!
					$person[$USERNAME] = strtolower(substr($person[$EMAIL], 0, $at));
				}
				else {
					// no email, let's smash up the user's name
					// attempting to favor the "last" name
					$parts = explode(" ", $person[$NAME]);
					$lastpart = substr(array_pop($parts), 0, 8);
					$user_name = '';
					foreach($parts as $p){
						$user_name .= substr($p, 0, 2); // 2 chars of everything else
					}
					$user_name = $user_name . $lastpart;
					$person[$USERNAME] = strtolower($user_name);
				}
			}

			// make sure username isn't already in list - give row numbers for both if found
			$pc=0;
			foreach($people as $checkp){
				$pc++;
				if($checkp[$USERNAME] == $person[$USERNAME]){
					throw new UserError("Row $line and row $pc have the same username '${person[$USERNAME]}'. If these were not supplied, you'll need to manually create one of them to avoid the collision.");
				}
			}

			// make sure username isn't already in db
			foreach($db_usernames as $username){
				if($username == $person[$USERNAME]){
					throw new UserError("Row $line has the username '${person[$USERNAME]}' which is already in the LMS. If this username was generated for you, you'll need to manually create a different one to avoid the collision.");
				}
			}

			// Note: anything goes in the 'info' field, so that shall remain as-is

			$people[] = $person; // add processed person to our list
		}


		// database insert!
		// =================================================================
		$pdo = Db::getPdo();
		$sql = "INSERT INTO person (name, email, tags, username, info) VALUES ";
		$val_lists = [];
		// create comma-separated "multi-values" for the insert (postgres allows)
		foreach($people as $person){
			$quoted_values = Db::quoteValues($person);
			$val_lists[] = "(" . implode(', ', $quoted_values) . ")";
		}
		$sql .= implode(', ', $val_lists);
		$sql .= " RETURNING person_id";
		$result = Db::raw($sql);

		// grind PDOStatement into flat array:
		$db_pids=[];
		while($p=$result->fetchColumn()){
			$db_pids[] = $p;
		}

		// add person_id and access links to each person
		// =================================================================
		for($i=0; $i<count($people); $i++){
			$person = &$people[$i];
			$pid = $db_pids[$i]; // person_id from db insert above
			$person[$PID] = $pid;
			$token = Auth::pwd_token((object)["person_id"=>$pid]);
			$link = "https://".Tenants::getHostname()."/#!/change-pwd/{$token}";
			$person[$ACCESSLINK] = $link;
		}

		// log the number of people inserted
		Log::info("Imported $line people from $fname.");

		$server->addResponseData(['imported'=>$people]);
		return $server;
	}
}
