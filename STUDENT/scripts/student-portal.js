// Student Portal JavaScript

let studentRequests = [];
let currentStudent = null;

// Initialize student portal
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first
    if (typeof Auth !== 'undefined' && Auth.isAuthenticated && !Auth.isAuthenticated()) {
        window.location.href = '../auth/student-login.html';
        return;
    }
    
    // Get current user from Auth system or create mock for testing
    if (typeof Auth !== 'undefined' && Auth.getCurrentUser) {
        currentStudent = Auth.getCurrentUser();
    } else {
        // Fallback for testing
        console.log('Auth system not fully loaded, using mock student data');
        currentStudent = {
            studentId: 'TEST123',
            firstName: 'Test',
            lastName: 'Student', 
            email: 'test@student.edu'
        };
    }
    
    // Update welcome message
    updateWelcomeMessage();
    // Prefill the student email in the form (read-only) so it appears below Last Name
    const emailInput = document.getElementById('studentEmail');
    if (emailInput && currentStudent && currentStudent.email) {
        emailInput.value = currentStudent.email;
    }
    loadStudentData();
    updateDashboard();
    loadRequests();
    
    // Attempt to refresh from server
    fetchServerRequests().then(updated => {
        if (updated) {
            updateDashboard();
            loadRequests();
        }
    });
    
    // Set up event listeners
    setupEventListeners();
    // Init notification UI
    initNotificationUI();
});

// --- Notifications (in-app) ---
function notificationsStorageKey() {
    return `notifications_${currentStudent ? currentStudent.studentId : 'guest'}`;
}

function loadNotifications() {
    try {
        const raw = localStorage.getItem(notificationsStorageKey());
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}

function saveNotifications(list) {
    localStorage.setItem(notificationsStorageKey(), JSON.stringify(list || []));
}

function initNotificationUI() {
    // Insert a bell + badge into .nav-buttons
    const navButtons = document.querySelector('.nav-buttons');
    if (!navButtons) return;
    const existing = document.getElementById('notifBtn');
    if (existing) return;

    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.marginLeft = '8px';

    const btn = document.createElement('button');
    btn.id = 'notifBtn';
    btn.className = 'btn btn-outline';
    btn.innerHTML = `<i class="fas fa-bell"></i> <span id="notifCount" style="margin-left:6px"></span>`;
    wrapper.appendChild(btn);

    const dropdown = document.createElement('div');
    dropdown.id = 'notifDropdown';
    dropdown.style.position = 'absolute';
    dropdown.style.right = '0';
    dropdown.style.top = '36px';
    dropdown.style.minWidth = '320px';
    dropdown.style.maxWidth = '420px';
    dropdown.style.background = 'white';
    dropdown.style.border = '1px solid #e9ecef';
    dropdown.style.borderRadius = '8px';
    dropdown.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
    dropdown.style.display = 'none';
    dropdown.style.zIndex = 2000;
    dropdown.innerHTML = `<div id="notifList" style="max-height:320px;overflow:auto;padding:8px"></div><div style="padding:8px;border-top:1px solid #f1f1f1;text-align:right"><button id="markAllRead" class="btn btn-outline">Mark all read</button></div>`;
    wrapper.appendChild(dropdown);

    navButtons.insertBefore(wrapper, navButtons.firstChild);

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        renderNotificationList();
    });

    document.addEventListener('click', () => { dropdown.style.display = 'none'; });

    const markAll = dropdown.querySelector('#markAllRead');
    markAll.addEventListener('click', (ev) => { ev.stopPropagation(); const list = loadNotifications().map(n => ({ ...n, read: true })); saveNotifications(list); renderNotificationBadge(); renderNotificationList(); });

    renderNotificationBadge();
}

function renderNotificationBadge() {
    const list = loadNotifications();
    const unread = list.filter(n => !n.read).length;
    const badge = document.getElementById('notifCount');
    if (badge) badge.textContent = unread ? `(${unread})` : '';
}

