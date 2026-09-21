-- The points ledger is append-only. The application has no code path that updates a
-- transaction; this makes the database refuse one too, so a historical transaction cannot be
-- edited by a bug, a script or a hand-typed statement. DELETE is deliberately still allowed:
-- rows leave only with their user (ON DELETE CASCADE, for the later account-deletion work).
CREATE FUNCTION "point_transactions_reject_update"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'point_transactions rows are immutable' USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "point_transactions_immutable"
BEFORE UPDATE ON "point_transactions"
FOR EACH ROW EXECUTE FUNCTION "point_transactions_reject_update"();
