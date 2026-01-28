-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: srv812.hstgr.io    Database: u179638245_toledao2025fim
-- ------------------------------------------------------
-- Server version	11.8.3-MariaDB-log

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `campeonatos`
--

DROP TABLE IF EXISTS `campeonatos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campeonatos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_esporte` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `descricao` text DEFAULT NULL,
  `data_inicio` date DEFAULT NULL,
  `data_fim` date DEFAULT NULL,
  `status` enum('Inscrições Abertas','Em Andamento','Finalizado') NOT NULL DEFAULT 'Inscrições Abertas',
  `tipo_chaveamento` enum('Mata-Mata','Pontos Corridos') NOT NULL,
  `data_criacao` timestamp NOT NULL DEFAULT current_timestamp(),
  `id_campeonato_pai` int(11) DEFAULT NULL,
  `id_melhor_jogador` int(11) DEFAULT NULL,
  `id_melhor_goleiro` int(11) DEFAULT NULL,
  `id_melhor_lateral` int(11) DEFAULT NULL,
  `id_melhor_meia` int(11) DEFAULT NULL,
  `id_melhor_atacante` int(11) DEFAULT NULL,
  `id_melhor_artilheiro` int(11) DEFAULT NULL,
  `id_melhor_assistencia` int(11) DEFAULT NULL,
  `id_melhor_volante` int(11) DEFAULT NULL,
  `id_melhor_estreante` int(11) DEFAULT NULL,
  `id_melhor_zagueiro` int(11) DEFAULT NULL,
  `id_foto_selecionada_melhor_jogador` int(11) DEFAULT NULL,
  `id_foto_selecionada_melhor_goleiro` int(11) DEFAULT NULL,
  `id_foto_selecionada_melhor_lateral` int(11) DEFAULT NULL,
  `id_foto_selecionada_melhor_meia` int(11) DEFAULT NULL,
  `id_foto_selecionada_melhor_atacante` int(11) DEFAULT NULL,
  `id_foto_selecionada_melhor_artilheiro` int(11) DEFAULT NULL,
  `id_foto_selecionada_melhor_assistencia` int(11) DEFAULT NULL,
  `id_foto_selecionada_melhor_volante` int(11) DEFAULT NULL,
  `id_foto_selecionada_melhor_estreante` int(11) DEFAULT NULL,
  `id_foto_selecionada_melhor_zagueiro` int(11) DEFAULT NULL,
  `id_craque` int(11) DEFAULT NULL,
  `id_foto_craque` int(11) DEFAULT NULL,
  `id_melhor_levantadora` int(11) DEFAULT NULL,
  `id_foto_melhor_levantadora` int(11) DEFAULT NULL,
  `id_melhor_libero` int(11) DEFAULT NULL,
  `id_foto_melhor_libero` int(11) DEFAULT NULL,
  `id_melhor_oposta` int(11) DEFAULT NULL,
  `id_foto_melhor_oposta` int(11) DEFAULT NULL,
  `id_melhor_ponteira` int(11) DEFAULT NULL,
  `id_foto_melhor_ponteira` int(11) DEFAULT NULL,
  `id_melhor_central` int(11) DEFAULT NULL,
  `id_foto_melhor_central` int(11) DEFAULT NULL,
  `id_maior_pontuador` int(11) DEFAULT NULL,
  `id_foto_maior_pontuador` int(11) DEFAULT NULL,
  `id_melhor_saque` int(11) DEFAULT NULL,
  `id_foto_melhor_saque` int(11) DEFAULT NULL,
  `id_melhor_bloqueio` int(11) DEFAULT NULL,
  `id_foto_melhor_bloqueio` int(11) DEFAULT NULL,
  `id_foto_melhor_estreante` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_esporte` (`id_esporte`),
  KEY `fk_campeonato_pai` (`id_campeonato_pai`),
  KEY `fk_campeonatos_foto_melhor_jogador_2025` (`id_foto_selecionada_melhor_jogador`),
  KEY `fk_campeonatos_foto_melhor_goleiro_2025` (`id_foto_selecionada_melhor_goleiro`),
  KEY `fk_campeonatos_foto_melhor_lateral_2025` (`id_foto_selecionada_melhor_lateral`),
  KEY `fk_campeonatos_foto_melhor_meia_2025` (`id_foto_selecionada_melhor_meia`),
  KEY `fk_campeonatos_foto_melhor_atacante_2025` (`id_foto_selecionada_melhor_atacante`),
  KEY `fk_campeonatos_foto_melhor_artilheiro_2025` (`id_foto_selecionada_melhor_artilheiro`),
  KEY `fk_campeonatos_foto_melhor_assistencia_2025` (`id_foto_selecionada_melhor_assistencia`),
  KEY `fk_campeonatos_foto_melhor_volante_2025` (`id_foto_selecionada_melhor_volante`),
  KEY `fk_campeonatos_foto_melhor_estreante_2025` (`id_foto_selecionada_melhor_estreante`),
  KEY `fk_campeonatos_foto_melhor_zagueiro_2025` (`id_foto_selecionada_melhor_zagueiro`),
  KEY `fk_campeonato_melhor_jogador_2025` (`id_melhor_jogador`),
  KEY `fk_campeonato_melhor_goleiro_2025` (`id_melhor_goleiro`),
  KEY `fk_campeonato_melhor_lateral_2025` (`id_melhor_lateral`),
  KEY `fk_campeonato_melhor_meia_2025` (`id_melhor_meia`),
  KEY `fk_campeonato_melhor_atacante_2025` (`id_melhor_atacante`),
  KEY `fk_campeonato_melhor_artilheiro_2025` (`id_melhor_artilheiro`),
  KEY `fk_campeonato_melhor_assistencia_2025` (`id_melhor_assistencia`),
  KEY `fk_campeonato_melhor_volante_2025` (`id_melhor_volante`),
  KEY `fk_campeonato_melhor_estreante_2025` (`id_melhor_estreante`),
  KEY `fk_campeonato_melhor_zagueiro_2025` (`id_melhor_zagueiro`),
  CONSTRAINT `campeonatos_ibfk_1` FOREIGN KEY (`id_esporte`) REFERENCES `esportes` (`id`),
  CONSTRAINT `fk_campeonato_melhor_artilheiro_2025` FOREIGN KEY (`id_melhor_artilheiro`) REFERENCES `participantes` (`id`),
  CONSTRAINT `fk_campeonato_melhor_assistencia_2025` FOREIGN KEY (`id_melhor_assistencia`) REFERENCES `participantes` (`id`),
  CONSTRAINT `fk_campeonato_melhor_atacante_2025` FOREIGN KEY (`id_melhor_atacante`) REFERENCES `participantes` (`id`),
  CONSTRAINT `fk_campeonato_melhor_estreante_2025` FOREIGN KEY (`id_melhor_estreante`) REFERENCES `participantes` (`id`),
  CONSTRAINT `fk_campeonato_melhor_goleiro_2025` FOREIGN KEY (`id_melhor_goleiro`) REFERENCES `participantes` (`id`),
  CONSTRAINT `fk_campeonato_melhor_jogador_2025` FOREIGN KEY (`id_melhor_jogador`) REFERENCES `participantes` (`id`),
  CONSTRAINT `fk_campeonato_melhor_lateral_2025` FOREIGN KEY (`id_melhor_lateral`) REFERENCES `participantes` (`id`),
  CONSTRAINT `fk_campeonato_melhor_meia_2025` FOREIGN KEY (`id_melhor_meia`) REFERENCES `participantes` (`id`),
  CONSTRAINT `fk_campeonato_melhor_volante_2025` FOREIGN KEY (`id_melhor_volante`) REFERENCES `participantes` (`id`),
  CONSTRAINT `fk_campeonato_melhor_zagueiro_2025` FOREIGN KEY (`id_melhor_zagueiro`) REFERENCES `participantes` (`id`),
  CONSTRAINT `fk_campeonato_pai` FOREIGN KEY (`id_campeonato_pai`) REFERENCES `campeonatos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_campeonatos_foto_melhor_artilheiro_2025` FOREIGN KEY (`id_foto_selecionada_melhor_artilheiro`) REFERENCES `fotos_participantes` (`id`),
  CONSTRAINT `fk_campeonatos_foto_melhor_assistencia_2025` FOREIGN KEY (`id_foto_selecionada_melhor_assistencia`) REFERENCES `fotos_participantes` (`id`),
  CONSTRAINT `fk_campeonatos_foto_melhor_atacante_2025` FOREIGN KEY (`id_foto_selecionada_melhor_atacante`) REFERENCES `fotos_participantes` (`id`),
  CONSTRAINT `fk_campeonatos_foto_melhor_estreante_2025` FOREIGN KEY (`id_foto_selecionada_melhor_estreante`) REFERENCES `fotos_participantes` (`id`),
  CONSTRAINT `fk_campeonatos_foto_melhor_goleiro_2025` FOREIGN KEY (`id_foto_selecionada_melhor_goleiro`) REFERENCES `fotos_participantes` (`id`),
  CONSTRAINT `fk_campeonatos_foto_melhor_jogador_2025` FOREIGN KEY (`id_foto_selecionada_melhor_jogador`) REFERENCES `fotos_participantes` (`id`),
  CONSTRAINT `fk_campeonatos_foto_melhor_lateral_2025` FOREIGN KEY (`id_foto_selecionada_melhor_lateral`) REFERENCES `fotos_participantes` (`id`),
  CONSTRAINT `fk_campeonatos_foto_melhor_meia_2025` FOREIGN KEY (`id_foto_selecionada_melhor_meia`) REFERENCES `fotos_participantes` (`id`),
  CONSTRAINT `fk_campeonatos_foto_melhor_volante_2025` FOREIGN KEY (`id_foto_selecionada_melhor_volante`) REFERENCES `fotos_participantes` (`id`),
  CONSTRAINT `fk_campeonatos_foto_melhor_zagueiro_2025` FOREIGN KEY (`id_foto_selecionada_melhor_zagueiro`) REFERENCES `fotos_participantes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campeonatos`
--

LOCK TABLES `campeonatos` WRITE;
/*!40000 ALTER TABLE `campeonatos` DISABLE KEYS */;
INSERT INTO `campeonatos` VALUES (10,1,'Campeonato Listão',NULL,'2025-08-12',NULL,'Inscrições Abertas','Pontos Corridos','2025-08-12 11:27:22',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(11,1,'2ª Copa Libertadores do Toledão',NULL,'2025-08-12',NULL,'Em Andamento','Pontos Corridos','2025-08-12 11:27:55',10,121,2023,70,65,101,65,30,37,65,118,NULL,NULL,27,NULL,NULL,NULL,13,NULL,NULL,80,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(12,1,'COPA TOLEDÃO SICREDI/JACLANI ESPORTES',NULL,'2025-08-15',NULL,'Inscrições Abertas','Pontos Corridos','2025-08-12 19:29:58',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(13,1,'CATEGORIA SUB 06',NULL,'2025-08-15',NULL,'Inscrições Abertas','Pontos Corridos','2025-08-12 19:30:29',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(14,1,'CATEGORIA SUB 07',NULL,'2025-08-15',NULL,'Inscrições Abertas','Mata-Mata','2025-08-12 19:34:15',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(15,1,'CATEGORIA SUB 08',NULL,'2025-08-15',NULL,'Inscrições Abertas','Pontos Corridos','2025-08-12 19:36:20',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(16,1,'CATEGORIA SUB 09',NULL,'2025-08-15',NULL,'Inscrições Abertas','Pontos Corridos','2025-08-12 19:37:01',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(17,1,'CATEGORIA SUB 10',NULL,'2025-08-15',NULL,'Inscrições Abertas','Pontos Corridos','2025-08-12 19:37:28',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(42,1,'CATEGORIA SUB 11',NULL,'2025-08-15',NULL,'Inscrições Abertas','','2025-09-17 23:43:33',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(43,1,'CATEGORIA SUB 12',NULL,'2025-08-15',NULL,'Inscrições Abertas','','2025-09-17 23:43:57',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(44,1,'CATEGORIA SUB 13',NULL,'2025-08-15',NULL,'Inscrições Abertas','','2025-09-17 23:44:26',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(45,1,'CATEGORIA SUB 14',NULL,'2025-08-15',NULL,'Inscrições Abertas','','2025-09-17 23:44:48',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(51,2,'testando_volei',NULL,'2025-10-01',NULL,'Inscrições Abertas','Mata-Mata','2025-10-19 19:24:04',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(52,2,'categoria_volei',NULL,'2025-10-21',NULL,'Em Andamento','Mata-Mata','2025-10-19 19:24:36',51,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,2014,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,2013,NULL,2012,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `campeonatos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `campeonatos_equipes`
--

DROP TABLE IF EXISTS `campeonatos_equipes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campeonatos_equipes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_campeonato` int(11) NOT NULL,
  `id_equipe` int(11) NOT NULL,
  `data_inscricao` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_campeonato` (`id_campeonato`,`id_equipe`),
  KEY `id_equipe` (`id_equipe`),
  CONSTRAINT `campeonatos_equipes_ibfk_1` FOREIGN KEY (`id_campeonato`) REFERENCES `campeonatos` (`id`),
  CONSTRAINT `campeonatos_equipes_ibfk_2` FOREIGN KEY (`id_equipe`) REFERENCES `equipes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=115 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campeonatos_equipes`
--

LOCK TABLES `campeonatos_equipes` WRITE;
/*!40000 ALTER TABLE `campeonatos_equipes` DISABLE KEYS */;
INSERT INTO `campeonatos_equipes` VALUES (60,11,11,'2025-08-12 11:49:49'),(61,11,12,'2025-08-12 15:17:12'),(62,11,16,'2025-08-12 15:17:18'),(63,11,18,'2025-08-12 15:17:23'),(64,11,13,'2025-08-12 15:17:29'),(65,11,20,'2025-08-12 15:17:36'),(66,11,17,'2025-08-12 15:17:41'),(67,11,14,'2025-08-12 15:17:47'),(68,11,19,'2025-08-12 15:17:52'),(69,11,15,'2025-08-12 15:17:58'),(70,13,21,'2025-08-12 19:33:38'),(71,14,21,'2025-08-12 19:34:24'),(72,15,21,'2025-08-12 19:40:54'),(73,17,21,'2025-08-13 00:37:59'),(74,10,11,'2025-08-15 12:54:09'),(75,12,11,'2025-08-16 22:27:26'),(76,12,16,'2025-08-16 22:27:34'),(95,10,1,'2025-09-15 11:17:53'),(98,12,1,'2025-09-19 00:12:22'),(113,52,1001,'2025-11-01 21:24:32'),(114,52,1002,'2025-11-01 21:24:32');
/*!40000 ALTER TABLE `campeonatos_equipes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `equipes`
--

DROP TABLE IF EXISTS `equipes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_lider` int(11) NOT NULL,
  `id_esporte` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `sigla` varchar(10) DEFAULT NULL,
  `cidade` varchar(100) DEFAULT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `data_criacao` timestamp NOT NULL DEFAULT current_timestamp(),
  `brasao` varchar(255) DEFAULT NULL,
  `tecnico` varchar(255) DEFAULT NULL,
  `capitao` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_lider` (`id_lider`),
  KEY `id_esporte` (`id_esporte`),
  KEY `fk_capitao` (`capitao`),
  CONSTRAINT `equipes_ibfk_1` FOREIGN KEY (`id_lider`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `equipes_ibfk_2` FOREIGN KEY (`id_esporte`) REFERENCES `esportes` (`id`),
  CONSTRAINT `fk_capitao` FOREIGN KEY (`capitao`) REFERENCES `participantes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1003 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipes`
--

LOCK TABLES `equipes` WRITE;
/*!40000 ALTER TABLE `equipes` DISABLE KEYS */;
INSERT INTO `equipes` VALUES (1,2,1,'São Paulo FC','SPF','Toledo',NULL,'2025-07-01 01:23:46',NULL,NULL,NULL),(2,3,1,'TESTE','123','Pederneiras',NULL,'2025-07-01 01:57:02','bra_1753035461.png',NULL,NULL),(3,4,1,'Palmeiras','PMA','São Paulo',NULL,'2025-07-01 02:51:58',NULL,NULL,NULL),(4,5,1,'Teste 5','TS5','Toledo',NULL,'2025-07-20 18:18:31','bra_1753035511.png',NULL,NULL),(5,6,1,'TESTE 5','TS5','Toledo',NULL,'2025-07-20 18:19:13','bra_1753035553.png',NULL,NULL),(6,7,1,'Teste 6','TS6','Toledo',NULL,'2025-07-20 18:31:14','bra_1753036274.png',NULL,NULL),(7,8,1,'Teste 7','TS7','Toledo',NULL,'2025-07-20 18:31:44','bra_1753036304.png',NULL,NULL),(8,9,1,'TESTE 8','TS8','Toledo',NULL,'2025-07-20 18:32:14','bra_1753036334.png',NULL,NULL),(9,10,1,'TESTE 9','TS9','Toledo',NULL,'2025-07-20 18:32:53','bra_1753036373.png',NULL,NULL),(10,11,1,'UPNOW Sistemas','UPS','Toledo',NULL,'2025-07-21 00:20:50','bra_1753057300.png',NULL,NULL),(11,13,1,'Atlético Nacional','ATN','Toledo',NULL,'2025-08-12 11:48:41','bra_1754999321.png',NULL,NULL),(12,13,1,'Boca Juniors','BOC','Toledo',NULL,'2025-08-12 14:55:47','bra_1755010583.png',NULL,NULL),(13,13,1,'LDU Quito','LDU','Toledo',NULL,'2025-08-12 14:57:05','bra_1755010778.png',NULL,NULL),(14,13,1,'Peñarol','PEÑ','Toledo',NULL,'2025-08-12 14:59:27','bra_1755010791.png',NULL,NULL),(15,13,1,'Vélez Sarsfield','VEL','Toledo',NULL,'2025-08-12 15:00:45','bra_1755011018.png',NULL,NULL),(16,13,1,'Cerro Porteño','CCP','Toledo',NULL,'2025-08-12 15:04:25','bra_1755011076.png',NULL,NULL),(17,13,1,'Nacional','NAC','Toledo',NULL,'2025-08-12 15:06:04','bra_1755011754.png',NULL,NULL),(18,13,1,'Estudiantes','EST','Toledo',NULL,'2025-08-12 15:07:51','bra_1755011721.png',NULL,NULL),(19,13,1,'River Plate','RIV','Toledo',NULL,'2025-08-12 15:09:08','bra_1755011806.png',NULL,NULL),(20,13,1,'Libertad','LIB','Toledo',NULL,'2025-08-12 15:10:12','bra_1755011784.png',NULL,NULL),(21,15,1,'TOLEDÃO SICREDI FUTSAL','TOL','Toledo',NULL,'2025-08-12 19:33:24',NULL,NULL,NULL),(22,10,1,'aaaaaa','ttt','TOLEDO',NULL,'2025-08-19 22:25:36',NULL,NULL,NULL),(28,16,1,'Guilherme Kaiser','NAC','Toledo',NULL,'2025-09-18 18:53:18','bra_1758244927.jpg',NULL,NULL),(29,16,1,'Guilherme Kaiser 2','BOC','Toledo',NULL,'2025-09-18 18:57:11','bra_1758221831.png',NULL,NULL),(30,11,1,'aaaaaaaaaaaaaaaaaaaaaaaaaaa','123','Toledo',NULL,'2025-09-19 00:07:37','bra_1758240457.png',NULL,NULL),(31,2,1,'bbbbbbbbbbbbbbbbbbbbbbbbb','add','Toledo',NULL,'2025-09-19 00:14:09','bra_1758240849.jpg',NULL,NULL),(1001,2,2,'Vôlei Azul','VAZ','Toledo',NULL,'2025-11-01 17:38:16',NULL,NULL,NULL),(1002,2,2,'Vôlei Vermelho','VVM','Toledo',NULL,'2025-11-01 17:38:16',NULL,NULL,NULL);
/*!40000 ALTER TABLE `equipes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `esportes`
--

