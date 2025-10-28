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
    // Prefill contact/email/date fields if present
    try {
        const emailInput = document.getElementById('studentEmailField');
        if (emailInput && currentStudent && currentStudent.email) emailInput.value = currentStudent.email;
        const contactInput = document.getElementById('contactNumber');
        if (contactInput && currentStudent && currentStudent.phone) contactInput.value = currentStudent.phone;
        const dateInput = document.getElementById('requestDate');
        if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0,10);
    } catch (e) {
        console.warn('Prefill fields error', e);
    }
    
    loadStudentData();
    // Load local data first, then try to pull latest from server and update UI
    updateDashboard();
    loadRequests();
    loadNotifications();
    // Attempt to refresh from server so statuses reflect admin/faculty updates
    fetchServerRequests().then(updated => {
        if (updated) {
            updateDashboard();
            loadRequests();
        }
    });
    // start background polling for server updates (every 10s)
    startPolling();
    
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
    // Document type change - show/hide extra fields ('Other')
    const documentType = document.getElementById('documentType');
    if (documentType) {
        documentType.addEventListener('change', function() {
            const otherGroup = document.getElementById('otherTypeGroup');
            const otherField = document.getElementById('otherDocumentType');
            const selected = this.value;
            if (selected === 'Other') {
                otherGroup.classList.remove('d-none');
                otherField.required = true;
            } else {
                otherGroup.classList.add('d-none');
                otherField.required = false;
            }
            // termCoverage remains optional and visible
        });
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
    // Render as table rows: Document requested | Submitted (status) | Date | Delete
    if (studentRequests.length === 0) {
        requestsList.innerHTML = `<tr><td colspan="4" class="text-muted" style="padding:14px">You haven't submitted any requests yet.</td></tr>`;
        return;
    }

    const rows = studentRequests.map(r => {
        const docLabel = (r.documentType === 'Other' && r.otherDocumentType) ? r.otherDocumentType : r.documentType;
        const status = r.status || 'Submitted';
        const dateDisplay = DocTracker.formatDateTime(r.dateSubmitted || r.requestDate || new Date().toISOString());
        const submittedShort = r.id || '';
        return `
            <tr style="border-bottom:1px solid #f1f1f1">
                <td style="padding:10px">${DocTracker.escape ? DocTracker.escape(docLabel) : docLabel}</td>
                <td style="padding:10px">${submittedShort}</td>
                <td style="padding:10px">${dateDisplay}</td>
                <td style="padding:10px">
                    <button class="btn btn-danger btn-sm" onclick="deleteRequest('${r.id}')"><i class="fas fa-trash"></i> Delete</button>
                </td>
            </tr>
        `;
    }).join('');

    requestsList.innerHTML = rows;
}

// Filters removed from UI; requests are displayed as a compact summary list.

// Request details modal removed — the student view shows a compact summary list instead.

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

