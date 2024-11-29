
DROP TABLE IF EXISTS `blockchain`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blockchain` (
  `id` int NOT NULL AUTO_INCREMENT,
  `index` int NOT NULL,
  `timestamp` datetime NOT NULL,
  `data` json NOT NULL,
  `previousHash` varchar(255) NOT NULL,
  `hash` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `blockchain_checkpoint`
--

DROP TABLE IF EXISTS `blockchain_checkpoint`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blockchain_checkpoint` (
  `id` int NOT NULL AUTO_INCREMENT,
  `checkpoint_data` json NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `nongsan`
--

DROP TABLE IF EXISTS `nongsan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nongsan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `area` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `address` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `phone` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `startAt` date DEFAULT NULL,
  `endAt` date DEFAULT NULL,
  `syncAt` date DEFAULT NULL,
  `market` varchar(500) COLLATE utf8mb4_0900_as_cs DEFAULT NULL,
  `createdAt` date DEFAULT NULL,
  `updatedAt` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=133065 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `producers`
--

DROP TABLE IF EXISTS `producers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `producers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `address` text,
  `lat` float DEFAULT NULL,
  `lng` float DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rice_batches`
--

DROP TABLE IF EXISTS `rice_batches`;
CREATE TABLE `rice_batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rice_type` varchar(100) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `attributes` text,
  `weight` float DEFAULT NULL,
  `certifications` text,
  `brand` varchar(100) DEFAULT NULL,
  `produced_by` int DEFAULT NULL,
  `transported_by` int DEFAULT NULL,
  `blockchain_hash` varchar(255) DEFAULT NULL,
  `email` varchar(45) DEFAULT NULL,
  `NumBatches` varchar(45) DEFAULT NULL,
  `region_code` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `produced_by` (`produced_by`),
  KEY `transported_by` (`transported_by`),
  CONSTRAINT `rice_batches_ibfk_1` FOREIGN KEY (`produced_by`) REFERENCES `producers` (`id`),
  CONSTRAINT `rice_batches_ibfk_2` FOREIGN KEY (`transported_by`) REFERENCES `transporters` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `transporters`
--

DROP TABLE IF EXISTS `transporters`;
CREATE TABLE `transporters` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `address` text,
  `lat` float DEFAULT NULL,
  `lng` float DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` enum('farmer','admin') DEFAULT 'farmer',
  `isEnable` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO users (name, email, password, role, isEnable)
VALUES 
('Admin User', 'admin@example.com', '$2a$10$H5ThdsHH4tO/MTmbnn5ajO35sXbwbpuB0L3o8O2OBsp0rzl1z/I2m', 'admin', 1);
INSERT INTO users (name, email, password, role, isEnable)
VALUES 
('Farmer User', 'farmer@example.com', '$2a$10$H5ThdsHH4tO/MTmbnn5ajO35sXbwbpuB0L3o8O2OBsp0rzl1z/I2m', 'farmer', 1);
-- pass:Vnpt#@123456!
-- Dump completed on 2024-11-29 14:20:37
