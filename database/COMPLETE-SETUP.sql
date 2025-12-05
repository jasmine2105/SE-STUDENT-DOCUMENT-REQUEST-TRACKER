-- ====================================================
-- COMPLETE DATABASE SETUP FOR RECOLETOS TRACKER
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

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
  FOREIGN KEY (faculty_id) REFERENCES faculty(id)
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

-- Departments
INSERT INTO departments (code, name) VALUES
  ('SCS', 'School of Computer Studies (SCS)'),
  ('SBM', 'School of Business Management (SBM)'),
  ('SAS', 'School of Arts and Sciences (SAS)'),
  ('SOE', 'School of Engineering (SOE)'),
  ('SAMS', 'School of Allied Medical Sciences (SAMS)'),
  ('SOL', 'School of Law (SOL)'),
  ('ETEEAP', 'ETEEAP (Expanded Tertiary Education Equivalency and Accreditation Program)'),
  ('SOED', 'School of Education (SOEd)')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Department Documents (with correct values matching frontend expectations)
INSERT INTO department_documents (department_id, label, value, requires_faculty)
VALUES
  -- SCS Documents
  ((SELECT id FROM departments WHERE code = 'SCS'), 'Transcript of Records', 'Transcript of Records', TRUE),
  ((SELECT id FROM departments WHERE code = 'SCS'), 'Certificate of Good Moral Character', 'Good Moral Certificate', TRUE),
  ((SELECT id FROM departments WHERE code = 'SCS'), 'Course Syllabus', 'Course Syllabus', TRUE),
  ((SELECT id FROM departments WHERE code = 'SCS'), 'Clearance', 'Clearance', FALSE),
  ((SELECT id FROM departments WHERE code = 'SCS'), 'Enrollment Certification', 'Enrollment Certification', FALSE),
  
  -- SBM Documents
  ((SELECT id FROM departments WHERE code = 'SBM'), 'Transcript of Records', 'Transcript of Records - SBM', TRUE),
  ((SELECT id FROM departments WHERE code = 'SBM'), 'Certificate of Good Moral Character', 'Good Moral Certificate - SBM', TRUE),
  ((SELECT id FROM departments WHERE code = 'SBM'), 'Internship Certification', 'Internship Certification', TRUE),
  ((SELECT id FROM departments WHERE code = 'SBM'), 'Clearance', 'Clearance - SBM', FALSE),
  
  -- SAS Documents
  ((SELECT id FROM departments WHERE code = 'SAS'), 'Transcript of Records', 'Transcript of Records - SAS', TRUE),
  ((SELECT id FROM departments WHERE code = 'SAS'), 'Program Certification', 'Program Certification', TRUE),
  ((SELECT id FROM departments WHERE code = 'SAS'), 'Clearance', 'Clearance - SAS', FALSE),
  
  -- SOE Documents
  ((SELECT id FROM departments WHERE code = 'SOE'), 'Transcript of Records', 'Transcript of Records - SOE', TRUE),
  ((SELECT id FROM departments WHERE code = 'SOE'), 'Board Exam Endorsement', 'Board Exam Endorsement', TRUE),
  ((SELECT id FROM departments WHERE code = 'SOE'), 'Clearance', 'Clearance - SOE', FALSE),
  
  -- SAMS Documents
  ((SELECT id FROM departments WHERE code = 'SAMS'), 'Transcript of Records', 'Transcript of Records - SAMS', TRUE),
  ((SELECT id FROM departments WHERE code = 'SAMS'), 'Clinical Rotation Certification', 'Clinical Rotation Certification', TRUE),
  ((SELECT id FROM departments WHERE code = 'SAMS'), 'Certificate of Good Moral Character', 'Good Moral Certificate - SAMS', TRUE),
  
  -- SOL Documents
  ((SELECT id FROM departments WHERE code = 'SOL'), 'Transcript of Records', 'Transcript of Records - SOL', TRUE),
  ((SELECT id FROM departments WHERE code = 'SOL'), 'BAR Endorsement', 'BAR Endorsement', TRUE),
  ((SELECT id FROM departments WHERE code = 'SOL'), 'Certification of Grades', 'Certification of Grades', TRUE),
  
  -- ETEEAP Documents
  ((SELECT id FROM departments WHERE code = 'ETEEAP'), 'Transcript of Records', 'ETEEAP TOR', TRUE),
  ((SELECT id FROM departments WHERE code = 'ETEEAP'), 'Competency Certificate', 'Competency Certificate', TRUE),
  
  -- SOED Documents
  ((SELECT id FROM departments WHERE code = 'SOED'), 'Transcript of Records', 'Transcript of Records - SOEd', TRUE),
  ((SELECT id FROM departments WHERE code = 'SOED'), 'Practice Teaching Certification', 'Practice Teaching Certification', TRUE),
  ((SELECT id FROM departments WHERE code = 'SOED'), 'Certificate of Good Moral Character', 'Good Moral Certificate - SOEd', TRUE)
ON DUPLICATE KEY UPDATE 
  label = VALUES(label), 
  requires_faculty = VALUES(requires_faculty);

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

