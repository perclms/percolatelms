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

class Scorm{

	public static function setValues($cid, $uid, $items){
		$tablekey = [ 'content_id' => $cid, 'person_id' => $uid ];
		$itemtablekey = [ 'content_id' => $cid, 'person_id' => $uid ];
		foreach($items as $item){
			$itemtablekey["key"] = $item->key;
			$vals = [ 'value' => $item->value ];
			$db = Db::upsert('scorm_record', $vals, $itemtablekey);
			self::doCompletion($uid, $cid, $item->key, $item->value);
			self::doScore($uid, $cid, $item->key, $item->value);
		}
	}

	private static function doCompletion($uid, $cid, $key, $value){
		if($key != "cmi.completion_status" && $key != "cmi.core.lesson_status") return;
		if($value != "completed" && $value != "passed") return;
		ResRecord::completed($uid, $cid);
	}

	private static function doScore($uid, $cid, $key, $value){
		if($key == "cmi.score.raw" || $key == "cmi.core.score.raw"){
			ResRecord::score($uid, $cid, $value);
		}
		if($key == "cmi.score.scaled"){
			ResRecord::score($uid, $cid, $value*100);
		}
	}

	public static function getSettingsBundle($cid, $uid){
		$scorm_data = [];

		// defaults
		$scorm_data["cmi.core.lesson_mode"] = ["value"=>"normal", "source"=>"lms-default"];
		$scorm_data["cmi.core.lesson_status"] = ["value"=>"not attempted", "source"=>"lms-default"];
		$scorm_data["cmi.core.entry"] = ["value"=>"ab initio", "source"=>"lms-default"];
		$scorm_data["cmi.entry"] = ["value"=>"ab initio", "source"=>"lms-default"];
		$scorm_data["cmi.success_status"] = ["value"=>"unknown", "source"=>"lms-default"];
		$scorm_data["cmi.completion_status"] = ["value"=>"unknown", "source"=>"lms-default"];
		$scorm_data["cmi.mode"] = ["value"=>"normal", "source"=>"lms-default"];

		// user info (for 1.2 and 2004 data models
		$db = Db::select('person.name', $uid);
		$name = $db->fetchColumn();
		$scorm_data["cmi.core.student_id"] = ["value"=>$uid, "source"=>"lms-default"];
		$scorm_data["cmi.learner_id"] = ["value"=>$uid, "source"=>"lms-default"];			
		$scorm_data["cmi.core.student_name"] = ["value"=>$name, "source"=>"lms-default"];	
		$scorm_data["cmi.learner_name"] = ["value"=>$name, "source"=>"lms-default"];


		// get stored manifest settings from db
		$db = Db::from('scorm_manifest', ['content_id'=>$cid]);
		$settings = $db->fetchAll();

		// translate manifest settings into scorm 1.2 and 2004 data model keys
		// 
		// Manifest                         1.2 Data Model		                  2004 Data Model
		// --------------------------------------------------------------------------------------
		// completion_threshold             n/a                                   cmi.completion_threshold (not implemented, seems to be for sequencing only)
		// datafromlms                      cmi.launch_data                       cmi.launch_data
		// attemptAbsoluteDurationLimit     cmi.student_data.max_time_allowed     cmi.max_time_allowed
		// minNormalizedMeasure             cmi.student_data.mastery_score    	  cmi.scaled_passing_score
		// timeLimitAction                  cmi.student_data.time_limit_action    cmi.time_limit_action 
		// objectives (Special)             cmi.objectives.n.id                   cmi.objectives.n.id 
		// 
		// launch_fname                     sys.launch_fname
		// launch_fid                       sys.launch_fid

		$translation = [
			'datafromlms'=>['cmi.launch_data', 'cmi.launch_data'],
			'maxtimeallowed'=>['cmi.student_data.max_time_allowed', 'cmi.max_time_allowed'],
			'masteryscore'=>['cmi.student_data.mastery_score', 'cmi.scaled_passing_score'],
			'timeLimitAction'=>['cmi.student_data.time_limit_action', 'cmi.time_limit_action'],
			'launch_fname'=>['sys.launch_fname'],
			'launch_fid'=>['sys.launch_fid'],
		];

		foreach($settings as $s){ // settings from manifest in database
			$key = $s['key'];
			$value = $s['value'];

			if($key === '') continue; // don't do anything for blank items

			// insert translation (if any)
			if(isset($translation[$key])){
				foreach($translation[$key] as $translation_key){
					$scorm_data[$translation_key] = ["value"=>$value, "source"=>"manifest"];
				}
			}

			// objectives need special handling
			if($key == 'objectives'){
				$count=0;
				foreach (explode(',', $value) as $obj_id) {
					$scorm_data["cmi.objectives.{$count}.id"] = ["value"=>$obj_id, "source"=>"manifest"];
					$count++;
				}
			}
		}



		// get stored user values from DB
		$db = Db::from('scorm_record', ['content_id'=>$cid, 'person_id'=>$uid]);
		$user = $db->fetchAll();
		foreach($user as $u){
			$scorm_data[$u['key']] = ["value"=>$u['value'], "source"=>"lms-stored"];
		}

		// translate associative array into numbered array
		// this is for the benefit of the front-end for manipulating
		// the values as a JavaScript array instead of an object
		$scorm_data_list = [];
		foreach($scorm_data as $key => $value){
			$value["key"] = $key;
			$scorm_data_list[] = $value;
		}

		return $scorm_data_list;
	}

