-- ====================================================
-- COMPLETE DATABASE SETUP FOR RECOLETOS TRACKER
-- This is the ONLY database file needed - combines schema and user data
-- Run this entire script to set up your database correctly
-- ====================================================

CREATE DATABASE IF NOT EXISTS recoletos_tracker;
USE recoletos_tracker;

-- =======================
-- DEPARTMENTS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL
);

-- =======================
-- DEPARTMENT_DOCUMENTS TABLE (REQUIRED BY APPLICATION)
-- =======================
CREATE TABLE IF NOT EXISTS department_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  label VARCHAR(255) NOT NULL,
  value VARCHAR(255) NOT NULL,
  requires_faculty BOOLEAN DEFAULT FALSE,
  UNIQUE KEY unique_department_document (department_id, value),
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- =======================
-- USERS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('student','faculty','admin') NOT NULL,
  id_number VARCHAR(32) NOT NULL UNIQUE,
  email VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  department_id INT,
  course VARCHAR(255),
  year_level VARCHAR(64),
  position VARCHAR(255),
  contact_number VARCHAR(32),
  birthdate DATE NULL,
  address TEXT NULL,
  gender VARCHAR(32) NULL,
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- =======================
-- MIGRATION: Add is_super_admin column for existing databases
-- =======================
-- Run this if you get "Unknown column 'is_super_admin'" error
-- Uncomment the line below and run it:
-- ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;

-- =======================
-- FACULTY TABLE
-- =======================
CREATE TABLE IF NOT EXISTS faculty (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  department_id INT NOT NULL,
  specialization VARCHAR(255),
  designation VARCHAR(255),
  availability_status ENUM('available','on_leave','busy') DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- =======================
-- REQUESTS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_code VARCHAR(32) UNIQUE,
  student_id INT NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  student_id_number VARCHAR(32) NOT NULL,
  department_id INT NOT NULL,
  document_id INT NULL,
  document_value VARCHAR(255) NOT NULL,
  document_label VARCHAR(255),
  status ENUM('pending','pending_faculty','in_progress','approved','completed','declined') DEFAULT 'pending',
  priority ENUM('normal','urgent') DEFAULT 'normal',
  quantity INT DEFAULT 1,
  purpose TEXT,
  cross_department BOOLEAN DEFAULT FALSE,
  cross_department_details TEXT,
  faculty_id INT NULL,
  attachments JSON,
  admin_notes JSON,
  faculty_approval JSON,
  requires_faculty BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (faculty_id) REFERENCES faculty(id),
  FOREIGN KEY (document_id) REFERENCES department_documents(id)
);

-- =======================
-- REQUEST_CONVERSATIONS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS request_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =======================
-- NOTIFICATIONS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role ENUM('student','faculty','admin'),
  type VARCHAR(64),
  title VARCHAR(255),
  message TEXT,
  request_id INT,
  read_flag BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (request_id) REFERENCES requests(id)
);

-- ====================================================
-- SEEDING INITIAL DATA
-- ====================================================

-- Departments (Only 9 departments allowed)
INSERT INTO departments (code, name) VALUES
  ('SCS', 'School of Computer Studies (SCS)'),
  ('SBM', 'School of Business Management (SBM)'),
  ('SDPC', 'Student Development and Programs Center (SDPC)'),
  ('SASO', 'Student Affairs and Services Office (SASO)'),
  ('SSD', 'Security Services Department (SSD)'),
  ('CLINIC', 'Clinic'),
  ('SCHOLARSHIP', 'Scholarship Office'),
  ('LIBRARY', 'Library'),
  ('CMO', 'Campus Management Office (CMO)')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Delete any existing "Transcript of Records" documents from all departments
DELETE FROM department_documents 
WHERE label LIKE '%Transcript of Records%' 
   OR value LIKE '%Transcript of Records%'
   OR label LIKE '%TOR%'
   OR value LIKE '%TOR%';

