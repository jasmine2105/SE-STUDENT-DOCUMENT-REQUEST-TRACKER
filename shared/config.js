window.RecoletosConfig = window.RecoletosConfig || {};

window.RecoletosConfig.departments = [
  {
    id: 'SBM',
    name: 'School of Business Management (SBM)',
    documents: [
      { value: 'Clearance', label: 'Clearance', requiresFaculty: false },
      { value: 'Endorsement Letter', label: 'Endorsement Letter', requiresFaculty: false },
      { value: 'Activity Letter', label: 'Activity Letter', requiresFaculty: false }
    ]
  },
  {
    id: 'SAS',
    name: 'School of Arts and Sciences (SAS)',
    documents: [
      { value: 'Clearance', label: 'Clearance', requiresFaculty: false },
      { value: 'Endorsement Letter', label: 'Endorsement Letter', requiresFaculty: false }
    ]
  },
  {
    id: 'SDPC',
    name: 'Student Development and Programs Center (SDPC)',
    documents: [
      { value: 'Excuse Slip', label: 'Excuse Slip', requiresFaculty: false },
      { value: 'Counseling Referral Form', label: 'Counseling Referral Form', requiresFaculty: false }
    ]
  },
  {
    id: 'SASO',
    name: 'Student Affairs and Services Office (SASO)',
    documents: [
      { value: 'Exemption Slip', label: 'Exemption Slip', requiresFaculty: false },
      { value: 'Parent Consent Letter', label: 'Parent Consent Letter', requiresFaculty: false }
    ]
  },
  {
    id: 'SSD',
    name: 'Security Services Department (SSD)',
    documents: [
      { value: 'Sticker for Vehicles', label: 'Sticker for Vehicles', requiresFaculty: false },
      { value: 'Gate Pass Request', label: 'Gate Pass Request', requiresFaculty: false },
      { value: 'Lost ID Incident Report', label: 'Lost ID Incident Report', requiresFaculty: false }
    ]
  },
  {
    id: 'CLINIC',
    name: 'Clinic',
    documents: [
      { value: 'Medical Certificate', label: 'Medical Certificate', requiresFaculty: false },
      { value: 'Dental Check-up Form', label: 'Dental Check-up Form', requiresFaculty: false },
      { value: 'Health Clearance', label: 'Health Clearance', requiresFaculty: false }
    ]
  },
  {
    id: 'SCS',
    name: 'School of Computer Studies (SCS)',
    documents: [
      { value: 'Clearance', label: 'Clearance', requiresFaculty: false },
      { value: 'Endorsement Letter', label: 'Endorsement Letter', requiresFaculty: false },
      { value: 'MOA', label: 'MOA', requiresFaculty: false }
    ]
  },
  {
    id: 'SCHOLARSHIP',
    name: 'Scholarship Office',
    documents: [
      { value: 'Payment Slip', label: 'Payment Slip', requiresFaculty: false },
      { value: 'Grade Compliance Report', label: 'Grade Compliance Report', requiresFaculty: false }
    ]
  },
  {
    id: 'LIBRARY',
    name: 'Library',
    documents: [
      { value: 'Library Clearance', label: 'Library Clearance', requiresFaculty: false },
      { value: 'Book Borrowing Slip', label: 'Book Borrowing Slip', requiresFaculty: false },
      { value: 'Lost Book Payment Form', label: 'Lost Book Payment Form', requiresFaculty: false }
    ]
  },
  {
    id: 'CMO',
    name: 'Campus Management Office (CMO)',
    documents: [
      { value: 'Utility Clearance', label: 'Utility Clearance', requiresFaculty: false }
    ]
  }
];

window.RecoletosConfig.defaultStudentDepartment = 'School of Computer Studies (SCS)';

window.RecoletosConfig.findDepartmentByName = function(name) {
  return (window.RecoletosConfig.departments || []).find((dept) => dept.name === name || dept.id === name);
};

