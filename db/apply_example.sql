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
	END LOOP;
	RAISE NOTICE 'Done';
END$$;

