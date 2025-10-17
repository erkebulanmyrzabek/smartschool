CREATE DATABASE smartschool CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartschool;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  role ENUM('student','teacher','admin'),
  subject VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT,
  receiver_id INT NULL,
  text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lessons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject VARCHAR(100),
  teacher_id INT,
  date DATE,
  time TIME,
  topic VARCHAR(255)
);

CREATE TABLE grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT,
  subject VARCHAR(100),
  score INT
);
