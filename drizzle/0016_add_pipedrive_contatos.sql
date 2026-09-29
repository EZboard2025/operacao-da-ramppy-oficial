-- Controle do envio de cada contato pro Pipedrive.
-- pipedrive_status: pendente | enviado | erro | desligado
ALTER TABLE contatos_evento ADD COLUMN pipedrive_deal_id TEXT NOT NULL DEFAULT '';
ALTER TABLE contatos_evento ADD COLUMN pipedrive_status TEXT NOT NULL DEFAULT 'pendente';
ALTER TABLE contatos_evento ADD COLUMN pipedrive_erro TEXT NOT NULL DEFAULT '';
