// Student Portal JavaScript

let studentRequests = [];
let currentStudent = null;

// Button loading helper: adds/removes spinner and disables button
function setButtonLoading(btn, isLoading, text) {
    if (!btn) return;
    if (isLoading) {
        btn.dataset.origHtml = btn.innerHTML;
        btn.disabled = true;
        // show spinner (spinner styled in student CSS)
        btn.innerHTML = `${text || 'Processing...'} <span class="spinner" aria-hidden="true"></span>`;
        btn.classList.add('btn-disabled');
    } else {
        btn.disabled = false;
        if (btn.dataset.origHtml) {
            btn.innerHTML = btn.dataset.origHtml;
            delete btn.dataset.origHtml;
        }
        btn.classList.remove('btn-disabled');
    }
}

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
    // Build notification bell and dropdown and insert after the logout button (so it's to the right of 'Logout')
    const navButtons = document.querySelector('.nav-buttons');
    if (!navButtons) return;
    if (document.getElementById('notifBtn')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'notif-wrapper';
    wrapper.style.marginLeft = '6px';

    const btn = document.createElement('button');
    btn.id = 'notifBtn';
    btn.className = 'notif-bell';
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = `<i class="fas fa-bell"></i><span id="notifCount" class="notif-badge" style="margin-left:6px"></span>`;
    wrapper.appendChild(btn);

    const dropdown = document.createElement('div');
    dropdown.className = 'notif-dropdown';
    dropdown.id = 'notifDropdown';
    dropdown.innerHTML = `<div class="notif-list" id="notifList" style="padding:6px"></div><div style="padding:8px;border-top:1px solid #f1f1f1;text-align:right"><button id="markAllRead" class="btn btn-outline">Mark all read</button></div>`;
    wrapper.appendChild(dropdown);

    // Place wrapper after logout button so it's to the right
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn && logoutBtn.parentNode) {
        logoutBtn.parentNode.insertBefore(wrapper, logoutBtn.nextSibling);
    } else {
        navButtons.appendChild(wrapper);
    }

    // Open on hover/focus, do not persist on click
    let hoverTimeout = null;
    wrapper.addEventListener('mouseenter', () => { clearTimeout(hoverTimeout); dropdown.style.display = 'block'; btn.setAttribute('aria-expanded', 'true'); renderNotificationList(); });
    wrapper.addEventListener('mouseleave', () => { hoverTimeout = setTimeout(() => { dropdown.style.display = 'none'; btn.setAttribute('aria-expanded', 'false'); }, 180); });
    btn.addEventListener('focus', () => { clearTimeout(hoverTimeout); dropdown.style.display = 'block'; btn.setAttribute('aria-expanded', 'true'); renderNotificationList(); });
    btn.addEventListener('blur', () => { hoverTimeout = setTimeout(() => { dropdown.style.display = 'none'; btn.setAttribute('aria-expanded', 'false'); }, 180); });

    // Mark all read button
    const markAll = dropdown.querySelector('#markAllRead');
    if (markAll) markAll.addEventListener('click', (ev) => { ev.stopPropagation(); const lst = loadNotifications().map(n => ({ ...n, read: true })); saveNotifications(lst); renderNotificationBadge(); renderNotificationList(); });

    renderNotificationBadge();
}

function renderNotificationBadge() {
    const list = loadNotifications();
    const unread = list.filter(n => !n.read).length;
    const badge = document.getElementById('notifCount');
    if (badge) {
        badge.textContent = unread ? unread : '';
        if (unread) badge.classList.add('unread'); else badge.classList.remove('unread');
    }
}

