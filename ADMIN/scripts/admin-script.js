// Admin Portal JavaScript

let adminRequests = [];
let adminNotifications = [];

// Initialize admin portal
document.addEventListener('DOMContentLoaded', function() {
    // Ensure only admin can view this page
    if (window.Auth && window.Auth.isAuthenticated) {
        const user = window.Auth.getCurrentUser();
        const roleVerified = sessionStorage.getItem('roleVerified');
        // Allow access if either the logged-in user is an admin OR the role password was
        // verified in this session. This lets admins skip signup/login after entering the password.
        if (!((user && user.role === 'admin') || roleVerified === 'admin')) {
            window.location.href = '../auth.html';
            return;
        }
    } else {
        // No persistent login; allow access only if role password was verified in this session
        const roleVerified = sessionStorage.getItem('roleVerified');
        if (roleVerified !== 'admin') {
            window.location.href = '../auth.html';
            return;
        }
    }

    loadAdminData();
    updateDashboard();
    loadRequests();
    loadNotifications();
    
    // Set up event listeners
    setupEventListeners();
    // Allow clicking the overlay of the process modal to close it for convenience
    (function attachProcessModalOverlayClose() {
        const modal = document.getElementById('processModal');
        if (!modal) return;
        modal.addEventListener('click', function(e) {
            // If the click target is the modal itself (i.e., the overlay), close it
            if (e.target === modal) {
                try { DocTracker.closeModal('processModal'); } catch (err) { /* ignore */ }
            }
        });
    })();
    
    // Try to sync with backend if available
    fetchAdminRequests();
    // Poll the server periodically for new requests (every 10s)
    setInterval(fetchAdminRequests, 10000);
});

// Load admin-specific data
function loadAdminData() {
    // Sample admin requests
    adminRequests = [
        {
            id: 'REQ001',
            studentId: '2023-001',
            studentName: 'John Doe',
            studentEmail: 'john.doe@student.edu',
            documentType: 'TOR',
            purpose: 'Employment Application',
            status: 'Submitted',
            dateSubmitted: '2024-01-15',
            copies: 2,
            deliveryMethod: 'Pickup',
            notes: 'Urgent request for job application',
            adminNotes: '',
            attachments: [],
            requiresClearance: false,
            timeline: [
                { status: 'Submitted', date: '2024-01-15', note: 'Request submitted by student', user: 'Student' },
                { status: 'Processing', date: '2024-01-16', note: 'Request is being processed', user: 'Admin' }
            ]
        },
        {
            id: 'REQ002',
            studentId: '2023-002',
            studentName: 'Jane Smith',
            studentEmail: 'jane.smith@student.edu',
            documentType: 'GoodMoral',
            purpose: 'Scholarship Application',
            status: 'Processing',
            dateSubmitted: '2024-01-14',
            copies: 1,
            deliveryMethod: 'Delivery',
            notes: 'For scholarship application',
            adminNotes: 'Documents prepared, awaiting final review',
            attachments: [],
            requiresClearance: false,
            timeline: [
                { status: 'Submitted', date: '2024-01-14', note: 'Request submitted by student', user: 'Student' },
                { status: 'Processing', date: '2024-01-15', note: 'Request is being processed', user: 'Admin' },
                { status: 'Processing', date: '2024-01-16', note: 'Documents are being prepared', user: 'Admin' }
            ]
        },
        {
            id: 'REQ003',
            studentId: '2023-003',
            studentName: 'Mike Johnson',
            studentEmail: 'mike.johnson@student.edu',
            documentType: 'COE',
            purpose: 'Internship',
            status: 'Completed',
            dateSubmitted: '2024-01-10',
            copies: 1,
            deliveryMethod: 'Pickup',
            notes: '',
            adminNotes: 'Document completed and picked up',
            attachments: [],
            requiresClearance: false,
            timeline: [
                { status: 'Submitted', date: '2024-01-10', note: 'Request submitted by student', user: 'Student' },
                { status: 'Processing', date: '2024-01-11', note: 'Request is being processed', user: 'Admin' },
                { status: 'Ready for Release', date: '2024-01-12', note: 'Document is ready for pickup', user: 'Admin' },
                { status: 'Completed', date: '2024-01-13', note: 'Document has been picked up', user: 'Student' }
            ]
        },
        {
            id: 'REQ004',
            studentId: '2023-004',
            studentName: 'Sarah Wilson',
            studentEmail: 'sarah.wilson@student.edu',
            documentType: 'TOR',
            purpose: 'Graduate School Application',
            status: 'Action Required',
            dateSubmitted: '2024-01-17',
            copies: 3,
            deliveryMethod: 'Delivery',
            notes: 'Need official transcripts for graduate school',
            adminNotes: 'Additional verification required from academic department',
            attachments: [],
            requiresClearance: true,
            timeline: [
                { status: 'Submitted', date: '2024-01-17', note: 'Request submitted by student', user: 'Student' },
                { status: 'Action Required', date: '2024-01-18', note: 'Additional verification required', user: 'Admin' }
            ]
        }
    ];

    adminNotifications = [
        {
            id: 1,
            type: 'info',
            title: 'New Request Submitted',
            message: 'Sarah Wilson submitted a TOR request',
            timestamp: '2024-01-17 14:30:00',
            read: false,
            requestId: 'REQ004'
        },
        {
            id: 2,
            type: 'warning',
            title: 'Action Required',
            message: 'Mike Johnson\'s COE request needs additional information',
            timestamp: '2024-01-17 10:15:00',
            read: false,
            requestId: 'REQ003'
        },
        {
            id: 3,
            type: 'success',
            title: 'Request Completed',
            message: 'John Doe\'s TOR request has been completed',
            timestamp: '2024-01-16 16:45:00',
            read: true,
            requestId: 'REQ001'
        }
    ];
}

