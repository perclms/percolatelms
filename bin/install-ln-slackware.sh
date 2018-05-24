#!/usr/bin/env bash

# Install LMS to fresh instance of Slackware Linux 14.2
#
# NOTE: This was last used in 2017 and is specific to the Slackware
# image provided by Linode, which has a limited set of packages installed.
#
# You will almost certainly want to review this script carefully
# and tailor it for your purposes.
# 
# After installing git (if needed) and cloning the LMS repo:
#
#	sudo cp /lms/lms.json.example /etc/lms.json
#	sudo vim /etc/lms.json
#
# Don't forget to set proper permissions for /etc/lms.json
# The LMS (as user/group: apache/apache) needs read permission.
#
# Note: if you will NOT be using AWS services (S3, SES),
# you'll want to remove aws-sdk-php from 
#    /lms/src/api/composer.json
# to avoid a somewhat hefty download of the PHP SDK.
#
# Copyright 2018 Michaels & Associates Docntrain, Ltd.


set -e

pushd /tmp

die () { echo -e "\033[30;41mError: $1\033[0;0m"; exit 1; }
header () { echo ""; echo -e "\033[30;46m$1\033[0;0m" }
lmsconf () { perl -MJSON -n000e "print decode_json(\$_)->{$1}{$2}" /etc/lms.json }


slackpkg_install () {
	if [ -f "/var/log/packages/$1" ]
	then
		echo "$1 already installed. Skipping..."
	else
		echo "Installing package $1 with slackpkg..."
		OPTIONS='-batch=on -default_answer=y install'
		if ! slackpkg $OPTIONS $1
		then
			die "Could not install package '$1'"
		fi
	fi

	# double-check it!
	if ! [ -f "/var/log/packages/$1" ]
	then
		die "Package '$1' was NOT installed."
	fi
}


sbopkg_install () {
	if [ -f "/var/log/packages/$2" ]
	then
		echo "$1 already installed. Skipping..."
	else
		echo "Installing SBo package $1 with sbopkg..."
		if ! sbopkg -B -i $1
		then 
			die "Could not install SBo package '$1'"
		fi
	fi

	# double-check it!
	if ! [ -f "/var/log/packages/$2" ]
	then
		die "SBo package '$2' was NOT installed."
	fi
}


swap () {
	# $1 - file to change
	# $2 - original line
	# $3 - new line
	# NOTE: since paths with '/' might be used, changing
	# delimeter to '|'
	if ! [ -f $1 ]
	then
		die "swap(): Cannot find file for alteration: $1"
	fi
	sed -i "s|^$2$|$3|" $1
	if ! grep "$3" $1 >/dev/null
	then
		die "swap(): Cannot continue until line $3 is in $1"
	fi
}




echo -e "\033[30;45m******************** Slackware Setup Start ********************\033[0;0m"


# require root user
if [[ $(id -u) != 0 ]]; then
    die "This must be run by the root user."
fi


header "Checking hostname"

echo "Note: if this process ever fails or needs to be undone, you can restore the original hostname and hosts file like so:"
echo ""
echo "  cp /etc/hosts.orig /etc/hosts"
echo "  cp /etc/HOSTNAME.orig /etc/HOSTNAME"
echo "  hostname -F /etc/HOSTNAME"
echo ""
echo "The key thing is that the HOSTNAME also be found in etc/hosts"
echo ""

OLDFQDN=$(hostname -s)
if [ "$OLDFQDN"  == "darkstar" ]
then
	echo "Hostname does not appear to be set. Let's setup /etc/hostname and /etc/hosts."

	echo "Attempting to get external IP address..."
	EXTERNAL_IP=$(curl ipecho.net/plain)
	if [ $? -ne 0 ]
	then
		die "Could not get IP address from web service ipecho.net. Might need to use a different service?"
	fi
	if echo $EXTERNAL_IP | grep -P "^(\d{1,3}\.?){4}$"
	then
		echo "IP address looks good: $EXTERNAL_IP"
	else
		die "IP address retrieved from service ipecho.net doesn't look right: '$EXTERNAL_IP'."
	fi

	echo "Enter a fully qualified domain name below such as 'dev1.perclms.com'."
	read -p "fqdn: " FQDN

	echo "Backing up /etc/HOSTNAME to /etc/HOSTNAME.orig"
	mv /etc/HOSTNAME /etc/HOSTNAME.orig

	echo "Writing to /etc/HOSTNAME and setting it..."
	echo $FQDN > /etc/HOSTNAME
	hostname -F /etc/HOSTNAME

	echo "Backing up /etc/hosts to /etc/hosts.orig..."
	mv /etc/hosts /etc/hosts.orig

	echo "Writing new /etc/hosts..."
	printf "127.0.0.1    $FQDN    $NEWHOST    localhost\n$EXTERNAL_IP    $FQDN\n" > /etc/hosts
	echo "New contents of /etc/hosts:"
	cat /etc/hosts

	echo "Testing hostname..."
	NEWFQDN=$(hostname -f)
	if [ "$NEWFQDN" == "$FQDN" ]
	then
		echo "Hostname has been set to $FQDN."
	else
		die "Could not set hostname to $FQDN."
	fi
	NEWHOST=$(hostname -s)
