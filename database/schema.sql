CREATE DATABASE recoletos_tracker;

USE recoletos_tracker;

-- ====================================================
-- RECOLETOS STUDENT DOCUMENT REQUEST TRACKER SCHEMA
-- ====================================================

-- =======================
-- DEPARTMENTS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL
);

-- =======================
-- DOCUMENTS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS documents (
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- =======================
-- FACULTY TABLE
-- (Faculty-specific data; linked to users)
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
  faculty_id INT NULL, -- ✅ faculty can be NULL (not required for all documents)
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

-- Documents (per department)
INSERT INTO documents (department_id, label, value, requires_faculty)
VALUES
  ((SELECT id FROM departments WHERE code = 'SCS'), 'Transcript of Records', 'SCS_TOR', TRUE),
  ((SELECT id FROM departments WHERE code = 'SCS'), 'Certificate of Good Moral Character', 'SCS_GM', TRUE),
  ((SELECT id FROM departments WHERE code = 'SCS'), 'Clearance', 'SCS_CLEARANCE', FALSE),
  ((SELECT id FROM departments WHERE code = 'SBM'), 'Transcript of Records', 'SBM_TOR', TRUE),
  ((SELECT id FROM departments WHERE code = 'SBM'), 'Internship Certification', 'SBM_INTERNSHIP', TRUE),
  ((SELECT id FROM departments WHERE code = 'SAS'), 'Transcript of Records', 'SAS_TOR', TRUE),
  ((SELECT id FROM departments WHERE code = 'SOE'), 'Board Exam Endorsement', 'SOE_BOARD_ENDORSEMENT', TRUE),
  ((SELECT id FROM departments WHERE code = 'SAMS'), 'Clinical Rotation Certification', 'SAMS_CLINICAL', TRUE),
  ((SELECT id FROM departments WHERE code = 'SOL'), 'BAR Endorsement', 'SOL_BAR_ENDORSEMENT', TRUE),
  ((SELECT id FROM departments WHERE code = 'ETEEAP'), 'Competency Certificate', 'ETEEAP_COMPETENCY', TRUE),
  ((SELECT id FROM departments WHERE code = 'SOED'), 'Practice Teaching Certification', 'SOED_PRACTICE_TEACHING', TRUE)
ON DUPLICATE KEY UPDATE label = VALUES(label), requires_faculty = VALUES(requires_faculty);

-- Sample Faculty User
INSERT INTO users (role, id_number, email, password_hash, full_name, department_id, position)
VALUES
  ('faculty', 'FAC1001', 'scs.prof1@recoletos.edu', 'hashed_pass_here', 'Prof. Maria Dela Cruz', 
   (SELECT id FROM departments WHERE code = 'SCS'), 'Instructor')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

-- Faculty Profile (linked to users)
INSERT INTO faculty (user_id, department_id, specialization, designation)
VALUES
  ((SELECT id FROM users WHERE id_number = 'FAC1001'),
   (SELECT id FROM departments WHERE code = 'SCS'),
   'Software Engineering', 'Program Chair')
ON DUPLICATE KEY UPDATE designation = VALUES(designation);


USE recoletos_tracker;

-- First, let's check if we have any users to link notifications to
SELECT id, role, id_number, full_name FROM users LIMIT 5;

-- If you have users, note their IDs and use them below
-- If no users exist, let's create a test student first
INSERT INTO users (role, id_number, email, password_hash, full_name, department_id, course, year_level) 
VALUES 
('student', 'STU2024001', 'test.student@recoletos.edu', 'hashed_password', 'Juan Dela Cruz', 
 (SELECT id FROM departments WHERE code = 'SCS'), 'BS Computer Science', '3rd Year')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

-- Now add sample notifications
INSERT INTO notifications (user_id, role, type, title, message, request_id, read_flag) 
VALUES 
((SELECT id FROM users WHERE id_number = 'STU2024001'), 'student', 'info', 'Welcome!', 'Welcome to Recoletos Document Tracker', NULL, FALSE),
((SELECT id FROM users WHERE id_number = 'STU2024001'), 'student', 'reminder', 'Document Tip', 'Make sure to specify the purpose of your document request', NULL, FALSE),
((SELECT id FROM users WHERE id_number = 'STU2024001'), 'student', 'update', 'System Update', 'New features added to the portal', NULL, TRUE);

-- Verify notifications were added
SELECT * FROM notifications;

USE recoletos_tracker;
SHOW TABLES;