function renderNotificationList() {
    const container = document.getElementById('notifList');
    if (!container) return;
    const list = loadNotifications();
    if (!list.length) { container.innerHTML = '<div style="padding:12px;color:#666">No notifications</div>'; return; }
    container.innerHTML = list.map(n => `
        <div class="notif-item" data-id="${n.id}" data-request-id="${n.requestId}" style="padding:8px;border-bottom:1px solid #f3f4f6;cursor:pointer;background:${n.read? 'transparent':'rgba(238,245,233,0.6)'}">
            <div style="font-weight:600;color:#14532d">${n.title}</div>
            <div style="font-size:0.9rem;color:#444">${n.message}</div>
            <div style="font-size:0.75rem;color:#777;margin-top:6px">${new Date(n.date).toLocaleString()}</div>
        </div>
    `).join('');

    // click handlers
    container.querySelectorAll('.notif-item').forEach(el => {
        el.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const id = el.dataset.id; const reqId = el.dataset.requestId;
            // mark read
            const list = loadNotifications().map(n => n.id === id ? { ...n, read: true } : n);
            saveNotifications(list);
            renderNotificationBadge();
            renderNotificationList();
            // open request modal
            if (reqId) viewRequestDetails(reqId);
        });
    });
}

function generateNotifId() {
    return `N${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
}

function createNotification(requestId, title, message, date) {
    const list = loadNotifications();
    const n = { id: generateNotifId(), requestId: requestId, title: title || 'Update', message: message || '', date: date || new Date().toISOString(), read: false };
    list.unshift(n);
    // keep max 200 notifications
    saveNotifications(list.slice(0, 200));
    renderNotificationBadge();
}

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
    // Delivery method removed from UI — no handler required

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
    // Status/type filters removed from UI per UX request
    
    // Request form submission
    const requestForm = document.getElementById('requestForm');
    if (requestForm) {
        requestForm.addEventListener('submit', handleRequestSubmission);
    }

    // Attach non-inline button handlers (remove reliance on onclick attributes)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    const showSubmitBtn = document.getElementById('showSubmitBtn');
    if (showSubmitBtn) showSubmitBtn.addEventListener('click', showSubmitForm);

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', refreshRequests);

    const cancelBtn = document.getElementById('cancelRequestBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', hideSubmitForm);

    const modalCloseBtn = document.getElementById('modalCloseBtn');
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);

    // Table delegation for delete/view actions
    const requestsTableBody = document.getElementById('requestsTableBody');
    if (requestsTableBody) {
        requestsTableBody.addEventListener('click', function (e) {
            const btn = e.target.closest('button');
            if (!btn) return;
            const action = btn.dataset.action;
            const rid = btn.dataset.requestId;
            if (!action || !rid) return;
            if (action === 'delete') {
                deleteRequest(rid);
            } else if (action === 'view') {
                viewRequestDetails(rid);
            }
        });
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
    const tableBody = document.getElementById('requestsTableBody');
    if (!tableBody) return;

    if (studentRequests.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">You haven't submitted any document requests yet.</td></tr>`;
        return;
    }

    tableBody.innerHTML = studentRequests.map(request => `
        <tr>
            <td style="border-bottom:1px solid #f3f4f6">${request.id}</td>
            <td style="border-bottom:1px solid #f3f4f6">${request.documentType}</td>
            <td style="border-bottom:1px solid #f3f4f6"><span class="status-badge ${DocTracker.getStatusBadgeClass(request.status)}">${request.status}</span></td>
            <td style="border-bottom:1px solid #f3f4f6">${DocTracker.formatDateTime(request.dateSubmitted)}</td>
            <td style="border-bottom:1px solid #f3f4f6">${request.purpose || ''}</td>
            <td style="border-bottom:1px solid #f3f4f6">
                <div style="display:flex;gap:6px;justify-content:center;align-items:center">
                    <button class="btn btn-primary btn-sm" data-action="view" data-request-id="${request.id}">View</button>
                    <button class="btn btn-danger btn-sm" data-action="delete" data-request-id="${request.id}">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Note: status/type filters removed; requests displayed in table via loadRequests()

// View request details
// Delete a request (student-facing) — removes locally and attempts server update
function deleteRequest(requestId) {
    if (!confirm('Are you sure you want to delete this request? This action cannot be undone.')) return;
    const idx = studentRequests.findIndex(r => r.id === requestId);
    if (idx === -1) return;

    // Remove locally
    studentRequests.splice(idx, 1);
    localStorage.setItem(`requests_${currentStudent.studentId}`, JSON.stringify(studentRequests));
    updateDashboard();
    loadRequests();
    DocTracker.showNotification('success', 'Request deleted locally. Attempting to remove from server...');

    // Try to mark deleted on server (best-effort). If server not available, leave local deletion as source of truth until sync.
    (async () => {
        try {
            const res = await fetch(`/api/requests/${requestId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Deleted', timelineEntry: { status: 'Deleted', date: new Date().toISOString(), note: 'Deleted by student' } })
            });
            if (res.ok) {
                const body = await res.json();
                if (body && body.success) {
                    DocTracker.showNotification('success', 'Request removed from server.');
                }
            }
        } catch (e) {
            console.warn('Could not update server to delete request:', e.message || e);
            DocTracker.showNotification('warning', 'Could not update server. Deletion is local only until server is available.');
        }
    })();
}

