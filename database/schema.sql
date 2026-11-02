CREATE DATABASE IF NOT EXISTS mediai_hospital
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mediai_hospital;

CREATE TABLE users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patients (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  date_of_birth DATE NULL,
  phone VARCHAR(30) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_patients_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE departments (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(500),
  timings VARCHAR(255),
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE doctors (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  department_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  specialization VARCHAR(150) NOT NULL,
  qualification VARCHAR(255),
  experience_years INT UNSIGNED DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  CONSTRAINT fk_doctor_department FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE appointments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  doctor_id INT UNSIGNED NOT NULL,
  appointment_date DATETIME NOT NULL,
  reason VARCHAR(500),
  status ENUM('booked','confirmed','cancelled','completed') DEFAULT 'booked',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_appointment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_appointment_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

CREATE TABLE ai_chat_history (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ai_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE contact_messages (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hospital_contact (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  hospital_name VARCHAR(150) NOT NULL,
  address VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  timings VARCHAR(255) NOT NULL
);

INSERT INTO departments(name,description,timings) VALUES
('Cardiology','Fictional cardiology department for demonstration.','Mon-Fri 09:00-17:00'),
('Orthopedics','Fictional orthopedics department for demonstration.','Mon-Sat 10:00-18:00'),
('General Medicine','Fictional general medicine department for demonstration.','Mon-Sat 09:00-17:00'),
('Pediatrics','Fictional pediatrics department for demonstration.','Mon-Sat 10:00-18:00');

INSERT INTO doctors(department_id,name,specialization,qualification,experience_years)
SELECT id,'Dr. Aarav Mehta','Cardiology','MD Cardiology (Fictional)',12 FROM departments WHERE name='Cardiology';
INSERT INTO doctors(department_id,name,specialization,qualification,experience_years)
SELECT id,'Dr. Isha Rao','Orthopedics','MS Orthopedics (Fictional)',10 FROM departments WHERE name='Orthopedics';
INSERT INTO doctors(department_id,name,specialization,qualification,experience_years)
SELECT id,'Dr. Neel Shah','General Medicine','MD Medicine (Fictional)',8 FROM departments WHERE name='General Medicine';
INSERT INTO doctors(department_id,name,specialization,qualification,experience_years)
SELECT id,'Dr. Kavya Nair','Pediatrics','MD Pediatrics (Fictional)',9 FROM departments WHERE name='Pediatrics';

INSERT INTO hospital_contact(hospital_name,address,phone,email,timings)
VALUES('APEX Care Hospital','100 Learning Avenue, Demo City, India','+91-00000-00000','demo@example.invalid','24x7 emergency demo; OPD Mon-Sat 09:00-18:00');

-- Validation queries:
SELECT * FROM departments;
SELECT * FROM doctors;
SELECT COUNT(*) AS user_count FROM users;
SELECT COUNT(*) AS appointment_count FROM appointments;
