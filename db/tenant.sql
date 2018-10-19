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




-- This script is to be run as the 'master' user
-- AFTER the following actions:
--
-- INSERT INTO tenants (id) VALUES (DEFAULT) RETURNING id;
-- CREATE ROLE tenant<num> NOINHERIT;
-- GRANT tenant<num> TO master;
-- CREATE SCHEMA tenant<num> AUTHORIZATION tenant<num>;
-- SET ROLE tenant<num>;

-- From then on, access to this schema will be made by connecting
-- as the master user, but then immediately switching roles to the
-- tenant user's via:
-- SET ROLE tenant<num>;


--
-- Create Template Schema for Tenants
--

-- recommended data types
-- For     | Use    
-- id      | SERIAL  | 4 bytes  | up to 2 billion  (also use PRIMARY KEY)
-- number  | INTEGER | 4 bytes  | -2147483648 to +2147483647 
-- float   | REAL    | 4 bytes  | 6 decimal digits
-- boolean | BOOLEAN | 1 byte   | TRUE, FALSE, NULL
-- string  | TEXT    | 4+ bytes | unlimited (and is efficient for any strings!)
-- foreign | INTEGER | foreign key which references a serial primary key

-- naming and relational rules
-- table names are lower case and singular (person), underscores separate words
-- primary key is <tablename>_id

-- create views for common queries requiring aggregates or complicated joins


-- note: file author constraint added after person table created
CREATE TABLE file (
	file_id SERIAL PRIMARY KEY,
	author INTEGER, 
	upload_fname TEXT NOT NULL CHECK (upload_fname <> ''),
	launch_fname TEXT NOT NULL CHECK (launch_fname <> ''),
	purpose TEXT NOT NULL,
	size INTEGER NOT NULL DEFAULT 0
);

-- note: person.frozen column deprecated, use $frozen tag instead
CREATE TABLE person (
	person_id SERIAL PRIMARY KEY,
	name TEXT NOT NULL CHECK (name <> ''),
	username TEXT UNIQUE NOT NULL CHECK (username <> ''),
	email TEXT NOT NULL DEFAULT '',
	password TEXT NOT NULL DEFAULT '',
	info TEXT NOT NULL DEFAULT '',
	thumb_file_id INTEGER REFERENCES file,
	thumb_fname TEXT NOT NULL DEFAULT '',
	tags TEXT[],
	frozen BOOLEAN NOT NULL DEFAULT FALSE, 
	created TIMESTAMP NOT NULL DEFAULT current_timestamp
);
-- create author constraint for file table   
ALTER TABLE file ADD CONSTRAINT author_fk FOREIGN KEY (author) REFERENCES person (person_id);
-- only the vital display information
CREATE VIEW person_v AS 
	SELECT person_id, name, username, thumb_file_id, thumb_fname, array_to_string(tags, ',') as tags
	FROM person;
-- everything except password, file_id
CREATE VIEW person_full_v AS 
	SELECT person_id, name, username, email, info, thumb_file_id, thumb_fname, array_to_string(tags, ',') as tags, created
	FROM person;
CREATE TYPE content_type_enum AS ENUM (
	'scorm',
	'cb',
	'comment',
	'lpath',
	'session'
);

-- note: content.frozen column deprecated, use $frozen tag instead
CREATE TABLE content (
	content_id SERIAL PRIMARY KEY,
	author INTEGER REFERENCES person (person_id) ON DELETE CASCADE,
	title TEXT NOT NULL CHECK (title <> ''),
	description TEXT NOT NULL DEFAULT '',
	type content_type_enum NOT NULL,
	tags TEXT[],
	thumb_file_id INTEGER REFERENCES file,
	thumb_fname TEXT NOT NULL DEFAULT '',
	frozen BOOLEAN NOT NULL DEFAULT FALSE,
	hidden BOOLEAN NOT NULL DEFAULT FALSE,
	created TIMESTAMP NOT NULL DEFAULT current_timestamp
);
-- everything we want to view/edit
CREATE VIEW content_v AS 
	SELECT content_id, author, title, description, type, array_to_string(tags, ',') as tags, thumb_fname, thumb_file_id
	FROM content;

CREATE TABLE lpath_content (
	primary_content_id INTEGER REFERENCES content (content_id) ON DELETE CASCADE,
	content_id INTEGER REFERENCES content ON DELETE CASCADE,
	num_order INTEGER
);

