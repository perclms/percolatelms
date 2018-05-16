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

class Db{
	private static $pdo = null;
	private static $pdo_type = 'none';


	public static function getPdo(){
		/**
		 * Gets a PDO connection for the current tenant.
		 *
		 */
		if(self::$pdo && self::$pdo_type === 'tenant') return self::$pdo;

		$pdo = self::getMasterPdo();
		self::$pdo = $pdo;
		$tenant_id = Tenants::getTenantId();
		self::setRole($tenant_id);
		return self::$pdo;
	}

	public static function getMasterPdo(){
		/**
		 * Gets a PDO connection for the LMS master.
		 *
		 * Is used by Tenants::getTenantId() and also by getPdo() above.
		 *
		 */
		if(self::$pdo && !self::$pdo_type === 'master') return self::$pdo;

		$SECRET_DB_LMS_MASTER = Conf::read('db', 'master_role_pwd');

		self::$pdo = new \PDO("pgsql:dbname=lms user=master password={$SECRET_DB_LMS_MASTER}");
		self::$pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
		self::$pdo_type = 'master';
		return self::$pdo;
	}

	public static function setRole($tenant_id){
		/**
		 *
		 * Sets the role of the PDO connection to the specified tenant.
		 *
		 * Rarely used outside of Db internals.
		 *
		 */
		$pdo = self::getMasterPdo();
		$sql = "SET ROLE tenant{$tenant_id}";
		$pdo->exec($sql);
		self::$pdo_type = 'tenant';
		return $pdo;
	}

	public static function raw($sql, $params=null){
		/**
		 *
		 * Execute a raw query statement (with prepared parameters)
		 *
		 *   $db = Db::raw("UPDATE foo SET bar=:bar", [":bar"=>"something else"]);
		 *
		 * This calls PHP's PDO::prepare() with $sql and PDOStatement::execute() with $params, sets the FetchMode to FETCH_ASSOC, then returs the PDOStatement.
		 *
		 * All Db statement functions ultimately call raw().
		 *
		 */
		$pdo = self::getPdo();
		try {
			$q = $pdo->prepare($sql);
			$q->execute($params);
		} catch(\PDOException $e) {
			// violates UNIQUE constraint
			if ( $q->errorCode() == 23505) {
				throw new DbDuplicate("A record with this value already exists in the database. SQL: $sql, PARAMS: ".print_r($params, true));
			}
			// VIOLATES a check constraint (user-written constraint)
			if ( $q->errorCode() == 23514) {
				throw new SystemError("The submitted values violate a constraint, most likely contains a blank/empty value where there should be none.");
			}
			throw $e; // something else, rethrow
		}
		$q->setFetchMode(\PDO::FETCH_ASSOC);
		return $q;
	}

	public static function from($table, $where=null){
		/**
		 * 
		 * Performs a SELECT on the specified table with a given (optional) WHERE clause param.
		 *
		 *   $db = Db::from('foo', $foo_id);
		 *
		 * See where() below for more.
		 *
		 * Here is a simple complete example:
		 *
		 *   $db = Db::from('foo');
		 *   $server->addResponseData($db->fetchAll());
		 *
		 *
		 * Returns the PDOStatement object returned by the call to raw().  For quick reference, some methods of PDOStatement are:
		 *
		 *   $db->columnCount()     // number of columns in the result set
		 *        ...   rowCount()        // number of rows affected by the last statement
		 *        ...   debugDumpParams() // dump a prepared SQL command for debugging
		 *        ...   fetch()           // fetch the next row
		 *        ...   fetchAll()        // returns array of associative arrays for all rows
		 *        ...   fetchColumn()     // first column or specified by number
		 *        ...   fetchObject()     // get next row as an object
		 *
		 */
		return self::select("{$table}.*", $where);
	}

	public static function select($select, $where=null){
		/**
		 *
		 * Performs a SELECT for specific fields in any number of tables, automatically creating LEFT JOINs and USINGs as needed.
		 *
		 * Get a single column from a single table:
		 *
		 *   $db = Db::select("foo.name");
		 *
		 * Join two tables (by bar_id) and get two columns of info where foo.foo_id = $foo_id.
		 *
		 *   $db = Db::select(["foo.name", "bar.quantity"], $foo_id);
		 *
		 * The first table is used for ID matching when given an integer for the WHERE clause.
		 *
		 * You can, of course, use "foo.*" to get all columns in the foo table.
		 *
		 */
		$pdo = self::getPdo();
		$tables = [];

		if(!is_array($select)){ $select = [$select]; }

		// put together the select columns, check for tables to join
		foreach($select as $col){
			if(!preg_match('/(\w+)\.(\w+|\*)/', $col, $m)) {
				throw new SystemError("Db select() expected columns to be in <table>.<column> format. Bad column: '$col'");
			}
			if(!in_array($m[1], $tables)) $tables[] = $m[1];
		}
		$select = implode(', ', $select);

		$main_table = array_shift($tables);
		$sql = "SELECT {$select} FROM {$main_table}";

		foreach($tables as $j){
			$sql .= " LEFT JOIN {$j} USING ({$j}_id)";
		}
		$where_clause = self::where($where, $main_table);
		$sql.=$where_clause;
		return self::raw($sql);
	}

