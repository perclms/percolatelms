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

class ResFiles extends \HummingJay\Resource{ 
	public $title = "Files";
	public $description = "Files.";
	public $decodeJson = false; // NOTE: since we're sending a file and not any JSON data, we don't want to try to decode


	public function GET($server){
		$db = Db::from('file');
		$server->addResponseData($db->fetchAll());
		return $server;
	}

	public function POST($server){
		$error = "";

		//Log::info("{$_SERVER['CONTENT_LENGTH']} and max is ".ini_get('post_max_size').".");

		// https://andrewcurioso.com/blog/archive/2010/detecting-file-size-overflow-in-php.html
		// We know what type of request is being processed, we have the $POST and $FILES arrays, 
		// and we have the content length as it was passed to the HTTP server from the client. 
		// From that we get this:
		$len = $_SERVER['CONTENT_LENGTH'];
		if ( $_SERVER['REQUEST_METHOD'] == 'POST' && empty($_POST) && empty($_FILES) && $len > 0 ) {      
			$displayMaxSize = ini_get('post_max_size');
			switch ( substr($displayMaxSize,-1) ) {
				case 'G': $displayMaxSize = $displayMaxSize * 1024;
				case 'M': $displayMaxSize = $displayMaxSize * 1024;
				case 'K': $displayMaxSize = $displayMaxSize * 1024;
			}
			$error = "Sorry, that file is too large! $len bytes exceeds the maximum upload size of $displayMaxSize bytes.";
			Log::warn($error);
		}
		// if $_FILES exists, then the file might still be too large
		if (!empty($_FILES) && !empty($_FILES['userfile']) && $_FILES['userfile']['error'] != 0) {
			Log::warn("An upload failed.  See the numbered 'error' in the FILES array here:  ".print_r($_FILES, true));
			return $server->hyperStatus(500, "Sorry, there was a problem uploading the file.");
		}


		$person_info = Auth::require_token();
		$filename = $_FILES['userfile']['name'];
		$tmp_filename = $_FILES['userfile']['tmp_name'];
		$uploaddir = '/tmp/uploads/';
		$uploadfile = $uploaddir . $filename;
		$scorm_unpack_results = null;
		$filesize = filesize($tmp_filename);
		$launch_fname = preg_replace('/[^a-zA-Z0-9-_\.]/','-', $filename);
		$purpose = $_POST['purpose'];
		$related_id = $_POST['related_id'];
		$author = $person_info->person_id;
		$unzip_dir = null;
		$manifest = null;


		// sanity-check filename
		if ($filename == "") { 
			return $server->hyperStatus(500, "Could not determine filename of uploaded file.");
		}


		// -----------------------------------------------------------------
		// Unzip SCORM first so that we can record an accurate file size and
		// launch filename (from the manifest).

		if($purpose == "scorm"){
			$unzip_result = $this->unzip($tmp_filename);
			$unzip_dir = $unzip_result['unzip_dir'];
			$filesize = $unzip_result['size'];

			// read manifest to get launch_fname
			// note: we aren't doing anything with the manifest title, just the launch fname
			$manifest = Scorm::readManifest($unzip_dir);
			$launch_fname = $manifest["launch_fname"];
		}


		// -----------------------------------------------------------------
		// Resize thumbs first so we can return an error (if needed)
		// before writing to the file table, etc.
		if($purpose == "person-thumb" || $purpose == "content-thumb"){
			$before_resize_filename = "${tmp_filename}_orig";
			// rename orig file and remove it after renaming
			rename($tmp_filename, $before_resize_filename);
			$this->make_thumbnail($before_resize_filename, $tmp_filename);
			unlink($before_resize_filename);
			// update filesize since it may now be smaller!
			$filesize = filesize($tmp_filename);
		}


		// -----------------------------------------------------------------
		// Write to [file] table

		$fid = Db::insert("file", [
			"author" => $author,
			"upload_fname" => $filename,
			"launch_fname" => $launch_fname,
			"purpose" => $purpose, 
			"size" => $filesize
		]);


		
		// -----------------------------------------------------------------
		// Upload to storage service

		if($purpose == "scorm"){
			SvcStorage::uploadDir($fid, $unzip_dir);
		}
		else{
			SvcStorage::upload($fid, $tmp_filename, $launch_fname);
		}



		// -----------------------------------------------------------------
		// Handle any other purpose-specific actions such as linking 
		// thumbnails in the database.

		if($related_id != 'new'){
			if($purpose == "person-thumb"){
				$db = Db::update("person", [
					"thumb_fname" => $launch_fname,
					"thumb_file_id" => $fid,
				], $related_id);
			}

			if($purpose == "content-thumb"){
				$db = Db::update("content", [
					"thumb_fname" => $launch_fname,
					"thumb_file_id" => $fid,
				], $related_id);
			}

			if($purpose == "scorm"){
				// add the fid of this file to the scorm manifest so it will
				// be stored in the settings
				$manifest["launch_fid"] = $fid;
				Scorm::storeSettings($related_id, $manifest);
			}
		}

		if($purpose == "site-logo"){
			// first, pull existing config json data
			$db = Db::select("config.value", 1); // hard-coded config_id of '1'
			$config = (array) json_decode($db->fetchColumn());

			// add the new file_id and fname to the config table
			$config["logo_file_id"] = $fid;
			$config["logo_fname"] = $launch_fname;

			// write new config to db
			$db = Db::update('config', ["value" => json_encode($config)], 1); 
		}

		if($purpose == "stylesheet"){
			// first, pull existing config json data
			$db = Db::select("config.value", 1); // hard-coded config_id of '1'
			$config = (array) json_decode($db->fetchColumn());

			// add the new file_id and fname to the config table
			$config["stylesheet_file_id"] = $fid;
			$config["stylesheet_logo_fname"] = $launch_fname;

			// write new config to db
			$db = Db::update('config', ["value" => json_encode($config)], 1); 
		}



		// -----------------------------------------------------------------
		// clean up temporary uploaded files

		if($purpose == "scorm"){
			$this->delUnzipDir($unzip_dir);
		}


		unlink($tmp_filename);


		// -----------------------------------------------------------------
		// return response

		$server->addResponseData(['file_id'=>$fid]);
		$server->addResponseData(['filesize'=>$filesize]);
		$server->addResponseData(['launch_fname'=>$launch_fname]);
		return $server->hyperStatus(200, "$filename uploaded!");
	}