-- get the contents for an lp (assuming a select from this view with an lp_id)
CREATE VIEW lpath_content_v as
	SELECT primary_content_id, content.* 
	FROM content 
	JOIN lpath_content using (content_id)
	ORDER BY lpath_content.num_order;

CREATE TABLE cb (
	content_id INTEGER REFERENCES content ON DELETE CASCADE,
	body TEXT NOT NULL DEFAULT '',
	PRIMARY KEY (content_id)
);

CREATE TABLE cb_record (
	content_id INTEGER REFERENCES cb ON DELETE CASCADE,
	person_id INTEGER REFERENCES person ON DELETE CASCADE,
	page_hash TEXT,
	answered_ts TIMESTAMP,
	answer TEXT,
	is_correct BOOLEAN,
	PRIMARY KEY (content_id, person_id, page_hash)
);


CREATE TABLE person_metatag (
	person_metatag_id SERIAL PRIMARY KEY,
	tag_name TEXT NOT NULL CHECK (tag_name <> ''),
	rule TEXT NOT NULL CHECK (rule <> '')
);

CREATE TABLE content_record (
	person_id INTEGER REFERENCES person ON DELETE CASCADE,
	content_id INTEGER REFERENCES content ON DELETE CASCADE,
	score REAL,
	passed BOOLEAN,
	failed BOOLEAN,
	completed BOOLEAN,
	started_ts TIMESTAMP,
	completed_ts TIMESTAMP,
	last_launched_ts TIMESTAMP,
	launch_count INTEGER NOT NULL DEFAULT 0,
	duration_sec INTEGER NOT NULL DEFAULT 0,
	frozen BOOLEAN NOT NULL DEFAULT FALSE,
	PRIMARY KEY (person_id, content_id)
);

CREATE VIEW crecord_v AS 
	SELECT 
		content.title,
		content_record.*,
		person.username,
		person.name
	FROM
		content_record
	LEFT JOIN content USING (content_id)
	LEFT JOIN person USING (person_id);

CREATE TABLE erule (
	erule_id SERIAL PRIMARY KEY,
	person_id INTEGER REFERENCES person ON DELETE CASCADE,
	content_id INTEGER REFERENCES content ON DELETE CASCADE,
	person_tag TEXT,
	content_tag TEXT
);

CREATE TABLE scorm_manifest (
	content_id INTEGER REFERENCES content ON DELETE CASCADE,
	key TEXT NOT NULL CHECK (key <> ''),
	value TEXT NOT NULL DEFAULT '',
	PRIMARY KEY (content_id, key)
);

CREATE TABLE scorm_record (
	content_id INTEGER REFERENCES content ON DELETE CASCADE,
	person_id INTEGER REFERENCES person ON DELETE CASCADE,
	key TEXT NOT NULL CHECK (key <> ''),
	value TEXT NOT NULL DEFAULT '',
	PRIMARY KEY (content_id, person_id, key)
);

CREATE TABLE config (
	config_id SERIAL PRIMARY KEY,
	value JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE comment (
  comment_id SERIAL PRIMARY KEY,
  content_id INTEGER REFERENCES content ON DELETE CASCADE,
  replies_to INTEGER REFERENCES comment,
  person_id INTEGER NOT NULL REFERENCES person ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  created TIMESTAMP NOT NULL DEFAULT current_timestamp,
  deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE content_session (
  content_id INTEGER REFERENCES content ON DELETE CASCADE,
  content_reference_id INTEGER REFERENCES content (content_id) ON DELETE CASCADE,
  instructor INTEGER REFERENCES person (person_id) ON DELETE SET NULL, 
  start_ts TIMESTAMP,
  end_ts TIMESTAMP,
  days_available INTEGER,
  price REAL,
  PRIMARY KEY (content_id)
);

-- -------------------------------------------------------
--                        updates
-- -------------------------------------------------------
-- 2018-08-14: added stylesheet file purpose
--   ALTER TYPE file_purpose_enum ADD VALUE 'stylesheet';
-- 2018-08-27: dropped enum for file purpose 
--   ALTER TABLE file ALTER COLUMN purpose TYPE text;
--   DROP TYPE file_purpose_enum;

