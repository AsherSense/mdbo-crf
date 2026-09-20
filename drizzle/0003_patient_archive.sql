CREATE TABLE `patient_archives` (
  `patient` text PRIMARY KEY NOT NULL REFERENCES `patients`(`id`),
  `archived_at` text NOT NULL,
  `actor` text NOT NULL
);

CREATE TRIGGER patient_archived AFTER INSERT ON patient_archives BEGIN
  INSERT INTO audit(patient,action,after,at,actor) VALUES(NEW.patient,'archive_patient',json_object('archived',1),NEW.archived_at,NEW.actor);
END;

CREATE TRIGGER patient_restored AFTER DELETE ON patient_archives BEGIN
  INSERT INTO audit(patient,action,before,after,at,actor) VALUES(OLD.patient,'restore_patient',json_object('archived',1),json_object('archived',0),datetime('now'),OLD.actor);
END;
