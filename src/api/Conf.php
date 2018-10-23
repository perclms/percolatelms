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
	private static $path = '/etc/lms.conf';

	private static function must_exist(){
		if (! is_readable(self::$path)) {
			throw new SystemError("Unable to read from '{self::$path}': ".$e->getMessage());
		}
	}

	public static function read($key){
		$lines = file(self::$path);
		foreach($lines as $line) {
			if(preg_match("/^$key\s*=\s*(.*)$/", $line, $m)) {
				return $m[1];
			}
		}

		throw new SystemError("Unable to read key '$key' from config.");
	}

	public static function has($key){
		$lines = file(self::$path);
		foreach($lines as $line) {
			if(preg_match("/^$key\s*=/", $line)) {
				return true;
			}
		}
		return false;
	}
}

