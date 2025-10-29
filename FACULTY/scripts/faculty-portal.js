// Faculty Portal JavaScript

let facultyClearances = [];
let facultyNotifications = [];

// Initialize faculty portal
document.addEventListener('DOMContentLoaded', function() {
    loadFacultyData();
    updateDashboard();
    loadClearances();
    loadNotifications();
    
    // Set up event listeners
    setupEventListeners();
});

// Load faculty-specific data
function loadFacultyData() {
    // Sample faculty clearances
    facultyClearances = [
        {
            id: 'CLR001',
            requestId: 'REQ004',
            studentId: '2023-004',
            studentName: 'Sarah Wilson',
            studentEmail: 'sarah.wilson@student.edu',
            department: 'Computer Science',
            documentType: 'TOR',
            purpose: 'Graduate School Application',
            status: 'Pending',
            dateSubmitted: '2024-01-17',
            academicRecord: {
                gpa: 3.8,
                creditsCompleted: 120,
                graduationStatus: 'Expected May 2024',
                holds: [],
                academicStanding: 'Good'
            },
            clearanceNotes: '',
            timeline: [
                { status: 'Pending', date: '2024-01-17', note: 'Clearance request submitted', user: 'System' },
                { status: 'Pending', date: '2024-01-18', note: 'Awaiting faculty review', user: 'System' }
            ]
        },
        {
            id: 'CLR002',
            requestId: 'REQ005',
            studentId: '2023-005',
            studentName: 'David Brown',
            studentEmail: 'david.brown@student.edu',
            department: 'Engineering',
            documentType: 'COE',
            purpose: 'Internship Application',
            status: 'Approved',
            dateSubmitted: '2024-01-16',
            academicRecord: {
                gpa: 3.5,
                creditsCompleted: 90,
                graduationStatus: 'Expected December 2024',
                holds: [],
                academicStanding: 'Good'
            },
            clearanceNotes: 'Student meets all academic requirements',
            timeline: [
                { status: 'Pending', date: '2024-01-16', note: 'Clearance request submitted', user: 'System' },
                { status: 'Approved', date: '2024-01-17', note: 'Clearance approved by faculty', user: 'Dr. Faculty' }
            ]
        },
        {
            id: 'CLR003',
            requestId: 'REQ006',
            studentId: '2023-006',
            studentName: 'Emily Davis',
            studentEmail: 'emily.davis@student.edu',
            department: 'Business',
            documentType: 'GoodMoral',
            purpose: 'Scholarship Application',
            status: 'Rejected',
            dateSubmitted: '2024-01-15',
            academicRecord: {
                gpa: 2.8,
                creditsCompleted: 75,
                graduationStatus: 'Expected May 2025',
                holds: ['Academic Probation'],
                academicStanding: 'Probation'
            },
            clearanceNotes: 'Student is on academic probation and does not meet good moral certificate requirements',
            timeline: [
                { status: 'Pending', date: '2024-01-15', note: 'Clearance request submitted', user: 'System' },
                { status: 'Rejected', date: '2024-01-16', note: 'Clearance rejected due to academic probation', user: 'Dr. Faculty' }
            ]
        }
    ];

    facultyNotifications = [
        {
            id: 1,
            type: 'info',
            title: 'New Clearance Request',
            message: 'Sarah Wilson requires academic clearance for TOR request',
            timestamp: '2024-01-17 14:30:00',
            read: false,
            clearanceId: 'CLR001'
        },
        {
            id: 2,
            type: 'success',
            title: 'Clearance Approved',
            message: 'David Brown\'s academic clearance has been approved',
            timestamp: '2024-01-17 10:15:00',
            read: true,
            clearanceId: 'CLR002'
        },
        {
            id: 3,
            type: 'warning',
            title: 'Clearance Rejected',
            message: 'Emily Davis\'s clearance was rejected due to academic probation',
            timestamp: '2024-01-16 16:45:00',
            read: true,
            clearanceId: 'CLR003'
        }
    ];
}

// Setup event listeners
function setupEventListeners() {
    // Filter changes
    const statusFilter = document.getElementById('statusFilter');
    const departmentFilter = document.getElementById('departmentFilter');
    const searchFilter = document.getElementById('searchFilter');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
    if (departmentFilter) {
        departmentFilter.addEventListener('change', applyFilters);
    }
    if (searchFilter) {
        searchFilter.addEventListener('input', applyFilters);
    }
}

