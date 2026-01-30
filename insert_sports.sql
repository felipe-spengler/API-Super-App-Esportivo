-- Inserção de Modalidades Esportivas
-- Rode este comando no seu banco de dados (phpMyAdmin ou terminal)

INSERT INTO `sports` (`name`, `slug`, `category_type`, `icon_name`, `created_at`, `updated_at`) VALUES
('Futsal', 'futsal', 'team', 'goal', NOW(), NOW()),
('Futebol 7', 'futebol-7', 'team', 'soccer', NOW(), NOW()),
('Basquete', 'basquete', 'team', 'basketball', NOW(), NOW()),
('Handebol', 'handebol', 'team', 'activity', NOW(), NOW()),
('Vôlei de Praia', 'volei-de-praia', 'team', 'volleyball', NOW(), NOW()),
('Futevôlei', 'futevolei', 'duo', 'volleyball', NOW(), NOW()),
('Beach Tennis', 'beach-tennis', 'duo', 'sun', NOW(), NOW()),
('Tênis de Mesa', 'tenis-de-mesa', 'individual', 'circle', NOW(), NOW()),
('Jiu-Jitsu', 'jiu-jitsu', 'combat', 'award', NOW(), NOW()),
('Judô', 'judo', 'combat', 'award', NOW(), NOW()),
('Boxe', 'boxe', 'combat', 'award', NOW(), NOW()),
('Muay Thai', 'muay-thai', 'combat', 'award', NOW(), NOW()),
('Corrida de Rua', 'corrida-de-rua', 'racing', 'fast-forward', NOW(), NOW()),
('Ciclismo', 'ciclismo', 'racing', 'bike', NOW(), NOW()),
('Natação', 'natacao', 'racing', 'waves', NOW(), NOW()),
('Triathlon', 'triathlon', 'racing', 'zap', NOW(), NOW());

-- Verificando os existentes para evitar duplicatas (caso já tenha inserido algum):
-- Futebol (ID 1), Vôlei (ID 2), Corrida (ID 3), Tênis (ID 4) já existem.
