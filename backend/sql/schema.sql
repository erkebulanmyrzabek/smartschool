-- schema.sql
CREATE DATABASE IF NOT EXISTS smartschool CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartschool;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  role ENUM('student','teacher','admin') NOT NULL,
  class VARCHAR(50) NULL,
  subject VARCHAR(150) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE chats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  sender_name VARCHAR(150) NOT NULL,
  text TEXT NOT NULL,
  is_private TINYINT(1) DEFAULT 0,
  private_to_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE lessons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject VARCHAR(150) NOT NULL,
  teacher_id INT NOT NULL,
  teacher_name VARCHAR(150) NOT NULL,
  lesson_date DATE NOT NULL,
  lesson_time TIME NOT NULL,
  topic VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  subject VARCHAR(150) NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  term VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