DROP TABLE IF EXISTS `esportes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `esportes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nome` (`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `esportes`
--

LOCK TABLES `esportes` WRITE;
/*!40000 ALTER TABLE `esportes` DISABLE KEYS */;
INSERT INTO `esportes` VALUES (1,'Futebol'),(2,'Volei');
/*!40000 ALTER TABLE `esportes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fotos_participantes`
--

DROP TABLE IF EXISTS `fotos_participantes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fotos_participantes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `participante_id` int(11) NOT NULL,
  `src` varchar(255) NOT NULL,
  `criado_em` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_participante` (`participante_id`),
  CONSTRAINT `fk_participante` FOREIGN KEY (`participante_id`) REFERENCES `participantes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=81 DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fotos_participantes`
--

LOCK TABLES `fotos_participantes` WRITE;
/*!40000 ALTER TABLE `fotos_participantes` DISABLE KEYS */;
INSERT INTO `fotos_participantes` VALUES (1,9,'uploads/participantes/9/foto_689b17648729c.png','2025-08-12 10:28:53'),(2,9,'uploads/participantes/9/foto_689b176518cfd.png','2025-08-12 10:28:53'),(3,7,'uploads/participantes/7/foto_689b18b552512.png','2025-08-12 10:34:30'),(4,7,'uploads/participantes/7/foto_689b18b561f5f.png','2025-08-12 10:34:30'),(5,5,'uploads/participantes/5/foto_689b18d31bcea.png','2025-08-12 10:34:59'),(6,5,'uploads/participantes/5/foto_689b18d32b425.png','2025-08-12 10:34:59'),(7,1,'uploads/participantes/1/foto_689b18f3ad72f.png','2025-08-12 10:35:32'),(8,1,'uploads/participantes/1/foto_689b18f3baf61.png','2025-08-12 10:35:32'),(9,11,'uploads/participantes/11/foto_689b5c8b5d8ce.png','2025-08-12 15:23:55'),(10,11,'uploads/participantes/11/foto_689b5c8b61ddd.png','2025-08-12 15:23:55'),(11,11,'uploads/participantes/11/foto_689b5c8b65bbe.png','2025-08-12 15:23:55'),(12,11,'uploads/participantes/11/foto_689b5c8b6a56e.png','2025-08-12 15:23:55'),(13,30,'uploads/participantes/30/foto_689b96c2c8b72.png','2025-08-12 19:32:18'),(14,30,'uploads/participantes/30/foto_689b96c2d0920.png','2025-08-12 19:32:18'),(15,26,'uploads/participantes/26/foto_689b975300468.png','2025-08-12 19:34:43'),(16,26,'uploads/participantes/26/foto_689b97530d784.png','2025-08-12 19:34:43'),(17,41,'uploads/participantes/41/foto_689b98d11022f.png','2025-08-12 19:41:05'),(18,41,'uploads/participantes/41/foto_689b98d1171ef.png','2025-08-12 19:41:05'),(19,21,'uploads/participantes/21/foto_689b98feb6947.png','2025-08-12 19:41:50'),(20,21,'uploads/participantes/21/foto_689b98febfba0.png','2025-08-12 19:41:50'),(21,13,'uploads/participantes/13/foto_689b991fc3715.png','2025-08-12 19:42:23'),(22,14,'uploads/participantes/14/foto_689b9932c9861.png','2025-08-12 19:42:42'),(23,12,'uploads/participantes/12/foto_689b9a18f3043.png','2025-08-12 19:46:33'),(24,12,'uploads/participantes/12/foto_689b9a1906517.png','2025-08-12 19:46:33'),(25,54,'uploads/participantes/54/foto_689b9ac6c3230.png','2025-08-12 19:49:26'),(26,54,'uploads/participantes/54/foto_689b9ac73e553.png','2025-08-12 19:49:27'),(27,70,'uploads/participantes/70/foto_689b9cbcb2547.png','2025-08-12 19:57:48'),(28,70,'uploads/participantes/70/foto_689b9cbcba260.png','2025-08-12 19:57:48'),(29,71,'uploads/participantes/71/foto_689b9ceaea0a1.png','2025-08-12 19:58:35'),(30,71,'uploads/participantes/71/foto_689b9ceb06f19.png','2025-08-12 19:58:35'),(31,62,'uploads/participantes/62/foto_689b9cfbdc4ff.png','2025-08-12 19:58:51'),(32,62,'uploads/participantes/62/foto_689b9cfbe55e4.png','2025-08-12 19:58:51'),(33,66,'uploads/participantes/66/foto_689b9d0eb0a5c.png','2025-08-12 19:59:10'),(34,66,'uploads/participantes/66/foto_689b9d0eb74e8.png','2025-08-12 19:59:10'),(35,69,'uploads/participantes/69/foto_689b9d254a569.png','2025-08-12 19:59:33'),(36,69,'uploads/participantes/69/foto_689b9d2555d5d.png','2025-08-12 19:59:33'),(37,86,'uploads/participantes/86/foto_689ba66e0f485.png','2025-08-12 20:39:10'),(38,86,'uploads/participantes/86/foto_689ba66e20f71.png','2025-08-12 20:39:10'),(39,95,'uploads/participantes/95/foto_689ba682966cc.png','2025-08-12 20:39:30'),(40,95,'uploads/participantes/95/foto_689ba6829ed25.png','2025-08-12 20:39:30'),(41,98,'uploads/participantes/98/foto_689ba71fe8b44.png','2025-08-12 20:42:08'),(42,97,'uploads/participantes/97/foto_689ba72f876bd.png','2025-08-12 20:42:23'),(43,97,'uploads/participantes/97/foto_689ba72fa03ab.png','2025-08-12 20:42:23'),(44,119,'uploads/participantes/119/foto_689ba7a7afc84.png','2025-08-12 20:44:23'),(45,119,'uploads/participantes/119/foto_689ba7a7b859e.png','2025-08-12 20:44:23'),(46,116,'uploads/participantes/116/foto_689ba7bbf3213.png','2025-08-12 20:44:44'),(47,116,'uploads/participantes/116/foto_689ba7bc0f9bf.png','2025-08-12 20:44:44'),(48,40,'uploads/participantes/40/foto_68a706e99a88b.jpg','2025-08-21 11:45:45'),(49,40,'uploads/participantes/40/foto_68a706e99c44d.jpg','2025-08-21 11:45:45'),(51,39,'Uploads/participantes/39/foto_68a708c5db6a9.jpg','2025-08-21 11:53:41'),(52,39,'Uploads/participantes/39/foto_68a708ce7b039.jpg','2025-08-21 11:53:50'),(53,39,'Uploads/participantes/39/foto_68a708d8d5a17.jpg','2025-08-21 11:54:00'),(55,34,'Uploads/participantes/34/foto_68a72d0f1706b.png','2025-08-21 14:28:31'),(74,117,'Uploads/participantes/117/foto_69162672297d1.png','2025-11-13 18:41:54'),(76,117,'Uploads/participantes/117/foto_691626d358d46.png','2025-11-13 18:43:31'),(77,117,'Uploads/participantes/117/foto_691626d36c12e.png','2025-11-13 18:43:31'),(78,117,'Uploads/participantes/117/foto_691626d3865f1.png','2025-11-13 18:43:31'),(79,118,'Uploads/participantes/118/foto_692707f0f331a.png','2025-11-26 14:00:16'),(80,118,'Uploads/participantes/118/foto_69270af7ea7ff.png','2025-11-26 14:13:11');
/*!40000 ALTER TABLE `fotos_participantes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `participantes`
--

DROP TABLE IF EXISTS `participantes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `participantes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_equipe` int(11) NOT NULL,
  `nome_completo` varchar(255) NOT NULL,
  `data_nascimento` date DEFAULT NULL,
  `numero_camisa` int(11) DEFAULT NULL,
  `posicao` varchar(50) DEFAULT NULL,
  `data_inscricao` timestamp NOT NULL DEFAULT current_timestamp(),
  `apelido` varchar(100) DEFAULT NULL,
  `foto_documento_frente` varchar(255) DEFAULT NULL,
  `foto_documento_verso` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_equipe` (`id_equipe`),
  CONSTRAINT `participantes_ibfk_1` FOREIGN KEY (`id_equipe`) REFERENCES `equipes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2024 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `participantes`
--

LOCK TABLES `participantes` WRITE;
/*!40000 ALTER TABLE `participantes` DISABLE KEYS */;
INSERT INTO `participantes` VALUES (1,1,'Gabriel Roger','2025-06-26',12,'','2025-07-01 01:24:02','',NULL,NULL),(2,1,'Ricardo Ferraz','2025-06-26',11,NULL,'2025-07-01 01:24:10',NULL,NULL,NULL),(3,2,'teste','2025-06-04',12,NULL,'2025-07-01 02:27:25',NULL,NULL,NULL),(4,2,'teste123','2025-06-26',9,NULL,'2025-07-01 02:39:12',NULL,NULL,NULL),(5,3,'Teste 123','2025-06-12',10,'Meia','2025-07-01 02:52:16',NULL,NULL,NULL),(7,3,'Gabriel Roger','2025-07-11',22,'Atacante','2025-07-20 18:00:55',NULL,NULL,NULL),(8,5,'Gabriel 1','2025-07-04',1,'Atacante','2025-07-20 18:29:09',NULL,NULL,NULL),(9,10,'Guilherme','2025-07-03',10,'Gandula','2025-07-21 00:21:38',NULL,NULL,NULL),(10,8,'Teste','2025-07-22',10,'Atacante','2025-07-21 22:50:26',NULL,NULL,NULL),(11,11,'Guilherme Kaiser Breda','1996-11-06',3,'','2025-08-12 11:50:49','',NULL,NULL),(12,11,'Robson Vilas Boas','1985-10-16',40,'','2025-08-12 15:27:03','',NULL,NULL),(13,11,'Alexandre Fernando de Oliveira Niehues','1979-10-14',5,'','2025-08-12 15:31:43','Ale',NULL,NULL),(14,11,'Gabriel Elan Vieira','1991-06-23',7,'','2025-08-12 15:32:31','',NULL,NULL),(15,11,'Juliano Parizotto Vissotto','1995-08-15',8,'','2025-08-12 19:06:47','',NULL,NULL),(16,11,'Lucas Apolinario','1998-10-02',2,'','2025-08-12 19:07:34','Popo',NULL,NULL),(17,11,'Mauro Mallmann','1981-03-11',29,'','2025-08-12 19:08:24','',NULL,NULL),(18,11,'Jose Ricardo Pereira da Silva','1988-03-25',25,'','2025-08-12 19:08:55','Ricardo',NULL,NULL),(19,11,'Dilmar Carlos Cenedese','1981-12-21',99,'','2025-08-12 19:09:19','',NULL,NULL),(20,11,'Guilherme Henrique','1993-09-27',6,'','2025-08-12 19:10:17','Balaio',NULL,NULL),(21,11,'Adson Miranda Vieira','1995-05-08',10,'','2025-08-12 19:13:09','',NULL,NULL),(22,15,'Vanderlei Jorge Manfrin',NULL,18,'','2025-08-12 19:29:07','',NULL,NULL),(23,15,'André Luis da Silva',NULL,5,'','2025-08-12 19:29:15','',NULL,NULL),(24,15,'Murilo Casarin',NULL,0,'','2025-08-12 19:29:26','',NULL,NULL),(25,15,'Adriel Morgenstern','1900-01-01',11,'','2025-08-12 19:29:35','','Uploads/participantes/25/doc_frente_689d41e720011.png','Uploads/participantes/25/doc_verso_689d41e72713e.png'),(26,15,'Anthony Frizzo',NULL,40,'','2025-08-12 19:29:46','',NULL,NULL),(27,15,'Maicom Rodrigo Ribeiro',NULL,8,'','2025-08-12 19:29:53','',NULL,NULL),(28,15,'Fernando Henrique Martins Ertel',NULL,12,'','2025-08-12 19:30:01','',NULL,NULL),(29,15,'Anderson Hubner Bolson',NULL,3,'','2025-08-12 19:30:16','',NULL,NULL),(30,15,'Thiago Braga Leubet',NULL,10,'','2025-08-12 19:30:23','',NULL,NULL),(31,15,'Ahmed Mohamed Abdelmaksoud',NULL,9,'','2025-08-12 19:30:39','',NULL,NULL),(32,15,'José Vitor Braz Veiga',NULL,4,'','2025-08-12 19:30:45','',NULL,NULL),(33,15,'Nelson Souza',NULL,1,'','2025-08-12 19:30:54','',NULL,NULL),(34,14,'Amarildo Titon',NULL,77,'','2025-08-12 19:38:41','',NULL,NULL),(35,14,'Daniel Luis Gongoleski',NULL,4,'','2025-08-12 19:38:47','',NULL,NULL),(36,14,'Kauã Dal Pozzo Waschburger',NULL,99,'','2025-08-12 19:38:53','',NULL,NULL),(37,14,'Diego Comarella',NULL,15,'','2025-08-12 19:38:59','',NULL,NULL),(38,14,'Lucas Marcelo Scheuer',NULL,49,'','2025-08-12 19:39:14','',NULL,NULL),(39,14,'Maycon de Almeida Marcelino',NULL,9,'','2025-08-12 19:39:21','',NULL,NULL),(40,14,'Paulo Victor zorzo Ribeiro',NULL,8,'','2025-08-12 19:39:28','',NULL,NULL),(41,14,'João Carlos dos Santos Cardoso',NULL,10,'','2025-08-12 19:39:44','',NULL,NULL),(42,14,'Clayton Farias de Lima',NULL,7,'','2025-08-12 19:39:57','',NULL,NULL),(43,14,'Bruno Rodrigo da Silva',NULL,18,'','2025-08-12 19:40:02','',NULL,NULL),(44,14,'Fernando Rodrigo Henrique Turim',NULL,87,'','2025-08-12 19:40:10','',NULL,NULL),(45,21,'Pedro Fulano','2019-02-12',10,NULL,'2025-08-12 19:40:10','Pedrinho',NULL,NULL),(46,14,'Edinelson Duarte',NULL,11,'','2025-08-12 19:40:16','',NULL,NULL),(47,14,'André Saturnino de Melo',NULL,21,'','2025-08-12 19:40:33','',NULL,NULL),(48,14,'Giovane Baptista',NULL,12,'','2025-08-12 19:40:39','',NULL,NULL),(49,16,'Diego Luiz Pasqualli',NULL,33,'','2025-08-12 19:47:33','',NULL,NULL),(50,16,'Edimar Luis Cenedese',NULL,9,'','2025-08-12 19:47:42','',NULL,NULL),(51,16,'Emerson Mezaque dos Santos oures',NULL,7,'','2025-08-12 19:47:48','',NULL,NULL),(52,16,'Jean Ricardo Zeni',NULL,29,'','2025-08-12 19:47:54','',NULL,NULL),(53,16,'José Carlos Fernandes Amaral',NULL,0,'','2025-08-12 19:48:00','',NULL,NULL),(54,16,'Roberto de Melo Souto',NULL,11,'','2025-08-12 19:48:16','',NULL,NULL),(55,16,'Ademar Antunes',NULL,0,'','2025-08-12 19:48:23','',NULL,NULL),(56,16,'Wesley Aguiar dos Santos',NULL,10,'','2025-08-12 19:48:29','',NULL,NULL),(57,16,'Caio Duarte Pradela',NULL,23,'','2025-08-12 19:48:41','',NULL,NULL),(58,16,'Nelson Souza Filho',NULL,17,'','2025-08-12 19:48:48','',NULL,NULL),(59,16,'Fabio Henrique Costa',NULL,0,'','2025-08-12 19:48:55','',NULL,NULL),(60,16,'Diego Natan Cardoso',NULL,99,'','2025-08-12 19:49:02','',NULL,NULL),(61,12,'Wellyson Pitol da Silva',NULL,2,'','2025-08-12 19:51:56','',NULL,NULL),(62,12,'Luciano Da Vitoria',NULL,11,'','2025-08-12 19:52:02','',NULL,NULL),(63,12,'Ozeas Nougueira dos Santos',NULL,22,'','2025-08-12 19:52:17','',NULL,NULL),(64,12,'Valdecir Rodrigues dos Santos',NULL,88,'','2025-08-12 19:52:28','',NULL,NULL),(65,12,'André Luiz Pereira Gomes',NULL,15,'','2025-08-12 19:52:34','',NULL,NULL),(66,12,'Luiz Ribeiro',NULL,31,'','2025-08-12 19:52:40','',NULL,NULL),(67,12,'André Luiz Leubet',NULL,9,'','2025-08-12 19:52:51','',NULL,NULL),(68,12,'Fernando Silva de Souza',NULL,5,'','2025-08-12 19:52:58','',NULL,NULL),(69,12,'Hellinton Eduardo Klein',NULL,0,'','2025-08-12 19:53:04','',NULL,NULL),(70,12,'Airton Tiago Borges Ferreira',NULL,17,'','2025-08-12 19:53:18','Tchê',NULL,NULL),(71,12,'Andrews Jairon de Souza Reis Santos',NULL,8,'','2025-08-12 19:53:35','',NULL,NULL),(72,12,'Waldair Ribeiro da Rosa Junior',NULL,1,'','2025-08-12 19:53:43','',NULL,NULL),(73,18,'Wagner Alex Jann Favreto',NULL,9,'','2025-08-12 19:55:13','',NULL,NULL),(74,18,'Robson de Oliveira Luiz',NULL,21,'','2025-08-12 19:55:27','',NULL,NULL),(75,18,'Marciano de Souza Mota',NULL,99,'','2025-08-12 19:55:52','',NULL,NULL),(76,18,'Stalone Di Domenico',NULL,11,'','2025-08-12 19:55:59','',NULL,NULL),(77,18,'Eduardo Brandao',NULL,12,'','2025-08-12 19:56:08','',NULL,NULL),(78,18,'Andrew Luka Machado',NULL,77,'','2025-08-12 19:56:22','',NULL,NULL),(79,18,'Matheus Di Berti',NULL,0,'','2025-08-12 19:56:29','',NULL,NULL),(80,18,'Thiere Queiroz',NULL,7,'','2025-08-12 19:56:40','',NULL,NULL),(81,18,'Sérgio Paulino',NULL,2,'','2025-08-12 19:56:47','',NULL,NULL),(82,18,'Chapolim',NULL,10,'','2025-08-12 19:56:53','',NULL,NULL),(83,18,'Valerio Da Silva',NULL,3,'','2025-08-12 19:57:00','',NULL,NULL),(84,18,'Cesar',NULL,0,'','2025-08-12 19:57:05','',NULL,NULL),(85,18,'Wanderley Graeff Junior',NULL,1,'','2025-08-12 19:57:11','',NULL,NULL),(86,13,'Leandro Dutra',NULL,9,'','2025-08-12 20:27:03','',NULL,NULL),(87,13,'Marcos Pereira',NULL,8,'','2025-08-12 20:27:12','',NULL,NULL),(88,13,'Jorge Henrique Miguel',NULL,3,'','2025-08-12 20:27:17','',NULL,NULL),(89,13,'Felipe Cazanatto',NULL,0,'','2025-08-12 20:27:28','',NULL,NULL),(90,13,'Maicon Douglas Machado da Silva',NULL,22,'','2025-08-12 20:29:23','',NULL,NULL),(91,13,'Enoque Moreira',NULL,0,'','2025-08-12 20:29:33','',NULL,NULL),(92,13,'Alison Teylor Lima Machado',NULL,0,'','2025-08-12 20:29:48','',NULL,NULL),(93,13,'Diego Braga Leubet',NULL,11,'','2025-08-12 20:29:54','',NULL,NULL),(94,13,'Bruno Richick',NULL,20,'','2025-08-12 20:29:59','',NULL,NULL),(95,13,'Vitamir sagais',NULL,7,'','2025-08-12 20:30:08','',NULL,NULL),(96,13,'Luciano Santiago',NULL,0,'','2025-08-12 20:30:15','',NULL,NULL),(97,13,'Clebson Ferreira De Quadros',NULL,99,'','2025-08-12 20:30:22','',NULL,NULL),(98,13,'Waldair Ribeiro da Rosa',NULL,1,'','2025-08-12 20:30:34','Xis A Lenda',NULL,NULL),(99,20,'Luis Henrique Leventi Graeff',NULL,5,'','2025-08-12 20:31:07','',NULL,NULL),(100,20,'Luciano Dries',NULL,6,'','2025-08-12 20:31:19','',NULL,NULL),(101,20,'Rodrigo Augusto Crespão',NULL,8,'','2025-08-12 20:31:26','',NULL,NULL),(102,20,'Paulo Ricardo Rodrigues',NULL,123,'','2025-08-12 20:31:33','',NULL,NULL),(103,20,'Milton Cazanatto',NULL,0,'','2025-08-12 20:31:39','',NULL,NULL),(104,20,'Fabio Luis johann',NULL,10,'','2025-08-12 20:31:47','',NULL,NULL),(105,20,'Eduardo Faustino dos Santos',NULL,20,'','2025-08-12 20:31:57','',NULL,NULL),(106,20,'Ricardo Mariano Weiss',NULL,9,'','2025-08-12 20:32:03','',NULL,NULL),(107,20,'Marcio Rafaeli',NULL,4,'','2025-08-12 20:32:13','',NULL,NULL),(108,20,'Ricardo Augusto Jansen da Silva',NULL,2,'','2025-08-12 20:32:20','',NULL,NULL),(109,20,'Weslley Pitol da Silva',NULL,7,'','2025-08-12 20:32:27','',NULL,NULL),(110,20,'Willian Bigaski Stolle',NULL,12,'','2025-08-12 20:32:34','',NULL,NULL),(111,20,'Eduardo Pierin dos Santos',NULL,1,'','2025-08-12 20:32:43','',NULL,NULL),(112,17,'Eduardo André Machado',NULL,7,'','2025-08-12 20:32:59','',NULL,NULL),(113,17,'Antonio Silvio Ribeiro',NULL,2,'','2025-08-12 20:33:05','',NULL,NULL),(114,17,'Teixeira',NULL,13,'','2025-08-12 20:33:10','',NULL,NULL),(115,17,'Anderson Pedro Lopes Ferreira',NULL,6,'','2025-08-12 20:33:27','',NULL,NULL),(116,17,'Jean Junior Dal Castel',NULL,22,'','2025-08-12 20:33:33','',NULL,NULL),(117,17,'Gustavo Henrique Paulino',NULL,8,'','2025-08-12 20:33:39','',NULL,NULL),(118,17,'Alex Sandro Grein Pires',NULL,5,'','2025-08-12 20:33:45','',NULL,NULL),(119,17,'Ivan Rodrigo Prediger',NULL,17,'','2025-08-12 20:33:53','',NULL,NULL),(120,17,'Thiago Eduardo',NULL,20,'','2025-08-12 20:33:59','',NULL,NULL),(121,17,'Rafael Diemerson Santos',NULL,10,'','2025-08-12 20:34:15','',NULL,NULL),(122,17,'Lucas Reis da Costa',NULL,14,'','2025-08-12 20:34:21','',NULL,NULL),(123,17,'Marcio Lourenço Júnior',NULL,12,'','2025-08-12 20:34:27','',NULL,NULL),(124,19,'Rafael Rodrigues Fernandes Mallmann',NULL,8,'','2025-08-12 20:35:38','',NULL,NULL),(125,19,'Vitor Medeiros Backes',NULL,30,'','2025-08-12 20:35:44','',NULL,NULL),(126,19,'Jean Franco',NULL,23,'','2025-08-12 20:35:50','',NULL,NULL),(127,19,'Marcos Patene',NULL,4,'','2025-08-12 20:35:56','',NULL,NULL),(128,19,'Leandro de Oliveira Roberto',NULL,14,'','2025-08-12 20:36:07','',NULL,NULL),(129,19,'Vitor José Florêncio Delanora',NULL,11,'','2025-08-12 20:36:15','',NULL,NULL),(130,19,'Maurício Bonissoni',NULL,10,'','2025-08-12 20:36:21','',NULL,NULL),(131,19,'Diego de Oliveira Rosa',NULL,99,'','2025-08-12 20:36:35','',NULL,NULL),(132,19,'Rafael Ederson Correa',NULL,12,'','2025-08-12 20:36:42','',NULL,NULL),(133,19,'Luiz Antonio de Oliveira',NULL,88,'','2025-08-12 20:36:56','',NULL,NULL),(134,19,'Leandro Marcos Sewald',NULL,7,'','2025-08-12 20:37:06','',NULL,NULL),(135,19,'Fábio Pontes Ribeiro',NULL,1,'','2025-08-12 20:37:12','',NULL,NULL),(136,28,'Guilherme Kaiser Breda','2021-02-02',3,NULL,'2025-09-18 19:02:10','Balaio',NULL,NULL),(149,16,'Wylhian Adriano',NULL,0,'','2025-09-19 22:23:25','',NULL,NULL),(150,22,'ccccccc','2000-07-16',1,'1','2025-09-29 21:51:37','cccccccc',NULL,NULL),(151,22,'dddddddddd','2000-09-11',2,'2','2025-09-29 21:51:59','ddddddd',NULL,NULL),(152,31,'xxxxxxx','2000-09-10',4,'4','2025-09-29 21:52:25','xxxxx',NULL,NULL),(153,31,'yyyyy','2000-09-04',6,'6','2025-09-29 21:52:44','yyyyyyy',NULL,NULL),(2001,1001,'Lucas Silva',NULL,10,NULL,'2025-11-01 17:38:51','Lucão',NULL,NULL),(2002,1002,'Pedro Almeida',NULL,7,NULL,'2025-11-01 17:38:51','Pedrão',NULL,NULL),(2009,1001,'João Silva',NULL,1,'Levantador','2025-11-01 17:40:55',NULL,NULL,NULL),(2010,1001,'Pedro Alves',NULL,2,'Oposto','2025-11-01 17:40:55',NULL,NULL,NULL),(2011,1001,'Lucas Santos',NULL,3,'Ponteiro','2025-11-01 17:40:55',NULL,NULL,NULL),(2012,1001,'Carlos Souza',NULL,4,'Central','2025-11-01 17:40:55',NULL,NULL,NULL),(2013,1001,'Rafael Lima',NULL,5,'Líbero','2025-11-01 17:40:55',NULL,NULL,NULL),(2014,1001,'André Costa',NULL,6,'Ponteiro','2025-11-01 17:40:55',NULL,NULL,NULL),(2015,1002,'Marcos Pereira',NULL,7,'Levantador','2025-11-01 17:40:55',NULL,NULL,NULL),(2016,1002,'Tiago Rocha',NULL,8,'Oposto','2025-11-01 17:40:55',NULL,NULL,NULL),(2017,1002,'Felipe Nunes',NULL,9,'Ponteiro','2025-11-01 17:40:55',NULL,NULL,NULL),(2018,1002,'Bruno Mendes',NULL,10,'Central','2025-11-01 17:40:55',NULL,NULL,NULL),(2019,1002,'Gustavo Dias',NULL,11,'Líbero','2025-11-01 17:40:55',NULL,NULL,NULL),(2020,1002,'Eduardo Vieira',NULL,12,'Ponteiro','2025-11-01 17:40:55',NULL,NULL,NULL),(2021,18,'Almir',NULL,20,'','2025-11-06 20:24:51','',NULL,NULL),(2022,14,'Maycon de Almeida',NULL,9,'','2025-11-06 20:25:42','',NULL,NULL),(2023,17,'Aramis',NULL,0,'goleiro','2025-11-26 14:07:41','',NULL,NULL);
/*!40000 ALTER TABLE `participantes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `partidas`
--

DROP TABLE IF EXISTS `partidas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `partidas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_campeonato` int(11) NOT NULL,
  `id_equipe_a` int(11) NOT NULL,
  `id_equipe_b` int(11) NOT NULL,
  `placar_equipe_a` int(11) DEFAULT 0,
  `placar_equipe_b` int(11) DEFAULT 0,
  `data_partida` datetime DEFAULT NULL,
  `local_partida` varchar(255) DEFAULT NULL,
  `id_melhor_jogador` int(11) DEFAULT NULL,
  `fase` varchar(100) DEFAULT NULL,
  `rodadas` varchar(20) DEFAULT NULL,
  `status` enum('Agendada','Em Andamento','Finalizada') NOT NULL DEFAULT 'Agendada',
  `arbitragem` text DEFAULT NULL,
  `id_melhor_goleiro` int(11) DEFAULT NULL,
  `id_melhor_lateral` int(11) DEFAULT NULL,
  `id_melhor_meia` int(11) DEFAULT NULL,
  `id_melhor_atacante` int(11) DEFAULT NULL,
  `id_melhor_artilheiro` int(11) DEFAULT NULL,
  `id_melhor_assistencia` int(11) DEFAULT NULL,
  `id_melhor_volante` int(11) DEFAULT NULL,
  `id_melhor_estreante` int(11) DEFAULT NULL,
  `id_melhor_zagueiro` int(11) DEFAULT NULL,
  `hora_inicio` datetime DEFAULT NULL,
  `hora_fim` datetime DEFAULT NULL,
  `rodada` varchar(50) DEFAULT NULL,
  `id_foto_selecionada_melhor_jogador` int(11) DEFAULT NULL,
  `id_foto_selecionada_melhor_goleiro` int(11) DEFAULT NULL,
  `id_foto_selecionada_melhor_lateral` int(11) DEFAULT NULL,
  `id_foto_selecionada_melhor_meia` int(11) DEFAULT NULL,
  `id_foto_selecionada_melhor_atacante` int(11) DEFAULT NULL,
  `id_foto_selecionada_melhor_artilheiro` int(11) DEFAULT NULL,
  `id_foto_selecionada_melhor_assistencia` int(11) DEFAULT NULL,
  `id_foto_selecionada_melhor_volante` int(11) DEFAULT NULL,
  `id_foto_selecionada_melhor_estreante` int(11) DEFAULT NULL,
  `id_foto_selecionada_melhor_zagueiro` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_campeonato` (`id_campeonato`),
  KEY `id_equipe_a` (`id_equipe_a`),
  KEY `id_equipe_b` (`id_equipe_b`),
  KEY `fk_melhor_goleiro` (`id_melhor_goleiro`),
  KEY `fk_melhor_lateral` (`id_melhor_lateral`),
  KEY `fk_melhor_meia` (`id_melhor_meia`),
  KEY `fk_melhor_atacante` (`id_melhor_atacante`),
  KEY `fk_melhor_artilheiro` (`id_melhor_artilheiro`),
  KEY `fk_melhor_assistencia` (`id_melhor_assistencia`),
  KEY `fk_melhor_volante` (`id_melhor_volante`),
  KEY `fk_melhor_estreante` (`id_melhor_estreante`),
  KEY `fk_melhor_zagueiro` (`id_melhor_zagueiro`),
  CONSTRAINT `fk_melhor_artilheiro` FOREIGN KEY (`id_melhor_artilheiro`) REFERENCES `participantes` (`id`),
  CONSTRAINT `fk_melhor_assistencia` FOREIGN KEY (`id_melhor_assistencia`) REFERENCES `participantes` (`id`),
  CONSTRAINT `fk_melhor_atacante` FOREIGN KEY (`id_melhor_atacante`) REFERENCES `participantes` (`id`),
  CONSTRAINT `fk_melhor_estreante` FOREIGN KEY (`id_melhor_estreante`) REFERENCES `participantes` (`id`),
  CONSTRAINT `fk_melhor_goleiro` FOREIGN KEY (`id_melhor_goleiro`) REFERENCES `participantes` (`id`),
  CONSTRAINT `fk_melhor_lateral` FOREIGN KEY (`id_melhor_lateral`) REFERENCES `participantes` (`id`),
  CONSTRAINT `fk_melhor_meia` FOREIGN KEY (`id_melhor_meia`) REFERENCES `participantes` (`id`),
  CONSTRAINT `fk_melhor_volante` FOREIGN KEY (`id_melhor_volante`) REFERENCES `participantes` (`id`),
  CONSTRAINT `fk_melhor_zagueiro` FOREIGN KEY (`id_melhor_zagueiro`) REFERENCES `participantes` (`id`),
  CONSTRAINT `partidas_ibfk_1` FOREIGN KEY (`id_campeonato`) REFERENCES `campeonatos` (`id`),
  CONSTRAINT `partidas_ibfk_2` FOREIGN KEY (`id_equipe_a`) REFERENCES `equipes` (`id`),
  CONSTRAINT `partidas_ibfk_3` FOREIGN KEY (`id_equipe_b`) REFERENCES `equipes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3022 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partidas`
--

LOCK TABLES `partidas` WRITE;
/*!40000 ALTER TABLE `partidas` DISABLE KEYS */;
INSERT INTO `partidas` VALUES (176,11,13,17,3,8,'0000-00-00 00:00:00','',121,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-07 22:27:14','2025-10-07 23:03:10','2ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(177,11,18,12,1,2,'2025-10-02 20:15:00','Clube Toledão',70,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-02 23:18:27','2025-10-03 00:13:20','2ª Rodada',28,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(178,11,15,19,5,3,'2025-08-21 20:15:00','Clube Toledão',30,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-01 20:25:26',NULL,'2ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(180,11,11,16,5,0,'2025-10-02 19:15:00','Clube Toledão',NULL,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-02 22:36:36',NULL,'2ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(183,11,11,19,5,4,'2025-08-28 20:15:00','Clube Toledão',127,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-01 20:20:37',NULL,'3ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(194,11,18,13,0,0,'2025-10-09 19:15:00','Clube Toledão',85,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-09 22:30:29','2025-10-09 23:24:40','3ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(196,11,12,14,5,2,'0000-00-00 00:00:00','',41,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-02 19:25:45',NULL,'3ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(197,11,20,16,4,1,'2025-08-28 19:15:00','Clube Toledão',106,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-01 20:18:34',NULL,'3ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(199,11,17,12,3,3,'2025-08-19 19:15:00','Clube Toledão',118,'Fase de Grupos',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-02 17:20:35',NULL,'1ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(201,11,13,19,5,2,'2025-08-14 20:15:00','Clube Toledão',86,'Fase de Grupos',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-02 17:14:57',NULL,'1ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(202,11,14,16,3,1,'2025-08-12 19:30:00','CLUBE TOLEDÃO',41,'Fase de Grupos',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-01 20:37:30',NULL,'1ª Rodada',17,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(205,11,18,20,3,3,'2025-08-14 19:15:00','Clube Toledão',106,'Fase de Grupos',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-01 20:55:24',NULL,'1ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(208,11,18,15,4,4,'2025-09-11 20:15:00','Clube Toledão',25,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-19 21:41:59',NULL,'4ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(209,11,14,13,6,2,'2025-09-11 19:15:00','Clube Toledão',41,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-19 20:59:49',NULL,'4ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(210,11,17,11,3,3,'2025-09-09 20:15:00','Clube Toledão',121,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-19 21:30:41',NULL,'4ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(211,11,16,19,7,0,'2025-09-09 19:15:00','Clube Toledão',149,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-19 21:10:07',NULL,'4ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(212,11,20,12,5,5,'0000-00-00 00:00:00','',72,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-07 23:22:31',NULL,'4ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(241,11,11,14,2,3,'2025-09-23 19:15:00','Clube Toledão',34,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-23 22:23:00',NULL,'5ª Rodada',55,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(242,11,15,20,4,5,'2025-09-18 20:15:00','Clube Toledão',101,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-19 21:56:22',NULL,'5ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(243,11,13,12,3,6,'2025-09-18 19:15:00','Clube Toledão',65,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-19 21:52:09',NULL,'5ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(244,11,17,16,3,0,'2025-09-16 19:15:00','Clube Toledão',116,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-16 22:21:37',NULL,'5ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(245,11,19,18,1,5,'2025-09-16 20:15:00','Clube Toledão',77,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-16 23:22:22',NULL,'5ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(246,11,13,16,6,5,'2025-09-23 20:15:00','Clube Toledão',56,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-23 23:26:11',NULL,'6ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(247,11,17,18,5,0,'2025-09-25 19:15:00','Clube Toledão',121,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-25 22:28:27',NULL,'6ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(248,11,15,12,1,4,'2025-09-25 20:15:00','Clube Toledão',62,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-25 23:21:02',NULL,'6ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(249,11,19,14,0,5,'2025-09-30 19:15:00','Clube Toledão',41,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'6ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(250,11,11,20,1,6,'2025-09-30 20:15:00','Clube Toledão',104,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-31 00:04:39','2025-10-31 00:09:07','6ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(251,11,16,18,4,3,'2025-10-02 19:15:00','Clube Toledão',56,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-14 22:24:34','2025-10-14 23:20:04','7ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(252,11,15,13,11,1,'2025-10-02 20:15:00','Clube Toledão',25,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-14 23:26:11',NULL,'7ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(253,11,14,17,6,3,'2025-10-07 19:15:00','Clube Toledão',47,'Chaveamento',NULL,'Finalizada',NULL,34,35,35,NULL,112,NULL,NULL,35,47,'2025-10-23 22:25:04','2025-10-23 23:18:55','7ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(254,11,20,19,5,0,'2025-10-07 20:15:00','Clube Toledão',104,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'7ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(255,11,12,11,5,0,'2025-10-09 19:15:00','Clube Toledão',61,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-09 23:31:46','2025-10-15 17:27:48','7ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(256,11,15,16,9,4,'2025-10-09 20:15:00','Clube Toledão',30,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-30 22:19:14','2025-10-30 23:14:38','8ª Rodada',14,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(257,11,18,14,4,6,'2025-10-14 19:15:00','Clube Toledão',37,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-11-06 20:23:22','2025-11-06 20:28:28','8ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(258,11,11,13,8,4,'2025-10-14 20:15:00','Clube Toledão',21,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-11-06 20:14:50','2025-11-06 20:19:01','8ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(259,11,17,20,5,0,'2025-10-16 19:15:00','Clube Toledão',112,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-30 23:17:10','2025-11-06 20:21:50','8ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(260,11,19,12,0,5,'2025-10-16 20:15:00','Clube Toledão',64,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'8ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(261,11,19,17,0,5,'2025-10-28 19:15:00','Clube Toledão',NULL,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'9ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(262,11,12,16,4,0,'2025-10-23 20:15:00','Clube Toledão',66,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-11-06 20:30:00','2025-11-06 20:31:37','9ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(263,11,13,20,0,5,'2025-10-28 20:15:00','Clube Toledão',NULL,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'9ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(264,11,15,14,8,9,'2025-10-30 19:15:00','Clube Toledão',37,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-11-06 22:25:24','2025-11-06 23:19:41','9ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(265,11,11,18,2,3,'2025-10-30 20:15:00','Clube Toledão',78,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-23 23:24:03',NULL,'9ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(268,11,14,20,3,7,'2025-08-21 20:15:00','Clube Toledão',41,'Chaveamento',NULL,'Finalizada',NULL,41,NULL,NULL,41,NULL,NULL,NULL,NULL,NULL,'2025-09-18 23:37:35','2025-11-13 13:08:12','2ª Rodada',17,17,NULL,NULL,17,NULL,NULL,NULL,NULL,NULL),(272,11,15,17,0,2,'2025-09-02 20:15:00','Clube Toledão',121,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-18 23:49:06',NULL,'3ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(278,11,11,15,5,2,'2025-08-12 20:15:00','Clube Toledão',15,'Chaveamento',NULL,'Finalizada',NULL,25,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-09-26 19:59:16',NULL,'1ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3001,52,1001,1002,3,2,'2025-11-01 18:00:00','Ginásio Clube Toledão',2013,NULL,NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-11-06 02:05:36','2025-11-06 20:58:29',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3002,52,1001,1002,3,1,NULL,NULL,2018,'Final',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-11-07 00:30:28','2025-11-07 20:25:10',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3009,52,1001,1002,0,0,'0000-00-00 00:00:00','',NULL,'Chaveamento',NULL,'Em Andamento',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-14 14:23:44',NULL,'2a Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3012,52,1001,1002,1,1,'2025-11-01 18:00:00','Ginásio Clube Toledão',NULL,'',NULL,'Em Andamento',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-11-19 13:56:04',NULL,'1ª Rodada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3013,11,14,18,3,2,'2025-11-13 20:15:00','Clube Toledão',41,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-11-13 23:27:22','2025-11-14 00:20:12','Quartas de Final',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3014,11,12,13,8,1,'2025-11-13 19:15:00','Clube Toledão',65,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-11-13 22:30:43','2025-11-13 23:21:52','Quartas de Final',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3015,11,17,15,4,2,'2025-11-11 19:15:00','Clube Toledão',117,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-11-13 18:33:58','2025-11-13 18:34:43','Quartas de Final',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3016,11,20,11,3,1,'2025-11-11 20:15:00','Clube Toledão',104,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-11-13 18:32:14','2025-11-13 18:33:14','Quartas de Final',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3018,11,17,14,3,2,'2025-11-18 20:15:00','Clube Toledão',116,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-11-19 13:15:12','2025-11-19 13:37:06','Semi Final',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3019,11,20,12,1,3,'2025-11-18 19:15:00','Clube Toledão',65,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-11-19 13:23:11','2025-11-19 13:26:36','Semi Final',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3020,11,12,17,1,3,'2025-11-25 20:15:00','Clube Toledão',118,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-11-25 23:43:00','2025-11-26 00:59:26','Final',79,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3021,11,14,20,0,2,'2025-11-25 19:15:00','Clube Toledão',101,'Chaveamento',NULL,'Finalizada',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-11-25 22:32:02','2025-11-25 23:41:41','3º e 4º',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `partidas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sumulas_eventos`
--

DROP TABLE IF EXISTS `sumulas_eventos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sumulas_eventos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_partida` int(11) NOT NULL,
  `id_participante` int(11) DEFAULT NULL,
  `id_equipe` int(11) DEFAULT NULL,
  `tipo_evento` varchar(100) NOT NULL,
  `minuto_evento` varchar(5) DEFAULT NULL,
  `descricao` text DEFAULT NULL,
  `periodo` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id_partida` (`id_partida`),
  KEY `id_participante` (`id_participante`),
  KEY `id_equipe` (`id_equipe`),
  CONSTRAINT `sumulas_eventos_ibfk_1` FOREIGN KEY (`id_partida`) REFERENCES `partidas` (`id`),
  CONSTRAINT `sumulas_eventos_ibfk_2` FOREIGN KEY (`id_participante`) REFERENCES `participantes` (`id`),
  CONSTRAINT `sumulas_eventos_ibfk_3` FOREIGN KEY (`id_equipe`) REFERENCES `equipes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=909 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sumulas_eventos`
--

LOCK TABLES `sumulas_eventos` WRITE;
/*!40000 ALTER TABLE `sumulas_eventos` DISABLE KEYS */;
INSERT INTO `sumulas_eventos` VALUES (141,197,101,20,'Gol','0',NULL,'Primeiro Tempo'),(142,197,106,20,'Gol','0',NULL,'Primeiro Tempo'),(143,197,106,20,'Gol','0',NULL,'Primeiro Tempo'),(144,197,102,20,'Gol','0',NULL,'Primeiro Tempo'),(145,197,50,16,'Gol','0',NULL,'Primeiro Tempo'),(146,183,17,11,'Gol','0',NULL,'Primeiro Tempo'),(147,183,15,11,'Gol','0',NULL,'Primeiro Tempo'),(148,183,18,11,'Gol','0',NULL,'Primeiro Tempo'),(149,183,15,11,'Gol','0',NULL,'Primeiro Tempo'),(150,183,13,11,'Gol','0',NULL,'Primeiro Tempo'),(151,183,130,19,'Gol','0',NULL,'Primeiro Tempo'),(152,183,127,19,'Gol','1',NULL,'Primeiro Tempo'),(153,183,130,19,'Gol','1',NULL,'Primeiro Tempo'),(154,183,127,19,'Gol','1',NULL,'Primeiro Tempo'),(165,178,132,19,'Gol','0',NULL,'Primeiro Tempo'),(166,178,127,19,'Gol','0',NULL,'Primeiro Tempo'),(167,178,133,19,'Gol','0',NULL,'Primeiro Tempo'),(168,178,25,15,'Gol','0',NULL,'Primeiro Tempo'),(169,178,25,15,'Gol','0',NULL,'Primeiro Tempo'),(170,178,30,15,'Gol','0',NULL,'Primeiro Tempo'),(171,178,30,15,'Gol','0',NULL,'Primeiro Tempo'),(172,178,28,15,'Gol','1',NULL,'Primeiro Tempo'),(175,183,18,11,'Assistência','0',NULL,'Segundo Tempo'),(176,183,15,11,'Assistência','0',NULL,'Segundo Tempo'),(177,202,43,14,'Gol','0',NULL,'Primeiro Tempo'),(178,202,37,14,'Gol','0',NULL,'Primeiro Tempo'),(179,202,41,14,'Gol','0',NULL,'Primeiro Tempo'),(180,202,54,16,'Gol','0',NULL,'Primeiro Tempo'),(181,202,56,16,'Assistência','0',NULL,'Primeiro Tempo'),(182,202,35,14,'Assistência','1',NULL,'Primeiro Tempo'),(183,202,44,14,'Assistência','1',NULL,'Primeiro Tempo'),(184,202,41,14,'Cartão Amarelo','0',NULL,'Segundo Tempo'),(185,202,56,16,'Cartão Amarelo','0',NULL,'Segundo Tempo'),(199,205,76,18,'Gol','0',NULL,'Primeiro Tempo'),(200,205,75,18,'Gol','0',NULL,'Primeiro Tempo'),(201,205,77,18,'Gol','1',NULL,'Primeiro Tempo'),(202,205,109,20,'Gol','1',NULL,'Primeiro Tempo'),(203,205,101,20,'Gol','1',NULL,'Primeiro Tempo'),(204,205,106,20,'Gol','1',NULL,'Primeiro Tempo'),(205,201,86,13,'Gol','0',NULL,'Primeiro Tempo'),(206,201,86,13,'Gol','0',NULL,'Primeiro Tempo'),(207,201,86,13,'Gol','0',NULL,'Primeiro Tempo'),(208,201,93,13,'Gol','0',NULL,'Primeiro Tempo'),(209,201,87,13,'Gol','1',NULL,'Primeiro Tempo'),(210,201,129,19,'Gol','1',NULL,'Primeiro Tempo'),(211,201,129,19,'Gol','1',NULL,'Primeiro Tempo'),(212,201,134,19,'Cartão Amarelo','1',NULL,'Primeiro Tempo'),(213,201,133,19,'Cartão Amarelo','2',NULL,'Primeiro Tempo'),(214,201,94,13,'Cartão Amarelo','2',NULL,'Primeiro Tempo'),(215,199,65,12,'Gol','0',NULL,'Primeiro Tempo'),(216,199,65,12,'Gol','0',NULL,'Primeiro Tempo'),(217,199,65,12,'Gol','0',NULL,'Primeiro Tempo'),(218,199,116,17,'Gol','1',NULL,'Primeiro Tempo'),(219,199,116,17,'Gol','1',NULL,'Primeiro Tempo'),(220,199,121,17,'Gol','1',NULL,'Primeiro Tempo'),(221,199,114,17,'Cartão Amarelo','2',NULL,'Primeiro Tempo'),(222,199,121,17,'Cartão Amarelo','2',NULL,'Primeiro Tempo'),(223,199,70,12,'Cartão Amarelo','2',NULL,'Primeiro Tempo'),(224,196,65,12,'Gol','0',NULL,'Primeiro Tempo'),(225,196,67,12,'Falta','1',NULL,'Primeiro Tempo'),(226,196,71,12,'Falta','3',NULL,'Primeiro Tempo'),(227,196,61,12,'Falta','9',NULL,'Primeiro Tempo'),(228,196,67,12,'Gol','10',NULL,'Primeiro Tempo'),(229,196,65,12,'Assistência','11',NULL,'Primeiro Tempo'),(230,196,34,14,'Falta','12',NULL,'Primeiro Tempo'),(231,196,65,12,'Falta','13',NULL,'Primeiro Tempo'),(232,196,37,14,'Gol','14',NULL,'Primeiro Tempo'),(233,196,35,14,'Falta','15',NULL,'Primeiro Tempo'),(234,196,65,12,'Gol','18',NULL,'Primeiro Tempo'),(235,196,65,12,'Gol','0',NULL,'Segundo Tempo'),(236,196,62,12,'Falta','7',NULL,'Segundo Tempo'),(237,196,39,14,'Falta','10',NULL,'Segundo Tempo'),(238,196,44,14,'Gol','13',NULL,'Segundo Tempo'),(239,196,39,14,'Assistência','13',NULL,'Segundo Tempo'),(240,196,61,12,'Assistência','17',NULL,'Segundo Tempo'),(241,196,68,12,'Gol','17',NULL,'Segundo Tempo'),(242,196,43,14,'Cartão Amarelo','21',NULL,'Segundo Tempo'),(248,244,58,16,'Falta','1',NULL,'Primeiro Tempo'),(249,244,58,16,'Falta','6',NULL,'Primeiro Tempo'),(250,244,53,16,'Falta','11',NULL,'Primeiro Tempo'),(251,244,117,17,'Falta','12',NULL,'Primeiro Tempo'),(252,244,119,17,'Falta','15',NULL,'Primeiro Tempo'),(253,244,115,17,'Cartão Amarelo','23',NULL,'Primeiro Tempo'),(254,244,53,16,'Falta','1',NULL,'Segundo Tempo'),(255,244,116,17,'Gol','1',NULL,'Segundo Tempo'),(256,244,119,17,'Falta','9',NULL,'Segundo Tempo'),(257,244,114,17,'Falta','9',NULL,'Segundo Tempo'),(258,244,119,17,'Assistência','11',NULL,'Segundo Tempo'),(259,244,116,17,'Gol','11',NULL,'Segundo Tempo'),(260,244,56,16,'Cartão Amarelo','14',NULL,'Segundo Tempo'),(261,244,121,17,'Gol','17',NULL,'Segundo Tempo'),(262,244,57,16,'Falta','19',NULL,'Segundo Tempo'),(263,244,116,17,'Falta','23',NULL,'Segundo Tempo'),(264,244,119,17,'Falta','25',NULL,'Segundo Tempo'),(265,245,81,18,'Falta','0',NULL,'Primeiro Tempo'),(266,245,132,19,'Falta','5',NULL,'Primeiro Tempo'),(267,245,127,19,'Assistência','7',NULL,'Primeiro Tempo'),(268,245,131,19,'Gol','8',NULL,'Primeiro Tempo'),(269,245,75,18,'Assistência','9',NULL,'Primeiro Tempo'),(270,245,77,18,'Gol','9',NULL,'Primeiro Tempo'),(271,245,77,18,'Falta','9',NULL,'Primeiro Tempo'),(272,245,131,19,'Falta','10',NULL,'Primeiro Tempo'),(273,245,76,18,'Gol','12',NULL,'Primeiro Tempo'),(274,245,133,19,'Falta','17',NULL,'Primeiro Tempo'),(275,245,75,18,'Falta','18',NULL,'Primeiro Tempo'),(276,245,130,19,'Falta','1',NULL,'Segundo Tempo'),(277,245,79,18,'Falta','3',NULL,'Segundo Tempo'),(278,245,75,18,'Gol','6',NULL,'Segundo Tempo'),(279,245,84,18,'Assistência','7',NULL,'Segundo Tempo'),(280,245,133,19,'Falta','8',NULL,'Segundo Tempo'),(281,245,75,18,'Gol','10',NULL,'Segundo Tempo'),(282,245,75,18,'Falta','16',NULL,'Segundo Tempo'),(283,245,76,18,'Assistência','17',NULL,'Segundo Tempo'),(284,245,77,18,'Gol','17',NULL,'Segundo Tempo'),(285,245,131,19,'Falta','18',NULL,'Segundo Tempo'),(286,268,41,14,'Gol','0',NULL,'Primeiro Tempo'),(287,268,42,14,'Gol','0',NULL,'Primeiro Tempo'),(288,268,35,14,'Gol','0',NULL,'Primeiro Tempo'),(289,268,104,20,'Gol','1',NULL,'Primeiro Tempo'),(290,268,104,20,'Gol','1',NULL,'Primeiro Tempo'),(291,268,101,20,'Gol','1',NULL,'Primeiro Tempo'),(292,268,101,20,'Gol','2',NULL,'Primeiro Tempo'),(293,268,101,20,'Gol','2',NULL,'Primeiro Tempo'),(294,268,106,20,'Gol','2',NULL,'Primeiro Tempo'),(295,268,106,20,'Gol','2',NULL,'Primeiro Tempo'),(296,272,121,17,'Gol','0',NULL,'Primeiro Tempo'),(297,272,121,17,'Gol','0',NULL,'Primeiro Tempo'),(298,209,43,14,'Falta','0',NULL,'Primeiro Tempo'),(299,209,38,14,'Cartão Amarelo','0',NULL,'Primeiro Tempo'),(300,209,34,14,'Falta','1',NULL,'Primeiro Tempo'),(301,209,42,14,'Assistência','1',NULL,'Primeiro Tempo'),(302,209,38,14,'Gol','1',NULL,'Primeiro Tempo'),(303,209,43,14,'Falta','1',NULL,'Primeiro Tempo'),(304,209,47,14,'Falta','2',NULL,'Primeiro Tempo'),(305,209,42,14,'Falta','2',NULL,'Primeiro Tempo'),(306,209,41,14,'Gol','2',NULL,'Primeiro Tempo'),(307,209,37,14,'Assistência','2',NULL,'Primeiro Tempo'),(308,209,89,13,'Gol','3',NULL,'Primeiro Tempo'),(309,209,41,14,'Gol','3',NULL,'Primeiro Tempo'),(310,209,93,13,'Gol','3',NULL,'Primeiro Tempo'),(311,209,87,13,'Assistência','3',NULL,'Primeiro Tempo'),(312,209,41,14,'Gol','3',NULL,'Primeiro Tempo'),(313,209,91,13,'Falta','4',NULL,'Primeiro Tempo'),(314,209,93,13,'Falta','4',NULL,'Primeiro Tempo'),(315,209,91,13,'Falta','4',NULL,'Primeiro Tempo'),(316,209,95,13,'Falta','4',NULL,'Primeiro Tempo'),(317,209,41,14,'Gol','5',NULL,'Primeiro Tempo'),(318,209,44,14,'Gol','5',NULL,'Primeiro Tempo'),(319,209,38,14,'Assistência','5',NULL,'Primeiro Tempo'),(320,209,44,14,'Falta','5',NULL,'Primeiro Tempo'),(321,209,92,13,'Falta','5',NULL,'Primeiro Tempo'),(322,211,49,16,'Cartão Amarelo','1',NULL,'Primeiro Tempo'),(323,211,58,16,'Gol','2',NULL,'Primeiro Tempo'),(324,211,53,16,'Gol','2',NULL,'Primeiro Tempo'),(325,211,56,16,'Gol','2',NULL,'Primeiro Tempo'),(326,211,56,16,'Gol','2',NULL,'Primeiro Tempo'),(327,210,121,17,'Gol','0',NULL,'Primeiro Tempo'),(328,210,121,17,'Gol','0',NULL,'Primeiro Tempo'),(329,210,121,17,'Gol','0',NULL,'Primeiro Tempo'),(330,210,15,11,'Gol','0',NULL,'Primeiro Tempo'),(331,210,15,11,'Gol','0',NULL,'Primeiro Tempo'),(332,210,19,11,'Gol','0',NULL,'Primeiro Tempo'),(333,210,117,17,'Cartão Amarelo','0',NULL,'Primeiro Tempo'),(334,208,81,18,'Gol','0',NULL,'Primeiro Tempo'),(335,208,81,18,'Cartão Amarelo','0',NULL,'Primeiro Tempo'),(336,208,27,15,'Gol','0',NULL,'Primeiro Tempo'),(337,208,83,18,'Cartão Amarelo','0',NULL,'Primeiro Tempo'),(338,208,30,15,'Gol','1',NULL,'Primeiro Tempo'),(339,208,25,15,'Gol','1',NULL,'Primeiro Tempo'),(340,208,25,15,'Gol','1',NULL,'Primeiro Tempo'),(341,208,76,18,'Gol','1',NULL,'Primeiro Tempo'),(342,208,76,18,'Gol','1',NULL,'Primeiro Tempo'),(343,208,79,18,'Gol','2',NULL,'Primeiro Tempo'),(344,243,68,12,'Gol','0',NULL,'Primeiro Tempo'),(345,243,88,13,'Gol','0',NULL,'Primeiro Tempo'),(346,243,67,12,'Gol','0',NULL,'Primeiro Tempo'),(347,243,87,13,'Gol','0',NULL,'Primeiro Tempo'),(348,243,87,13,'Gol','0',NULL,'Primeiro Tempo'),(349,243,62,12,'Gol','0',NULL,'Primeiro Tempo'),(350,243,65,12,'Gol','1',NULL,'Primeiro Tempo'),(351,243,65,12,'Gol','1',NULL,'Primeiro Tempo'),(352,243,65,12,'Gol','1',NULL,'Primeiro Tempo'),(353,242,29,15,'Cartão Amarelo','0',NULL,'Primeiro Tempo'),(354,242,107,20,'Cartão Amarelo','0',NULL,'Primeiro Tempo'),(355,242,107,20,'Cartão Azul','1',NULL,'Primeiro Tempo'),(356,242,23,15,'Gol','1',NULL,'Primeiro Tempo'),(357,242,109,20,'Gol','1',NULL,'Primeiro Tempo'),(358,242,101,20,'Gol','1',NULL,'Primeiro Tempo'),(359,242,101,20,'Gol','1',NULL,'Primeiro Tempo'),(360,242,101,20,'Gol','1',NULL,'Primeiro Tempo'),(361,242,30,15,'Gol','2',NULL,'Primeiro Tempo'),(362,242,106,20,'Gol','4',NULL,'Primeiro Tempo'),(363,242,25,15,'Gol','4',NULL,'Primeiro Tempo'),(364,242,25,15,'Gol','5',NULL,'Primeiro Tempo'),(365,211,149,16,'Gol','0',NULL,'Segundo Tempo'),(366,211,149,16,'Gol','0',NULL,'Segundo Tempo'),(367,211,149,16,'Gol','0',NULL,'Segundo Tempo'),(368,211,149,16,'Cartão Amarelo','0',NULL,'Segundo Tempo'),(369,241,38,14,'Assistência','1',NULL,'Primeiro Tempo'),(370,241,41,14,'Gol','2',NULL,'Primeiro Tempo'),(371,241,44,14,'Falta','2',NULL,'Primeiro Tempo'),(372,241,43,14,'Falta','3',NULL,'Primeiro Tempo'),(373,241,38,14,'Falta','5',NULL,'Primeiro Tempo'),(374,241,19,11,'Falta','9',NULL,'Primeiro Tempo'),(375,241,37,14,'Falta','10',NULL,'Primeiro Tempo'),(376,241,43,14,'Falta','14',NULL,'Primeiro Tempo'),(377,241,19,11,'Falta','16',NULL,'Primeiro Tempo'),(378,241,38,14,'Falta','17',NULL,'Primeiro Tempo'),(379,241,13,11,'Falta','19',NULL,'Primeiro Tempo'),(380,241,44,14,'Assistência','19',NULL,'Primeiro Tempo'),(381,241,41,14,'Gol','20',NULL,'Primeiro Tempo'),(382,241,20,11,'Gol','21',NULL,'Primeiro Tempo'),(383,241,21,11,'Falta','22',NULL,'Primeiro Tempo'),(384,241,39,14,'Falta','2',NULL,'Segundo Tempo'),(385,241,39,14,'Falta','3',NULL,'Segundo Tempo'),(386,241,18,11,'Falta','4',NULL,'Segundo Tempo'),(387,241,37,14,'Assistência','8',NULL,'Segundo Tempo'),(389,241,41,14,'Gol','8',NULL,'Segundo Tempo'),(390,241,21,11,'Falta','8',NULL,'Segundo Tempo'),(391,241,43,14,'Falta','11',NULL,'Segundo Tempo'),(392,241,43,14,'Cartão Amarelo','12',NULL,'Segundo Tempo'),(393,241,42,14,'Falta','13',NULL,'Segundo Tempo'),(394,241,18,11,'Falta','16',NULL,'Segundo Tempo'),(395,241,41,14,'Falta','17',NULL,'Segundo Tempo'),(396,241,21,11,'Falta','20',NULL,'Segundo Tempo'),(397,241,21,11,'Cartão Amarelo','20',NULL,'Segundo Tempo'),(398,241,16,11,'Cartão Azul','24',NULL,'Segundo Tempo'),(400,241,18,11,'Gol','0',NULL,'Tempo Extra'),(401,246,86,13,'Assistência','4',NULL,'Primeiro Tempo'),(402,246,91,13,'Gol','4',NULL,'Primeiro Tempo'),(403,246,96,13,'Gol','5',NULL,'Primeiro Tempo'),(404,246,87,13,'Assistência','5',NULL,'Primeiro Tempo'),(405,246,96,13,'Gol','8',NULL,'Primeiro Tempo'),(406,246,52,16,'Gol','8',NULL,'Primeiro Tempo'),(407,246,60,16,'Assistência','9',NULL,'Primeiro Tempo'),(408,246,91,13,'Assistência','12',NULL,'Primeiro Tempo'),(409,246,87,13,'Gol','12',NULL,'Primeiro Tempo'),(410,246,90,13,'Falta','23',NULL,'Primeiro Tempo'),(411,246,54,16,'Assistência','4',NULL,'Segundo Tempo'),(412,246,51,16,'Gol','5',NULL,'Segundo Tempo'),(413,246,86,13,'Gol','5',NULL,'Segundo Tempo'),(414,246,51,16,'Gol','7',NULL,'Segundo Tempo'),(416,246,56,16,'Assistência','9',NULL,'Segundo Tempo'),(417,246,57,16,'Falta','9',NULL,'Segundo Tempo'),(418,246,57,16,'Gol','10',NULL,'Segundo Tempo'),(419,246,56,16,'Assistência','10',NULL,'Segundo Tempo'),(420,246,86,13,'Gol','11',NULL,'Segundo Tempo'),(421,246,91,13,'Falta','19',NULL,'Segundo Tempo'),(422,246,56,16,'Gol','19',NULL,'Segundo Tempo'),(424,247,121,17,'Gol','2',NULL,'Primeiro Tempo'),(425,247,117,17,'Assistência','2',NULL,'Primeiro Tempo'),(426,247,119,17,'Falta','4',NULL,'Primeiro Tempo'),(427,247,115,17,'Gol','4',NULL,'Primeiro Tempo'),(428,247,119,17,'Assistência','7',NULL,'Primeiro Tempo'),(429,247,121,17,'Gol','7',NULL,'Primeiro Tempo'),(431,247,121,17,'Assistência','8',NULL,'Primeiro Tempo'),(432,247,117,17,'Gol','8',NULL,'Primeiro Tempo'),(433,247,74,18,'Falta','10',NULL,'Primeiro Tempo'),(434,247,115,17,'Falta','11',NULL,'Primeiro Tempo'),(435,247,117,17,'Falta','16',NULL,'Primeiro Tempo'),(436,247,121,17,'Gol','18',NULL,'Primeiro Tempo'),(437,247,112,17,'Falta','20',NULL,'Primeiro Tempo'),(438,248,27,15,'Falta','1',NULL,'Primeiro Tempo'),(439,248,27,15,'Falta','10',NULL,'Primeiro Tempo'),(440,248,70,12,'Falta','11',NULL,'Primeiro Tempo'),(441,248,29,15,'Falta','12',NULL,'Primeiro Tempo'),(442,248,61,12,'Assistência','13',NULL,'Primeiro Tempo'),(443,248,70,12,'Gol','13',NULL,'Primeiro Tempo'),(444,248,62,12,'Assistência','14',NULL,'Primeiro Tempo'),(445,248,70,12,'Gol','14',NULL,'Primeiro Tempo'),(446,248,70,12,'Falta','18',NULL,'Primeiro Tempo'),(447,248,65,12,'Assistência','19',NULL,'Primeiro Tempo'),(448,248,62,12,'Gol','20',NULL,'Primeiro Tempo'),(449,248,62,12,'Falta','20',NULL,'Primeiro Tempo'),(450,248,23,15,'Falta','22',NULL,'Primeiro Tempo'),(451,248,64,12,'Cartão Amarelo','0',NULL,'Tempo Extra'),(452,248,24,15,'Gol','0',NULL,'Tempo Extra'),(453,248,29,15,'Falta','4',NULL,'Tempo Extra'),(454,248,30,15,'Cartão Amarelo','7',NULL,'Tempo Extra'),(455,248,68,12,'Falta','11',NULL,'Tempo Extra'),(456,248,65,12,'Assistência','14',NULL,'Tempo Extra'),(457,248,71,12,'Gol','14',NULL,'Tempo Extra'),(458,248,71,12,'Falta','19',NULL,'Tempo Extra'),(460,278,29,15,'Cartão Amarelo','0',NULL,'Primeiro Tempo'),(461,278,27,15,'Gol','0',NULL,'Primeiro Tempo'),(462,278,15,11,'Gol','0',NULL,'Primeiro Tempo'),(463,278,15,11,'Gol','0',NULL,'Primeiro Tempo'),(464,278,16,11,'Cartão Amarelo','0',NULL,'Primeiro Tempo'),(465,278,16,11,'Cartão Azul','0',NULL,'Primeiro Tempo'),(466,278,21,11,'Cartão Amarelo','1',NULL,'Primeiro Tempo'),(467,278,18,11,'Assistência','1',NULL,'Primeiro Tempo'),(468,278,21,11,'Assistência','1',NULL,'Primeiro Tempo'),(469,177,77,18,'Falta','9',NULL,'Primeiro Tempo'),(470,177,77,18,'Falta','20',NULL,'Primeiro Tempo'),(471,177,70,12,'Gol','25',NULL,'Primeiro Tempo'),(472,177,61,12,'Assistência','25',NULL,'Primeiro Tempo'),(473,177,64,12,'Falta','5',NULL,'Segundo Tempo'),(474,177,73,18,'Gol','13',NULL,'Segundo Tempo'),(475,177,71,12,'Gol','17',NULL,'Segundo Tempo'),(476,177,73,18,'Falta','18',NULL,'Segundo Tempo'),(477,177,63,12,'Cartão Amarelo','21',NULL,'Segundo Tempo'),(478,176,93,13,'Falta','3',NULL,'Primeiro Tempo'),(479,176,121,17,'Assistência','6',NULL,'Primeiro Tempo'),(480,176,115,17,'Gol','6',NULL,'Primeiro Tempo'),(481,176,119,17,'Falta','6',NULL,'Primeiro Tempo'),(482,176,121,17,'Assistência','9',NULL,'Primeiro Tempo'),(483,176,117,17,'Gol','10',NULL,'Primeiro Tempo'),(484,176,93,13,'Assistência','11',NULL,'Primeiro Tempo'),(485,176,86,13,'Gol','11',NULL,'Primeiro Tempo'),(486,176,121,17,'Assistência','13',NULL,'Primeiro Tempo'),(487,176,117,17,'Gol','14',NULL,'Primeiro Tempo'),(488,176,119,17,'Falta','14',NULL,'Primeiro Tempo'),(489,176,95,13,'Gol','15',NULL,'Primeiro Tempo'),(490,176,116,17,'Gol','17',NULL,'Primeiro Tempo'),(491,176,114,17,'Assistência','17',NULL,'Primeiro Tempo'),(492,176,119,17,'Cartão Amarelo','20',NULL,'Primeiro Tempo'),(493,176,86,13,'Gol','20',NULL,'Primeiro Tempo'),(494,176,112,17,'Gol','24',NULL,'Primeiro Tempo'),(495,176,121,17,'Assistência','24',NULL,'Primeiro Tempo'),(496,176,112,17,'Assistência','26',NULL,'Primeiro Tempo'),(497,176,116,17,'Gol','26',NULL,'Primeiro Tempo'),(498,176,121,17,'Gol','5',NULL,'Segundo Tempo'),(499,176,121,17,'Gol','5',NULL,'Segundo Tempo'),(500,176,112,17,'Assistência','5',NULL,'Segundo Tempo'),(501,176,95,13,'Cartão Amarelo','6',NULL,'Segundo Tempo'),(502,212,109,20,'Falta','7',NULL,'Primeiro Tempo'),(503,212,99,20,'Falta','8',NULL,'Primeiro Tempo'),(504,212,65,12,'Gol','8',NULL,'Primeiro Tempo'),(505,212,67,12,'Gol','9',NULL,'Primeiro Tempo'),(506,212,106,20,'Gol','11',NULL,'Primeiro Tempo'),(507,212,109,20,'Assistência','11',NULL,'Primeiro Tempo'),(508,212,104,20,'Falta','17',NULL,'Primeiro Tempo'),(509,212,106,20,'Assistência','22',NULL,'Primeiro Tempo'),(510,212,101,20,'Gol','22',NULL,'Primeiro Tempo'),(511,212,104,20,'Falta','24',NULL,'Primeiro Tempo'),(512,212,65,12,'Gol','24',NULL,'Primeiro Tempo'),(513,212,101,20,'Gol','2',NULL,'Segundo Tempo'),(514,212,99,20,'Falta','3',NULL,'Segundo Tempo'),(515,212,71,12,'Cartão Amarelo','5',NULL,'Segundo Tempo'),(516,212,106,20,'Assistência','7',NULL,'Segundo Tempo'),(517,212,101,20,'Gol','7',NULL,'Segundo Tempo'),(518,212,99,20,'Falta','10',NULL,'Segundo Tempo'),(519,212,62,12,'Falta','12',NULL,'Segundo Tempo'),(520,212,62,12,'Cartão Amarelo','12',NULL,'Segundo Tempo'),(521,212,99,20,'Falta','13',NULL,'Segundo Tempo'),(522,212,71,12,'Falta','14',NULL,'Segundo Tempo'),(523,212,104,20,'Gol','15',NULL,'Segundo Tempo'),(524,212,71,12,'Assistência','16',NULL,'Segundo Tempo'),(525,212,67,12,'Gol','16',NULL,'Segundo Tempo'),(526,212,62,12,'Falta','20',NULL,'Segundo Tempo'),(527,212,65,12,'Gol','22',NULL,'Segundo Tempo'),(528,212,67,12,'Assistência','22',NULL,'Segundo Tempo'),(529,212,72,12,'Melhor em Campo','25',NULL,'Segundo Tempo'),(530,194,81,18,'Falta','1',NULL,'Primeiro Tempo'),(531,194,83,18,'Falta','11',NULL,'Primeiro Tempo'),(532,194,90,13,'Cartão Amarelo','19',NULL,'Primeiro Tempo'),(533,194,82,18,'Falta','23',NULL,'Primeiro Tempo'),(534,194,76,18,'Falta','0',NULL,'Segundo Tempo'),(535,194,87,13,'Falta','2',NULL,'Segundo Tempo'),(536,194,83,18,'Falta','6',NULL,'Segundo Tempo'),(537,194,81,18,'Falta','6',NULL,'Segundo Tempo'),(538,194,81,18,'Cartão Amarelo','8',NULL,'Segundo Tempo'),(539,194,91,13,'Falta','10',NULL,'Segundo Tempo'),(540,194,98,13,'Cartão Azul','15',NULL,'Segundo Tempo'),(541,194,93,13,'Falta','19',NULL,'Segundo Tempo'),(542,194,93,13,'Falta','19',NULL,'Segundo Tempo'),(543,194,81,18,'Cartão Azul','21',NULL,'Segundo Tempo'),(544,194,87,13,'Cartão Azul','21',NULL,'Segundo Tempo'),(545,194,76,18,'Falta','25',NULL,'Segundo Tempo'),(546,194,85,18,'Melhor em Campo','26',NULL,'Segundo Tempo'),(547,255,71,12,'Assistência','7',NULL,'Primeiro Tempo'),(548,255,61,12,'Gol','8',NULL,'Primeiro Tempo'),(549,255,70,12,'Falta','9',NULL,'Primeiro Tempo'),(550,255,21,11,'Falta','19',NULL,'Primeiro Tempo'),(551,255,71,12,'Falta','23',NULL,'Primeiro Tempo'),(552,255,15,11,'Falta','1',NULL,'Segundo Tempo'),(553,255,70,12,'Gol','4',NULL,'Segundo Tempo'),(554,255,66,12,'Falta','11',NULL,'Segundo Tempo'),(555,255,65,12,'Cartão Amarelo','13',NULL,'Segundo Tempo'),(556,255,61,12,'Gol','13',NULL,'Segundo Tempo'),(557,255,19,11,'Falta','16',NULL,'Segundo Tempo'),(558,255,15,11,'Falta','20',NULL,'Segundo Tempo'),(559,255,65,12,'Gol','20',NULL,'Segundo Tempo'),(560,255,19,11,'Falta','21',NULL,'Segundo Tempo'),(561,255,67,12,'Gol','22',NULL,'Segundo Tempo'),(562,255,65,12,'Assistência','22',NULL,'Segundo Tempo'),(563,255,19,11,'Cartão Amarelo','23',NULL,'Segundo Tempo'),(564,255,61,12,'Melhor em Campo','24',NULL,'Segundo Tempo'),(565,251,149,16,'Gol','11',NULL,'Primeiro Tempo'),(566,251,76,18,'Falta','11',NULL,'Primeiro Tempo'),(567,251,56,16,'Gol','17',NULL,'Primeiro Tempo'),(568,251,53,16,'Falta','18',NULL,'Primeiro Tempo'),(569,251,73,18,'Assistência','21',NULL,'Primeiro Tempo'),(570,251,82,18,'Gol','21',NULL,'Primeiro Tempo'),(571,251,84,18,'Falta','21',NULL,'Primeiro Tempo'),(572,251,79,18,'Falta','23',NULL,'Primeiro Tempo'),(573,251,51,16,'Gol','24',NULL,'Primeiro Tempo'),(575,251,52,16,'Cartão Amarelo','25',NULL,'Primeiro Tempo'),(576,251,54,16,'Assistência','0',NULL,'Segundo Tempo'),(577,251,79,18,'Gol','6',NULL,'Segundo Tempo'),(578,251,75,18,'Assistência','7',NULL,'Segundo Tempo'),(579,251,53,16,'Falta','7',NULL,'Segundo Tempo'),(580,251,58,16,'Falta','10',NULL,'Segundo Tempo'),(581,251,76,18,'Falta','16',NULL,'Segundo Tempo'),(582,251,58,16,'Falta','16',NULL,'Segundo Tempo'),(583,251,75,18,'Falta','19',NULL,'Segundo Tempo'),(584,251,75,18,'Cartão Amarelo','19',NULL,'Segundo Tempo'),(585,251,73,18,'Falta','22',NULL,'Segundo Tempo'),(586,251,75,18,'Gol','25',NULL,'Segundo Tempo'),(587,251,73,18,'Assistência','25',NULL,'Segundo Tempo'),(589,251,56,16,'Assistência','26',NULL,'Segundo Tempo'),(590,251,58,16,'Gol','26',NULL,'Segundo Tempo'),(591,251,52,16,'Cartão Amarelo','26',NULL,'Segundo Tempo'),(592,251,52,16,'Cartão Azul','27',NULL,'Segundo Tempo'),(593,252,30,15,'Gol','6',NULL,'Primeiro Tempo'),(594,252,28,15,'Assistência','6',NULL,'Primeiro Tempo'),(595,252,28,15,'Falta','7',NULL,'Primeiro Tempo'),(596,252,26,15,'Assistência','8',NULL,'Primeiro Tempo'),(597,252,25,15,'Gol','8',NULL,'Primeiro Tempo'),(598,252,26,15,'Assistência','14',NULL,'Primeiro Tempo'),(599,252,25,15,'Gol','14',NULL,'Primeiro Tempo'),(600,252,25,15,'Assistência','16',NULL,'Primeiro Tempo'),(601,252,30,15,'Gol','16',NULL,'Primeiro Tempo'),(602,252,25,15,'Gol','19',NULL,'Primeiro Tempo'),(603,252,22,15,'Assistência','1',NULL,'Segundo Tempo'),(604,252,25,15,'Gol','1',NULL,'Segundo Tempo'),(605,252,30,15,'Assistência','5',NULL,'Segundo Tempo'),(606,252,23,15,'Gol','5',NULL,'Segundo Tempo'),(607,252,86,13,'Gol','7',NULL,'Segundo Tempo'),(608,252,22,15,'Assistência','9',NULL,'Segundo Tempo'),(609,252,23,15,'Gol','9',NULL,'Segundo Tempo'),(610,252,25,15,'Gol','11',NULL,'Segundo Tempo'),(611,252,30,15,'Assistência','12',NULL,'Segundo Tempo'),(612,252,25,15,'Assistência','12',NULL,'Segundo Tempo'),(613,252,30,15,'Gol','12',NULL,'Segundo Tempo'),(614,252,26,15,'Gol','16',NULL,'Segundo Tempo'),(616,252,30,15,'Assistência','16',NULL,'Segundo Tempo'),(617,253,43,14,'Falta','16',NULL,'Primeiro Tempo'),(618,253,43,14,'Falta','16',NULL,'Primeiro Tempo'),(619,253,41,14,'Falta','0',NULL,'Segundo Tempo'),(620,253,35,14,'Assistência','0',NULL,'Segundo Tempo'),(621,253,39,14,'Gol','1',NULL,'Segundo Tempo'),(622,253,41,14,'Gol','1',NULL,'Segundo Tempo'),(623,253,117,17,'Falta','1',NULL,'Segundo Tempo'),(624,253,121,17,'Gol','1',NULL,'Segundo Tempo'),(625,253,116,17,'Falta','3',NULL,'Segundo Tempo'),(626,253,43,14,'Cartão Amarelo','3',NULL,'Segundo Tempo'),(627,253,38,14,'Falta','5',NULL,'Segundo Tempo'),(628,253,116,17,'Gol','16',NULL,'Segundo Tempo'),(629,253,118,17,'Assistência','16',NULL,'Segundo Tempo'),(630,253,37,14,'Falta','16',NULL,'Segundo Tempo'),(631,253,37,14,'Assistência','23',NULL,'Segundo Tempo'),(632,253,41,14,'Gol','23',NULL,'Segundo Tempo'),(633,253,39,14,'Gol','26',NULL,'Segundo Tempo'),(634,253,39,14,'Cartão Amarelo','26',NULL,'Segundo Tempo'),(635,253,41,14,'Falta','27',NULL,'Segundo Tempo'),(636,253,37,14,'Gol','34',NULL,'Segundo Tempo'),(637,253,35,14,'Assistência','35',NULL,'Segundo Tempo'),(638,253,37,14,'Gol','35',NULL,'Segundo Tempo'),(639,253,121,17,'Gol','35',NULL,'Segundo Tempo'),(640,253,116,17,'Falta','36',NULL,'Segundo Tempo'),(641,253,47,14,'Melhor em Campo','37',NULL,'Segundo Tempo'),(642,265,78,18,'Falta','7',NULL,'Primeiro Tempo'),(643,265,73,18,'Falta','7',NULL,'Primeiro Tempo'),(644,265,21,11,'Gol','8',NULL,'Primeiro Tempo'),(645,265,15,11,'Falta','11',NULL,'Primeiro Tempo'),(646,265,83,18,'Falta','13',NULL,'Primeiro Tempo'),(647,265,78,18,'Falta','13',NULL,'Primeiro Tempo'),(648,265,19,11,'Falta','23',NULL,'Primeiro Tempo'),(649,265,78,18,'Falta','24',NULL,'Primeiro Tempo'),(650,265,78,18,'Gol','3',NULL,'Segundo Tempo'),(651,265,78,18,'Gol','8',NULL,'Segundo Tempo'),(652,265,16,11,'Assistência','20',NULL,'Segundo Tempo'),(653,265,20,11,'Gol','20',NULL,'Segundo Tempo'),(654,265,19,11,'Falta','21',NULL,'Segundo Tempo'),(655,265,78,18,'Gol','22',NULL,'Segundo Tempo'),(656,265,19,11,'Falta','24',NULL,'Segundo Tempo'),(658,256,25,15,'Gol','10',NULL,'Primeiro Tempo'),(659,256,53,16,'Falta','10',NULL,'Primeiro Tempo'),(660,256,25,15,'Gol','18',NULL,'Primeiro Tempo'),(661,256,25,15,'Gol','19',NULL,'Primeiro Tempo'),(662,256,30,15,'Assistência','19',NULL,'Primeiro Tempo'),(663,256,58,16,'Falta','19',NULL,'Primeiro Tempo'),(664,256,58,16,'Cartão Amarelo','19',NULL,'Primeiro Tempo'),(665,256,26,15,'Gol','21',NULL,'Primeiro Tempo'),(666,256,30,15,'Assistência','21',NULL,'Primeiro Tempo'),(667,256,54,16,'Assistência','23',NULL,'Primeiro Tempo'),(668,256,57,16,'Gol','23',NULL,'Primeiro Tempo'),(669,256,25,15,'Gol','3',NULL,'Segundo Tempo'),(670,256,25,15,'Assistência','4',NULL,'Segundo Tempo'),(671,256,30,15,'Gol','5',NULL,'Segundo Tempo'),(672,256,30,15,'Assistência','5',NULL,'Segundo Tempo'),(673,256,56,16,'Gol','5',NULL,'Segundo Tempo'),(674,256,50,16,'Gol','7',NULL,'Segundo Tempo'),(675,256,26,15,'Gol','14',NULL,'Segundo Tempo'),(676,256,28,15,'Gol','16',NULL,'Segundo Tempo'),(677,256,25,15,'Gol','18',NULL,'Segundo Tempo'),(678,256,30,15,'Assistência','19',NULL,'Segundo Tempo'),(679,256,30,15,'Assistência','19',NULL,'Segundo Tempo'),(680,256,54,16,'Assistência','19',NULL,'Segundo Tempo'),(681,256,56,16,'Gol','19',NULL,'Segundo Tempo'),(695,250,104,20,'Gol','0',NULL,'Primeiro Tempo'),(696,250,104,20,'Gol','0',NULL,'Primeiro Tempo'),(697,250,104,20,'Gol','0',NULL,'Primeiro Tempo'),(698,250,104,20,'Gol','0',NULL,'Primeiro Tempo'),(699,250,104,20,'Assistência','0',NULL,'Primeiro Tempo'),(700,250,109,20,'Gol','1',NULL,'Primeiro Tempo'),(701,250,106,20,'Gol','1',NULL,'Primeiro Tempo'),(702,250,99,20,'Assistência','1',NULL,'Primeiro Tempo'),(703,250,99,20,'Assistência','2',NULL,'Primeiro Tempo'),(704,250,21,11,'Gol','2',NULL,'Primeiro Tempo'),(705,250,19,11,'Cartão Amarelo','2',NULL,'Primeiro Tempo'),(706,250,108,20,'Falta','3',NULL,'Primeiro Tempo'),(707,250,106,20,'Falta','3',NULL,'Primeiro Tempo'),(708,250,99,20,'Falta','3',NULL,'Primeiro Tempo'),(709,250,20,11,'Falta','3',NULL,'Primeiro Tempo'),(710,250,19,11,'Falta','4',NULL,'Primeiro Tempo'),(711,3001,2001,1001,'Cartão Amarelo','0',NULL,'Primeiro Set'),(712,3001,2014,1001,'Ponto Saque','1',NULL,'Primeiro Set'),(714,258,15,11,'Gol','0',NULL,'Primeiro Tempo'),(715,258,15,11,'Gol','0',NULL,'Primeiro Tempo'),(716,258,15,11,'Assistência','0',NULL,'Primeiro Tempo'),(717,258,17,11,'Gol','1',NULL,'Primeiro Tempo'),(718,258,20,11,'Assistência','1',NULL,'Primeiro Tempo'),(719,258,20,11,'Gol','1',NULL,'Primeiro Tempo'),(720,258,21,11,'Gol','1',NULL,'Primeiro Tempo'),(721,258,21,11,'Gol','2',NULL,'Primeiro Tempo'),(722,258,21,11,'Gol','2',NULL,'Primeiro Tempo'),(723,258,21,11,'Assistência','2',NULL,'Primeiro Tempo'),(724,258,21,11,'Assistência','2',NULL,'Primeiro Tempo'),(725,258,11,11,'Gol','2',NULL,'Primeiro Tempo'),(726,258,93,13,'Gol','2',NULL,'Primeiro Tempo'),(727,258,93,13,'Assistência','3',NULL,'Primeiro Tempo'),(728,258,86,13,'Gol','3',NULL,'Primeiro Tempo'),(729,258,93,13,'Gol','3',NULL,'Primeiro Tempo'),(730,258,87,13,'Gol','3',NULL,'Primeiro Tempo'),(731,258,87,13,'Assistência','4',NULL,'Primeiro Tempo'),(732,259,121,17,'Gol','0',NULL,'Tempo Extra'),(733,259,121,17,'Gol','0',NULL,'Tempo Extra'),(734,259,121,17,'Gol','0',NULL,'Tempo Extra'),(735,259,121,17,'Assistência','0',NULL,'Tempo Extra'),(736,259,119,17,'Gol','1',NULL,'Tempo Extra'),(737,259,119,17,'Assistência','1',NULL,'Tempo Extra'),(738,259,112,17,'Gol','1',NULL,'Tempo Extra'),(739,259,112,17,'Assistência','1',NULL,'Tempo Extra'),(740,257,39,14,'Gol','2',NULL,'Primeiro Tempo'),(741,257,39,14,'Gol','3',NULL,'Primeiro Tempo'),(742,257,41,14,'Gol','3',NULL,'Primeiro Tempo'),(743,257,37,14,'Gol','3',NULL,'Primeiro Tempo'),(744,257,40,14,'Gol','3',NULL,'Primeiro Tempo'),(745,257,34,14,'Gol','3',NULL,'Primeiro Tempo'),(746,257,76,18,'Gol','4',NULL,'Primeiro Tempo'),(747,257,76,18,'Gol','4',NULL,'Primeiro Tempo'),(748,257,2021,18,'Gol','4',NULL,'Primeiro Tempo'),(749,257,77,18,'Gol','4',NULL,'Primeiro Tempo'),(750,262,64,12,'Cartão Amarelo','0',NULL,'Primeiro Tempo'),(751,262,58,16,'Cartão Azul','0',NULL,'Primeiro Tempo'),(752,262,61,12,'Gol','0',NULL,'Primeiro Tempo'),(753,262,71,12,'Gol','1',NULL,'Primeiro Tempo'),(754,262,65,12,'Gol','1',NULL,'Primeiro Tempo'),(755,262,65,12,'Gol','1',NULL,'Primeiro Tempo'),(756,264,37,14,'Gol','2',NULL,'Primeiro Tempo'),(757,264,24,15,'Gol','5',NULL,'Primeiro Tempo'),(758,264,30,15,'Assistência','5',NULL,'Primeiro Tempo'),(760,264,37,14,'Gol','10',NULL,'Primeiro Tempo'),(761,264,35,14,'Assistência','10',NULL,'Primeiro Tempo'),(762,264,23,15,'Gol','11',NULL,'Primeiro Tempo'),(763,264,24,15,'Assistência','11',NULL,'Primeiro Tempo'),(764,264,40,14,'Assistência','12',NULL,'Primeiro Tempo'),(765,264,37,14,'Gol','12',NULL,'Primeiro Tempo'),(766,264,40,14,'Gol','14',NULL,'Primeiro Tempo'),(767,264,41,14,'Assistência','14',NULL,'Primeiro Tempo'),(768,264,40,14,'Falta','17',NULL,'Primeiro Tempo'),(769,264,25,15,'Gol','17',NULL,'Primeiro Tempo'),(770,264,37,14,'Gol','19',NULL,'Primeiro Tempo'),(771,264,37,14,'Falta','19',NULL,'Primeiro Tempo'),(772,264,30,15,'Gol','24',NULL,'Primeiro Tempo'),(773,264,41,14,'Falta','24',NULL,'Primeiro Tempo'),(774,264,34,14,'Cartão Amarelo','4',NULL,'Segundo Tempo'),(775,264,30,15,'Gol','5',NULL,'Segundo Tempo'),(776,264,37,14,'Gol','8',NULL,'Segundo Tempo'),(777,264,23,15,'Gol','9',NULL,'Segundo Tempo'),(778,264,41,14,'Gol','11',NULL,'Segundo Tempo'),(779,264,37,14,'Assistência','11',NULL,'Segundo Tempo'),(780,264,35,14,'Cartão Amarelo','11',NULL,'Segundo Tempo'),(781,264,25,15,'Falta','14',NULL,'Segundo Tempo'),(782,264,25,15,'Gol','14',NULL,'Segundo Tempo'),(783,264,30,15,'Assistência','14',NULL,'Segundo Tempo'),(784,264,38,14,'Gol','16',NULL,'Segundo Tempo'),(785,264,37,14,'Assistência','16',NULL,'Segundo Tempo'),(786,264,30,15,'Gol','16',NULL,'Segundo Tempo'),(787,264,25,15,'Assistência','17',NULL,'Segundo Tempo'),(788,264,41,14,'Gol','22',NULL,'Segundo Tempo'),(799,3002,2019,1002,'Ponto de Bloqueio','5',NULL,'3º Set'),(800,3002,2019,1002,'Ponto de Bloqueio','5',NULL,'3º Set'),(801,3002,2020,1002,'Ponto de Saque','5',NULL,'3º Set'),(802,3002,2019,1002,'Ponto de Bloqueio','49',NULL,'4º Set'),(804,3002,2012,1001,'Ponto de Saque','0',NULL,'5º Set'),(805,3002,2009,1001,'Ponto de Saque','0',NULL,'5º Set'),(806,3002,2014,1001,'Ponto de Saque','0',NULL,'5º Set'),(807,3002,2014,1001,'Ponto de Bloqueio','0',NULL,'5º Set'),(808,3002,2009,1001,'Ponto de Saque','1',NULL,'5º Set'),(823,3016,21,11,'Assistência','0',NULL,'Primeiro Tempo'),(824,3016,15,11,'Gol','0',NULL,'Primeiro Tempo'),(825,3016,104,20,'Gol','0',NULL,'Primeiro Tempo'),(826,3016,104,20,'Gol','0',NULL,'Primeiro Tempo'),(827,3016,106,20,'Gol','0',NULL,'Primeiro Tempo'),(828,3015,117,17,'Gol','0',NULL,'Primeiro Tempo'),(829,3015,117,17,'Gol','0',NULL,'Primeiro Tempo'),(830,3015,117,17,'Gol','0',NULL,'Primeiro Tempo'),(831,3015,121,17,'Gol','0',NULL,'Primeiro Tempo'),(832,3015,25,15,'Gol','0',NULL,'Primeiro Tempo'),(833,3015,26,15,'Gol','0',NULL,'Primeiro Tempo'),(834,3014,61,12,'Falta','3',NULL,'Primeiro Tempo'),(836,3014,61,12,'Assistência','7',NULL,'Primeiro Tempo'),(837,3014,61,12,'Falta','9',NULL,'Primeiro Tempo'),(838,3014,65,12,'Gol','13',NULL,'Primeiro Tempo'),(839,3014,67,12,'Gol','13',NULL,'Primeiro Tempo'),(840,3014,68,12,'Gol','17',NULL,'Primeiro Tempo'),(841,3014,67,12,'Gol','25',NULL,'Primeiro Tempo'),(842,3014,65,12,'Falta','0',NULL,'Segundo Tempo'),(843,3014,95,13,'Falta','1',NULL,'Segundo Tempo'),(844,3014,65,12,'Gol','6',NULL,'Segundo Tempo'),(845,3014,62,12,'Gol','8',NULL,'Segundo Tempo'),(846,3014,65,12,'Assistência','8',NULL,'Segundo Tempo'),(847,3014,87,13,'Gol','13',NULL,'Segundo Tempo'),(848,3014,65,12,'Gol','13',NULL,'Segundo Tempo'),(849,3014,70,12,'Gol','17',NULL,'Segundo Tempo'),(850,3013,37,14,'Gol','16',NULL,'Primeiro Tempo'),(851,3013,41,14,'Assistência','16',NULL,'Primeiro Tempo'),(852,3013,41,14,'Gol','24',NULL,'Primeiro Tempo'),(853,3013,74,18,'Assistência','4',NULL,'Segundo Tempo'),(854,3013,75,18,'Gol','5',NULL,'Segundo Tempo'),(855,3013,47,14,'Cartão Amarelo','6',NULL,'Segundo Tempo'),(856,3013,43,14,'Cartão Azul','12',NULL,'Segundo Tempo'),(857,3013,41,14,'Cartão Amarelo','13',NULL,'Segundo Tempo'),(858,3013,43,14,'Cartão Amarelo','13',NULL,'Segundo Tempo'),(859,3013,38,14,'Gol','21',NULL,'Segundo Tempo'),(860,3013,84,18,'Gol','22',NULL,'Segundo Tempo'),(867,3012,2012,1001,'Ponto de Saque','0',NULL,'1º Set'),(868,3012,2016,1002,'Ponto de Bloqueio','0',NULL,'1º Set'),(869,3012,2014,1001,'Ponto de Bloqueio','1',NULL,'1º Set'),(870,3012,2018,1002,'Ponto de Bloqueio','1',NULL,'1º Set'),(871,3019,65,12,'Gol','0',NULL,'Primeiro Tempo'),(872,3019,106,20,'Gol','0',NULL,'Primeiro Tempo'),(873,3019,65,12,'Assistência','2',NULL,'Primeiro Tempo'),(874,3019,67,12,'Gol','2',NULL,'Primeiro Tempo'),(875,3019,65,12,'Gol','3',NULL,'Primeiro Tempo'),(876,3018,121,17,'Assistência','12',NULL,'Primeiro Tempo'),(877,3018,116,17,'Gol','12',NULL,'Primeiro Tempo'),(878,3018,44,14,'Assistência','16',NULL,'Primeiro Tempo'),(879,3018,43,14,'Gol','16',NULL,'Primeiro Tempo'),(880,3018,121,17,'Gol','19',NULL,'Primeiro Tempo'),(881,3018,37,14,'Gol','20',NULL,'Primeiro Tempo'),(882,3018,116,17,'Assistência','21',NULL,'Primeiro Tempo'),(883,3018,117,17,'Gol','21',NULL,'Primeiro Tempo'),(884,3012,2002,1002,'Cartão Amarelo','0',NULL,'1º Set'),(885,3012,2019,1002,'Ponto de Saque','0',NULL,'1º Set'),(886,3012,2019,1002,'Cartão Amarelo','1',NULL,'1º Set'),(887,3012,2009,1001,'Ponto de Saque','1',NULL,'1º Set'),(888,3012,2002,1002,'Ponto de Saque','0',NULL,'2º Set'),(889,3012,2019,1002,'Ponto Normal','0',NULL,'2º Set'),(890,3012,2015,1002,'Ponto de Bloqueio','0',NULL,'2º Set'),(891,3012,2013,1001,'Ponto de Bloqueio','0',NULL,'2º Set'),(892,3021,101,20,'Falta','7',NULL,'Primeiro Tempo'),(893,3021,100,20,'Falta','21',NULL,'Primeiro Tempo'),(894,3021,47,14,'Cartão Amarelo','2',NULL,'Segundo Tempo'),(895,3021,101,20,'Gol','19',NULL,'Segundo Tempo'),(896,3021,101,20,'Gol','19',NULL,'Segundo Tempo'),(897,3021,102,20,'Assistência','0',NULL,'Tempo Extra'),(898,3020,65,12,'Cartão Amarelo','5',NULL,'Primeiro Tempo'),(899,3020,121,17,'Gol','14',NULL,'Primeiro Tempo'),(900,3020,121,17,'Assistência','23',NULL,'Primeiro Tempo'),(901,3020,116,17,'Gol','24',NULL,'Primeiro Tempo'),(902,3020,121,17,'Assistência','1',NULL,'Segundo Tempo'),(903,3020,117,17,'Gol','1',NULL,'Segundo Tempo'),(904,3020,61,12,'Gol','16',NULL,'Segundo Tempo'),(905,3020,65,12,'Assistência','17',NULL,'Segundo Tempo'),(906,3020,121,17,'Cartão Amarelo','17',NULL,'Segundo Tempo'),(907,3020,121,17,'Cartão Azul','18',NULL,'Segundo Tempo'),(908,3020,121,17,'Cartão Vermelho','18',NULL,'Segundo Tempo');
/*!40000 ALTER TABLE `sumulas_eventos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sumulas_periodos`
--

DROP TABLE IF EXISTS `sumulas_periodos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sumulas_periodos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_partida` int(11) NOT NULL,
  `id_equipe_a` int(11) DEFAULT NULL,
  `id_equipe_b` int(11) DEFAULT NULL,
  `periodo` varchar(50) DEFAULT NULL,
  `hora_inicio` datetime DEFAULT NULL,
  `hora_fim` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_partida` (`id_partida`),
  KEY `id_equipe_a` (`id_equipe_a`),
  KEY `id_equipe_b` (`id_equipe_b`),
  CONSTRAINT `sumulas_periodos_ibfk_1` FOREIGN KEY (`id_partida`) REFERENCES `partidas` (`id`),
  CONSTRAINT `sumulas_periodos_ibfk_2` FOREIGN KEY (`id_equipe_a`) REFERENCES `equipes` (`id`),
  CONSTRAINT `sumulas_periodos_ibfk_3` FOREIGN KEY (`id_equipe_b`) REFERENCES `equipes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=231 DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sumulas_periodos`
--

LOCK TABLES `sumulas_periodos` WRITE;
/*!40000 ALTER TABLE `sumulas_periodos` DISABLE KEYS */;
INSERT INTO `sumulas_periodos` VALUES (77,197,NULL,NULL,'Primeiro Tempo','2025-09-01 20:18:34','2025-09-01 20:19:36'),(78,197,NULL,NULL,'Pausa Primeiro Tempo','2025-09-01 20:19:28',NULL),(79,183,NULL,NULL,'Primeiro Tempo','2025-09-01 20:20:37','2025-09-01 20:21:59'),(81,178,NULL,NULL,'Primeiro Tempo','2025-09-01 20:25:26',NULL),(83,183,NULL,NULL,'Segundo Tempo','2025-09-01 20:32:36','2025-09-01 20:33:07'),(84,202,NULL,NULL,'Primeiro Tempo','2025-09-01 20:37:30','2025-09-01 20:40:43'),(85,202,NULL,NULL,'Pausa Primeiro Tempo','2025-09-01 20:38:07','2025-09-01 20:40:06'),(86,202,NULL,NULL,'Segundo Tempo','2025-09-01 20:44:20','2025-09-01 20:44:56'),(88,205,NULL,NULL,'Primeiro Tempo','2025-09-01 20:55:24','2025-09-01 20:57:36'),(89,201,NULL,NULL,'Primeiro Tempo','2025-09-02 17:14:57','2025-09-02 17:17:35'),(90,199,NULL,NULL,'Primeiro Tempo','2025-09-02 17:20:35','2025-09-02 17:23:14'),(91,196,NULL,NULL,'Primeiro Tempo','2025-09-02 19:25:45','2025-09-02 19:48:30'),(92,196,NULL,NULL,'Segundo Tempo','2025-09-02 19:53:34','2025-09-02 20:17:16'),(96,244,NULL,NULL,'Primeiro Tempo','2025-09-16 22:21:37','2025-09-16 22:47:45'),(97,244,NULL,NULL,'Segundo Tempo','2025-09-16 22:51:22','2025-09-16 23:17:47'),(98,244,NULL,NULL,'Tempo Extra','2025-09-16 23:17:58',NULL),(99,244,NULL,NULL,'Tempo Extra','2025-09-16 23:18:02',NULL),(100,245,NULL,NULL,'Primeiro Tempo','2025-09-16 23:22:22','2025-09-16 23:47:45'),(101,245,NULL,NULL,'Segundo Tempo','2025-09-16 23:50:12','2025-09-17 00:14:48'),(102,245,NULL,NULL,'Tempo Extra','2025-09-17 00:16:52','2025-09-18 17:45:40'),(103,245,NULL,NULL,'Tempo Extra','2025-09-17 00:16:55','2025-09-18 17:45:49'),(104,268,NULL,NULL,'Primeiro Tempo','2025-09-18 23:37:35','2025-09-18 23:40:59'),(105,272,NULL,NULL,'Primeiro Tempo','2025-09-18 23:49:06','2025-09-18 23:49:34'),(106,209,NULL,NULL,'Primeiro Tempo','2025-09-19 20:59:49','2025-09-19 21:06:07'),(107,211,NULL,NULL,'Primeiro Tempo','2025-09-19 21:10:07','2025-09-19 21:29:30'),(108,210,NULL,NULL,'Primeiro Tempo','2025-09-19 21:30:41','2025-09-19 21:31:41'),(109,208,NULL,NULL,'Primeiro Tempo','2025-09-19 21:41:59','2025-09-19 21:44:41'),(110,243,NULL,NULL,'Primeiro Tempo','2025-09-19 21:52:09','2025-09-19 21:53:54'),(111,242,NULL,NULL,'Primeiro Tempo','2025-09-19 21:56:22','2025-09-19 22:01:33'),(112,211,NULL,NULL,'Segundo Tempo','2025-09-19 22:37:07','2025-09-19 22:38:57'),(125,241,NULL,NULL,'Primeiro Tempo','2025-09-23 22:23:00','2025-09-23 22:48:18'),(126,241,NULL,NULL,'Segundo Tempo','2025-09-23 22:52:25','2025-09-23 23:19:05'),(127,241,NULL,NULL,'Tempo Extra','2025-09-23 23:19:31','2025-09-23 23:19:51'),(128,241,NULL,NULL,'Tempo Extra','2025-09-23 23:19:59',NULL),(129,246,NULL,NULL,'Primeiro Tempo','2025-09-23 23:26:11','2025-09-23 23:51:33'),(130,246,NULL,NULL,'Segundo Tempo','2025-09-23 23:54:30','2025-09-24 00:15:52'),(131,246,NULL,NULL,'Tempo Extra','2025-09-24 00:16:03',NULL),(132,268,NULL,NULL,'Tempo Extra','2025-09-24 21:06:32','2025-09-24 21:07:41'),(133,268,NULL,NULL,'Segundo Tempo','2025-09-24 21:08:13','2025-09-24 21:09:17'),(134,247,NULL,NULL,'Primeiro Tempo','2025-09-25 22:28:27','2025-09-25 22:49:18'),(135,248,NULL,NULL,'Primeiro Tempo','2025-09-25 23:21:02','2025-09-25 23:50:44'),(136,248,NULL,NULL,'Segundo Tempo','2025-09-25 23:50:44','2025-09-25 23:50:45'),(137,248,NULL,NULL,'Tempo Extra','2025-09-25 23:55:29','2025-09-26 00:15:31'),(138,268,NULL,NULL,'Tempo Extra','2025-09-26 15:02:00','2025-09-26 15:02:27'),(139,278,NULL,NULL,'Primeiro Tempo','2025-09-26 19:59:16','2025-09-26 20:00:56'),(145,180,NULL,NULL,'Primeiro Tempo','2025-10-02 22:36:36','2025-10-02 22:36:45'),(146,177,NULL,NULL,'Primeiro Tempo','2025-10-02 23:18:27','2025-10-02 23:44:06'),(147,177,NULL,NULL,'Segundo Tempo','2025-10-02 23:47:48','2025-10-03 00:13:20'),(148,176,NULL,NULL,'Primeiro Tempo','2025-10-07 22:27:14','2025-10-07 22:56:24'),(149,176,NULL,NULL,'Segundo Tempo','2025-10-07 22:56:46','2025-10-07 23:03:10'),(150,212,NULL,NULL,'Primeiro Tempo','2025-10-07 23:22:31','2025-10-07 23:51:48'),(151,212,NULL,NULL,'Segundo Tempo','2025-10-07 23:52:25',NULL),(152,194,NULL,NULL,'Primeiro Tempo','2025-10-09 22:30:29','2025-10-09 22:54:37'),(153,194,NULL,NULL,'Segundo Tempo','2025-10-09 22:58:10','2025-10-09 23:24:36'),(154,255,NULL,NULL,'Primeiro Tempo','2025-10-09 23:31:46','2025-10-09 23:56:06'),(155,255,NULL,NULL,'Segundo Tempo','2025-10-09 23:59:47','2025-10-15 17:27:46'),(156,251,NULL,NULL,'Primeiro Tempo','2025-10-14 22:24:34','2025-10-14 22:51:54'),(157,251,NULL,NULL,'Segundo Tempo','2025-10-14 22:52:28','2025-10-14 23:20:04'),(158,252,NULL,NULL,'Primeiro Tempo','2025-10-14 23:26:11','2025-10-14 23:52:26'),(159,252,NULL,NULL,'Segundo Tempo','2025-10-14 23:52:29',NULL),(160,253,NULL,NULL,'Primeiro Tempo','2025-10-23 22:25:04','2025-10-23 22:41:19'),(161,253,NULL,NULL,'Segundo Tempo','2025-10-23 22:41:31','2025-10-23 23:18:55'),(162,265,NULL,NULL,'Primeiro Tempo','2025-10-23 23:24:03','2025-10-23 23:51:51'),(163,265,NULL,NULL,'Segundo Tempo','2025-10-23 23:51:54',NULL),(164,256,NULL,NULL,'Primeiro Tempo','2025-10-30 22:19:14','2025-10-30 22:44:55'),(165,256,NULL,NULL,'Segundo Tempo','2025-10-30 22:48:05','2025-10-30 23:14:38'),(166,259,NULL,NULL,'Primeiro Tempo','2025-10-30 23:17:10','2025-10-30 23:42:01'),(167,259,NULL,NULL,'Segundo Tempo','2025-10-30 23:44:45','2025-10-31 00:01:58'),(168,250,NULL,NULL,'Primeiro Tempo','2025-10-31 00:04:39','2025-10-31 00:09:07'),(169,3001,NULL,NULL,'Primeiro Tempo','2025-11-06 02:05:36','2025-11-06 02:08:02'),(170,258,NULL,NULL,'Primeiro Tempo','2025-11-06 20:14:50','2025-11-06 20:19:01'),(171,259,NULL,NULL,'Tempo Extra','2025-11-06 20:20:10','2025-11-06 20:21:50'),(172,257,NULL,NULL,'Primeiro Tempo','2025-11-06 20:23:22','2025-11-06 20:28:28'),(173,262,NULL,NULL,'Primeiro Tempo','2025-11-06 20:30:00','2025-11-06 20:31:37'),(174,264,NULL,NULL,'Primeiro Tempo','2025-11-06 22:25:24','2025-11-06 22:50:25'),(175,264,NULL,NULL,'Segundo Tempo','2025-11-06 22:54:28','2025-11-06 23:19:41'),(185,3002,NULL,NULL,'1º Set','2025-11-07 14:39:44','2025-11-07 14:48:52'),(186,3002,NULL,NULL,'2º Set','2025-11-07 15:33:35','2025-11-07 15:47:51'),(187,3002,NULL,NULL,'3º Set','2025-11-07 15:48:09','2025-11-07 16:48:25'),(192,3002,NULL,NULL,'4º Set','2025-11-07 19:14:07','2025-11-07 19:18:59'),(196,3002,NULL,NULL,'5º Set','2025-11-07 20:03:59','2025-11-07 20:25:10'),(199,268,NULL,NULL,'Tempo Extra','2025-11-13 13:07:31','2025-11-13 13:08:10'),(200,3016,NULL,NULL,'Primeiro Tempo','2025-11-13 18:32:14','2025-11-13 18:33:14'),(201,3015,NULL,NULL,'Primeiro Tempo','2025-11-13 18:33:58','2025-11-13 18:34:43'),(202,3014,NULL,NULL,'Primeiro Tempo','2025-11-13 22:30:43','2025-11-13 22:57:21'),(203,3014,NULL,NULL,'Segundo Tempo','2025-11-13 22:59:54','2025-11-13 23:21:52'),(204,3013,NULL,NULL,'Primeiro Tempo','2025-11-13 23:27:22','2025-11-13 23:53:31'),(205,3013,NULL,NULL,'Segundo Tempo','2025-11-13 23:54:41','2025-11-14 00:20:10'),(220,3018,NULL,NULL,'Primeiro Tempo','2025-11-19 13:15:12','2025-11-19 13:37:06'),(221,3019,NULL,NULL,'Primeiro Tempo','2025-11-19 13:23:11','2025-11-19 13:26:36'),(222,3012,NULL,NULL,'1º Set','2025-11-19 13:56:04','2025-11-19 13:58:37'),(223,3012,1001,NULL,'Pausa 1º Set','2025-11-19 13:58:19','2025-11-19 13:58:33'),(224,3012,NULL,NULL,'2º Set','2025-11-24 11:54:22','2025-11-24 11:55:53'),(225,3021,NULL,NULL,'Primeiro Tempo','2025-11-25 22:32:02','2025-11-25 22:54:56'),(226,3021,NULL,NULL,'Segundo Tempo','2025-11-25 22:58:44','2025-11-25 23:18:43'),(227,3021,NULL,NULL,'Tempo Extra','2025-11-25 23:18:51','2025-11-25 23:41:41'),(228,3020,NULL,NULL,'Primeiro Tempo','2025-11-25 23:43:00','2025-11-26 00:08:22'),(229,3020,NULL,NULL,'Segundo Tempo','2025-11-26 00:13:13','2025-11-26 00:59:26'),(230,3009,NULL,NULL,'1º Set','2026-01-14 14:23:44',NULL);
/*!40000 ALTER TABLE `sumulas_periodos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sumulas_pontos_sets`
--

DROP TABLE IF EXISTS `sumulas_pontos_sets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sumulas_pontos_sets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_partida` int(11) NOT NULL,
  `periodo` varchar(20) NOT NULL,
  `pontos_equipe_a` int(11) DEFAULT 0,
  `pontos_equipe_b` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_set` (`id_partida`,`periodo`),
  CONSTRAINT `sumulas_pontos_sets_ibfk_1` FOREIGN KEY (`id_partida`) REFERENCES `partidas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sumulas_pontos_sets`
--

LOCK TABLES `sumulas_pontos_sets` WRITE;
/*!40000 ALTER TABLE `sumulas_pontos_sets` DISABLE KEYS */;
INSERT INTO `sumulas_pontos_sets` VALUES (1,3012,'2º Set',1,3),(2,3009,'1º Set',0,0);
/*!40000 ALTER TABLE `sumulas_pontos_sets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sumulas_posicoes`
--

DROP TABLE IF EXISTS `sumulas_posicoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sumulas_posicoes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_partida` int(11) NOT NULL,
  `periodo` varchar(50) NOT NULL,
  `id_equipe` int(11) NOT NULL,
  `posicao` int(11) NOT NULL,
  `id_participante` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_pos` (`id_partida`,`periodo`,`id_equipe`,`posicao`),
  KEY `id_equipe` (`id_equipe`),
  KEY `id_participante` (`id_participante`),
  CONSTRAINT `sumulas_posicoes_ibfk_1` FOREIGN KEY (`id_partida`) REFERENCES `partidas` (`id`),
  CONSTRAINT `sumulas_posicoes_ibfk_2` FOREIGN KEY (`id_equipe`) REFERENCES `equipes` (`id`),
  CONSTRAINT `sumulas_posicoes_ibfk_3` FOREIGN KEY (`id_participante`) REFERENCES `participantes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=153 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sumulas_posicoes`
--

LOCK TABLES `sumulas_posicoes` WRITE;
/*!40000 ALTER TABLE `sumulas_posicoes` DISABLE KEYS */;
INSERT INTO `sumulas_posicoes` VALUES (117,3012,'1º Set',1001,1,2013),(118,3012,'1º Set',1001,2,2011),(119,3012,'1º Set',1001,3,2009),(120,3012,'1º Set',1001,4,2010),(121,3012,'1º Set',1001,5,2014),(122,3012,'1º Set',1001,6,2012),(123,3012,'1º Set',1002,1,2020),(124,3012,'1º Set',1002,2,2016),(125,3012,'1º Set',1002,3,2015),(126,3012,'1º Set',1002,4,2017),(127,3012,'1º Set',1002,5,2019),(128,3012,'1º Set',1002,6,2018),(129,3012,'2º Set',1001,1,2001),(130,3012,'2º Set',1001,2,2010),(131,3012,'2º Set',1001,3,2011),(132,3012,'2º Set',1001,4,2012),(133,3012,'2º Set',1001,5,2013),(134,3012,'2º Set',1001,6,2014),(135,3012,'2º Set',1002,1,2019),(136,3012,'2º Set',1002,2,2015),(137,3012,'2º Set',1002,3,2020),(138,3012,'2º Set',1002,4,2016),(139,3012,'2º Set',1002,5,2017),(140,3012,'2º Set',1002,6,2018),(141,3009,'1º Set',1001,1,2014),(142,3009,'1º Set',1001,2,2001),(143,3009,'1º Set',1001,3,2013),(144,3009,'1º Set',1001,4,2010),(145,3009,'1º Set',1001,5,2011),(146,3009,'1º Set',1001,6,2012),(147,3009,'1º Set',1002,1,2018),(148,3009,'1º Set',1002,2,2019),(149,3009,'1º Set',1002,3,2016),(150,3009,'1º Set',1002,4,2015),(151,3009,'1º Set',1002,5,2017),(152,3009,'1º Set',1002,6,2002);
/*!40000 ALTER TABLE `sumulas_posicoes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sumulas_volei`
--

DROP TABLE IF EXISTS `sumulas_volei`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sumulas_volei` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_partida` int(11) NOT NULL,
  `equipe_sacando_atual` int(11) DEFAULT NULL,
  `ultimo_set_rotacionado` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_partida` (`id_partida`),
  CONSTRAINT `sumulas_volei_ibfk_1` FOREIGN KEY (`id_partida`) REFERENCES `partidas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sumulas_volei`
--

LOCK TABLES `sumulas_volei` WRITE;
/*!40000 ALTER TABLE `sumulas_volei` DISABLE KEYS */;
INSERT INTO `sumulas_volei` VALUES (21,3012,1001,NULL),(26,3009,1001,NULL);
/*!40000 ALTER TABLE `sumulas_volei` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sumulas_volei_config`
--

DROP TABLE IF EXISTS `sumulas_volei_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sumulas_volei_config` (
  `id_partida` int(11) NOT NULL,
  `equipe_esquerda_primeiro_set` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_partida`),
  CONSTRAINT `sumulas_volei_config_ibfk_1` FOREIGN KEY (`id_partida`) REFERENCES `partidas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sumulas_volei_config`
--

LOCK TABLES `sumulas_volei_config` WRITE;
/*!40000 ALTER TABLE `sumulas_volei_config` DISABLE KEYS */;
INSERT INTO `sumulas_volei_config` VALUES (3009,1001),(3012,1002);
/*!40000 ALTER TABLE `sumulas_volei_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `senha` varchar(255) NOT NULL,
  `tipo` enum('admin','lider_equipe') NOT NULL,
  `data_criacao` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'Gabriel Roger Santos de Oliveira','gabrielroger2019@hotmail.com','$2y$10$nEgODbU29HIZj0qT6/W6IeeJ8I.uVHrSEhl/vvv4aM4sN/AndTxd2','admin','2025-07-01 01:22:26'),(2,'Teste Time','teste3@hotmail.com','$2y$10$2HvcxcC5lDoJ0HL2.3e1Jukd1uqjNmT2yNAV2scxR40z2kNY5Hnv2','lider_equipe','2025-07-01 01:23:26'),(3,'Teste 2','teste2@hotmail.com','$2y$10$FzgnkKJKuxUche89d8kKzO0ctcG.XvZ8p4781If4E8rKNAEKXQUIW','lider_equipe','2025-07-01 01:52:45'),(4,'Gabriel Teste','teste1@hotmail.com','$2y$10$AkDMmOT0sGp2Kq4jmNC9Ou/PAAHBr03otVKzfNIi1hbZITt5Z7vxy','lider_equipe','2025-07-01 02:51:36'),(5,'Teste 3','teste4@hotmail.com','$2y$10$MelVDBRX23yHTDo7vvcdbuDYSRAjXIBywKF.I7m8Mtg7xbDa3KszW','lider_equipe','2025-07-20 18:14:30'),(6,'Teste 4','teste5@hotmail.com','$2y$10$lRdZBIivZENrJ0d8Pu2nIuGfjHKNJlkZO55z2daWqP0CvKB4X6qcm','lider_equipe','2025-07-20 18:14:57'),(7,'Teste 5','teste6@hotmail.com','$2y$10$SMKnL8OarWo9e5i/iuuru.uT/xGOj7ICSLbGIKHAdzv/J8Ew./q76','lider_equipe','2025-07-20 18:15:13'),(8,'Teste 6','teste7@hotmail.com','$2y$10$JMwn24D5/0hyauhpMz53k.MtQCqGls9z0rHNZpQgUXCDfmSs2WGFm','lider_equipe','2025-07-20 18:15:35'),(9,'Teste 7','teste8@hotmail.com','$2y$10$m1RGVtT2nLrE3OQv3MpU0.gRFWYcELe3z51gSRM6UvE/PYT2vwgNq','lider_equipe','2025-07-20 18:15:58'),(10,'Teste 9','teste9@hotmail.com','$2y$10$am7QyaVi27VO4xM30OW7c.blXTakud9Ivj6uNMpvypggmp0pTiJOS','lider_equipe','2025-07-20 18:16:12'),(11,'Assis Upnow Sistemas','assis@hotmail.com','$2y$10$nmPcMvhplbiF/v5qkREYQ.EreqW5.oYuQpwBwA7mHlU7F8ypzkkoW','lider_equipe','2025-07-21 03:20:04'),(12,'adm','admin@hotmail.com','$2y$10$nmPcMvhplbiF/v5qkREYQ.EreqW5.oYuQpwBwA7mHlU7F8ypzkkoW','admin','2025-07-21 03:20:04'),(13,'Guilherme Kaiser','guilhermemkb@gmail.com','$2y$10$YLjrpWT/Wgn5rdH3S0NYrudNBoipY7iGKjiNtEvzDkPYfLa0DWDH2','lider_equipe','2025-08-12 11:47:08'),(14,'Giovane Batista','giovane.geg@gmail.com','$2y$10$GK8JA2NceGGcNGrmH3slxe2fwUG23bHiAJYrLKJdv8/HYWP4nkM9C','admin','2025-08-12 19:11:15'),(15,'MATEUS SOLANHO','mateusgsolanho@gmail.com','$2y$10$OOA1mhtU5wHqb5rC13mwXuXt7L72g8JoVHIY5OXeixkF2u35s5wY6','lider_equipe','2025-08-12 19:32:54'),(16,'Teste Toledão','midia7agencia@gmail.com','$2y$10$4C0K83wUulzrid3bXkMZze8b9M9hpLIjQe77snY0xZjTBr0eQXsA2','lider_equipe','2025-09-18 18:52:15');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-20 23:28:50