	public function unzip($local_file){
		$unzip_dir = $local_file."_unzipped";
		$zip = new \ZipArchive;
		$result = $zip->open($local_file);
		if($result !== true) throw new ZipError("Could not open due to zip read error '$result'.");

		$size = 0;
		for ($i = 0; $i < $zip->numFiles; $i++) {
			$size += $zip->statIndex($i)['size'];
		}

		$result = $zip->extractTo($unzip_dir);
		if($result !== true) throw new ZipError("Could not extract $local_file to $unzip_dir");
		$zip->close();
		return ["unzip_dir"=>$unzip_dir, "size"=>$size];
	}

	public function delUnzipDir($dir){
		// safety check - if this doesn't end with "_unzipped", then we didn't create it
		if(!preg_match("/_unzipped$/", $dir)) throw new ZipError("Sorry, attempting to clean up incorrect unzip directory: '$dir'");
		// delete directory, see http://stackoverflow.com/a/3349792/695615
		$it = new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS);
		$files = new \RecursiveIteratorIterator($it, \RecursiveIteratorIterator::CHILD_FIRST);
		foreach($files as $file) {
			if ($file->isDir()) rmdir($file->getRealPath());
			else unlink($file->getRealPath());
		}
		rmdir($dir);
	}



	public function make_thumbnail($src_path, $thumb_path){
		$thumb_max_width = 280;
		$thumb_max_height = 280;

		//$finfo = finfo_open(FILEINFO_MIME_TYPE);
		//$mime_type = finfo_file($finfo, $src_path);
		$mime_type = mime_content_type($src_path);
		//echo "mime: "; print_r($mime_type); echo "\n";
		switch ($mime_type) {
			case "image/gif": $src_gd = imagecreatefromgif($src_path); break;
			case "image/jpeg": $src_gd = imagecreatefromjpeg($src_path); break;
			case "image/png": $src_gd = imagecreatefrompng($src_path); break;
			default: 
				throw new UserError("Does not appear to be an allowed image type: '$mime_type'.");
		}
		//finfo_close($finfo);

		if (!$src_gd) {
			throw new UserError("There was an error reading the image file.");
		}

		list($src_width, $src_height, $src_type) = getimagesize($src_path);

		if ( $src_width == $thumb_max_width ) {
			// already perfect width, copy file to thumb path
			copy($src_path, $thumb_path);
			return true;
		}

		$src_ratio = $src_width / $src_height;
		$thumb_ratio = $thumb_max_width / $thumb_max_height;
		if ($src_width <= $thumb_max_width && $src_height <= $thumb_max_height) {
			$thumb_width = $src_width;
			$thumb_height = $src_height;
		} elseif ($thumb_ratio > $src_ratio) {
			$thumb_width = (int) ($thumb_max_height * $src_ratio);
			$thumb_height = $thumb_max_height;
		} else {
			$thumb_width = $thumb_max_width;
			$thumb_height = (int) ($thumb_max_width / $src_ratio);
		}
		$thumb_gd_image = imagecreatetruecolor($thumb_width, $thumb_height);
		imagecopyresampled($thumb_gd_image, $src_gd, 0, 0, 0, 0, $thumb_width, $thumb_height, $src_width, $src_height);
		imagejpeg($thumb_gd_image, $thumb_path, 90);
		imagedestroy($src_gd);
		imagedestroy($thumb_gd_image);
		return true;
	}
}
