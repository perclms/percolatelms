<?php

namespace Lms;

require_once('/lms/src/api/autoloaders.php');

if(count($argv) < 2) {
	die("Please give a (fully-qualified) hostname as the first argument.\n");
}
$hostname = $argv[1];
if(!preg_match('/.+\..+/',$hostname)) {
	die("'$hostname' doesn't look like a FULLY QUALIFIED hostname ([bar.]foo.tld)\n");
}

//echo "Creating db schema for host $hostname...\n";
$pdo = Db::getMasterPdo();
try {
	$tid = Tenants::getTenantIdForHost($hostname);
} catch (UserError $e) {
	// Good! That's what we want!
}
if ($tid) {
	die("Sorry, hostname '$hostname' taken by tenant (id '$tid').\n");
}	
// and thus!
$newtid = Tenants::create("admin", "1234", $hostname);

echo "Done: host=$hostname, tenant_id=$newtid\n";