else
	echo "Hostname already set to $OLDFQDN."
fi



header "Checking /etc/lms.json config file"

if ! [ -f /etc/lms.json ]
then
	die "Could not find /etc/lms.json. You'll need to put one there first.  See lms.json.template (in LMS repo) for an example."
else
	echo "lms.json exists"
fi


header "Checking postgres user account"

if ! id -u postgres 2>&1 >/dev/null
then
	echo "Creating postgres user account..."
	# create group and user (linux 'postgres' user has no password)
	groupadd -g 209 postgres
	useradd -u 209 -g 209 -d /var/lib/pgsql postgres
else
	echo "User 'postgres' already exists, skipping creation..."
fi



header "Preparing slackpkg tool"

if [ -f "/etc/slackpkg/setupdone" ]
then 
	echo 'Already performed by setup, skipping. Feel free to run 'slackpkg update' manually.'
else
	echo "Doing slackpkg update..."
	if ! slackpkg -batch=on -default_answer=y update
	then
		die "slackpkg update failed"
	fi
	touch /etc/slackpkg/setupdone

	echo "Also checking for upgrades to existing packages..."
	slackpkg upgrade-all
fi

header "Installing official distro packages"

slackpkg_install perl-5.22.2-x86_64-1 # for postgres and parsing lms.conf
slackpkg_install python-2.7.13-x86_64-2_slack14.2 # for mercurial and postgres
slackpkg_install mercurial-3.8.2-x86_64-1
slackpkg_install sqlite-3.13.0-x86_64-1 # for httpd
slackpkg_install httpd-2.4.25-x86_64-1_slack14.2
slackpkg_install libX11-1.6.4-x86_64-1_slack14.2 # for php/gd image manipulation
slackpkg_install libXpm-3.5.11-x86_64-2 # for php/gd
slackpkg_install libvpx-1.5.0-x86_64-1 # for php/gd
slackpkg_install freetype-2.6.3-x86_64-1 # for php/gd
slackpkg_install libxcb-1.11.1-x86_64-1 # for php/gd
slackpkg_install libXau-1.0.8-x86_64-2 # for php/gd
slackpkg_install libXdmcp-1.1.2-x86_64-2 # for php/gd
slackpkg_install harfbuzz-1.2.7-x86_64-1 # for php/gd
slackpkg_install php-5.6.30-x86_64-1_slack14.2


header "Installing and preparing sbopkg tool"

SBOPKG="sbopkg-0.38.1-noarch-1_wsr"
SBOPKG_FILE="$SBOPKG.tgz"
SBOPKG_VER="0.38.1"
if [ -f "/var/log/packages/$SBOPKG" ]
then
	echo "$SBOPKG already installed. Skipping..."
else
	echo "Installing sbopkg ($SBOPKG)..."
	wget "https://github.com/sbopkg/sbopkg/releases/download/$SBOPKG_VER/$SBOPKG_FILE" 
	installpkg $SBOPKG_FILE
	echo "Syncing sbopkg repo..."
	sbopkg -r
fi




header "Installing slackbuilds.org packages"

sbopkg_install postgresql postgresql-9.6.0-x86_64-1_SBo
sbopkg_install php-pgsql php-pgsql-5.6.24-x86_64-1_SBo


header "Checking httpd settings"

echo "Uncommenting mod_php include..."
swap /etc/httpd/httpd.conf \
	'#Include /etc/httpd/mod_php.conf' \
	'Include /etc/httpd/mod_php.conf'

echo "Removing Indexes (directory browsing) option..."
swap /etc/httpd/httpd.conf \
	'    Options Indexes FollowSymLinks' \
	'    Options FollowSymLinks'



header "Checking php settings"

echo "Uncommenting pdo_pgsql module extension..."
swap /etc/php.d/pdo_pgsql.ini \
	'; extension=pdo_pgsql.so' \
	'extension=pdo_pgsql.so'


echo "Uncommenting pgsql module extension..."
swap /etc/php.d/pgsql.ini \
	'; extension=pgsql.so' \
	'extension=pgsql.so'

echo "Setting PHP timezone to UTC..."
sed -i "/;date.timezone/ s/.*/date.timezone = UTC/" /etc/php.ini
echo "Setting PHP raw_post_data to no..."
sed -i "/;always_populate_raw_post_data/ s/.*/always_populate_raw_post_data = -1/" /etc/php.ini
echo "Setting PHP max upload size"
sed -i "/^upload_max_filesize/ s/.*/upload_max_filesize = 5G/" /etc/php.ini
sed -i "/^post_max_size/ s/.*/post_max_size = 5G/" /etc/php.ini
sed -i "/^memory_limit/ s/.*/memory_limit = 5G/" /etc/php.ini



