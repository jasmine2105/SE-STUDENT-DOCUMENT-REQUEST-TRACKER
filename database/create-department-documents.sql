-- Create department_documents table (required by the application)
USE recoletos_tracker;

-- Create the department_documents table
CREATE TABLE IF NOT EXISTS department_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  label VARCHAR(255) NOT NULL,
  value VARCHAR(255) NOT NULL,
  requires_faculty BOOLEAN DEFAULT FALSE,
  UNIQUE KEY unique_department_document (department_id, value),
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Migrate data from documents table if it exists
INSERT INTO department_documents (department_id, label, value, requires_faculty)
SELECT department_id, label, value, requires_faculty
FROM documents
WHERE NOT EXISTS (
  SELECT 1 FROM department_documents dd 
  WHERE dd.department_id = documents.department_id 
  AND dd.value = documents.value
);

-- Insert default document types if table is empty
INSERT INTO department_documents (department_id, label, value, requires_faculty)
VALUES
  ((SELECT id FROM departments WHERE code = 'SCS'), 'Transcript of Records', 'Transcript of Records', TRUE),
  ((SELECT id FROM departments WHERE code = 'SCS'), 'Certificate of Good Moral Character', 'Good Moral Certificate', TRUE),
  ((SELECT id FROM departments WHERE code = 'SCS'), 'Course Syllabus', 'Course Syllabus', TRUE),
  ((SELECT id FROM departments WHERE code = 'SCS'), 'Clearance', 'Clearance', FALSE),
  ((SELECT id FROM departments WHERE code = 'SCS'), 'Enrollment Certification', 'Enrollment Certification', FALSE),
  ((SELECT id FROM departments WHERE code = 'SBM'), 'Transcript of Records', 'Transcript of Records - SBM', TRUE),
  ((SELECT id FROM departments WHERE code = 'SBM'), 'Certificate of Good Moral Character', 'Good Moral Certificate - SBM', TRUE),
  ((SELECT id FROM departments WHERE code = 'SBM'), 'Internship Certification', 'Internship Certification', TRUE),
  ((SELECT id FROM departments WHERE code = 'SBM'), 'Clearance', 'Clearance - SBM', FALSE),
  ((SELECT id FROM departments WHERE code = 'SAS'), 'Transcript of Records', 'Transcript of Records - SAS', TRUE),
  ((SELECT id FROM departments WHERE code = 'SAS'), 'Program Certification', 'Program Certification', TRUE),
  ((SELECT id FROM departments WHERE code = 'SAS'), 'Clearance', 'Clearance - SAS', FALSE),
  ((SELECT id FROM departments WHERE code = 'SOE'), 'Transcript of Records', 'Transcript of Records - SOE', TRUE),
  ((SELECT id FROM departments WHERE code = 'SOE'), 'Board Exam Endorsement', 'Board Exam Endorsement', TRUE),
  ((SELECT id FROM departments WHERE code = 'SOE'), 'Clearance', 'Clearance - SOE', FALSE),
  ((SELECT id FROM departments WHERE code = 'SAMS'), 'Transcript of Records', 'Transcript of Records - SAMS', TRUE),
  ((SELECT id FROM departments WHERE code = 'SAMS'), 'Clinical Rotation Certification', 'Clinical Rotation Certification', TRUE),
  ((SELECT id FROM departments WHERE code = 'SAMS'), 'Certificate of Good Moral Character', 'Good Moral Certificate - SAMS', TRUE),
  ((SELECT id FROM departments WHERE code = 'SOL'), 'Transcript of Records', 'Transcript of Records - SOL', TRUE),
  ((SELECT id FROM departments WHERE code = 'SOL'), 'BAR Endorsement', 'BAR Endorsement', TRUE),
  ((SELECT id FROM departments WHERE code = 'SOL'), 'Certification of Grades', 'Certification of Grades', TRUE),
  ((SELECT id FROM departments WHERE code = 'ETEEAP'), 'Transcript of Records', 'ETEEAP TOR', TRUE),
  ((SELECT id FROM departments WHERE code = 'ETEEAP'), 'Competency Certificate', 'Competency Certificate', TRUE),
  ((SELECT id FROM departments WHERE code = 'SOED'), 'Transcript of Records', 'Transcript of Records - SOEd', TRUE),
  ((SELECT id FROM departments WHERE code = 'SOED'), 'Practice Teaching Certification', 'Practice Teaching Certification', TRUE),
  ((SELECT id FROM departments WHERE code = 'SOED'), 'Certificate of Good Moral Character', 'Good Moral Certificate - SOEd', TRUE)
ON DUPLICATE KEY UPDATE 
  label = VALUES(label), 
  requires_faculty = VALUES(requires_faculty);

-- Verify the table was created
SELECT COUNT(*) as document_count FROM department_documents;
SHOW TABLES LIKE 'department_documents';