	public static function storeSettings($cid, $settings){
		foreach($settings as $key => $value){
			$db = Db::upsert('scorm_manifest', ['value' => $value], ['content_id' => $cid, 'key' => $key]);
	   	}
	}


	
	public static function readManifest($scorm_dir){
		$manifest_path = "$scorm_dir/imsmanifest.xml";
		if (!file_exists($manifest_path)) {
			throw new ScormError("Could not find imsmanifest.xml in zip archive.");
		}
		return self::parseManifest(file_get_contents($manifest_path));
	}

	public static function parseManifest($manifest_str){
		libxml_use_internal_errors(true);
		$manifest_xml = simplexml_load_string($manifest_str);
		if (!$manifest_xml) throw new ScormError(libxml_get_errors());
		//self::xpathNamespaceFailtrain($manifest_xml);

		$manifest_dom = dom_import_simplexml($manifest_xml);

		//$item = self::domGetTag($manifest_dom, "item");
		$item = null;
		foreach($manifest_dom->getElementsByTagName("item") as $i){
			if($i->getAttribute('identifierref') != ''){
				if($item) throw new ScormError("Manifest contains multiple <item> elements with an 'identifierref' property. This is likely a multi-SCO course, which is not supported at this time.");
				$item = $i;
			}
		}
		if(!$item)throw new ScormError("Manifest did not contain an <item> element with an 'identifierref' property.");

		$launch_fname = "";
		$identifierref = $item->getAttribute("identifierref");
		foreach($manifest_dom->getElementsByTagName("resource") as $resource){
			if($identifierref === $resource->getAttribute("identifier")){
				$launch_fname = $resource->getAttribute("href");
				$base = $resource->getAttribute("xml:base");
				if($base)
					$launch_fname = $base.$launch_fname;
			}
		}

		if(!$item || $launch_fname == "") {
			throw new ScormError("Unable to find an 'href' property in a <resource> element with the 'identifierref' proptery of {$identifierref}");
		}

		$objectives = [];
		foreach($item->getElementsByTagName("objective") as $objective){
			$objectives[] = $objective->getAttribute("objectiveID");
		}
		$results = [
			"title" => self::domGetValue($item, "title"),
			"masteryscore" => self::domGetValue($item, "masteryscore"),
			"maxtimeallowed" => self::domGetValue($item, "maxtimeallowed"),
			"datafromlms" => self::domGetValue($item, "datafromlms"),
			"timelimitaction" => self::domGetValue($item, "timelimitaction"),
			"objectives" => implode(",", $objectives),
			"minNormalizedMeasure" => self::domGetValue($item, "minNormalizedMeasure"),
			"launch_fname" => $launch_fname,
		];


		return $results;
	}

	public static function domGetTag($dom, $tag){
		$item = $dom->getElementsByTagName($tag);
		if($item->length==0) return null;
		return $item[0];
	}

	public static function domGetValue($dom, $tag){
		$item = self::domGetTag($dom, $tag);
		if(!$item) return "";
		return $item->textContent;
	}
}

