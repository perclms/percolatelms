-- Percolate LMS
--
-- Copyright (C) 2018 Michaels & Associates Docntrain, Ltd.
--
-- This program is free software: you can redistribute it and/or modify it under
-- the terms of the GNU General Public License as published by the Free Software
-- Foundation, either version 3 of the License, or (at your option) any later
-- version.
--
-- This program is distributed in the hope that it will be useful, but WITHOUT
-- ANY WARRANTY; without even the implied warranty of  MERCHANTABILITY or FITNESS
-- FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
--
-- You should have received a copy of the GNU General Public License along with
-- this program.  If not, see <http://www.gnu.org/licenses/>.
--






-- This script needs to be run as the 'postgres' superuser 



--
-- Create the 'lms' database
--

CREATE DATABASE lms;

-- use psql command \connect to switch to our new database

\connect lms;



--
-- Create 'master' role
-- Note the temporary password which will be changed
-- to either a dev or production password
-- after this script is run during provisioning.
--

CREATE ROLE master WITH LOGIN CREATEROLE PASSWORD 'temp-password';
GRANT CREATE ON DATABASE lms TO master;




--
-- Create the 'master' schema

CREATE SCHEMA master AUTHORIZATION master;



-- Switch to that role so that permissions for the tables will be given to it(?)
SET ROLE master;



-- Tenants table
-- Each tenant corresponds with a schema and a user
-- named "tenant<tenants.id>"
-- Note the 

CREATE TABLE master.tenant (
	tenant_id SERIAL PRIMARY KEY
);


-- Hosts table
-- Allows multiple domain/subdomain names which 
-- resolve to a particular tenant.
-- Note the UNIQUE constraint on the host field.

CREATE TABLE master.host (
	host_id SERIAL PRIMARY KEY,
	tenant_id INTEGER REFERENCES tenant ON DELETE CASCADE,
	hostname TEXT UNIQUE
);