-- Department Documents (strictly matching the specified list)
INSERT INTO department_documents (department_id, label, value, requires_faculty)
VALUES
  -- SBM Documents: Clearance, Endorsement Letter, Activity Letter
  ((SELECT id FROM departments WHERE code = 'SBM'), 'Clearance', 'Clearance', FALSE),
  ((SELECT id FROM departments WHERE code = 'SBM'), 'Endorsement Letter', 'Endorsement Letter', FALSE),
  ((SELECT id FROM departments WHERE code = 'SBM'), 'Activity Letter', 'Activity Letter', FALSE),
  
  -- SDPC Documents: Excuse Slip, Counseling Referral Form
  ((SELECT id FROM departments WHERE code = 'SDPC'), 'Excuse Slip', 'Excuse Slip', FALSE),
  ((SELECT id FROM departments WHERE code = 'SDPC'), 'Counseling Referral Form', 'Counseling Referral Form', FALSE),
  
  -- SASO Documents: Exemption Slip, Parent Consent Letter
  ((SELECT id FROM departments WHERE code = 'SASO'), 'Exemption Slip', 'Exemption Slip', FALSE),
  ((SELECT id FROM departments WHERE code = 'SASO'), 'Parent Consent Letter', 'Parent Consent Letter', FALSE),
  
  -- SSD Documents: Sticker for Vehicles, Gate Pass Request, Lost ID Incident Report
  ((SELECT id FROM departments WHERE code = 'SSD'), 'Sticker for Vehicles', 'Sticker for Vehicles', FALSE),
  ((SELECT id FROM departments WHERE code = 'SSD'), 'Gate Pass Request', 'Gate Pass Request', FALSE),
  ((SELECT id FROM departments WHERE code = 'SSD'), 'Lost ID Incident Report', 'Lost ID Incident Report', FALSE),
  
  -- CLINIC Documents: Medical Certificate, Dental Check-up Form, Health Clearance
  ((SELECT id FROM departments WHERE code = 'CLINIC'), 'Medical Certificate', 'Medical Certificate', FALSE),
  ((SELECT id FROM departments WHERE code = 'CLINIC'), 'Dental Check-up Form', 'Dental Check-up Form', FALSE),
  ((SELECT id FROM departments WHERE code = 'CLINIC'), 'Health Clearance', 'Health Clearance', FALSE),
  
  -- SCS Documents: Clearance, Endorsement Letter, MOA
  ((SELECT id FROM departments WHERE code = 'SCS'), 'Clearance', 'Clearance', FALSE),
  ((SELECT id FROM departments WHERE code = 'SCS'), 'Endorsement Letter', 'Endorsement Letter', FALSE),
  ((SELECT id FROM departments WHERE code = 'SCS'), 'MOA', 'MOA', FALSE),
  
  -- SCHOLARSHIP Documents: Payment Slip, Grade Compliance Report
  ((SELECT id FROM departments WHERE code = 'SCHOLARSHIP'), 'Payment Slip', 'Payment Slip', FALSE),
  ((SELECT id FROM departments WHERE code = 'SCHOLARSHIP'), 'Grade Compliance Report', 'Grade Compliance Report', FALSE),
  
  -- LIBRARY Documents: Library Clearance, Book Borrowing Slip, Lost Book Payment Form
  ((SELECT id FROM departments WHERE code = 'LIBRARY'), 'Library Clearance', 'Library Clearance', FALSE),
  ((SELECT id FROM departments WHERE code = 'LIBRARY'), 'Book Borrowing Slip', 'Book Borrowing Slip', FALSE),
  ((SELECT id FROM departments WHERE code = 'LIBRARY'), 'Lost Book Payment Form', 'Lost Book Payment Form', FALSE),
  
  -- CMO Documents: Utility Clearance
  ((SELECT id FROM departments WHERE code = 'CMO'), 'Utility Clearance', 'Utility Clearance', FALSE)
ON DUPLICATE KEY UPDATE 
  label = VALUES(label), 
  requires_faculty = VALUES(requires_faculty);

-- ====================================================
-- USER DATASET
-- Only users in this dataset can log in to the system
-- ====================================================

-- Default password for all users: "password123" (hashed with bcrypt)
SET @defaultPassword = '$2a$10$wYWyp7V293134sopBZ4L3u.w78mSVvm6MwExFrEIJdDV7lXsfEjHu';

