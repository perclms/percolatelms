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

class Validate{
	private static function v($input, $whitelist){
		if (is_object($input)){
			// convert object to array
			$input = get_object_vars($input);
		}
		if (!is_array($input)){
			throw new SystemError("Validate::" 
				. debug_backtrace()[1]['function'] 
				. "() given: " 
				. print_r($input, true)
			);
		}

		$output = [];

		foreach ($whitelist as $fieldname => $type) {
			// can't insert IDs (in WHERE clause instead)
			if ($type == "SERIAL") continue;
			if ($type == "file_purpose_enum"){
				$type == "TEXT";
			}

			if (isset($input[$fieldname])) {
				$output[$fieldname] = $input[$fieldname];
			}
		}

		return $output;
	}

	public static function file($input){
		return self::v($input, [
			"file_id" => "SERIAL",
			"author" => "INTEGER",
			"upload_fname" => "TEXT",
			"launch_fname" => "TEXT",
			"purpose" => "file_purpose_enum",
			"size" => "INTEGER",
		]);
	}

	public static function person($input){
		return self::v($input, [
			"person_id" => "SERIAL",
			"name" => "TEXT",
			"username" => "TEXT",
			"email" => "TEXT",
			"password" => "TEXT",
			"info" => "TEXT",
			"thumb_file_id" => "INTEGER",
			"thumb_fname" => "TEXT",
			"tags" => "TEXT[]",
			"created" => "TIMESTAMP",
		]);
	}

	public static function content($input){
		return self::v($input, [
			"content_id" => "SERIAL",
			"author" => "INTEGER",
			"title" => "TEXT",
			"description" => "TEXT",
			"type" => "content_type_enum",
			"tags" => "TEXT[]",
			"thumb_file_id" => "INTEGER",
			"thumb_fname" => "TEXT",
			"hidden" => "BOOLEAN",
			"created" => "TIMESTAMP",
		]);
	}

	public static function lpath_content($input){
		return self::v($input, [
			"primary_content_id" => "INTEGER",
			"content_id" => "INTEGER",
			"num_order" => "INTEGER",
		]);
	}

	public static function cb($input){
		return self::v($input, [
			"content_id" => "INTEGER",
			"body" => "TEXT",
			"PRIMARY" => "KEY",
		]);
	}

	public static function cb_record($input){
		return self::v($input, [
			"content_id" => "INTEGER",
			"person_id" => "INTEGER",
			"page_hash" => "TEXT",
			"answered_ts" => "TIMESTAMP",
			"answer" => "TEXT",
			"is_correct" => "BOOLEAN",
			"PRIMARY" => "KEY",
		]);
	}

	public static function person_metatag($input){
		return self::v($input, [
			"person_metatag_id" => "SERIAL",
			"tag_name" => "TEXT",
			"rule" => "TEXT",
		]);
	}

	public static function content_record($input){
		return self::v($input, [
			"person_id" => "INTEGER",
			"content_id" => "INTEGER",
			"score" => "REAL",
			"passed" => "BOOLEAN",
			"failed" => "BOOLEAN",
			"completed" => "BOOLEAN",
			"started_ts" => "TIMESTAMP",
			"last_launched_ts" => "TIMESTAMP",
			"launch_count" => "INTEGER",
			"duration_sec" => "INTEGER",
			"frozen" => "BOOLEAN",
			"PRIMARY" => "KEY",
		]);
	}

	public static function erule($input){
		return self::v($input, [
			"erule_id" => "SERIAL",
			"person_id" => "INTEGER",
			"content_id" => "INTEGER",
			"person_tag" => "TEXT",
			"content_tag" => "TEXT",
		]);
	}

	public static function scorm_manifest($input){
		return self::v($input, [
			"content_id" => "INTEGER",
			"key" => "TEXT",
			"value" => "TEXT",
			"PRIMARY" => "KEY",
		]);
	}

	public static function scorm_record($input){
		return self::v($input, [
			"scorm_record_id" => "SERIAL",
			"content_id" => "INTEGER",
			"person_id" => "INTEGER",
			"key" => "TEXT",
			"value" => "TEXT",
			"created" => "TIMESTAMP",
		]);
	}

	public static function config($input){
		return self::v($input, [
			"config_id" => "SERIAL",
			"value" => "JSONB",
		]);
	}

	public static function comment($input){
		return self::v($input, [
			"comment_id" => "SERIAL",
			"content_id" => "INTEGER",
			"replies_to" => "INTEGER",
			"person_id" => "INTEGER",
			"body" => "TEXT",
			"created" => "TIMESTAMP",
			"deleted" => "BOOLEAN",
		]);
	}

	public static function content_session($input){
		return self::v($input, [
			"content_id" => "INTEGER",
			"content_reference_id" => "INTEGER",
			"instructor" => "INTEGER",
			"start_ts" => "TIMESTAMP",
			"end_ts" => "TIMESTAMP",
			"days_available" => "INTEGER",
			"price" => "REAL",
			"PRIMARY" => "KEY",
		]);
	}

}

