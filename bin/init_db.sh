#!/usr/bin/env bash

set -e


die () {
	echo -e "\033[30;41mError: $1\033[0;0m"
	exit 1
}

# require root user
if [[ $(id -u) != 0 ]]; then
    die "This must be run by the root user."
fi


lmsconf () {
	grep $1 /etc/lms.conf | cut -d'=' -f 2
}

if su - postgres -c "psql password=$db_pwd -c \"SELECT 'exists' FROM pg_database WHERE datname='lms'\"" | grep exists
then
	echo "Database 'lms' already created in this postgres db cluster."
else

	db_pwd=$(lmsconf db pg_superuser_pwd)

	# creates 'lms' database, 'master' user, and 'master' schema
	# master has password "temp_password" from the .sql commands
	echo "Running master.sql..."
	su - postgres -c "psql password=$db_pwd -f /lms/db/master.sql"

	# set 'master' user password
	echo "Setting master password..."
	master_pwd=$(lmsconf db_master_pwd)
	su - postgres -c "psql password=$db_pwd -c \"ALTER USER master WITH PASSWORD '$master_pwd';\""

	echo "LMS database created.  This does not create a tenant."

fi




