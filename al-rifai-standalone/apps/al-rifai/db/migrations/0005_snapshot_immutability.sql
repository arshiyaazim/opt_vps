CREATE FUNCTION alrifai_reject_snapshot_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Evidence snapshots are immutable'; END;
$$;
CREATE TRIGGER alrifai_snapshot_immutable BEFORE UPDATE OR DELETE ON site_source_snapshots FOR EACH ROW EXECUTE FUNCTION alrifai_reject_snapshot_change();
CREATE TRIGGER alrifai_snapshot_no_truncate BEFORE TRUNCATE ON site_source_snapshots FOR EACH STATEMENT EXECUTE FUNCTION alrifai_reject_snapshot_change();