function renderNotificationList() {
    const container = document.getElementById('notifList');
    if (!container) return;
    const list = loadNotifications();
    if (!list.length) { container.innerHTML = '<div style="padding:12px;color:#666">No notifications</div>'; return; }

    container.innerHTML = list.map(n => `
        <div class="notif-card ${n.read ? 'read' : 'unread'}" data-id="${n.id}" data-request-id="${n.requestId}">
            <div class="meta">
                <h6>${escapeHtml(n.title || 'Update')}</h6>
                <p>${escapeHtml((n.message || '').slice(0, 160))}${(n.message||'').length>160? '...':''}</p>
                <small>${new Date(n.date).toLocaleString()}</small>
            </div>
            <div class="actions">
                <button class="btn btn-primary btn-sm view-notif" data-id="${n.id}" data-request-id="${n.requestId}">View</button>
            </div>
        </div>
    `).join('');

    // click handlers for each View button
    container.querySelectorAll('.view-notif').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const id = btn.dataset.id; const reqId = btn.dataset.requestId;
            // mark notification read
            const updated = loadNotifications().map(n => n.id === id ? { ...n, read: true } : n);
            saveNotifications(updated);
            renderNotificationBadge();
            renderNotificationList();
            // Open the full Notification Center and focus the notification
            openNotificationCenter(id);
            const dd = document.getElementById('notifDropdown'); if (dd) dd.style.display = 'none';
        });
    });
}

// Open a large notification center modal; if highlightId provided, scroll to it
function openNotificationCenter(highlightId) {
    const modal = document.getElementById('notifCenterModal');
    const listEl = document.getElementById('notifCenterList');
    if (!modal || !listEl) return;
    const items = loadNotifications();
    if (!items.length) {
        listEl.innerHTML = '<div class="text-muted">No notifications</div>';
    } else {
        listEl.innerHTML = items.map(n => `
            <div class="notif-center-item" id="nc_${n.id}">
                <div class="title">${escapeHtml(n.title || 'Update')}</div>
                <div class="message">${escapeHtml(n.message || '')}</div>
                <div class="meta">${new Date(n.date).toLocaleString()} ${n.requestId? ' — Request: ' + n.requestId : ''}</div>
                <div style="margin-top:8px;text-align:right"><button class="btn btn-primary btn-sm open-request" data-request-id="${n.requestId}">Open Request</button></div>
            </div>
        `).join('');

        // wire open-request buttons
        listEl.querySelectorAll('.open-request').forEach(b => {
            b.addEventListener('click', (ev) => {
                const rid = b.dataset.requestId;
                if (rid) {
                    viewRequestDetails(rid);
                    closeNotificationCenter();
                }
            });
        });
    }

    modal.style.display = 'block';
    modal.setAttribute('aria-hidden','false');
    // scroll to highlight
    if (highlightId) {
        const el = document.getElementById('nc_' + highlightId);
        if (el) { el.scrollIntoView({behavior:'smooth', block:'center'}); el.style.boxShadow = '0 0 0 4px rgba(47,133,90,0.08)'; setTimeout(() => { el.style.boxShadow = ''; }, 2500); }
    }
}

function closeNotificationCenter() {
    const modal = document.getElementById('notifCenterModal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden','true');
}

// Small HTML escape utility for safe insertion
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (s) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[s]; });
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
        // Per request: show only the student's name (no 'Welcome')
        welcomeElement.textContent = `${currentStudent.firstName} ${currentStudent.lastName}`;
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
    
    // How It Works button functionality
    const howItWorksBtn = document.getElementById('howItWorksBtn');
    if (howItWorksBtn) {
        howItWorksBtn.addEventListener('click', function() {
            // Scroll to the "How It Works" section on the home page, or show a modal
            // Since we're in the portal, show a modal with the steps
            showHowItWorksModal();
        });
    }

    const cancelBtn = document.getElementById('cancelRequestBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', hideSubmitForm);

    const modalCloseBtn = document.getElementById('modalCloseBtn');
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);

    // Quick dashboard action buttons
    const quickNew = document.getElementById('quickNew'); if (quickNew) quickNew.addEventListener('click', showSubmitForm);
    const quickTrack = document.getElementById('quickTrack'); if (quickTrack) quickTrack.addEventListener('click', function() {
        // Show tracking view - scroll to requests table and highlight it
        const requestsCard = document.querySelector('.card:has(#requestsList)') || document.querySelector('#requestsList')?.closest('.card');
        if (requestsCard) {
            requestsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Add a highlight effect
            requestsCard.style.boxShadow = '0 0 0 4px rgba(72,187,120,0.3)';
            setTimeout(() => {
                requestsCard.style.boxShadow = '';
            }, 2000);
            DocTracker.showNotification('info', 'Showing your request tracking. Click "View" on any request to see detailed tracking information.');
        } else {
            // If no requests, show message
            if (studentRequests.length === 0) {
                DocTracker.showNotification('info', 'You have no requests to track yet. Submit a new request to get started!');
                showSubmitForm();
            } else {
                refreshRequests();
            }
        }
    });
    const quickDownload = document.getElementById('quickDownload'); if (quickDownload) quickDownload.addEventListener('click', function() {
        // Simple behavior: show completed requests with download links if available
        const completed = studentRequests.filter(r => r.status === 'Completed');
        if (!completed.length) { DocTracker.showNotification('info', 'No completed documents available for download.'); return; }
        // For now, present the notif center and show a message
        openNotificationCenter();
        DocTracker.showNotification('info', `There are ${completed.length} completed requests. Use the Request view to download attachments.`);
    });

    // Notification center close
    const closeNotifCenter = document.getElementById('closeNotifCenter'); if (closeNotifCenter) closeNotifCenter.addEventListener('click', closeNotificationCenter);

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
    // Also render dashboard overview summary (center rectangle)
    try { renderDashboardOverview(); } catch (e) { /* ignore */ }
}