-- ====================================================
-- SUPER ADMINS (4 users - 4 digits each)
-- ====================================================
-- Main super admin account: id 1234, password 4321
SET @superAdminPassword = '$2a$10$FGVQzh0k1lU8aec1HR1au.S2U.ffivZF7J/gaj2DkyXqc/g4zAUTS';
INSERT INTO users (role, id_number, full_name, email, password_hash, is_super_admin) VALUES
  ('admin', '1234', 'Super Administrator', 'superadmin@usjr.edu.ph', @superAdminPassword, TRUE),
  ('admin', '0001', 'Jasmine Omandam', 'jasmine.omandam@usjr.edu.ph', @defaultPassword, TRUE),
  ('admin', '0002', 'Martina Monica Calledo', 'martina.calledo@usjr.edu.ph', @defaultPassword, TRUE),
  ('admin', '0003', 'Patrick Duron', 'patrick.duron@usjr.edu.ph', @defaultPassword, TRUE)
ON DUPLICATE KEY UPDATE 
  full_name = VALUES(full_name),
  email = VALUES(email),
  password_hash = VALUES(password_hash),
  is_super_admin = VALUES(is_super_admin);

-- ====================================================
-- REGULAR ADMINS (1 per department - 3 digits each)
-- ====================================================
-- Password for all department admins: "111" for SCS, "222" for SBM, etc.
SET @adminPasswordSCS = '$2a$10$3oxb46cZ/n3JGlQNIxakcunQxuhi.ppxo3fNm.sbaHuCwQ179Mf4a';  -- password: 111
SET @adminPasswordSBM = '$2a$10$JaKoqqq3yhuSugdsxzao4e6K9FLMJ6UFVj/Nnt.vfuK/TBSmZVB52';  -- password: 222
SET @adminPasswordSDPC = '$2a$10$3oxb46cZ/n3JGlQNIxakcunQxuhi.ppxo3fNm.sbaHuCwQ179Mf4a';  -- password: 111 (reuse for others)
SET @adminPasswordCLINIC = '$2a$10$3oxb46cZ/n3JGlQNIxakcunQxuhi.ppxo3fNm.sbaHuCwQ179Mf4a';
SET @adminPasswordSSD = '$2a$10$3oxb46cZ/n3JGlQNIxakcunQxuhi.ppxo3fNm.sbaHuCwQ179Mf4a';
SET @adminPasswordSCHOLARSHIP = '$2a$10$3oxb46cZ/n3JGlQNIxakcunQxuhi.ppxo3fNm.sbaHuCwQ179Mf4a';
SET @adminPasswordLIBRARY = '$2a$10$3oxb46cZ/n3JGlQNIxakcunQxuhi.ppxo3fNm.sbaHuCwQ179Mf4a';
SET @adminPasswordCMO = '$2a$10$3oxb46cZ/n3JGlQNIxakcunQxuhi.ppxo3fNm.sbaHuCwQ179Mf4a';
SET @adminPasswordSASO = '$2a$10$3oxb46cZ/n3JGlQNIxakcunQxuhi.ppxo3fNm.sbaHuCwQ179Mf4a';

-- SCS Admin: id 111, password 111
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, is_super_admin) VALUES
  ('admin', '111', 'SCS Administrator', 'admin.scs@usjr.edu.ph', @adminPasswordSCS, 
   (SELECT id FROM departments WHERE code = 'SCS' LIMIT 1), FALSE)
ON DUPLICATE KEY UPDATE 
  full_name = VALUES(full_name),
  email = VALUES(email),
  password_hash = VALUES(password_hash);

-- SBM Admin: id 222, password 222
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, is_super_admin) VALUES
  ('admin', '222', 'SBM Administrator', 'admin.sbm@usjr.edu.ph', @adminPasswordSBM, 
   (SELECT id FROM departments WHERE code = 'SBM' LIMIT 1), FALSE)
ON DUPLICATE KEY UPDATE 
  full_name = VALUES(full_name),
  email = VALUES(email),
  password_hash = VALUES(password_hash);

-- SDPC Admin: id 333, password 111
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, is_super_admin) VALUES
  ('admin', '333', 'SDPC Administrator', 'admin.sdpc@usjr.edu.ph', @adminPasswordSDPC, 
   (SELECT id FROM departments WHERE code = 'SDPC' LIMIT 1), FALSE)
