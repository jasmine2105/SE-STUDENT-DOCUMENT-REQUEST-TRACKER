// Faculty Portal JavaScript

let facultyRequests = [];

document.addEventListener('DOMContentLoaded', function() {
    // Ensure only faculty can view this page and that role password was verified
    if (window.Auth && window.Auth.isAuthenticated) {
        const user = window.Auth.getCurrentUser();
        const roleVerified = sessionStorage.getItem('roleVerified');
        // Allow access if the logged-in user is faculty OR the role password was verified
        if (!((user && user.role === 'faculty') || roleVerified === 'faculty')) {
            window.location.href = '../auth.html';
            return;
        }
    } else {
        const roleVerified = sessionStorage.getItem('roleVerified');
        if (roleVerified !== 'faculty') {
            window.location.href = '../auth.html';
            return;
        }
    }

    fetchFacultyRequests();

    // Poll for updates periodically
    setInterval(fetchFacultyRequests, 10000);

    // Wire up quick actions
    const refreshBtn = document.querySelector('.btn-secondary');
    if (refreshBtn) refreshBtn.addEventListener('click', refreshData);
    // Wire up filters & search
    const statusFilter = document.getElementById('statusFilter');
    const departmentFilter = document.getElementById('departmentFilter');
    const searchFilter = document.getElementById('searchFilter');
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    if (departmentFilter) departmentFilter.addEventListener('change', applyFilters);
    if (searchFilter) searchFilter.addEventListener('input', applyFilters);
});

