ALTER TABLE tickets_dev ADD COLUMN prazo INTEGER;
ALTER TABLE tickets_dev ADD COLUMN ordem REAL NOT NULL DEFAULT 0;

CREATE INDEX idx_tickets_ordem ON tickets_dev (status, ordem);