function viewRequestDetails(requestId) {
    const request = studentRequests.find(r => r.id === requestId);
    if (!request) return;

    const modal = document.getElementById('requestModal');
    const details = document.getElementById('requestDetails');
    
    // Helper: convert a server-side stored path to a web-accessible URL
    function getAttachmentUrl(p) {
        if (!p) return '';
        const s = String(p);
        // If it's already a blob/data/http/absolute path, return as-is
        if (s.startsWith('blob:') || s.startsWith('data:') || s.startsWith('http') || s.startsWith('/')) return s;
        // normalize backslashes (handle Windows paths sent by server)
        let norm = s.replace(/\\/g, '/');
        // also handle single backslashes (defensive)
        norm = norm.replace(/\\/g, '/');
        // find the first occurrence of /uploads and return from there
        const idx = norm.indexOf('/uploads');
        if (idx !== -1) return norm.slice(idx);
        const idx2 = norm.indexOf('uploads/');
        if (idx2 !== -1) return '/' + norm.slice(idx2);
        // fallback: return /uploads/<filename>
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
                // Return a clickable thumbnail which opens an inline preview in the modal
                return `<div style="margin-bottom:8px"><a href="#" class="attachment-link" data-url="${url}" data-name="${name}"><img src="${url}" alt="${name}" style="max-width:240px;max-height:240px;border:1px solid #e5e7eb;padding:4px;border-radius:4px;display:block"></a><div><a href="#" class="attachment-link" data-url="${url}" data-name="${name}">${name}</a></div></div>`;
            }
            // For non-images show a clickable link that opens inline preview (PDF/doc will open in iframe)
            return `<div style="margin-bottom:6px"><a href="#" class="attachment-link" data-url="${url}" data-name="${name}">${name}</a></div>`;
        }).join('');
    }

    // Minimal preview-focused layout: show only Document Type and the preview pane
    details.innerHTML = `
        <div class="simple-view">
            <h5 class="preview-title">Document Type: <span class="doc-type">${request.documentType}</span></h5>
            <div id="attachmentPreview" class="attachment-preview text-center text-muted">Click an attachment below to preview it here.</div>
            <div id="attachmentList" class="attachment-list" style="margin-top:12px">${renderAttachmentsHTML(request.attachments || [])}</div>
        </div>
    `;

    DocTracker.openModal('requestModal');

    // Attach click handlers for inline attachment preview and auto-show first file
    try {
        const previewContainer = document.getElementById('attachmentPreview');
        const attachmentLinks = details.querySelectorAll('.attachment-link');
        if (attachmentLinks && attachmentLinks.length) {
            attachmentLinks.forEach(link => {
                link.addEventListener('click', function (ev) {
                    ev.preventDefault();
                    const url = this.dataset.url;
                    const name = this.dataset.name || '';
                    if (!url) return;
                    const ext = (name.split('.').pop() || '').toLowerCase();
                    const imageExts = ['jpg','jpeg','png','gif','webp'];
                    if (imageExts.includes(ext) || url.startsWith('data:') || url.startsWith('blob:')) {
                        previewContainer.innerHTML = `<div style="display:flex;justify-content:center"><img src="${url}" alt="${name}" style="max-width:100%;max-height:520px;border-radius:8px;border:1px solid #e9ecef"/></div>`;
                    } else if (ext === 'pdf' || url.toLowerCase().endsWith('.pdf')) {
                        previewContainer.innerHTML = `<iframe src="${url}" style="width:100%;height:520px;border:0;border-radius:6px"></iframe>`;
                    } else {
                        previewContainer.innerHTML = `<div style="padding:12px"><p>${name}</p><a href="${url}" target="_blank" class="btn btn-outline">Open in new tab</a></div>`;
                    }
                });
            });

            // auto-open first attachment
            setTimeout(() => attachmentLinks[0].click(), 50);
        }
    } catch (e) {
        console.warn('Could not attach attachment preview handlers', e);
    }
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

                    // Compare timelines and create notifications for newly added timeline entries
                    const localTimeline = local.timeline || [];
                    const serverTimeline = sr.timeline || [];
                    if (JSON.stringify(localTimeline) !== JSON.stringify(serverTimeline)) {
                        // If server has more entries than local, create notification(s)
                        if (serverTimeline.length > localTimeline.length) {
                            for (let i = localTimeline.length; i < serverTimeline.length; i++) {
                                const te = serverTimeline[i];
                                const title = `${sr.documentType || 'Request'} (${sr.id || ''})`;
                                const message = te && (te.note || (`Status: ${te.status || ''}`)) || 'Update on your request';
                                const date = te && te.date ? te.date : new Date().toISOString();
                                createNotification(sr.id, title, message, date);
                            }
                        }
                        local.timeline = serverTimeline;
                        changed = true;
                    }

                    if (local.notes !== sr.adminNotes && sr.adminNotes) { local.notes = sr.adminNotes; changed = true; }

                    // Update attachments if server has them and they're different
                    if (JSON.stringify(local.attachments || []) !== JSON.stringify(sr.attachments || [])) {
                        local.attachments = sr.attachments || [];
                        changed = true;
                    }
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
async function handleRequestSubmission(e) {
    e.preventDefault();
    const formElement = e.target;
    const formData = new FormData(formElement);

    // Collect attachments for immediate preview and to send to server
    const attachmentsInput = document.getElementById('attachments');
    const files = (attachmentsInput && attachmentsInput.files) ? Array.from(attachmentsInput.files) : [];

    const fileToDataURL = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });

    const attachmentsPreview = [];
    for (const f of files) {
        try {
            if (f.type && f.type.startsWith('image/')) {
                const dataUrl = await fileToDataURL(f);
                attachmentsPreview.push({ originalName: f.name, path: dataUrl, _data: true });
            } else {
                attachmentsPreview.push({ originalName: f.name, path: URL.createObjectURL(f), _local: true });
            }
        } catch (err) {
            attachmentsPreview.push({ originalName: f.name, path: URL.createObjectURL(f), _local: true });
        }
    }

    const recipientFirst = formData.get('recipientFirstName') || '';
    const recipientLast = formData.get('recipientLastName') || '';
    const combinedRecipient = `${recipientFirst} ${recipientLast}`.trim();

    const newRequest = {
        id: DocTracker.generateRequestId(),
        studentId: currentStudent.studentId,
        studentName: `${currentStudent.firstName} ${currentStudent.lastName}`,
        studentEmail: currentStudent.email,
        documentType: formData.get('documentType'),
        purpose: formData.get('purpose'),
        purposeDetails: formData.get('purposeDetails') || '',
        termCoverage: formData.get('termCoverage'),
        termExtra: formData.get('termExtra') || '',
        copies: parseInt(formData.get('copies')) || 1,
        recipientFirstName: recipientFirst,
        recipientLastName: recipientLast,
        recipientName: combinedRecipient,
        contactNumber: formData.get('contactNumber'),
        notes: formData.get('notes'),
        status: 'Submitted',
        dateSubmitted: new Date().toISOString(),
        timeline: [{ status: 'Submitted', date: new Date().toISOString(), note: 'Request submitted successfully' }]
    };

    newRequest.attachments = attachmentsPreview;

    studentRequests.unshift(newRequest);
    localStorage.setItem(`requests_${currentStudent.studentId}`, JSON.stringify(studentRequests));
    updateDashboard();
    loadRequests();
    hideSubmitForm();
    DocTracker.showNotification('success', 'Document request submitted locally. Sending request to server...');

    // Send to backend
    const sendData = new FormData();
    sendData.append('studentId', newRequest.studentId);
    sendData.append('studentName', newRequest.studentName);
    sendData.append('studentEmail', newRequest.studentEmail);
    sendData.append('documentType', newRequest.documentType);
    sendData.append('purpose', newRequest.purpose);
    sendData.append('purposeDetails', newRequest.purposeDetails || '');
    sendData.append('termCoverage', newRequest.termCoverage || '');
    sendData.append('termExtra', newRequest.termExtra || '');
    sendData.append('copies', newRequest.copies);
    sendData.append('recipientName', newRequest.recipientName || '');
    sendData.append('recipientFirstName', newRequest.recipientFirstName || '');
    sendData.append('recipientLastName', newRequest.recipientLastName || '');
    sendData.append('contactNumber', newRequest.contactNumber || '');
    sendData.append('notes', newRequest.notes || '');

    if (files && files.length) {
        for (let i = 0; i < files.length; i++) sendData.append('attachments', files[i], files[i].name);
    }

    try {
        const res = await fetch('/api/requests', { method: 'POST', body: sendData });
        const result = await res.json();
        if (result && result.success) {
            DocTracker.showNotification('success', 'Request sent to server. You will receive an email confirmation shortly.');
            const serverRequest = result.request;
            studentRequests = studentRequests.map(r => {
                if (r.id === newRequest.id) {
                    try { (r.attachments || []).forEach(a => { if (a && a.path && a._local) URL.revokeObjectURL(a.path); }); } catch (e) {}
                    return Object.assign({}, r, serverRequest, { studentName: r.studentName, studentEmail: r.studentEmail });
                }
                return r;
            });
            localStorage.setItem(`requests_${currentStudent.studentId}`, JSON.stringify(studentRequests));
            loadRequests();
        } else {
            DocTracker.showNotification('error', 'Server error: could not save request. It remains saved locally.');
            console.error('Server response', result);
        }
    } catch (err) {
        console.error('Error sending to server:', err);
        DocTracker.showNotification('warning', 'Could not reach server. Your request is saved locally and will not trigger email until server is running.');
    }
}

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

// Logout function - CONSISTENT WITH FACULTY/ADMIN
function logout() {
    console.log('Logging out student...');
    
    // Clear user data - consistent with FACULTY/ADMIN
    currentStudent = null;
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    
    // Redirect to home page - consistent with FACULTY
    window.location.href = '../../index.html';
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

// Compatibility: filters were removed from the UI; keep a noop function so references don't break
function filterRequests() {
    // no-op: filters removed
    return;
}

function generateRequestId() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `REQ${timestamp}${random}`;
}

// Expose closeModal globally
window.closeModal = closeModal;

// Expose all functions globally for onclick handlers - CONSISTENT NAMING
window.logout = logout;
window.showSubmitForm = showSubmitForm;
window.hideSubmitForm = hideSubmitForm;
window.refreshRequests = refreshRequests;
window.viewRequestDetails = viewRequestDetails;
window.confirmPickup = confirmPickup;
window.filterRequests = filterRequests;

// Override Auth.logout if present
if (window.Auth && typeof window.Auth === 'object') {
    window.Auth.logout = logout;
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