ON DUPLICATE KEY UPDATE 
  full_name = VALUES(full_name),
  email = VALUES(email),
  password_hash = VALUES(password_hash);

-- CLINIC Admin: id 444, password 111
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, is_super_admin) VALUES
  ('admin', '444', 'Clinic Administrator', 'admin.clinic@usjr.edu.ph', @adminPasswordCLINIC, 
   (SELECT id FROM departments WHERE code = 'CLINIC' LIMIT 1), FALSE)
ON DUPLICATE KEY UPDATE 
  full_name = VALUES(full_name),
  email = VALUES(email),
  password_hash = VALUES(password_hash);

-- SSD Admin: id 555, password 111
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, is_super_admin) VALUES
  ('admin', '555', 'SSD Administrator', 'admin.ssd@usjr.edu.ph', @adminPasswordSSD, 
   (SELECT id FROM departments WHERE code = 'SSD' LIMIT 1), FALSE)
ON DUPLICATE KEY UPDATE 
  full_name = VALUES(full_name),
  email = VALUES(email),
  password_hash = VALUES(password_hash);

-- SCHOLARSHIP Admin: id 666, password 111
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, is_super_admin) VALUES
  ('admin', '666', 'Scholarship Administrator', 'admin.scholarship@usjr.edu.ph', @adminPasswordSCHOLARSHIP, 
   (SELECT id FROM departments WHERE code = 'SCHOLARSHIP' LIMIT 1), FALSE)
ON DUPLICATE KEY UPDATE 
  full_name = VALUES(full_name),
  email = VALUES(email),
  password_hash = VALUES(password_hash);

-- LIBRARY Admin: id 777, password 111
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, is_super_admin) VALUES
  ('admin', '777', 'Library Administrator', 'admin.library@usjr.edu.ph', @adminPasswordLIBRARY, 
   (SELECT id FROM departments WHERE code = 'LIBRARY' LIMIT 1), FALSE)
ON DUPLICATE KEY UPDATE 
  full_name = VALUES(full_name),
  email = VALUES(email),
  password_hash = VALUES(password_hash);

-- CMO Admin: id 888, password 111
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, is_super_admin) VALUES
  ('admin', '888', 'CMO Administrator', 'admin.cmo@usjr.edu.ph', @adminPasswordCMO, 
   (SELECT id FROM departments WHERE code = 'CMO' LIMIT 1), FALSE)
ON DUPLICATE KEY UPDATE 
  full_name = VALUES(full_name),
  email = VALUES(email),
  password_hash = VALUES(password_hash);

-- SASO Admin: id 999, password 111
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, is_super_admin) VALUES
  ('admin', '999', 'SASO Administrator', 'admin.saso@usjr.edu.ph', @adminPasswordSASO, 
   (SELECT id FROM departments WHERE code = 'SASO' LIMIT 1), FALSE)
ON DUPLICATE KEY UPDATE 
  full_name = VALUES(full_name),
  email = VALUES(email),
  password_hash = VALUES(password_hash);

-- ====================================================
-- FACULTY (2 per department - 5 digits each)
-- ====================================================
-- SCS Faculty
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, position) VALUES
  ('faculty', '10001', 'Dr. Maria Santos', 'maria.santos@usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SCS' LIMIT 1), 'Professor'),
  ('faculty', '10002', 'Prof. John Cruz', 'john.cruz@usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SCS' LIMIT 1), 'Associate Professor')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email);

-- SBM Faculty
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, position) VALUES
  ('faculty', '20001', 'Dr. Anna Reyes', 'anna.reyes@usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SBM' LIMIT 1), 'Professor'),
  ('faculty', '20002', 'Prof. Michael Tan', 'michael.tan@usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SBM' LIMIT 1), 'Associate Professor')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email);

-- SDPC Faculty
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, position) VALUES
  ('faculty', '40001', 'Dr. Sarah Lopez', 'sarah.lopez@usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SDPC' LIMIT 1), 'Director'),
  ('faculty', '40002', 'Prof. David Rodriguez', 'david.rodriguez@usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SDPC' LIMIT 1), 'Coordinator')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email);