// Delete a request (student-initiated). Removes locally and attempts to mark deleted on server.
function deleteRequest(requestId) {
    if (!confirm('Are you sure you want to delete this request? This action cannot be undone.')) return;

    const idx = studentRequests.findIndex(r => r.id === requestId);
    if (idx === -1) {
        DocTracker.showNotification('error', 'Request not found.');
        return;
    }

    // Remove locally
    studentRequests.splice(idx, 1);
    localStorage.setItem(`requests_${currentStudent.studentId}`, JSON.stringify(studentRequests));
    updateDashboard();
    loadRequests();

    // Try to update server to mark as deleted (server supports PUT)
    fetch(`/api/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Deleted', timelineEntry: { status: 'Deleted', date: new Date().toISOString(), note: 'Student deleted the request' } })
    }).then(r => r.json()).then(res => {
        if (res && res.success) {
            DocTracker.showNotification('success', 'Request deleted successfully.');
        } else {
            DocTracker.showNotification('warning', 'Local request deleted but server update failed.');
            console.warn('Server delete/mark failed', res);
        }
    }).catch(err => {
        console.warn('Error marking request deleted on server:', err);
        DocTracker.showNotification('warning', 'Request removed locally. Server could not be reached.');
    });
}

// expose deleteRequest globally for button onclick
window.deleteRequest = deleteRequest;

// Refresh requests
function refreshRequests() {
    DocTracker.showNotification('info', 'Refreshing requests...');
    // Try fetching latest requests from server and merge statuses into local requests
    fetchServerRequests().then(updated => {
        loadRequests();
        updateDashboard();
        if (updated) {
            DocTracker.showNotification('success', 'Requests refreshed from server.');
        } else {
            DocTracker.showNotification('warning', 'No server available or no updates. Showing local requests.');
        }
    }).catch(err => {
        console.error('Error refreshing from server:', err);
        // Fallback to local-only refresh
        loadRequests();
        updateDashboard();
        DocTracker.showNotification('warning', 'Could not contact server. Showing local requests.');
    });
}

// Fetch requests from backend and merge status/timeline/notes into local studentRequests
async function fetchServerRequests() {
    if (!currentStudent) return false;
    try {
        const res = await fetch('/api/requests');
        if (!res.ok) return false;
        const body = await res.json();
        const serverRequests = Array.isArray(body) ? body : (body.requests || []);

        // Find requests that belong to this student (match by studentId or studentEmail)
        let foundAny = false;
        serverRequests.forEach(sr => {
            if (!sr) return;
            const matchesStudent = sr.studentId === currentStudent.studentId || (sr.studentEmail && sr.studentEmail.toLowerCase() === (currentStudent.email || '').toLowerCase());
            if (!matchesStudent) return;

            // Try to find local entry by id
            const idx = studentRequests.findIndex(r => r.id === sr.id);
            if (idx !== -1) {
                // Update status, timeline, notes and attachments if changed
                const local = studentRequests[idx];
                let changed = false;
                if (local.status !== sr.status) { local.status = sr.status; changed = true; }

                // Detect new timeline steps and convert them into notifications for the student
                const localTimeline = local.timeline || [];
                const serverTimeline = sr.timeline || [];
                // find steps that are in serverTimeline but not in localTimeline (by date+status+note)
                const newSteps = serverTimeline.filter(st => !localTimeline.some(lt => lt.date === st.date && lt.status === st.status && (lt.note || '') === (st.note || '')));
                if (newSteps.length) {
                    // add notifications for each new step
                    const notifKey = `notifications_${currentStudent ? currentStudent.studentId : 'anon'}`;
                    const existingNotifs = JSON.parse(localStorage.getItem(notifKey) || '[]');
                    newSteps.forEach(ns => {
                        existingNotifs.unshift({
                            id: DocTracker.generateRequestId(),
                            requestId: sr.id,
                            title: `${ns.status} — ${sr.documentType}`,
                            message: ns.note || `${sr.documentType} status updated to ${ns.status}`,
                            date: ns.date || new Date().toISOString(),
                            read: false
                        });
                    });
                    localStorage.setItem(notifKey, JSON.stringify(existingNotifs));
                    // update notification UI count if visible
                    if (document.getElementById('notificationCount')) {
                        loadNotifications();
                    }
                }

                if (JSON.stringify(localTimeline) !== JSON.stringify(serverTimeline)) { local.timeline = serverTimeline || []; changed = true; }
                if (local.notes !== sr.adminNotes && sr.adminNotes) { local.notes = sr.adminNotes; changed = true; }
                if (changed) foundAny = true;
                studentRequests[idx] = local;
            } else {
                // Local does not have it yet — insert server copy so student sees it
                const copy = Object.assign({}, sr);
                // Ensure necessary fields exist
                copy.timeline = copy.timeline || [];
                studentRequests.unshift(copy);
                foundAny = true;
            }
        });

        if (foundAny) {
            // Persist merged results locally
            localStorage.setItem(`requests_${currentStudent.studentId}`, JSON.stringify(studentRequests));
        }

        return true;
    } catch (e) {
        console.warn('fetchServerRequests failed:', e.message || e);
        return false;
    }
}

// Handle form submission
function handleRequestSubmission(e) {
    e.preventDefault();

    const formElement = e.target;
    const formData = new FormData(formElement);

    // read top-level fields that are outside the form
    const recipientTop = document.getElementById('recipientNameTop') ? document.getElementById('recipientNameTop').value.trim() : '';
    const contactNumber = document.getElementById('contactNumber') ? document.getElementById('contactNumber').value.trim() : '';
    const studentEmailField = document.getElementById('studentEmailField') ? document.getElementById('studentEmailField').value.trim() : (currentStudent.email || '');
    const requestDateField = document.getElementById('requestDate') ? document.getElementById('requestDate').value : '';

    // Build local request object for UI
    const chosenDocType = formData.get('documentType') === 'Other' ? (document.getElementById('otherDocumentType') ? document.getElementById('otherDocumentType').value.trim() : '') : formData.get('documentType');

    const newRequest = {
        id: DocTracker.generateRequestId(),
        studentId: currentStudent.studentId,
        studentName: `${currentStudent.firstName} ${currentStudent.lastName}`,
        studentEmail: studentEmailField || currentStudent.email,
        documentType: formData.get('documentType'),
        otherDocumentType: (formData.get('documentType') === 'Other') ? chosenDocType : '',
        purpose: formData.get('purpose'),
        termCoverage: formData.get('termCoverage'),
        copies: parseInt(formData.get('copies')),
        recipientName: recipientTop,
        contactNumber: contactNumber,
        requestDate: requestDateField || new Date().toISOString(),
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
    if (newRequest.otherDocumentType) sendData.append('otherDocumentType', newRequest.otherDocumentType);
    sendData.append('purpose', newRequest.purpose);
    sendData.append('termCoverage', newRequest.termCoverage || '');
    sendData.append('copies', newRequest.copies);
    sendData.append('recipientName', newRequest.recipientName || '');
    sendData.append('contactNumber', newRequest.contactNumber || '');
    sendData.append('requestDate', newRequest.requestDate || '');
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

// Start polling server for updates every N seconds
let _pollIntervalId = null;
function startPolling(intervalMs = 10000) {
    if (_pollIntervalId) return;
    _pollIntervalId = setInterval(async () => {
        try {
            const updated = await fetchServerRequests();
            if (updated) {
                updateDashboard();
                loadRequests();
            }
        } catch (e) {
            console.debug('Polling error:', e && e.message);
        }
    }, intervalMs);
}

function stopPolling() {
    if (_pollIntervalId) {
        clearInterval(_pollIntervalId);
        _pollIntervalId = null;
    }
}

// Load notifications from localStorage for current student
function loadNotifications() {
    const list = document.getElementById('notificationsList');
    const countEl = document.getElementById('notificationCount');
    if (!list || !currentStudent) return;
    const key = `notifications_${currentStudent.studentId}`;
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    if (!items || items.length === 0) {
        list.innerHTML = `<p class="text-muted">No notifications</p>`;
        if (countEl) countEl.style.display = 'none';
        return;
    }

    // render items
    list.innerHTML = items.map(n => `
        <div style="padding:8px;border-bottom:1px solid #f1f1f1">
            <div style="font-weight:700">${n.title}</div>
            <div class="text-muted small">${n.message}</div>
            <div class="text-muted xsmall" style="font-size:11px">${DocTracker.formatDateTime(n.date)}</div>
        </div>
    `).join('');

    if (countEl) {
        const unread = items.filter(i => !i.read).length;
        if (unread > 0) {
            countEl.textContent = unread;
            countEl.style.display = 'inline-block';
        } else {
            countEl.style.display = 'none';
        }
    }
}

function toggleNotifications() {
    const panel = document.getElementById('notificationsPanel');
    if (!panel) return;
    if (panel.style.display === 'none' || panel.style.display === '') {
        loadNotifications();
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

// expose toggle to global scope for onclick
window.toggleNotifications = toggleNotifications;

// Expose closeModal globally
window.closeModal = closeModal;

// Expose all functions globally for onclick handlers
window.studentLogout = studentLogout;
window.showSubmitForm = showSubmitForm;
window.hideSubmitForm = hideSubmitForm;
window.refreshRequests = refreshRequests;
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