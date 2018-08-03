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


class Tenants{
	// we cache the tenant_id so that we don't have to keep looking it up in the DB
	private static $tenant_id = 0;
	private static $getting_tid = false;

	public static function getTenantId(){
		if(self::$tenant_id > 0) return self::$tenant_id; 
		self::$getting_tid = true;
		$hn = self::getHostname();
		$tid = self::getTenantIdForHost($hn);
		self::$tenant_id = $tid;
		self::$getting_tid = false;
		return self::$tenant_id;
	}

	public static function getTenantIdForLog(){
		if(self::$getting_tid) return "NONE";
		return self::getTenantId();
	}

	public static function getTenantIdForHost($hostname){
		$pdo = Db::getMasterPdo();

		// NOTE: this cannot use the DB functions for select, etc. because they
		// attempt to connect to a tenant, so we would have a circular relationship
		// problem.
		$sql = "SELECT tenant_id FROM host WHERE hostname=:hostname";
		$query = $pdo->prepare($sql);
		$query->bindParam(":hostname", $hostname);
		$query->execute();
		$tid = $query->fetchColumn();
		if(!$tid){
			Log::warn("getTenantIdForHost('$hostname'): not found.");
			throw new NoTenant("Sorry, no LMS found at this domain ('$hostname'). Perhaps check the spelling?");
		}
		return $tid;
	}


	public static function getHostname(){
		$hostname = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : "";
		if(isset($GLOBALS["TEST_HOST"])) $hostname = $GLOBALS["TEST_HOST"];
    	$hostname = preg_replace("/:\d+/", '', $hostname); // strip port number
		return $hostname;
	}


	public static function delete($tid){
		$pdo = Db::getMasterPdo();

		$sql = "DELETE FROM host WHERE tenant_id = {$tid};";
		$query = $pdo->prepare($sql);
		$query->execute();

		$sql = "DELETE FROM tenant WHERE tenant_id = {$tid};";
		$query = $pdo->prepare($sql);
		$query->execute();

		$sql = "DROP SCHEMA tenant{$tid} CASCADE;";
		$query = $pdo->prepare($sql);
		$query->execute();

		return true;
	}
	

	public static function create($admin_username, $admin_password, $hostname){

		$pdo = Db::getMasterPdo();


		//
		//
		// Create master tenant record, host record, and tenant role and schema
		//
		//


		$sql = "INSERT INTO tenant (tenant_id) VALUES (DEFAULT) RETURNING tenant_id;";
		$query = $pdo->prepare($sql);
		$query->execute();
		$tid = $query->fetchColumn();

		if(!is_int($tid)){ 
			throw new SystemError("Tenants::create() was unable to get a TID for new host: '$hostname'.");
		}

		// Insert hostname (domain) into hosts table for this tenant
		$sql = "INSERT INTO host (tenant_id, hostname) VALUES (:tenant_id, :hostname);";
		$query = $pdo->prepare($sql);
		$query->execute(['tenant_id'=>$tid, 'hostname'=>$hostname]);

		// Create role for our new tenant{$tid}
		$sql = "CREATE ROLE tenant{$tid} NOINHERIT;";
		$query = $pdo->prepare($sql);
		$query->execute();

		// Allow master to use and manipulate role tenant{$tid}
		$sql = "GRANT tenant$tid TO master;";
		$query = $pdo->prepare($sql);
		$query->execute();

		// Create schema and grant rights for that tenant role
		$sql = "CREATE SCHEMA tenant{$tid} AUTHORIZATION tenant{$tid};";
		$query = $pdo->prepare($sql);
		$query->execute();


		//
		//
		// Switch roles to tenant and then run the tenant.sql script to create the tables! 
		//
		//


		$pdo = Db::setRole($tid);

		$script_path = Conf::read('db_new_tenant');
		$scriptfile = fopen($script_path, "r");
		if(!$scriptfile){
		   throw new SystemError("Couldn't open '{$script_path}'");
		}
		$script = '';
		while (($line = fgets($scriptfile)) !== false) {
			$line = trim($line);
			// skip comments and blank lines
			if(preg_match("/^#|^--|^$/", $line)){ continue; } 
			$script .= ' '.$line;
		}
		// run each statement
		$statements = explode(';', $script);
		foreach($statements as $sql){
			if($sql === '') { continue; }
			$query = $pdo->prepare($sql);
			$query->execute();
		}



		// Insert the initial admin user into the tenant's users table
		$pwdhash = Auth::hash_password($admin_password);
		$db = Db::insert("person", [
			'name'=>'Admin',
			'username'=>$admin_username,
			'email'=>'admin@example.com',
			'password'=>$pwdhash,
			'tags'=>"{\$admin}",
		]);

		// Insert the initial configuration
		$db = Db::insert("config", ["value"=>json_encode([
			"title"=>"Percolate LMS",
			"css"=>"main",
		])]);
		
		return $tid;
	}



}

