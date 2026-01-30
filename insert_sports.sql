-- Inserção de Modalidades Esportivas
-- Rode este comando no seu banco de dados (phpMyAdmin ou terminal)

INSERT INTO `sports` (`name`, `slug`, `category_type`, `icon_name`, `created_at`, `updated_at`) VALUES
('Futsal', 'futsal', 'team', 'goal', NOW(), NOW()),
('Basquete', 'basquete', 'team', 'basketball', NOW(), NOW()),
('Handebol', 'handebol', 'team', 'activity', NOW(), NOW()),
('Futebol 7', 'futebol-7', 'team', 'soccer', NOW(), NOW()),
('Futevôlei', 'futevolei', 'duo', 'volleyball', NOW(), NOW()),
('Beach Tennis', 'beach-tennis', 'duo', 'sun', NOW(), NOW()),
('Tênis de Mesa', 'tenis-de-mesa', 'individual', 'circle', NOW(), NOW()),
('Lutas', 'lutas', 'combat', 'swords', NOW(), NOW());

-- Verificando os existentes para evitar duplicatas (caso já tenha inserido algum):
-- Futebol (ID 1), Vôlei (ID 2), Corrida (ID 3), Tênis (ID 4) já existem.
