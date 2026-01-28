CREATE DATABASE  IF NOT EXISTS `u179638245_toledao2025fim` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `u179638245_toledao2025fim`;
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
) ENGINE=InnoDB AUTO_INCREMENT=230 DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
) ENGINE=InnoDB AUTO_INCREMENT=141 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
-- Dumping events for database 'u179638245_toledao2025fim'
--

--
-- Dumping routines for database 'u179638245_toledao2025fim'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-19 12:54:20