// Try to fetch requests from backend API (if server running) and replace adminRequests
async function fetchAdminRequests() {
    try {
        const res = await fetch('/api/requests');
        if (res.ok) {
            const body = await res.json();
            // server returns { success: true, requests: [...] }
            const data = Array.isArray(body) ? body : (body.requests || []);
            // Map any missing fields to adminRequests format
            adminRequests = data.map(r => Object.assign({
                adminNotes: r.adminNotes || '',
                attachments: r.attachments || [],
                requiresClearance: !!r.requiresClearance,
                timeline: r.timeline || [{ status: r.status, date: r.dateSubmitted, note: 'Submitted', user: 'Student' }]
            }, r));
            updateDashboard();
            loadRequests();
        }
    } catch (e) {
        console.warn('Could not fetch admin requests from server:', e.message);
    }
}

// Helper to persist request updates to server
async function persistRequestUpdate(requestId, payload) {
    try {
        const res = await fetch(`/api/requests/${requestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const body = await res.json();
            if (body && body.success && body.request) {
                // Refresh local adminRequests from server
                await fetchAdminRequests();
                return true;
            }
        }
    } catch (err) {
        console.error('Failed to persist request update:', err);
    }
    return false;
}

// Setup event listeners
function setupEventListeners() {
    // Filter changes
    const statusFilter = document.getElementById('statusFilter');
    const typeFilter = document.getElementById('typeFilter');
    const dateFilter = document.getElementById('dateFilter');
    const searchFilter = document.getElementById('searchFilter');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
    if (typeFilter) {
        typeFilter.addEventListener('change', applyFilters);
    }
    if (dateFilter) {
        dateFilter.addEventListener('change', applyFilters);
    }
    if (searchFilter) {
        searchFilter.addEventListener('input', applyFilters);
    }
}

// Update dashboard statistics
function updateDashboard() {
    const totalRequests = adminRequests.length;
    const pendingRequests = adminRequests.filter(r => r.status === 'Submitted').length;
    const processingRequests = adminRequests.filter(r => r.status === 'Processing').length;
    const completedToday = adminRequests.filter(r => 
        r.status === 'Completed' && 
        new Date(r.timeline.find(t => t.status === 'Completed')?.date).toDateString() === new Date().toDateString()
    ).length;

    document.getElementById('totalRequests').textContent = totalRequests;
    document.getElementById('pendingRequests').textContent = pendingRequests;
    document.getElementById('processingRequests').textContent = processingRequests;
    document.getElementById('completedToday').textContent = completedToday;
}

// Load and display requests
function loadRequests() {
    const tableBody = document.getElementById('requestsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = adminRequests.map(request => `
        <tr>
            <td>${request.id}</td>
            <td>
                <div>
                    <strong>${request.studentName}</strong><br>
                    <small class="text-muted">${request.studentId}</small>
                </div>
            </td>
            <td>${request.documentType}</td>
            <td>
                <span class="status-badge ${DocTracker.getStatusBadgeClass(request.status)}">
                    ${request.status}
                </span>
            </td>
            <td>${DocTracker.formatDate(request.dateSubmitted)}</td>
            <td>
                <div class="d-flex gap-1">
                    <button class="btn btn-primary btn-sm" onclick="viewRequestDetails('${request.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-success btn-sm" onclick="processRequest('${request.id}')">
                        <i class="fas fa-cogs"></i>
                    </button>
                    <button class="btn btn-info btn-sm" onclick="addNotes('${request.id}')">
                        <i class="fas fa-sticky-note"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Apply filters
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    const searchFilter = (document.getElementById('searchFilter').value || '').toLowerCase();
    
    let filteredRequests = adminRequests;
    
    if (statusFilter) {
        filteredRequests = filteredRequests.filter(r => r.status === statusFilter);
    }
    
    if (typeFilter) {
        filteredRequests = filteredRequests.filter(r => r.documentType === typeFilter);
    }
    
    if (dateFilter) {
        const now = new Date();
        const filterDate = new Date();
        
        switch (dateFilter) {
            case 'today':
                filteredRequests = filteredRequests.filter(r => 
                    new Date(r.dateSubmitted).toDateString() === now.toDateString()
                );
                break;
            case 'week':
                filterDate.setDate(now.getDate() - 7);
                filteredRequests = filteredRequests.filter(r => 
                    new Date(r.dateSubmitted) >= filterDate
                );
                break;
            case 'month':
                filterDate.setMonth(now.getMonth() - 1);
                filteredRequests = filteredRequests.filter(r => 
                    new Date(r.dateSubmitted) >= filterDate
                );
                break;
        }
    }
    
    if (searchFilter) {
        filteredRequests = filteredRequests.filter(r => 
            ((r.studentName || '').toLowerCase().includes(searchFilter)) ||
            ((r.studentId || '').toLowerCase().includes(searchFilter))
        );
    }
    
    displayFilteredRequests(filteredRequests);
}

// Display filtered requests
function displayFilteredRequests(requests) {
    const tableBody = document.getElementById('requestsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = requests.map(request => `
        <tr>
            <td>${request.id}</td>
            <td>
                <div>
                    <strong>${request.studentName}</strong><br>
                    <small class="text-muted">${request.studentId}</small>
                </div>
            </td>
            <td>${request.documentType}</td>
            <td>
                <span class="status-badge ${DocTracker.getStatusBadgeClass(request.status)}">
                    ${request.status}
                </span>
            </td>
            <td>${DocTracker.formatDate(request.dateSubmitted)}</td>
            <td>
                <div class="d-flex gap-1">
                    <button class="btn btn-primary btn-sm" onclick="viewRequestDetails('${request.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-success btn-sm" onclick="processRequest('${request.id}')">
                        <i class="fas fa-cogs"></i>
                    </button>
                    <button class="btn btn-info btn-sm" onclick="addNotes('${request.id}')">
                        <i class="fas fa-sticky-note"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Show all requests
function showAllRequests() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('dateFilter').value = '';
    document.getElementById('searchFilter').value = '';
    loadRequests();
}

// Show pending requests
function showPendingRequests() {
    document.getElementById('statusFilter').value = 'Submitted';
    document.getElementById('typeFilter').value = '';
    document.getElementById('dateFilter').value = '';
    document.getElementById('searchFilter').value = '';
    applyFilters();
}

// View request details
function viewRequestDetails(requestId) {
    console.log('[admin] viewRequestDetails', requestId);
    const request = adminRequests.find(r => r.id === requestId);
    if (!request) return;

    const modal = document.getElementById('processModal');
    const details = document.getElementById('processDetails');
    
    details.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h5>Student Information</h5>
                <p><strong>Name:</strong> ${request.studentName}</p>
                <p><strong>Student ID:</strong> ${request.studentId}</p>
                <p><strong>Email:</strong> ${request.studentEmail}</p>
                
                <h5 class="mt-3">Request Details</h5>
                <p><strong>Request ID:</strong> ${request.id}</p>
                <p><strong>Document Type:</strong> ${request.documentType}</p>
                <p><strong>Purpose:</strong> ${request.purpose}</p>
                <p><strong>Copies:</strong> ${request.copies}</p>
                <p><strong>Delivery Method:</strong> ${request.deliveryMethod}</p>
                ${request.notes ? `<p><strong>Student Notes:</strong> ${request.notes}</p>` : ''}
                ${request.adminNotes ? `<p><strong>Admin Notes:</strong> ${request.adminNotes}</p>` : ''}
            </div>
            <div class="col-md-6">
                <h5>Status Information</h5>
                <p><strong>Current Status:</strong> 
                    <span class="status-badge ${DocTracker.getStatusBadgeClass(request.status)}">${request.status}</span>
                </p>
                <p><strong>Date Submitted:</strong> ${DocTracker.formatDateTime(request.dateSubmitted)}</p>
                
                <h5 class="mt-3">Timeline</h5>
                <div class="timeline">
                    ${request.timeline.map(step => `
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
        </div>
        
        <div class="mt-3">
            <h5>Actions</h5>
            <div class="d-flex gap-2">
                ${!request.requiresClearance ? `
                    <button class="btn btn-outline" onclick="sendForFacultyClearance('${request.id}')">
                        <i class="fas fa-university"></i> FOR FACULTY VALIDATION
                    </button>
                ` : ''}
                ${request.status === 'Submitted' ? `
                    <button class="btn btn-success" onclick="updateRequestStatus('${request.id}', 'Processing')">
                        <i class="fas fa-play"></i> Start Processing
                    </button>
                ` : ''}
                ${request.status === 'Processing' ? `
                    <button class="btn btn-info" onclick="updateRequestStatus('${request.id}', 'Ready for Release')">
                        <i class="fas fa-check"></i> Ready for Release
                    </button>
                ` : ''}
                ${request.status === 'Ready for Release' ? `
                    <button class="btn btn-success" onclick="updateRequestStatus('${request.id}', 'Completed')">
                        <i class="fas fa-check-circle"></i> Mark as Completed
                    </button>
                ` : ''}
                ${request.status !== 'Completed' && request.status !== 'Declined' ? `
                    <button class="btn btn-warning" onclick="updateRequestStatus('${request.id}', 'Action Required')">
                        <i class="fas fa-exclamation-triangle"></i> Action Required
                    </button>
                    <button class="btn btn-danger" onclick="declineRequest('${request.id}')">
                        <i class="fas fa-times"></i> Decline
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    
    DocTracker.openModal('processModal');
}

// Process request
function processRequest(requestId) {
    console.log('[admin] processRequest', requestId);
    viewRequestDetails(requestId);
}

// Add notes
function addNotes(requestId) {
    console.log('[admin] addNotes', requestId);
    const request = adminRequests.find(r => r.id === requestId);
    if (!request) return;

    DocTracker.openModal('notesModal');
    
    document.getElementById('notesForm').onsubmit = function(e) {
        e.preventDefault();
        const noteText = document.getElementById('noteText').value;
            if (noteText.trim()) {
                request.adminNotes = noteText;
                request.timeline.push({
                    status: request.status,
                    date: new Date().toISOString(),
                    note: `Admin note: ${noteText}`,
                    user: 'Admin'
                });
                
                // Persist to server
                persistRequestUpdate(requestId, { adminNotes: noteText, timelineEntry: { status: request.status, date: new Date().toISOString(), note: `Admin note: ${noteText}`, user: 'Admin' } })
                    .then(success => {
                        if (success) {
                            DocTracker.showNotification('success', 'Note added successfully!');
                        } else {
                            DocTracker.showNotification('warning', 'Note saved locally but failed to sync with server.');
                        }
                        DocTracker.closeModal();
                        document.getElementById('noteText').value = '';
                        loadRequests();
                    });
            }
    };
}

// Update request status
function updateRequestStatus(requestId, newStatus) {
    console.log('[admin] updateRequestStatus', requestId, newStatus);
    const request = adminRequests.find(r => r.id === requestId);
    if (!request) return;

    const oldStatus = request.status;
    const timelineEntry = {
        status: newStatus,
        date: new Date().toISOString(),
        note: `Status changed from ${oldStatus} to ${newStatus}`,
        user: 'Admin'
    };

    // Optimistically update locally
    request.status = newStatus;
    request.timeline.push(timelineEntry);

    // Persist update to server
    persistRequestUpdate(requestId, { status: newStatus, timelineEntry })
        .then(success => {
            if (success) {
                DocTracker.showNotification('success', `Request status updated to ${newStatus}!`);
            } else {
                DocTracker.showNotification('warning', `Status updated locally to ${newStatus} (server sync failed).`);
            }
            updateDashboard();
            loadRequests();
            loadNotifications();
            DocTracker.closeModal();
        });
}

// Decline request
function declineRequest(requestId) {
    console.log('[admin] declineRequest', requestId);
    const reason = prompt('Please provide a reason for declining this request:');
    if (reason && reason.trim()) {
        const request = adminRequests.find(r => r.id === requestId);
        if (request) {
            const timelineEntry = { status: 'Declined', date: new Date().toISOString(), note: `Request declined: ${reason}`, user: 'Admin' };
            // Optimistic update
            request.status = 'Declined';
            request.adminNotes = `Request declined: ${reason}`;
            request.timeline.push(timelineEntry);
            // Persist
            persistRequestUpdate(requestId, { status: 'Declined', adminNotes: `Request declined: ${reason}`, timelineEntry })
                .then(success => {
                    if (success) {
                        DocTracker.showNotification('success', 'Request has been declined!');
                    } else {
                        DocTracker.showNotification('warning', 'Request declined locally (server sync failed).');
                    }
                    updateDashboard();
                    loadRequests();
                    DocTracker.closeModal();
                });
        }
    }
}

// Send request to faculty for clearance
function sendForFacultyClearance(requestId) {
    console.log('[admin] sendForFacultyClearance', requestId);
    const request = adminRequests.find(r => r.id === requestId);
    if (!request) return;

    const timelineEntry = { status: 'Action Required', date: new Date().toISOString(), note: 'Sent to faculty for clearance', user: 'Admin' };
    // Optimistic update
    request.status = 'Action Required';
    request.requiresClearance = true;
    request.timeline.push(timelineEntry);

    persistRequestUpdate(requestId, { status: 'Action Required', requiresClearance: true, timelineEntry })
        .then(success => {
            if (success) {
                adminNotifications.unshift({
                    id: adminNotifications.length + 1,
                    type: 'warning',
                    title: 'Faculty Clearance Requested',
                    message: `${request.studentName}'s ${request.documentType} needs faculty clearance`,
                    timestamp: new Date().toISOString(),
                    read: false,
                    requestId: requestId
                });
                DocTracker.showNotification('success', 'Request sent to faculty for clearance');
            } else {
                DocTracker.showNotification('warning', 'Request marked for faculty clearance locally (server sync failed).');
            }
            updateDashboard();
            loadRequests();
            loadNotifications();
            DocTracker.closeModal();
        });
}

// Load notifications
function loadNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;

    notificationsList.innerHTML = adminNotifications.slice(0, 5).map(notification => `
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
    const notification = adminNotifications.find(n => n.id === notificationId);
    if (notification) {
        notification.read = true;
        loadNotifications();
    }
}

// Refresh data
function refreshData() {
    DocTracker.showNotification('info', 'Refreshing data...');
    setTimeout(() => {
        loadRequests();
        loadNotifications();
        updateDashboard();
        DocTracker.showNotification('success', 'Data refreshed successfully!');
    }, 1000);
}

// Add timeline styles (same as student portal)
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
    background: #667eea;
    border: 2px solid white;
    box-shadow: 0 0 0 2px #667eea;
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

// Expose admin functions globally (in case inline onclicks need them)
window.viewRequestDetails = viewRequestDetails;
window.processRequest = processRequest;
window.addNotes = addNotes;
window.updateRequestStatus = updateRequestStatus;
window.declineRequest = declineRequest;
window.sendForFacultyClearance = sendForFacultyClearance;
window.markNotificationRead = markNotificationRead;
window.refreshData = refreshData;
window.showAllRequests = showAllRequests;
window.showPendingRequests = showPendingRequests;
window.applyFilters = applyFilters;
window.loadRequests = loadRequests;
window.loadNotifications = loadNotifications;
window.fetchAdminRequests = fetchAdminRequests;
window.persistRequestUpdate = persistRequestUpdate;
