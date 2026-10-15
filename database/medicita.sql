CREATE DATABASE IF NOT EXISTS medicita_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medicita_db;

CREATE TABLE specialties (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(255) NOT NULL UNIQUE
);
CREATE TABLE patients (
 id INT AUTO_INCREMENT PRIMARY KEY,
 full_name VARCHAR(255) NOT NULL,
 email VARCHAR(150) NOT NULL UNIQUE,
 phone VARCHAR(255)
);
CREATE TABLE users (
 id INT AUTO_INCREMENT PRIMARY KEY,
 patient_id INT NULL UNIQUE,
 email VARCHAR(150) NOT NULL UNIQUE,
 password VARCHAR(255) NOT NULL,
 role ENUM('patient','admin') NOT NULL DEFAULT 'patient',
 FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT
);
CREATE TABLE doctors (
 id INT AUTO_INCREMENT PRIMARY KEY,
 full_name VARCHAR(255) NOT NULL,
 specialty_id INT NOT NULL,
 schedule_description VARCHAR(255) NOT NULL,
 consultation_price DECIMAL(12,2) NOT NULL,
 profile TEXT,
 active TINYINT NOT NULL DEFAULT 1,
 FOREIGN KEY (specialty_id) REFERENCES specialties(id)
);
CREATE TABLE doctor_schedules (
 id INT AUTO_INCREMENT PRIMARY KEY,
 doctor_id INT NOT NULL,
 weekday TINYINT NOT NULL,
 start_time TIME NOT NULL,
 end_time TIME NOT NULL,
 FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);
CREATE TABLE appointments (
 id INT AUTO_INCREMENT PRIMARY KEY,
 patient_id INT NOT NULL,
 doctor_id INT NOT NULL,
 starts_at DATETIME NOT NULL,
 duration_minutes INT NOT NULL DEFAULT 30,
 price_at_booking DECIMAL(12,2) NOT NULL,
 status ENUM('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
 FOREIGN KEY (patient_id) REFERENCES patients(id),
 FOREIGN KEY (doctor_id) REFERENCES doctors(id),
 INDEX appointment_doctor_time (doctor_id, starts_at)
);
CREATE TABLE reviews (
 id INT AUTO_INCREMENT PRIMARY KEY,
 appointment_id INT NOT NULL UNIQUE,
 rating TINYINT NOT NULL,
 comment TEXT NULL,
 wait_minutes INT NULL,
 FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);
CREATE TABLE review_tags (
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(80) NOT NULL UNIQUE
);
CREATE TABLE review_tag_assignments (
 review_id INT NOT NULL,
 tag_id INT NOT NULL,
 PRIMARY KEY (review_id, tag_id),
 FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
 FOREIGN KEY (tag_id) REFERENCES review_tags(id) ON DELETE CASCADE
);
CREATE TABLE medical_results (
 id INT AUTO_INCREMENT PRIMARY KEY,
 patient_id INT NOT NULL,
 exam_name VARCHAR(255) NOT NULL,
 result_type ENUM('numeric','qualitative','imaging') NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (patient_id) REFERENCES patients(id)
);
CREATE TABLE numeric_results (
 result_id INT PRIMARY KEY,
 measured_value DECIMAL(12,3) NOT NULL,
 unit VARCHAR(40) NOT NULL,
 reference_min DECIMAL(12,3) NOT NULL,
 reference_max DECIMAL(12,3) NOT NULL,
 FOREIGN KEY (result_id) REFERENCES medical_results(id) ON DELETE CASCADE
);
CREATE TABLE qualitative_results (
 result_id INT PRIMARY KEY,
 finding VARCHAR(250) NOT NULL,
 FOREIGN KEY (result_id) REFERENCES medical_results(id) ON DELETE CASCADE
);
CREATE TABLE imaging_results (
 result_id INT PRIMARY KEY,
 report_text TEXT NOT NULL,
 image_path VARCHAR(500) NOT NULL,
 FOREIGN KEY (result_id) REFERENCES medical_results(id) ON DELETE CASCADE
);
INSERT INTO specialties(name) VALUES ('Medicina general'), ('Cardiología'), ('Dermatología');
