CREATE TRIGGER patients_audit AFTER INSERT ON patients BEGIN INSERT INTO audit(patient,action,after,at,actor) VALUES(NEW.id,'create_patient',json_object('center',NEW.center),NEW.created,NEW.actor); END;
--> statement-breakpoint
CREATE TRIGGER record_created AFTER INSERT ON records BEGIN INSERT INTO audit(patient,action,after,at,actor) VALUES(NEW.patient,'create_record:'||NEW.module||':'||NEW.slot,NEW.data,NEW.updated,NEW.actor); END;
--> statement-breakpoint
CREATE TRIGGER record_updated AFTER UPDATE ON records BEGIN INSERT INTO audit(patient,action,before,after,at,actor) VALUES(NEW.patient,'update_record:'||NEW.module||':'||NEW.slot,OLD.data,NEW.data,NEW.updated,NEW.actor); END;
--> statement-breakpoint
CREATE TRIGGER allocation_created AFTER INSERT ON allocations BEGIN INSERT INTO audit(patient,action,after,at,actor) VALUES(NEW.patient,'randomize',json_object('seq',NEW.seq,'arm',NEW.arm,'center',NEW.center,'stratum',NEW.stratum,'u',NEW.u,'scoreA',NEW.score_a,'scoreB',NEW.score_b,'probA',NEW.prob_a,'operator',NEW.operator,'inputs',NEW.inputs),NEW.at,NEW.actor); END;
--> statement-breakpoint
CREATE TRIGGER allocation_no_update BEFORE UPDATE ON allocations BEGIN SELECT RAISE(ABORT,'Allocation is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER allocation_no_delete BEFORE DELETE ON allocations BEGIN SELECT RAISE(ABORT,'Allocation is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'Audit is append-only'); END;
--> statement-breakpoint
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'Audit is append-only'); END;
--> statement-breakpoint
CREATE TRIGGER basis_lock BEFORE UPDATE ON records WHEN NEW.module IN ('screen','baseline','random') AND EXISTS(SELECT 1 FROM allocations WHERE patient=NEW.patient) BEGIN SELECT RAISE(ABORT,'Randomization basis is locked'); END;
--> statement-breakpoint
CREATE TRIGGER records_no_delete BEFORE DELETE ON records BEGIN SELECT RAISE(ABORT,'Records cannot be deleted'); END;
