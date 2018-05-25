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


class Log{
	// these all return a timestamp which can be reported back to the user
	// interface and used to locate the exact entry

	public static function error($msg){ 
		$msgtxt = "[error] $msg";
		return self::writeToFile($msgtxt);
	}

	public static function warn($msg){ 
		$msgtxt = "[warn] $msg";
		return self::writeToFile($msgtxt);
	}

	public static function info($msg){ 
		$msgtxt = "[info] $msg";
		return self::writeToFile($msgtxt);
	}


	// Internals

	public static function writeToFile($msg){
		$logFilePath = Conf::read('log_path');
		if(isset($GLOBALS["TEST"]) && $GLOBALS["TEST"]) {
			$logFilePath = $GLOBALS["TEST_LOG_PATH"];
		}

		$tid = Tenants::getTenantIdForLog();

		$dt = new \DateTime();
		$isodate = $dt->format('Y-m-d\TH:i:s');
		$stamp = $dt->getTimestamp();
		$stamp = base_convert($stamp, 10, 36);

		$msgtxt = "\n$isodate ($stamp) (tenant$tid) $msg\n";
		$result = file_put_contents($logFilePath, $msgtxt, FILE_APPEND);
        if($result === false) die("ERROR: Log unable to write to $logFilePath\n");
		return $stamp;
    }
}
