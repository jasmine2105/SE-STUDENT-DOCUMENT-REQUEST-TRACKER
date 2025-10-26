// Student Portal JavaScript

let studentRequests = [];
let currentStudent = null;

// Initialize student portal
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first
    if (!Auth.isAuthenticated()) {
        window.location.href = '../auth.html';
        return;
    }
    
    // Get current user
    currentStudent = Auth.getCurrentUser();
    
    // Update welcome message
    updateWelcomeMessage();
    
    loadStudentData();
    updateDashboard();
    loadRequests();
    
    // Set up event listeners
    setupEventListeners();
});

// Update welcome message
function updateWelcomeMessage() {
    const welcomeElement = document.getElementById('welcomeMessage');
    if (welcomeElement && currentStudent) {
        welcomeElement.textContent = `Welcome, ${currentStudent.firstName} ${currentStudent.lastName}`;
    }
}

// Load student-specific data
function loadStudentData() {
    // Load requests from localStorage for the current user
    const savedRequests = localStorage.getItem(`requests_${currentStudent.studentId}`);
    if (savedRequests) {
        studentRequests = JSON.parse(savedRequests);
    } else {
        // Sample requests for new users
        studentRequests = [];
    }
}

// Setup event listeners
function setupEventListeners() {
    // Delivery method change
    const deliveryMethod = document.getElementById('deliveryMethod');
    if (deliveryMethod) {
        deliveryMethod.addEventListener('change', function() {
            const deliveryDetails = document.getElementById('deliveryDetails');
            if (this.value === 'Delivery') {
                deliveryDetails.classList.remove('d-none');
            } else {
                deliveryDetails.classList.add('d-none');
            }
        });
    }

    // Document type change - show/hide extra fields
    const documentType = document.getElementById('documentType');
    if (documentType) {
        documentType.addEventListener('change', function() {
            const otherField = document.getElementById('otherDocumentType');
            const termField = document.getElementById('termCoverage');
            const selected = this.value;
            // Show 'other' input when Other selected
            if (selected === 'Other') {
                otherField.classList.remove('d-none');
                otherField.required = true;
            } else {
                otherField.classList.add('d-none');
                otherField.required = false;
            }

            // For TOR and COE, show termCoverage input
            if (selected === 'TOR' || selected === 'COE') {
                termField.parentElement.classList.remove('d-none');
            } else {
                // Keep term coverage visible but optional for others
                termField.parentElement.classList.remove('d-none');
            }
        });
    }

    // Filter changes
    const statusFilter = document.getElementById('statusFilter');
    const typeFilter = document.getElementById('typeFilter');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', filterRequests);
    }
    if (typeFilter) {
        typeFilter.addEventListener('change', filterRequests);
    }
    
    // Request form submission
    const requestForm = document.getElementById('requestForm');
    if (requestForm) {
        requestForm.addEventListener('submit', handleRequestSubmission);
    }
}

// Update dashboard statistics
function updateDashboard() {
    const totalRequests = studentRequests.length;
    const pendingRequests = studentRequests.filter(r => r.status === 'Submitted').length;
    const processingRequests = studentRequests.filter(r => r.status === 'Processing').length;
    const completedRequests = studentRequests.filter(r => r.status === 'Completed').length;

    document.getElementById('totalRequests').textContent = totalRequests;
    document.getElementById('pendingRequests').textContent = pendingRequests;
    document.getElementById('processingRequests').textContent = processingRequests;
    document.getElementById('completedRequests').textContent = completedRequests;
}

// Show submit form
function showSubmitForm() {
    const form = document.getElementById('submitForm');
    form.classList.remove('d-none');
    form.scrollIntoView({ behavior: 'smooth' });
}

// Hide submit form
function hideSubmitForm() {
    const form = document.getElementById('submitForm');
    form.classList.add('d-none');
    document.getElementById('requestForm').reset();
}

