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

// http://lucumr.pocoo.org/2013/11/17/my-favorite-database/
// http://jwt.io/
// http://tools.ietf.org/html/rfc7519

class Auth{
	private static $jwt_alg = 'HS256'; // the JWT algorithm we require

	private static function get_secret_key(){
		/**
		 *
		 * Used internally to get secret key for JWT tokens.
		 *
		 */
		// return $SECRET_LMS_JWT_KEY;
		return Conf::read('tokens', 'tenant_private_key');
	}

	public static function hash_password($password){
		/**
		 *
		 * Calls PHP's own password_hash() using default algo (bcrypt, currently). Unlikely to be used outside of Auth.
		 *
		 */
		return password_hash($password, PASSWORD_DEFAULT);
	}


	public static function authenticate($username, $password){
		/**
		 *
		 * Authenticates a login with username and password. Returns a JWT token.
		 *
		 */
		$db = Db::from('person', ['username'=>$username]);
		if($db->rowCount() == 0){
			throw new AuthFailure("The username or password you entered were not correct.");
		}
		$person_info = $db->fetch();
		if(!password_verify($password, $person_info['password'])){
			throw new AuthFailure("The username or password you entered were not correct.");
		}
		if(self::psql_array_contains_tag($person_info['tags'], '$frozen')){
			throw new AuthFailure("This account is frozen.");
		}

		unset($person_info['password']);
		return self::create_token($person_info);
	}



	public static function authenticate_access_token($access_token){
		/**
		 *
		 * Authenticates an access token, returns a JWT token just like a normal login.
		 *
		 */
		$decoded = self::decode_token($access_token);
		if (!$decoded) {
			throw new AuthFailure("Unable to decode access token.");
		}

		$db = Db::from('person', $decoded->person_id);
		if($db->rowCount() == 0){
			throw new AuthFailure("Access token does not match a current person.");
		}

		$person_info = $db->fetch();

		if(self::psql_array_contains_tag($person_info['tags'], '$frozen')){
			throw new AuthFailure("This account is frozen.");
		}

		// make access tokens expire in 24 hours
		if(time() - $decoded->ts > (60*60*24)){
			throw new AuthFailure("Access token has expired.");
		}

		unset($person_info['password']); // exclude from token
		return self::create_token($person_info);
	}


	public static function create_token($payload){
		/**
		 *
		 * Used by both authentication functions to create the tokenized payload to be given to the client.
		 *
		 */
		$token = array_merge($payload, array(
			"iss" => "perclms",         // issuer
			"iat" => time(),                // time token issued
			"jti" => md5(time()) // uniq id of token
		));

		$key = self::get_secret_key();
		
		$jwt = \JWT::encode($token, $key, self::$jwt_alg);
		return $jwt;
	}

	public static function pwd_token($lookup){
		/**
		 *
		 * Returns an access token that is only valid until the password is changed.
		 *
		 *   $access_token = Auth::pwd_token(["person_id"=>15]);
		 *
		 *   $access_token = Auth::pwd_token(["username"=>"sjones"]);
		 *
		 *   $access_token = Auth::pwd_token(["email"=>"sjones@example.org"]);
		 *
		 */

		if(isset($lookup->person_id)){
			$db = Db::from('person', $lookup->person_id);
		} 
		elseif(isset($lookup->username) && $lookup->username){
			$db = Db::from('person', ["username"=>$lookup->username]);
		}
		elseif(isset($lookup->email)){
			$db = Db::from('person', ["email"=>$lookup->email]);
			if($db->rowCount() > 1){
				throw new UserError("Sorry, that email is associated with more than one account and therefore cannot be used for a password reset.");
			}
		}
		else{
			throw new SystemError("pwd_token(): lookup param did not contain a person_id, username, or email: ".print_r($lookup, true));
		}

		$person_info = $db->fetch();
		if($person_info==null){
			throw new UserError("Sorry, could not find a record with that username or email address. Please try another.");
		}

		$payload = [
			"person_id" => $person_info['person_id'],
			"email" => $person_info['email'],
			"ts" => time(),
		];
		$key = self::get_secret_key();
		$jwt = \JWT::encode($payload, $key, self::$jwt_alg);

		return $jwt;
	}

	public static function require_token($require_tag=null, $test_token=null){
		/**
		 *
		 * Checks the validity of the client-supplied token. Decodes it and returns the decoded (person info) payload.
		 *
		 * The $require_tag parameter can be used to require that the user have a specific tag. Admins are required via the '$admin' system tag.
		 *
		 *   $person_info = Auth::require_token();
		 *
		 *   $person_info = Auth::require_token('$admin');
		 *
		 */
		if($test_token === null){
			// Normal operation
			if(!isset($_SERVER['HTTP_AUTHORIZATION'])){
				throw new NotLoggedIn("You are not logged in.");
			}

			$header = $_SERVER['HTTP_AUTHORIZATION'];
			preg_match("/^Bearer (.*)$/", $header, $m);
			if(!isset($m[1])){
				throw new NotLoggedIn("You are not logged in.");
			}

			$token_str = $m[1];
		}
		else{
			// Testing operation
			$token_str = $test_token;
		}

		$person_info = self::decode_token($token_str);
		if($person_info === null){
			throw new NotLoggedIn("You are not logged in.");
		}

		if($require_tag){
			if(!self::psql_array_contains_tag($person_info->tags, $require_tag)){
				throw new NotAuthorized("You do not have the credentials required for this resource.");
			}
		}

		// everything looks good, return person_info
		return $person_info;
	}


	public static function psql_array_contains_tag($psql_array, $tag){
		/**
		 *
		 * Used internally to match specific tag in postgresql tags array.
		 *
		 */
		$psql_array = preg_replace('/^{/', '', $psql_array);
		$psql_array = preg_replace('/}$/', '', $psql_array);
		$tags = explode(",", $psql_array);
		return in_array($tag, $tags);
	}


	public static function decode_token($token){
		/**
		 *
		 * Used internally to get the payload from the token using the secret key.
		 *
		 */
		$key = self::get_secret_key();

		try{ 
			$payload = \JWT::decode($token, $key, [self::$jwt_alg]); 
		} catch(\Exception $e){ 
			return null; 
		}

		return $payload;
	}
}

