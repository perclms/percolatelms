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

class Conf{
	public static function read($cat, $key){
		$json = file_get_contents('/etc/lms.json');
		$conf = json_decode($json, true);
		if (isset($conf[$cat]) && isset($conf[$cat][$key])) {
			return $conf[$cat][$key];
		}
		else {
			throw new SystemError("Unable to read LMS conf file!");
		}
	}
}