// Load and display requests
function loadRequests() {
    const requestsList = document.getElementById('requestsList');
    if (!requestsList) return;

    if (studentRequests.length === 0) {
        requestsList.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                <h4>No requests found</h4>
                <p class="text-muted">You haven't submitted any document requests yet.</p>
                <button class="btn btn-primary" onclick="showSubmitForm()">
                    <i class="fas fa-plus"></i> Submit Your First Request
                </button>
            </div>
        `;
        return;
    }

    requestsList.innerHTML = studentRequests.map(request => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h5 class="mb-1">${request.documentType}</h5>
                        <p class="text-muted mb-0">Request ID: ${request.id}</p>
                    </div>
                    <span class="status-badge ${DocTracker.getStatusBadgeClass(request.status)}">
                        ${request.status}
                    </span>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Purpose:</strong> ${request.purpose}</p>
                        <p><strong>Copies:</strong> ${request.copies}</p>
                        <p><strong>Delivery:</strong> ${request.deliveryMethod}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Submitted:</strong> ${DocTracker.formatDate(request.dateSubmitted)}</p>
                        <p><strong>Status:</strong> ${request.status}</p>
                        ${request.notes ? `<p><strong>Notes:</strong> ${request.notes}</p>` : ''}
                    </div>
                </div>
                
                <div class="d-flex gap-2 mt-3">
                    <button class="btn btn-primary btn-sm" onclick="viewRequestDetails('${request.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    ${request.status === 'Ready for Release' ? `
                        <button class="btn btn-success btn-sm" onclick="confirmPickup('${request.id}')">
                            <i class="fas fa-check"></i> Confirm Pickup
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Filter requests
function filterRequests() {
    const statusFilter = document.getElementById('statusFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    
    let filteredRequests = studentRequests;
    
    if (statusFilter) {
        filteredRequests = filteredRequests.filter(r => r.status === statusFilter);
    }
    
    if (typeFilter) {
        filteredRequests = filteredRequests.filter(r => r.documentType === typeFilter);
    }
    
    displayFilteredRequests(filteredRequests);
}

// Display filtered requests
function displayFilteredRequests(requests) {
    const requestsList = document.getElementById('requestsList');
    if (!requestsList) return;

    if (requests.length === 0) {
        requestsList.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h4>No requests match your filters</h4>
                <p class="text-muted">Try adjusting your filter criteria.</p>
            </div>
        `;
        return;
    }

    requestsList.innerHTML = requests.map(request => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h5 class="mb-1">${request.documentType}</h5>
                        <p class="text-muted mb-0">Request ID: ${request.id}</p>
                    </div>
                    <span class="status-badge ${DocTracker.getStatusBadgeClass(request.status)}">
                        ${request.status}
                    </span>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Purpose:</strong> ${request.purpose}</p>
                        <p><strong>Copies:</strong> ${request.copies}</p>
                        <p><strong>Delivery:</strong> ${request.deliveryMethod}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Submitted:</strong> ${DocTracker.formatDate(request.dateSubmitted)}</p>
                        <p><strong>Status:</strong> ${request.status}</p>
                        ${request.notes ? `<p><strong>Notes:</strong> ${request.notes}</p>` : ''}
                    </div>
                </div>
                
                <div class="d-flex gap-2 mt-3">
                    <button class="btn btn-primary btn-sm" onclick="viewRequestDetails('${request.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    ${request.status === 'Ready for Release' ? `
                        <button class="btn btn-success btn-sm" onclick="confirmPickup('${request.id}')">
                            <i class="fas fa-check"></i> Confirm Pickup
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// View request details
function viewRequestDetails(requestId) {
    const request = studentRequests.find(r => r.id === requestId);
    if (!request) return;

    const modal = document.getElementById('requestModal');
    const details = document.getElementById('requestDetails');
    
    details.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h5>Request Information</h5>
                <p><strong>Request ID:</strong> ${request.id}</p>
                <p><strong>Document Type:</strong> ${request.documentType}</p>
                <p><strong>Purpose:</strong> ${request.purpose}</p>
                <p><strong>Copies:</strong> ${request.copies}</p>
                <p><strong>Delivery Method:</strong> ${request.deliveryMethod}</p>
                        ${request.deliveryAddress ? `<p><strong>Delivery Address:</strong> ${request.deliveryAddress}</p>` : ''}
                        ${request.notes ? `<p><strong>Notes:</strong> ${request.notes}</p>` : ''}
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
                                <p class="text-muted">${DocTracker.formatDateTime(step.date)}</p>
                                <p>${step.note}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    DocTracker.openModal('requestModal');
}

// Confirm pickup
function confirmPickup(requestId) {
    if (confirm('Are you sure you want to confirm pickup of this document?')) {
        const request = studentRequests.find(r => r.id === requestId);
        if (request) {
            request.status = 'Completed';
            request.timeline.push({
                status: 'Completed',
                date: new Date().toISOString(),
                note: 'Document has been picked up'
            });
            
            // Save updated requests
            localStorage.setItem(`requests_${currentStudent.studentId}`, JSON.stringify(studentRequests));
            
            DocTracker.showNotification('success', 'Pickup confirmed successfully!');
            updateDashboard();
            loadRequests();
        }
    }
}

// Refresh requests
function refreshRequests() {
    DocTracker.showNotification('info', 'Refreshing requests...');
    setTimeout(() => {
        loadRequests();
        updateDashboard();
        DocTracker.showNotification('success', 'Requests refreshed successfully!');
    }, 1000);
}

// Handle form submission
function handleRequestSubmission(e) {
    e.preventDefault();

    const formElement = e.target;
    const formData = new FormData(formElement);

    // Build local request object for UI
    const newRequest = {
        id: DocTracker.generateRequestId(),
        studentId: currentStudent.studentId,
        studentName: `${currentStudent.firstName} ${currentStudent.lastName}`,
        studentEmail: currentStudent.email,
        documentType: formData.get('documentType'),
        purpose: formData.get('purpose'),
        termCoverage: formData.get('termCoverage'),
        copies: parseInt(formData.get('copies')),
        deliveryMethod: formData.get('deliveryMethod'),
        deliveryAddress: formData.get('deliveryAddress'),
        recipientName: formData.get('recipientName'),
        notes: formData.get('notes'),
        status: 'Submitted',
        dateSubmitted: new Date().toISOString(),
        timeline: [{
            status: 'Submitted',
            date: new Date().toISOString(),
            note: 'Request submitted successfully'
        }]
    };

    // Add to requests locally for immediate feedback
    studentRequests.unshift(newRequest);
    localStorage.setItem(`requests_${currentStudent.studentId}`, JSON.stringify(studentRequests));
    updateDashboard();
    loadRequests();
    hideSubmitForm();
    DocTracker.showNotification('success', 'Document request submitted locally. Sending request to server...');

    // Send to backend (attempt). Backend will persist and send Gmail notification.
    // Build FormData to include files if any
    const sendData = new FormData();
    // Append fields
    sendData.append('studentId', newRequest.studentId);
    sendData.append('studentName', newRequest.studentName);
    sendData.append('studentEmail', newRequest.studentEmail);
    sendData.append('documentType', newRequest.documentType);
    sendData.append('purpose', newRequest.purpose);
    sendData.append('termCoverage', newRequest.termCoverage || '');
    sendData.append('copies', newRequest.copies);
    sendData.append('deliveryMethod', newRequest.deliveryMethod);
    sendData.append('deliveryAddress', newRequest.deliveryAddress || '');
    sendData.append('recipientName', newRequest.recipientName || '');
    sendData.append('notes', newRequest.notes || '');

    // Append attachments from file input if any
    const attachmentsInput = document.getElementById('attachments');
    if (attachmentsInput && attachmentsInput.files && attachmentsInput.files.length) {
        for (let i = 0; i < attachmentsInput.files.length; i++) {
            sendData.append('attachments', attachmentsInput.files[i], attachmentsInput.files[i].name);
        }
    }

    fetch('/api/requests', {
        method: 'POST',
        body: sendData
    }).then(r => r.json())
      .then(result => {
          if (result && result.success) {
              DocTracker.showNotification('success', 'Request sent to server. You will receive an email confirmation shortly.');
              // Optionally update the local entry with server id
              const serverId = result.request.id;
              // replace the local request id with server id
              studentRequests = studentRequests.map(r => r.id === newRequest.id ? Object.assign({}, r, { id: serverId }) : r);
              localStorage.setItem(`requests_${currentStudent.studentId}`, JSON.stringify(studentRequests));
              loadRequests();
          } else {
              DocTracker.showNotification('error', 'Server error: could not save request. It remains saved locally.');
              console.error('Server response', result);
          }
      }).catch(err => {
          console.error('Error sending to server:', err);
          DocTracker.showNotification('warning', 'Could not reach server. Your request is saved locally and will not trigger email until server is running.');
      });
};

// Add timeline styles
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

// Student-specific logout to ensure logout works from the student portal folder.
function studentLogout() {
    console.log('[studentLogout] Logging out...');
    
    // Clear all user data
    try {
        currentStudent = null;
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
        console.log('[studentLogout] Cleared user data');
    } catch (e) {
        console.error('Error clearing user data:', e);
    }

    // Redirect to auth page
    try {
        window.location.href = '../index.html';
    } catch (e) {
        console.error('[studentLogout] Redirect error:', e);
        window.location.href = '../index.html';
    }
}

// Helper functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusBadgeClass(status) {
    const statusClasses = {
        'Submitted': 'status-submitted',
        'Processing': 'status-processing',
        'Ready for Release': 'status-ready',
        'Completed': 'status-completed',
        'Declined': 'status-declined'
    };
    return statusClasses[status] || 'status-submitted';
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}

function showNotification(type, message) {
    // Simple notification - just use alert for now
    alert(message);
}

function generateRequestId() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `REQ${timestamp}${random}`;
}

// Expose closeModal globally
window.closeModal = closeModal;

// Expose all functions globally for onclick handlers
window.studentLogout = studentLogout;
window.showSubmitForm = showSubmitForm;
window.hideSubmitForm = hideSubmitForm;
window.refreshRequests = refreshRequests;
window.viewRequestDetails = viewRequestDetails;
window.confirmPickup = confirmPickup;

// Override Auth.logout if present
if (window.Auth && typeof window.Auth === 'object') {
    window.Auth.logout = studentLogout;
}

// Add DocTracker helper object
window.DocTracker = {
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    getStatusBadgeClass: getStatusBadgeClass,
    openModal: openModal,
    closeModal: closeModal,
    showNotification: showNotification,
    generateRequestId: generateRequestId
};