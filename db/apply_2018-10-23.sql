-- to run, log into the 'lms' database with psql and execute
-- with the '\i' command like so:
--
--   lms=> \i db/apply_example.sql
--
DO $$
DECLARE
	_tid int;
BEGIN
	SET ROLE master;
	FOR _tid IN SELECT tenant_id FROM tenant
	LOOP
		RAISE NOTICE 'Upgrading tenant%...', _tid;
		EXECUTE 'SET ROLE tenant' || _tid;
		-- ----------------------------------------
		--        YOUR STATEMENTS HERE
		-- ----------------------------------------
		ALTER TABLE person ADD COLUMN last_login TIMESTAMP;
		DROP VIEW person_full_v;
		CREATE VIEW person_full_v AS 
			SELECT person_id, name, username, email, info, thumb_file_id, thumb_fname, 
			array_to_string(tags, ',') as tags, created, last_login FROM person;
		-- ----------------------------------------
		-- ----------------------------------------
	END LOOP;
	RAISE NOTICE 'Done';
END$$;

