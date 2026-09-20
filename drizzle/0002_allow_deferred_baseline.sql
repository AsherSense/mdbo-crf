DROP TRIGGER IF EXISTS basis_lock;
--> statement-breakpoint
CREATE TRIGGER random_basis_lock BEFORE UPDATE ON records WHEN (NEW.module = 'random' OR OLD.module = 'random') AND EXISTS(SELECT 1 FROM allocations WHERE patient=OLD.patient) BEGIN SELECT RAISE(ABORT,'Randomization confirmation is locked'); END;