// Update dashboard statistics
function updateDashboard() {
    const pendingClearances = facultyClearances.filter(c => c.status === 'Pending').length;
    const approvedToday = facultyClearances.filter(c => 
        c.status === 'Approved' && 
        new Date(c.timeline.find(t => t.status === 'Approved')?.date).toDateString() === new Date().toDateString()
    ).length;
    const rejectedToday = facultyClearances.filter(c => 
        c.status === 'Rejected' && 
        new Date(c.timeline.find(t => t.status === 'Rejected')?.date).toDateString() === new Date().toDateString()
    ).length;
    const totalProcessed = facultyClearances.filter(c => c.status === 'Approved' || c.status === 'Rejected').length;

    document.getElementById('pendingClearances').textContent = pendingClearances;
    document.getElementById('approvedToday').textContent = approvedToday;
    document.getElementById('rejectedToday').textContent = rejectedToday;
    document.getElementById('totalProcessed').textContent = totalProcessed;
}

// Load and display clearances
function loadClearances() {
    const tableBody = document.getElementById('clearancesTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = facultyClearances.map(clearance => `
        <tr>
            <td>${clearance.requestId}</td>
            <td>
                <div>
                    <strong>${clearance.studentName}</strong><br>
                    <small class="text-muted">${clearance.studentId}</small>
                </div>
            </td>
            <td>${clearance.department}</td>
            <td>${clearance.documentType}</td>
            <td>
                <span class="status-badge ${DocTracker.getStatusBadgeClass(clearance.status)}">
                    ${clearance.status}
                </span>
            </td>
            <td>${DocTracker.formatDate(clearance.dateSubmitted)}</td>
            <td>
                <div class="d-flex gap-1">
                    <button class="btn btn-primary btn-sm" onclick="viewClearanceDetails('${clearance.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${clearance.status === 'Pending' ? `
                        <button class="btn btn-success btn-sm" onclick="approveClearance('${clearance.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="rejectClearance('${clearance.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// Apply filters
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const departmentFilter = document.getElementById('departmentFilter').value;
    const searchFilter = document.getElementById('searchFilter').value.toLowerCase();
    
    let filteredClearances = facultyClearances;
    
    if (statusFilter) {
        filteredClearances = filteredClearances.filter(c => c.status === statusFilter);
    }
    
    if (departmentFilter) {
        filteredClearances = filteredClearances.filter(c => c.department === departmentFilter);
    }
    
    if (searchFilter) {
        filteredClearances = filteredClearances.filter(c => 
            c.studentName.toLowerCase().includes(searchFilter) ||
            c.studentId.toLowerCase().includes(searchFilter)
        );
    }
    
    displayFilteredClearances(filteredClearances);
}

// Display filtered clearances
function displayFilteredClearances(clearances) {
    const tableBody = document.getElementById('clearancesTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = clearances.map(clearance => `
        <tr>
            <td>${clearance.requestId}</td>
            <td>
                <div>
                    <strong>${clearance.studentName}</strong><br>
                    <small class="text-muted">${clearance.studentId}</small>
                </div>
            </td>
            <td>${clearance.department}</td>
            <td>${clearance.documentType}</td>
            <td>
                <span class="status-badge ${DocTracker.getStatusBadgeClass(clearance.status)}">
                    ${clearance.status}
                </span>
            </td>
            <td>${DocTracker.formatDate(clearance.dateSubmitted)}</td>
            <td>
                <div class="d-flex gap-1">
                    <button class="btn btn-primary btn-sm" onclick="viewClearanceDetails('${clearance.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${clearance.status === 'Pending' ? `
                        <button class="btn btn-success btn-sm" onclick="approveClearance('${clearance.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="rejectClearance('${clearance.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// Show pending clearances
function showPendingClearances() {
    document.getElementById('statusFilter').value = 'Pending';
    document.getElementById('departmentFilter').value = '';
    document.getElementById('searchFilter').value = '';
    applyFilters();
}

// View clearance details
function viewClearanceDetails(clearanceId) {
    const clearance = facultyClearances.find(c => c.id === clearanceId);
    if (!clearance) return;

    const modal = document.getElementById('clearanceModal');
    const details = document.getElementById('clearanceDetails');
    
    // Helpers for attachments (convert server path to web URL and render previews)
    function getAttachmentUrl(p) {
        if (!p) return '';
        const s = String(p);
        if (s.startsWith('blob:') || s.startsWith('data:') || s.startsWith('http') || s.startsWith('/')) return s;
        let norm = s.replace(/\\\\/g, '/');
        const idx = norm.indexOf('/uploads');
        if (idx !== -1) return norm.slice(idx);
        const idx2 = norm.indexOf('uploads/');
        if (idx2 !== -1) return '/' + norm.slice(idx2);
        return '/uploads/' + norm.split('/').pop();
    }

    function renderAttachmentsHTML(attachments) {
        if (!attachments || !attachments.length) return '<p class="text-muted">No attachments</p>';
        return attachments.map(a => {
            const url = getAttachmentUrl(a.path || a);
            const name = a.originalName || (typeof a === 'string' ? a.split('/').pop() : 'attachment');
            const ext = (name.split('.').pop() || '').toLowerCase();
            const imageExts = ['jpg','jpeg','png','gif','webp'];
            if (imageExts.includes(ext)) {
                return `<div style="margin-bottom:8px"><a href="${url}" target="_blank"><img src="${url}" alt="${name}" style="max-width:240px;max-height:240px;border:1px solid #e5e7eb;padding:4px;border-radius:4px;display:block"></a><div><a href="${url}" target="_blank">${name}</a></div></div>`;
            }
            return `<div style="margin-bottom:6px"><a href="${url}" target="_blank">${name}</a></div>`;
        }).join('');
    }
    
    details.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h5>Student Information</h5>
                <p><strong>Name:</strong> ${clearance.studentName}</p>
                <p><strong>Student ID:</strong> ${clearance.studentId}</p>
                <p><strong>Email:</strong> ${clearance.studentEmail}</p>
                <p><strong>Department:</strong> ${clearance.department}</p>
                
                <h5 class="mt-3">Request Details</h5>
                <p><strong>Request ID:</strong> ${clearance.requestId}</p>
                <p><strong>Document Type:</strong> ${clearance.documentType}</p>
                <p><strong>Purpose:</strong> ${clearance.purpose}</p>
                <h5 class="mt-3">Attachments</h5>
                ${renderAttachmentsHTML(clearance.attachments || [])}
            </div>
            <div class="col-md-6">
                <h5>Academic Record</h5>
                <p><strong>GPA:</strong> ${clearance.academicRecord.gpa}</p>
                <p><strong>Credits Completed:</strong> ${clearance.academicRecord.creditsCompleted}</p>
                <p><strong>Graduation Status:</strong> ${clearance.academicRecord.graduationStatus}</p>
                <p><strong>Academic Standing:</strong> ${clearance.academicRecord.academicStanding}</p>
                ${clearance.academicRecord.holds.length > 0 ? `
                    <p><strong>Holds:</strong> ${clearance.academicRecord.holds.join(', ')}</p>
                ` : ''}
                
                <h5 class="mt-3">Clearance Status</h5>
                <p><strong>Status:</strong> 
                    <span class="status-badge ${DocTracker.getStatusBadgeClass(clearance.status)}">${clearance.status}</span>
                </p>
                ${clearance.clearanceNotes ? `<p><strong>Notes:</strong> ${clearance.clearanceNotes}</p>` : ''}
            </div>
        </div>
        
        <div class="mt-3">
            <h5>Timeline</h5>
            <div class="timeline">
                ${clearance.timeline.map(step => `
                    <div class="timeline-item">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <h6>${step.status}</h6>
                            <p class="text-muted">${DocTracker.formatDateTime(step.date)} by ${step.user}</p>
                            <p>${step.note}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        ${clearance.status === 'Pending' ? `
            <div class="mt-3">
                <h5>Actions</h5>
                <div class="d-flex gap-2">
                    <button class="btn btn-success" onclick="approveClearance('${clearance.id}')">
                        <i class="fas fa-check"></i> Approve Clearance
                    </button>
                    <button class="btn btn-danger" onclick="rejectClearance('${clearance.id}')">
                        <i class="fas fa-times"></i> Reject Clearance
                    </button>
                </div>
            </div>
        ` : ''}
    `;
    
    DocTracker.openModal('clearanceModal');
}

// Approve clearance
function approveClearance(clearanceId) {
    const clearance = facultyClearances.find(c => c.id === clearanceId);
    if (!clearance) return;

    const notes = prompt('Enter approval notes (optional):');
    
    clearance.status = 'Approved';
    clearance.clearanceNotes = notes || 'Clearance approved by faculty';
    
    clearance.timeline.push({
        status: 'Approved',
        date: new Date().toISOString(),
        note: `Clearance approved: ${clearance.clearanceNotes}`,
        user: 'Dr. Faculty'
    });
    
    // Add notification
    facultyNotifications.unshift({
        id: facultyNotifications.length + 1,
        type: 'success',
        title: 'Clearance Approved',
        message: `${clearance.studentName}'s academic clearance has been approved`,
        timestamp: new Date().toISOString(),
        read: false,
        clearanceId: clearanceId
    });
    
    DocTracker.showNotification('success', 'Academic clearance approved successfully!');
    updateDashboard();
    loadClearances();
    loadNotifications();
    DocTracker.closeModal();
}

// Reject clearance
function rejectClearance(clearanceId) {
    const clearance = facultyClearances.find(c => c.id === clearanceId);
    if (!clearance) return;

    const reason = prompt('Please provide a reason for rejecting this clearance:');
    if (reason && reason.trim()) {
        clearance.status = 'Rejected';
        clearance.clearanceNotes = `Clearance rejected: ${reason}`;
        
        clearance.timeline.push({
            status: 'Rejected',
            date: new Date().toISOString(),
            note: `Clearance rejected: ${reason}`,
            user: 'Dr. Faculty'
        });
        
        // Add notification
        facultyNotifications.unshift({
            id: facultyNotifications.length + 1,
            type: 'warning',
            title: 'Clearance Rejected',
            message: `${clearance.studentName}'s academic clearance has been rejected`,
            timestamp: new Date().toISOString(),
            read: false,
            clearanceId: clearanceId
        });
        
        DocTracker.showNotification('warning', 'Academic clearance has been rejected!');
        updateDashboard();
        loadClearances();
        loadNotifications();
        DocTracker.closeModal();
    }
}

// Load notifications
function loadNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;

    notificationsList.innerHTML = facultyNotifications.slice(0, 5).map(notification => `
        <div class="notification notification-${notification.type}">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h6>${notification.title}</h6>
                    <p class="mb-1">${notification.message}</p>
                    <small class="text-muted">${DocTracker.formatDateTime(notification.timestamp)}</small>
                </div>
                <button class="btn btn-sm btn-outline" onclick="markNotificationRead(${notification.id})">
                    <i class="fas fa-check"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Mark notification as read
function markNotificationRead(notificationId) {
    const notification = facultyNotifications.find(n => n.id === notificationId);
    if (notification) {
        notification.read = true;
        loadNotifications();
    }
}

// Refresh data
function refreshData() {
    DocTracker.showNotification('info', 'Refreshing data...');
    setTimeout(() => {
        loadClearances();
        loadNotifications();
        updateDashboard();
        DocTracker.showNotification('success', 'Data refreshed successfully!');
    }, 1000);
}

// Logout function
function logout() {
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('roleVerified'); // Clear faculty role verification
    window.location.href = '../../index.html'; // Fixed path to home page
}

// Add timeline styles (same as other portals)
const timelineStyles = `
<style>
.timeline {
    position: relative;
    padding-left: 30px;
}

.timeline-item {
    position: relative;
    margin-bottom: 20px;
}

.timeline-marker {
    position: absolute;
    left: -25px;
    top: 5px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--usjr-green);
    border: 2px solid white;
    box-shadow: 0 0 0 2px var(--usjr-green);
}

.timeline-item:not(:last-child) .timeline-marker::after {
    content: '';
    position: absolute;
    top: 15px;
    left: 50%;
    transform: translateX(-50%);
    width: 2px;
    height: 30px;
    background: #dee2e6;
}

.timeline-content h6 {
    margin-bottom: 5px;
    color: #333;
}

.timeline-content p {
    margin-bottom: 5px;
}
</style>
`;

// Add timeline styles to head
document.head.insertAdjacentHTML('beforeend', timelineStyles);

// Make functions globally available
window.logout = logout;
window.viewClearanceDetails = viewClearanceDetails;
window.approveClearance = approveClearance;
window.rejectClearance = rejectClearance;
window.refreshData = refreshData;
window.showPendingClearances = showPendingClearances;
window.markNotificationRead = markNotificationRead;
window.applyFilters = applyFilters;