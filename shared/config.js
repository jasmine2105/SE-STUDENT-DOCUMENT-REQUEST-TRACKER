window.RecoletosConfig = window.RecoletosConfig || {};

window.RecoletosConfig.departments = [
  {
    id: 'SCS',
    name: 'School of Computer Studies (SCS)',
    documents: [
      { value: 'Transcript of Records', label: 'Transcript of Records', requiresFaculty: true },
      { value: 'Good Moral Certificate', label: 'Certificate of Good Moral Character', requiresFaculty: true },
      { value: 'Course Syllabus', label: 'Course Syllabus', requiresFaculty: true },
      { value: 'Clearance', label: 'Clearance', requiresFaculty: false },
      { value: 'Enrollment Certification', label: 'Enrollment Certification', requiresFaculty: false }
    ]
  },
  {
    id: 'SBM',
    name: 'School of Business Management (SBM)',
    documents: [
      { value: 'Transcript of Records - SBM', label: 'Transcript of Records', requiresFaculty: true },
      { value: 'Good Moral Certificate - SBM', label: 'Certificate of Good Moral Character', requiresFaculty: true },
      { value: 'Internship Certification', label: 'Internship Certification', requiresFaculty: true },
      { value: 'Clearance - SBM', label: 'Clearance', requiresFaculty: false }
    ]
  },
  {
    id: 'SAS',
    name: 'School of Arts and Sciences (SAS)',
    documents: [
      { value: 'Transcript of Records - SAS', label: 'Transcript of Records', requiresFaculty: true },
      { value: 'Program Certification', label: 'Program Certification', requiresFaculty: true },
      { value: 'Clearance - SAS', label: 'Clearance', requiresFaculty: false }
    ]
  },
  {
    id: 'SOE',
    name: 'School of Engineering (SOE)',
    documents: [
      { value: 'Transcript of Records - SOE', label: 'Transcript of Records', requiresFaculty: true },
      { value: 'Board Exam Endorsement', label: 'Board Exam Endorsement', requiresFaculty: true },
      { value: 'Clearance - SOE', label: 'Clearance', requiresFaculty: false }
    ]
  },
  {
    id: 'SAMS',
    name: 'School of Allied Medical Sciences (SAMS)',
    documents: [
      { value: 'Transcript of Records - SAMS', label: 'Transcript of Records', requiresFaculty: true },
      { value: 'Clinical Rotation Certification', label: 'Clinical Rotation Certification', requiresFaculty: true },
      { value: 'Good Moral Certificate - SAMS', label: 'Certificate of Good Moral Character', requiresFaculty: true }
    ]
  },
  {
    id: 'SOL',
    name: 'School of Law (SOL)',
    documents: [
      { value: 'Transcript of Records - SOL', label: 'Transcript of Records', requiresFaculty: true },
      { value: 'BAR Endorsement', label: 'BAR Endorsement', requiresFaculty: true },
      { value: 'Certification of Grades', label: 'Certification of Grades', requiresFaculty: true }
    ]
  },
  {
    id: 'ETEEAP',
    name: 'ETEEAP (Expanded Tertiary Education Equivalency and Accreditation Program)',
    documents: [
      { value: 'ETEEAP TOR', label: 'Transcript of Records', requiresFaculty: true },
      { value: 'Competency Certificate', label: 'Competency Certificate', requiresFaculty: true }
    ]
  },
  {
    id: 'SOED',
    name: 'School of Education (SOEd)',
    documents: [
      { value: 'Transcript of Records - SOEd', label: 'Transcript of Records', requiresFaculty: true },
      { value: 'Practice Teaching Certification', label: 'Practice Teaching Certification', requiresFaculty: true },
      { value: 'Good Moral Certificate - SOEd', label: 'Certificate of Good Moral Character', requiresFaculty: true }
    ]
  }
];

window.RecoletosConfig.defaultStudentDepartment = 'School of Computer Studies (SCS)';

window.RecoletosConfig.findDepartmentByName = function(name) {
  return (window.RecoletosConfig.departments || []).find((dept) => dept.name === name || dept.id === name);
};