// Render the dashboard summary (progress and recent requests)
function renderDashboardOverview() {
    const pending = studentRequests.filter(r => r.status === 'Submitted' || r.status === 'Pending').length || 0;
    const processing = studentRequests.filter(r => r.status === 'Processing' || r.status === 'Ready for Release').length || 0;
    const completed = studentRequests.filter(r => r.status === 'Completed').length || 0;
    const total = pending + processing + completed || Math.max(1, (studentRequests.length || 0));

    const pct = Math.round((completed / (total || 1)) * 100);
    const elPending = document.getElementById('dsPending'); if (elPending) elPending.textContent = pending;
    const elProcessing = document.getElementById('dsProcessing'); if (elProcessing) elProcessing.textContent = processing;
    const elCompleted = document.getElementById('dsCompleted'); if (elCompleted) elCompleted.textContent = completed;
    const fill = document.getElementById('dsProgressBar'); if (fill) fill.style.width = `${pct}%`;

    // Update subtitle with student's name
    const subtitle = document.getElementById('dashboardSubtitle');
    if (subtitle && currentStudent) subtitle.textContent = `Welcome back, ${currentStudent.firstName}! Here's an overview of your document requests.`;
    
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
    if (!request) {
        DocTracker.showNotification('error', 'Request not found.');
        return;
    }

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

    // Render timeline for tracking
    function renderTimelineHTML(timeline) {
        if (!timeline || !timeline.length) {
            return '<p class="text-muted">No tracking information available yet.</p>';
        }
        return `
            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
                <h5 style="margin-bottom: 1rem;"><i class="fas fa-route"></i> Request Timeline</h5>
                <div style="position: relative; padding-left: 2rem;">
                    ${timeline.map((entry, index) => {
                        const date = entry.date ? new Date(entry.date).toLocaleString() : 'N/A';
                        const isLast = index === timeline.length - 1;
                        return `
                            <div style="position: relative; margin-bottom: ${isLast ? '0' : '1.5rem'};">
                                <div style="position: absolute; left: -1.75rem; top: 0.25rem; width: 12px; height: 12px; background: ${isLast ? 'var(--usjr-green, #48bb78)' : '#cbd5e0'}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 2px ${isLast ? 'var(--usjr-green, #48bb78)' : '#cbd5e0'};"></div>
                                ${!isLast ? '<div style="position: absolute; left: -1.69rem; top: 0.75rem; width: 2px; height: calc(100% + 0.5rem); background: #e5e7eb;"></div>' : ''}
                                <div>
                                    <strong style="color: #333;">${escapeHtml(entry.status || 'Update')}</strong>
                                    <p style="color: #666; margin: 0.25rem 0;">${escapeHtml(entry.note || '')}</p>
                                    <small style="color: #999;">${date}</small>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // Full tracking view with timeline and details
    details.innerHTML = `
        <div>
            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-bottom: 0.5rem;">Request ID: <span style="color: var(--usjr-green, #48bb78);">${request.id}</span></h4>
                <p style="color: #666; margin-bottom: 0.5rem;"><strong>Document Type:</strong> ${request.documentType}</p>
                <p style="color: #666; margin-bottom: 0.5rem;"><strong>Status:</strong> <span class="status-badge ${DocTracker.getStatusBadgeClass(request.status)}">${request.status}</span></p>
                <p style="color: #666;"><strong>Submitted:</strong> ${DocTracker.formatDateTime(request.dateSubmitted)}</p>
            </div>
            
            ${renderTimelineHTML(request.timeline || [])}
            
            <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb;">
                <h5 style="margin-bottom: 1rem;"><i class="fas fa-paperclip"></i> Attachments</h5>
                <div id="attachmentPreview" class="attachment-preview text-center text-muted" style="min-height: 200px; display: flex; align-items: center; justify-content: center; border: 1px dashed #e5e7eb; border-radius: 8px; margin-bottom: 1rem;">Click an attachment below to preview it here.</div>
                <div id="attachmentList" class="attachment-list">${renderAttachmentsHTML(request.attachments || [])}</div>
            </div>
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
    const submitBtn = document.getElementById('submitRequestBtn');
    // Show loading state immediately
    setButtonLoading(submitBtn, true, 'Processing...');
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
    } finally {
        // clear loading state on submit button regardless of outcome
        setButtonLoading(submitBtn, false);
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

// Show How It Works modal
function showHowItWorksModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'howItWorksModal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h3><i class="fas fa-info-circle"></i> How It Works</h3>
                <span class="close" onclick="this.closest('.modal').remove(); document.body.style.overflow='auto';">&times;</span>
            </div>
            <div class="modal-body" style="padding: 2rem;">
                <div style="display: grid; gap: 1.5rem;">
                    <div style="display: flex; gap: 1rem; align-items: start;">
                        <div style="width: 40px; height: 40px; background: var(--usjr-green, #48bb78); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">1</div>
                        <div>
                            <h4 style="margin-bottom: 0.5rem;">Sign Up & Login</h4>
                            <p style="color: #666;">Create your student account and login with your credentials.</p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 1rem; align-items: start;">
                        <div style="width: 40px; height: 40px; background: var(--usjr-green, #48bb78); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">2</div>
                        <div>
                            <h4 style="margin-bottom: 0.5rem;">Select Document Type</h4>
                            <p style="color: #666;">Choose the document you need (TOR, Good Moral, COE, etc.) and fill out the required information.</p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 1rem; align-items: start;">
                        <div style="width: 40px; height: 40px; background: var(--usjr-green, #48bb78); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">3</div>
                        <div>
                            <h4 style="margin-bottom: 0.5rem;">Submit Request</h4>
                            <p style="color: #666;">Review your request details and submit it for processing. You'll receive a confirmation email.</p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 1rem; align-items: start;">
                        <div style="width: 40px; height: 40px; background: var(--usjr-green, #48bb78); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">4</div>
                        <div>
                            <h4 style="margin-bottom: 0.5rem;">Track Progress</h4>
                            <p style="color: #666;">Monitor your request status in real-time. Click "Track Request" or "View" on any request to see the timeline and updates.</p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 1rem; align-items: start;">
                        <div style="width: 40px; height: 40px; background: var(--usjr-green, #48bb78); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">5</div>
                        <div>
                            <h4 style="margin-bottom: 0.5rem;">Receive Document</h4>
                            <p style="color: #666;">Once your document is ready, you'll be notified. Pick it up or receive it via your preferred delivery method.</p>
                        </div>
                    </div>
                </div>
                <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb;">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove(); document.body.style.overflow='auto'; showSubmitForm();">
                        <i class="fas fa-plus"></i> Submit Your First Request
                    </button>
                    <button class="btn btn-outline" onclick="this.closest('.modal').remove(); document.body.style.overflow='auto';" style="margin-left: 0.5rem;">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Close on outside click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
            document.body.style.overflow = 'auto';
        }
    });
}

// Expose all functions globally for onclick handlers - CONSISTENT NAMING
window.logout = logout;
window.showSubmitForm = showSubmitForm;
window.hideSubmitForm = hideSubmitForm;
window.refreshRequests = refreshRequests;
window.viewRequestDetails = viewRequestDetails;
window.confirmPickup = confirmPickup;
window.filterRequests = filterRequests;
window.showHowItWorksModal = showHowItWorksModal;

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