header "Setting postgres and apache to start on boot"

chmod +x /etc/rc.d/rc.httpd
chmod +x /etc/rc.d/rc.postgresql
echo "Done."


header "Installing Perl JSON module via CPAN"
if perl -MJSON -e 1 >/dev/null 2>/dev/null
then
	echo "JSON module already installed."
else
	export PERL_MM_USE_DEFAULT=1 # answers "yes" to CPAN questions
	cpan install JSON
fi


DB_PWD=$(lmsconf db pg_superuser_pwd)

header "Setting up postgres"

export PGDATA="/var/lib/pgsql/9.6/data"
if [ -f "$PGDATA/PG_VERSION" ]
then
	echo "Database cluster already created at $PGDATA. Skipping initdb."
	echo "    To re-create completely, something like this should work:"
	echo "        /etc/rc.d/rc.postgresql stop"
	echo "        rm -rf $PGDATA"
	echo "    and then run this script again."
else
	echo "Running 'initdb' to create database cluster at $PGDATA..."
	# init db using 'postgres' user
	# -A md5 (hashed password)
	# --pwfile (gets password from first line of file)
	# We create a temporary file to house the password and then remove it
	echo $DB_PWD > /tmp/pgpw.txt
	cat /tmp/pgpw.txt
	INITDB_CMD="initdb --locale=en_US.UTF-8 -A md5 --pwfile=/tmp/pgpw.txt"
	if ! su postgres -c "$INITDB_CMD"
	then
		die "initdb failed"
	fi
	rm /tmp/pgpw.txt
fi



header "Starting db and webserver"

if [ -r /var/lib/pgsql/9.6/data/postmaster.pid ]
then
	echo "Postgres already running."
else
	echo "Starting postgres..."
	/etc/rc.d/rc.postgresql start
fi

if ps ax | grep -v grep | grep httpd > /dev/null
then
	echo "Apache already running."
else
	echo "Starting Apache..."
	/etc/rc.d/rc.httpd start
fi


header "Installing composer"

if [ -f /bin/composer ]
then
	echo "Composer already installed. Skipping..."
else
	echo "Getting and installing composer..."
	# note: getting specific version because newer requires some
	# specific PHP modules not in my version of PHP
	wget https://getcomposer.org/download/1.2.0/composer.phar
	chmod a+x composer.phar
	mv composer.phar /bin/composer
fi



header "Testing apache and php"
HTDOCS=$(/usr/sbin/apachectl -S | sed -n 's/Main DocumentRoot: "\(.*\)"/\1/ p')
echo "Apache htdocs are at $HTDOCS"

TESTPHP="$HTDOCS/temporary_check.php"
echo "<?php phpinfo();" >> $TESTPHP
if curl http://localhost/temporary_check.php | grep pgsql
then
	echo "For what it's worth, pgsql is mentioned in phpinfo()"
else
	die "Hmmm... pgsql was not mentioned in phpinfo() or something else is not yet hooked up"
fi

rm $TESTPHP


header "Setting up lms database on PostgreSQL"

if su - postgres -c "psql password=1234 -c \"SELECT 'exists' FROM pg_database WHERE datname='lms'\"" | grep exists
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
	master_pwd=$(lmsconf db master_role_pwd)
	su - postgres -c "psql password=$db_pwd -c \"ALTER USER master WITH PASSWORD '$master_pwd';\""

	echo "LMS database created.  This does not create a tenant."

fi



header "Setting up Apache virtual host for lms"

# NOTE: this is the part of the script most likely to need
# individual attention.

# Directives such as the following will be needed to serve
# the LMS UI files and PHP API:

# <VirtualHost *:80>
#    DocumentRoot "/lms/src"
#    ServerName tenant1.example.com
#</VirtualHost>
#<Directory "/lms/src">
#    Require all granted
#    RewriteEngine On
#    RewriteBase /
#    RewriteCond %{REQUEST_FILENAME}     !-f
#    RewriteRule "^api/(.+)$" "/api/index.php/$1" [PT,QSA,L]
#    SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
#</Directory>


# This may be useful:

#HTCONF=/etc/httpd/httpd.conf

# put our virtual host config for apache
#sed -i '/httpd-vhosts.conf/ s/^#//' $HTCONF

# include rewrite_module
#sed -i '/LoadModule rewrite_module/ s/^#//' $HTCONF


header "Creating LMS log"

mkdir /var/log/lms
touch /var/log/lms/log.txt
chown -R :lmsadmin /var/log/lms
# you'll want to lock down permissions after installation:
chmod 666 /var/log/lms/log.txt

header "Getting LMS PHP dependencies (with Composer)"

pushd /lms/src/api
composer update
popd

echo -e "\033[30;42m*** Done ***\033[0;0m"


popd
