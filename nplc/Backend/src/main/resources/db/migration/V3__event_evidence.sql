-- Evidence provenance for extracted events.
--
-- The product's core rule is that no claim exists without the source text it came from.
-- Extraction (LLM) must therefore attach, to every event it creates, the exact snippet of
-- the source that justifies it. Nullable because events created by hand through
-- POST /events or /decisions carry no extracted snippet.

ALTER TABLE events ADD COLUMN IF NOT EXISTS evidence text;
