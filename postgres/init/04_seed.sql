-- Mot de passe par défaut : admin123 (hash bcrypt)
INSERT INTO users (email, name, role, password_hash, active) 
VALUES (
  'admin@vermeg.com', 
  'Administrateur Système', 
  'admin', 
  '$2a$10$8K1p/a06NV76BGr9Oq6p9e5.U1.rXU6l7uMh3G8i4tN5P/Z6.Y4W.', 
  true
) ON CONFLICT (email) DO NOTHING;

-- Ajout de quelques logs fictifs pour peupler le dashboard
INSERT INTO base_event (source_doc_id, event_timestamp, application_name, application_key, application_group, log_family, event_type, parse_status, parse_confidence)
VALUES ('seed-1', NOW(), 'MegaCash', 'megacash', 'finance', 'lifecycle', 'start', 'success', '1.0');