-- Lets an initiative carry a longer-form description and a triage priority, shown on
-- the Initiatives list so the important ones surface without opening each one.

ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS priority varchar(16) NOT NULL DEFAULT 'MEDIUM';
