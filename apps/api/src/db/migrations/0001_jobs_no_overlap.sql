-- Prevent overlapping jobs for the same technician.
-- Requires the btree_gist extension (created by docker-entrypoint init SQL).
ALTER TABLE "jobs"
  ADD CONSTRAINT "jobs_no_overlap"
  EXCLUDE USING gist (
    "technician_id" WITH =,
    tstzrange("start_time", "end_time") WITH &&
  );
