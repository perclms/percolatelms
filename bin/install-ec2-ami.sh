#!/bin/bash

# Install LMS to fresh instance of Amazon Linux AMI on EC2
# 
# To use this script to install Percolate, you'll first need to 
# get git and the Percolate repo.  
#
# Create the EC2 instance and then:
# 
#	sudo yum update
#	sudo yum install -y git
#	sudo mkdir /lms
#	sudo chown ec2-user /lms
#	git clone https://github.com/perclms/percolatelms.git /lms
#
# Then put the LMS config file in place and edit it to your liking:
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

set -e    # exit if a command fails
set -u    # trying to expand unset vars is an error!

die () { echo -e "\033[30;41mERROR\033[0;0m $1"; exit 1; }
note () { echo -e "\n\n\t\033[30;46m$1\033[0;0m"; }

[[ $(id -u) != 0 ]] && die "Must be run with super privileges (try sudo)."

read -p "Install LMS (destructively) to a fresh EC2 AMI instance? (y/N)" ans
[[ "$ans" != 'y' ]] && exit



note "Installing Apache, PostgreSQL, PHP..."

yum install -y \
	httpd24 \
	php56 \
	php56-gd \
	postgresql96 \
	postgresql96-server \
	php-ZendFramework-Db-Adapter-Pdo-Pgsql


note "Setting up Apache"

hconf=/etc/httpd/conf/httpd.conf
mv $hconf $hconf.bak
cat > $hconf << 'EOF'
ServerRoot "/etc/httpd"
Listen 80
Include conf.modules.d/*.conf
User apache
Group apache
ServerAdmin root@localhost

<Directory />
    AllowOverride none
    Require all denied
</Directory>

DocumentRoot "/lms/src"

<VirtualHost *:80>
	DocumentRoot "/lms/src"
	ServerName ec2-xxx.us-west-2.compute.amazonaws.com
</VirtualHost>

<Directory "/lms/src">
	Require all granted
	RewriteEngine On
	RewriteBase /
	RewriteCond %{REQUEST_FILENAME}     !-f
	RewriteRule "^api/(.+)$" "/api/index.php/$1" [PT,QSA,L]
	SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
</Directory>

<IfModule dir_module>
    DirectoryIndex index.html
</IfModule>

ErrorLog "logs/error_log"
LogLevel warn

<IfModule mime_module>
    TypesConfig /etc/mime.types
    AddType application/x-compress .Z
    AddType application/x-gzip .gz .tgz
</IfModule>

AddDefaultCharset UTF-8

<IfModule mime_magic_module>
    MIMEMagicFile conf/magic
</IfModule>

EnableSendfile on

# Supplemental configuration - retained from AMI package default
IncludeOptional conf.d/*.conf
EOF

# set start runlevels
chkconfig --levels 235 httpd on
chkconfig --list httpd
# start it!
service httpd start




note "Setting up PostgreSQL"

# set start runlevels
chkconfig --levels 235 postgresql96 on
chkconfig --list postgresql96
# create cluster
service postgresql96 initdb
# setup authentication methods
pg_hba=/var/lib/pgsql96/data/pg_hba.conf
mv $pg_hba $pg_hba.bak
cat > $pg_hba << 'EOF'
local   all  postgres     peer
local   lms  master       md5
EOF
# start it!
service postgresql96 start




note "Creating LMS database..."

sudo -iu postgres psql -f /lms/db/master.sql
echo "Let's set the LMS DB 'master' role password (should match 'master_role_pwd' in /etc/lms.json)."
read -s -p "Master pwd: " masterpwd
echo ""
sudo -iu postgres psql -c "ALTER USER master with password '$masterpwd';"
echo "LMS database and master role created:"
PGPASSWORD=$masterpwd psql -U master -d lms -c "\dt"




note "Setting up LMS log file"

touch /var/log/lms
chown ec2-user /var/log/lms
chgrp apache /var/log/lms



note "Getting LMS PHP dependencies (with Composer)"

curl -sS https://getcomposer.org/installer | sudo php
mv composer.phar /usr/local/bin/composer
ln -s /usr/local/bin/composer /usr/bin/composer
pushd /lms/src/api
composer update
popd


note "Setting up PHP"

s="s/^;date.timezone.*/date.timezone = UTC/"
s="$s;s/^;always_populate_raw_post_data/always_populate_raw_post_data/"
sed -i.bak "$s" /etc/php.ini




echo ""
echo "Done.  Try creating a tenant with:"
echo "php /lms/bin/new-tenant.php YOUR_PUBLIC_DOMAIN.amazonaws.com"
echo ""

