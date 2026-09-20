DROP TRIGGER IF EXISTS allocation_no_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS audit_no_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS records_no_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS patient_restored;
--> statement-breakpoint
DELETE FROM patient_archives;
--> statement-breakpoint
DELETE FROM records;
--> statement-breakpoint
DELETE FROM allocations;
--> statement-breakpoint
DELETE FROM audit;
--> statement-breakpoint
DELETE FROM patients;
--> statement-breakpoint
DELETE FROM sqlite_sequence WHERE name='audit';
--> statement-breakpoint
CREATE TRIGGER allocation_no_delete BEFORE DELETE ON allocations BEGIN SELECT RAISE(ABORT,'Allocation is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'Audit is append-only'); END;
--> statement-breakpoint
CREATE TRIGGER records_no_delete BEFORE DELETE ON records BEGIN SELECT RAISE(ABORT,'Records cannot be deleted'); END;
--> statement-breakpoint
CREATE TRIGGER patient_restored AFTER DELETE ON patient_archives BEGIN
  INSERT INTO audit(patient,action,before,after,at,actor)
  VALUES(OLD.patient,'restore_patient',json_object('archived',1),json_object('archived',0),datetime('now'),OLD.actor);
END;