-- SASO Faculty
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, position) VALUES
  ('faculty', '50001', 'Dr. Jennifer Torres', 'jennifer.torres@usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SASO' LIMIT 1), 'Director'),
  ('faculty', '50002', 'Prof. Mark Fernandez', 'mark.fernandez@usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SASO' LIMIT 1), 'Coordinator')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email);

-- SSD Faculty
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, position) VALUES
  ('faculty', '60001', 'Dr. Patricia Ramos', 'patricia.ramos@usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SSD' LIMIT 1), 'Director'),
  ('faculty', '60002', 'Prof. James Villanueva', 'james.villanueva@usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SSD' LIMIT 1), 'Coordinator')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email);

-- CLINIC Faculty
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, position) VALUES
  ('faculty', '70001', 'Dr. Maria Dela Cruz', 'maria.delacruz@usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'CLINIC' LIMIT 1), 'Medical Director'),
  ('faculty', '70002', 'Prof. Carlos Mendoza', 'carlos.mendoza@usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'CLINIC' LIMIT 1), 'Nurse Supervisor')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email);

-- SCHOLARSHIP Faculty
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, position) VALUES
  ('faculty', '80001', 'Dr. Grace Bautista', 'grace.bautista@usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SCHOLARSHIP' LIMIT 1), 'Director'),
  ('faculty', '80002', 'Prof. Anthony Rivera', 'anthony.rivera@usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SCHOLARSHIP' LIMIT 1), 'Coordinator')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email);

-- LIBRARY Faculty
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, position) VALUES
  ('faculty', '90001', 'Dr. Susan Morales', 'susan.morales@usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'LIBRARY' LIMIT 1), 'Librarian'),
  ('faculty', '90002', 'Prof. Daniel Castillo', 'daniel.castillo@usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'LIBRARY' LIMIT 1), 'Assistant Librarian')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email);

-- CMO Faculty
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, position) VALUES
  ('faculty', '00001', 'Dr. Nancy Gutierrez', 'nancy.gutierrez@usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'CMO' LIMIT 1), 'Director'),
  ('faculty', '00002', 'Prof. Richard Ocampo', 'richard.ocampo@usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'CMO' LIMIT 1), 'Coordinator')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email);

-- ====================================================
-- STUDENTS (3 per department - 10 digits each)
-- ====================================================
-- SCS Students
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, course, year_level) VALUES
  ('student', '2021001001', 'Juan Dela Cruz', 'juan.delacruz@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SCS' LIMIT 1), 'BS Computer Science', '3rd Year'),
  ('student', '2021001002', 'Maria Santos', 'maria.santos@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SCS' LIMIT 1), 'BS Information Technology', '2nd Year'),
  ('student', '2021001003', 'Carlos Reyes', 'carlos.reyes@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SCS' LIMIT 1), 'BS Entertainment and Multimedia Computing', '4th Year')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email);

-- SBM Students
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, course, year_level) VALUES
  ('student', '2022002001', 'Ana Garcia', 'ana.garcia@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SBM' LIMIT 1), 'BS Accountancy', '3rd Year'),
  ('student', '2022002002', 'Luis Martinez', 'luis.martinez@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SBM' LIMIT 1), 'BS Business Administration', '2nd Year'),
  ('student', '2022002003', 'Sofia Lopez', 'sofia.lopez@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SBM' LIMIT 1), 'BS Marketing Management', '4th Year')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email);

-- SDPC Students
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, course, year_level) VALUES
  ('student', '2024004001', 'Elena Villanueva', 'elena.villanueva@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SDPC' LIMIT 1), 'BS Computer Science', '3rd Year'),
  ('student', '2024004002', 'Ricardo Dela Cruz', 'ricardo.delacruz@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SDPC' LIMIT 1), 'BS Information Technology', '2nd Year'),
  ('student', '2024004003', 'Carmen Mendoza', 'carmen.mendoza@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SDPC' LIMIT 1), 'BS Business Administration', '4th Year')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email);

-- SASO Students
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, course, year_level) VALUES
  ('student', '2025005001', 'Fernando Bautista', 'fernando.bautista@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SASO' LIMIT 1), 'BS Computer Science', '3rd Year'),
  ('student', '2025005002', 'Lucia Rivera', 'lucia.rivera@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SASO' LIMIT 1), 'BS Accountancy', '2nd Year'),
  ('student', '2025005003', 'Roberto Morales', 'roberto.morales@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SASO' LIMIT 1), 'AB Communication', '4th Year')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email);