	public static function insert($table, $values, $returns_id=true){
		/**
		 * 
		 * Inserts the values into the table. Returns the auto-generated ID (unless disabled).
		 *
		 *   $new_foo_id = Db::insert('foo', ["name"=>"Wiggles", "qty"=>6]);
		 *
		 * If the table won't generate an ID, you must set parameter $returns_id to false
		 *
		 */
		$pdo = self::getPdo();
		$quoted_values = self::quoteValues($values);
		$cols = implode(', ', array_keys($quoted_values));
		$vals = implode(', ', $quoted_values);
		$returning = ($returns_id ? "RETURNING {$table}_id" : "");
		$sql = "INSERT INTO {$table} ({$cols}) VALUES ({$vals}) {$returning}";
		$result = self::raw($sql);

		if($returns_id){
			return $result->fetchColumn();
		}
		return null;
	}

	public static function upsert($table, $values, $where){
		/**
		 * 
		 * Inserts the values into the table OR updates existing based on WHERE.
		 *
		 *   $db = Db::upsert('foo', ["name"=>"Wiggles", "qty"=>6], ["id"=>7]);
		 *
		 * The values in the WHERE clause are inserted if there is not already
		 * a record which matches the constraint.
		 *
		 * The value(s) in the WHERE clause MUST be part of a unique constraint 
		 * (in short, they should be the column(s) of the primary key!)
		 *
		 */
		$pdo = self::getPdo();

		// combine the values and where arrays so that the where clause items
		// will be inserted if a row doesn't already exist to update
		$values = (array) $values;
		if(!is_array($where)){
			throw new SystemError("Db upsert($table) WHERE clause is required and must be an array of [key=>value]s.  Instead, is:".print_r($where, true));
		}
		$insert_values = array_merge($values, $where);
		$insert_values = self::quoteValues($insert_values);
		$cols = implode(', ', array_keys($insert_values));
		$vals = implode(', ', $insert_values);
		$where_cols = implode(', ', array_keys($where));
		$sql = "INSERT INTO {$table} ({$cols}) VALUES ({$vals}) ";
		$sql .= "ON CONFLICT ($where_cols) DO UPDATE SET";
		$pairs = [];
		foreach($values as $col => $val){
			$pairs[] = " $col=EXCLUDED.$col";
		}
		$sql .= implode(",", $pairs);

		$result = self::raw($sql);

		return null;
	}

	public static function update($table, $values, $where){
		/**
		 *
		 * Updates the values of a row or rows in the table.
		 *
		 *   $db = Db::update('foo', ["name"=>"Wiggles 2"], $foo_id);
		 *
		 * The WHERE clause is required!
		 *
		 */
		$pdo = self::getPdo();
		$sql = "UPDATE {$table} SET";
		$pairs = [];
		$quoted_values = self::quoteValues($values);
		foreach($quoted_values as $col => $val){
			array_push($pairs, " $col=$val");
		}
		$sql .= implode(",", $pairs);
		if($where === null || $where === ""){
			throw new SystemError("Db update($table) not given a WHERE clause.");
		}
		$where_clause = self::where($where, $table);
		$sql.=$where_clause;
		return self::raw($sql);
	}

	public static function delete($table, $where){
		/**
		 *
		 * Deletes a row or rows from the table.
		 *
		 *   $db = Db::delete('foo', $foo_id);
		 *
		 * As with update(), the WHERE clause is required!
		 *
		 */
		$pdo = self::getPdo();
		if(!$where){
			throw new SystemError("Db delete error: You must supply a where clause (second parameter). (table: $table)".print_r($where, true));
		}
		$sql = "DELETE FROM {$table}";
		$where_clause = self::where($where, $table);
		$sql.=$where_clause;
		return self::raw($sql);
	}

	public static function where($where, $table){
		/**
		 *
		 * Used internally to create WHERE clauses for all statements.
		 *
		 * A numeric value is always an ID in the form of "$table_id"
		 *
		 *   // $where=16, $table='foo'
		 *   // WHERE foo_id='16' 
		 *
		 * A string is used verbatim (you MUST sanitize this before sending to where()!)
		 *
		 *   // $where="name IS NULL"
		 *   // WHERE name IS NULL
		 *
		 * An array is used as key->value pairs (if there is more than one pair, they are joined with AND)
		 *
		 *   // $where=["qty"=>"16", "color"=>"blue"]  
		 *   // WHERE qty='16' AND color='blue'
		 *
		 * The value of each pair is automatically quoted.
		 *
		 */
		$pdo = self::getPdo();
		$sql="";
		if($where !== null) $sql.=" WHERE ";
		if(is_numeric($where)) return $sql.="{$table}_id='{$where}'";
		if(is_string($where)) return $sql.=$where;
		if(is_array($where)){
			$cond = [];
			$values = $where;
			$quoted_values = self::quoteValues($values);
			foreach ($quoted_values as $col => $val)
				$cond[] = "$col=$val";
			$sql .= implode(" AND ", $cond);
		}
		return $sql;
	}

	public static function quoteValues($values){
		/**
		 *
		 * Used internally to quote values in SQL statements. Uses the built-in database quoting mechanism.  Does not quote an all-caps 'DEFAULT'.
		 *
		 */
		$pdo = self::getPdo();
		if(is_object($values)) $values = (array) $values;
		$newvals = [];
		foreach($values as $col => $val){
			if(is_object($val) || is_array($val)){
				throw new SystemError("Db quoteValues() given bad values. Trace:".print_r(debug_backtrace(),true));
			}
			if($val != "DEFAULT"){
				$val = $pdo->quote($val);
			}
			$newvals[$col] = $val;
		}
		return $newvals;
	}
}