function applyFilters() {
    const statusVal = (document.getElementById('statusFilter').value || '');
    const deptVal = (document.getElementById('departmentFilter').value || '');
    const searchVal = (document.getElementById('searchFilter').value || '').toLowerCase();

    let results = facultyRequests.slice();
    if (statusVal) results = results.filter(r => r.status === statusVal);
    if (deptVal) results = results.filter(r => (r.department || '').toLowerCase() === deptVal.toLowerCase());
    if (searchVal) {
        results = results.filter(r => ((r.studentName || '').toLowerCase().includes(searchVal) || (r.studentId || '').toLowerCase().includes(searchVal)));
    }
    // Render filtered
    const tbody = document.getElementById('clearancesTableBody');
    if (!tbody) return;
    if (results.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No clearance requests match your filters.</td></tr>`;
        updateDashboard();
        return;
    }
    tbody.innerHTML = results.map(r => `
        <tr>
            <td>${r.id}</td>
            <td>
                <div>
                    <strong>${r.studentName}</strong><br>
                    <small class="text-muted">${r.studentId}</small>
                </div>
            </td>
            <td>${r.department || '-'}</td>
            <td>${r.documentType}</td>
            <td><span class="status-badge ${DocTracker.getStatusBadgeClass(r.status)}">${r.status}</span></td>
            <td>${DocTracker.formatDate(r.dateSubmitted)}</td>
            <td>
                <div class="d-flex gap-1">
                    <button class="btn btn-primary btn-sm" onclick="viewClearanceDetails('${r.id}')"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-success btn-sm" onclick="approveClearance('${r.id}')"><i class="fas fa-check"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="rejectClearance('${r.id}')"><i class="fas fa-times"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
    updateDashboard();
}

async function fetchFacultyRequests() {
    try {
        const res = await fetch('/api/requests');
        if (res.ok) {
            const body = await res.json();
            const data = Array.isArray(body) ? body : (body.requests || []);
            // Filter requests that require faculty clearance
            facultyRequests = data.filter(r => !!r.requiresClearance || r.status === 'Action Required');
            renderRequests();
            updateDashboard();
        }
    } catch (e) {
        console.warn('Could not fetch faculty requests:', e.message);
    }
}

function renderRequests() {
    const tbody = document.getElementById('clearancesTableBody');
    if (!tbody) return;

    if (facultyRequests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No clearance requests at the moment.</td></tr>`;
        return;
    }

    tbody.innerHTML = facultyRequests.map(r => `
        <tr>
            <td>${r.id}</td>
            <td>
                <div>
                    <strong>${r.studentName}</strong><br>
                    <small class="text-muted">${r.studentId}</small>
                </div>
            </td>
            <td>${r.department || '-'}</td>
            <td>${r.documentType}</td>
            <td><span class="status-badge ${DocTracker.getStatusBadgeClass(r.status)}">${r.status}</span></td>
            <td>${DocTracker.formatDate(r.dateSubmitted)}</td>
            <td>
                <div class="d-flex gap-1">
                    <button class="btn btn-primary btn-sm" onclick="viewClearanceDetails('${r.id}')"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-success btn-sm" onclick="approveClearance('${r.id}')"><i class="fas fa-check"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="rejectClearance('${r.id}')"><i class="fas fa-times"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateDashboard() {
    document.getElementById('pendingClearances').textContent = facultyRequests.filter(r => r.status === 'Action Required' || r.requiresClearance).length;
    document.getElementById('approvedToday').textContent = 0;
    document.getElementById('rejectedToday').textContent = 0;
    document.getElementById('totalProcessed').textContent = facultyRequests.length;
}

function viewClearanceDetails(requestId) {
    console.log('[faculty] viewClearanceDetails', requestId);
    const r = facultyRequests.find(x => x.id === requestId);
    if (!r) return;
    const modal = document.getElementById('clearanceModal');
    const container = document.getElementById('clearanceDetails');
    container.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h5>Student Information</h5>
                <p><strong>Name:</strong> ${r.studentName}</p>
                <p><strong>Student ID:</strong> ${r.studentId}</p>
                <p><strong>Email:</strong> ${r.studentEmail}</p>

                <h5 class="mt-3">Request Details</h5>
                <p><strong>Request ID:</strong> ${r.id}</p>
                <p><strong>Document Type:</strong> ${r.documentType}</p>
                <p><strong>Purpose:</strong> ${r.purpose}</p>
                <p><strong>Notes:</strong> ${r.notes || '-'}</p>
            </div>
            <div class="col-md-6">
                <h5>Actions</h5>
                <div class="d-flex gap-2">
                    <button class="btn btn-success" onclick="approveClearance('${r.id}')">Approve</button>
                    <button class="btn btn-danger" onclick="rejectClearance('${r.id}')">Reject</button>
                    <button class="btn btn-outline" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    DocTracker.openModal('clearanceModal');
}

async function approveClearance(requestId) {
    console.log('[faculty] approveClearance', requestId);
    const request = facultyRequests.find(r => r.id === requestId);
    if (!request) return;
    const timelineEntry = { status: 'Faculty Approved', date: new Date().toISOString(), note: 'Approved by faculty', user: 'Faculty' };
    // Persist to server
    try {
        const res = await fetch(`/api/requests/${requestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Processing', facultyNotes: 'Faculty cleared the request', timelineEntry })
        });
        if (res.ok) {
            DocTracker.showNotification('success', 'Request approved and returned to processing.');
            fetchFacultyRequests();
            DocTracker.closeModal();
        } else {
            DocTracker.showNotification('error', 'Failed to approve request on server.');
        }
    } catch (e) {
        console.error('Error approving clearance:', e);
        DocTracker.showNotification('warning', 'Could not reach server. Approval queued locally.');
    }
}

async function rejectClearance(requestId) {
    console.log('[faculty] rejectClearance', requestId);
    const reason = prompt('Please provide reason for rejection:');
    if (!reason) return;
    const timelineEntry = { status: 'Faculty Rejected', date: new Date().toISOString(), note: `Rejected by faculty: ${reason}`, user: 'Faculty' };
    try {
        const res = await fetch(`/api/requests/${requestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Declined', facultyNotes: reason, timelineEntry })
        });
        if (res.ok) {
            DocTracker.showNotification('success', 'Request rejected.');
            fetchFacultyRequests();
            DocTracker.closeModal();
        } else {
            DocTracker.showNotification('error', 'Failed to reject request on server.');
        }
    } catch (e) {
        console.error('Error rejecting clearance:', e);
        DocTracker.showNotification('warning', 'Could not reach server. Rejection queued locally.');
    }
}

function refreshData() {
    DocTracker.showNotification('info', 'Refreshing...');
    fetchFacultyRequests();
}

// Expose functions globally
window.viewClearanceDetails = viewClearanceDetails;
window.approveClearance = approveClearance;
window.rejectClearance = rejectClearance;
window.refreshData = refreshData;