-- SSD Students
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, course, year_level) VALUES
  ('student', '2026006001', 'Adriana Castillo', 'adriana.castillo@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SSD' LIMIT 1), 'BS Computer Science', '3rd Year'),
  ('student', '2026006002', 'Javier Gutierrez', 'javier.gutierrez@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SSD' LIMIT 1), 'BS Information Technology', '2nd Year'),
  ('student', '2026006003', 'Valentina Ocampo', 'valentina.ocampo@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SSD' LIMIT 1), 'BS Business Administration', '4th Year')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email);

-- CLINIC Students
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, course, year_level) VALUES
  ('student', '2027007001', 'Gabriel Herrera', 'gabriel.herrera@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'CLINIC' LIMIT 1), 'BS Computer Science', '3rd Year'),
  ('student', '2027007002', 'Natalia Jimenez', 'natalia.jimenez@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'CLINIC' LIMIT 1), 'BS Information Technology', '2nd Year'),
  ('student', '2027007003', 'Sebastian Ortega', 'sebastian.ortega@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'CLINIC' LIMIT 1), 'BS Accountancy', '4th Year')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email);

-- SCHOLARSHIP Students
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, course, year_level) VALUES
  ('student', '2028008001', 'Camila Vargas', 'camila.vargas@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SCHOLARSHIP' LIMIT 1), 'BS Computer Science', '3rd Year'),
  ('student', '2028008002', 'Mateo Silva', 'mateo.silva@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SCHOLARSHIP' LIMIT 1), 'BS Information Technology', '2nd Year'),
  ('student', '2028008003', 'Sofia Castro', 'sofia.castro@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'SCHOLARSHIP' LIMIT 1), 'BS Business Administration', '4th Year')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email);

-- LIBRARY Students
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, course, year_level) VALUES
  ('student', '2029009001', 'Alejandro Ruiz', 'alejandro.ruiz@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'LIBRARY' LIMIT 1), 'BS Computer Science', '3rd Year'),
  ('student', '2029009002', 'Isabella Moreno', 'isabella.moreno@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'LIBRARY' LIMIT 1), 'BS Information Technology', '2nd Year'),
  ('student', '2029009003', 'Lucas Pena', 'lucas.pena@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'LIBRARY' LIMIT 1), 'BS Accountancy', '4th Year')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email);

-- CMO Students
INSERT INTO users (role, id_number, full_name, email, password_hash, department_id, course, year_level) VALUES
  ('student', '2020000001', 'Emma Navarro', 'emma.navarro@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'CMO' LIMIT 1), 'BS Computer Science', '3rd Year'),
  ('student', '2020000002', 'Daniel Fuentes', 'daniel.fuentes@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'CMO' LIMIT 1), 'BS Information Technology', '2nd Year'),
  ('student', '2020000003', 'Olivia Rios', 'olivia.rios@student.usjr.edu.ph', @defaultPassword, 
   (SELECT id FROM departments WHERE code = 'CMO' LIMIT 1), 'BS Business Administration', '4th Year')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email);

-- ====================================================
-- VERIFICATION
-- ====================================================
SELECT 'Database setup complete!' as status;
SELECT COUNT(*) as department_count FROM departments;
SELECT COUNT(*) as document_count FROM department_documents;
SELECT d.code, d.name, COUNT(dd.id) as doc_count 
FROM departments d 
LEFT JOIN department_documents dd ON dd.department_id = d.id 
GROUP BY d.id, d.code, d.name
ORDER BY d.code;

SELECT 'User dataset created!' as status;
SELECT role, COUNT(*) as count FROM users GROUP BY role;
SELECT 'Super Admins:' as label, COUNT(*) as count FROM users WHERE is_super_admin = TRUE;
SELECT d.code, d.name, 
       COUNT(CASE WHEN u.role = 'student' THEN 1 END) as students,
       COUNT(CASE WHEN u.role = 'faculty' THEN 1 END) as faculty
FROM departments d
LEFT JOIN users u ON u.department_id = d.id
GROUP BY d.id, d.code, d.name
ORDER BY d.code;

