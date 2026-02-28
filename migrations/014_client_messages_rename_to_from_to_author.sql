-- Rename to_from to author on client_messages.
-- Author: for sent messages = who sent it (e.g. team member); for received = client name.

ALTER TABLE client_messages RENAME COLUMN to_from TO author;
