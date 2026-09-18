-- Parent linkage for imported issues.
--
-- A Jira subtask (or any issue with a parent) records its parent's key here, so the
-- decision timeline can group a source under the ticket it belongs to. Nullable: most
-- sources (standalone tickets, commits, hand-entered docs) have no parent.

ALTER TABLE sources ADD COLUMN IF NOT EXISTS parent_ref varchar(255);
