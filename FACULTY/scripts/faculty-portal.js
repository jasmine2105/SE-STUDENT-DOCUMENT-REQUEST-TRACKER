document.addEventListener('DOMContentLoaded', async () => {
  if (!Utils.requireAuth()) return;

  const user = Utils.getCurrentUser();
  const userNameEl = document.getElementById('userName');
  const userInfoEl = document.getElementById('userInfo');
  const sidebarUserInfo = document.getElementById('sidebarUserInfo');

  if (userNameEl) userNameEl.textContent = user?.fullName || user?.name || user?.idNumber || 'User';
  if (userInfoEl) userInfoEl.textContent = `${user?.role || ''}`;
  if (sidebarUserInfo) sidebarUserInfo.textContent = user?.fullName || '';

  // Initialize notifications (pass userId as fallback if server doesn't use auth header)
  try {
    await Notifications.init({
      userId: user?.id,
      bellId: 'notificationBell',
      countId: 'notificationCount',
      dropdownId: 'notificationDropdown',
      listId: 'notificationList',
      markAllBtnId: 'markAllRead'
    });
  } catch (err) {
    console.warn('Notifications init failed', err.message || err);
  }

  // Sidebar view switching
  const links = document.querySelectorAll('.sidebar-link');
  links.forEach(btn => btn.addEventListener('click', () => {
    links.forEach(l => l.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view;
    document.getElementById('dashboardView').classList.toggle('hidden', view !== 'dashboard');
    document.getElementById('requestsView').classList.toggle('hidden', view !== 'requests');
  }));

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => Utils.clearCurrentUser());

  // Load recent requests
  async function loadRecent() {
    try {
      const requests = await Utils.apiRequest('/requests', { method: 'GET' });
      const recentEl = document.getElementById('recentRequests');
      const statTotal = document.getElementById('statTotal');
      const statPending = document.getElementById('statPending');
      const statCompleted = document.getElementById('statCompleted');

      if (!Array.isArray(requests) || requests.length === 0) {
        recentEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📄</div><h3>No recent requests</h3><p>Requests assigned to you will appear here.</p></div>';
        if (statTotal) statTotal.textContent = '0';
        if (statPending) statPending.textContent = '0';
        if (statCompleted) statCompleted.textContent = '0';
        return;
      }

      // Create table structure matching admin dashboard design
      function getStatusIcon(status) {
        const icons = {
          pending: 'fa-clock',
          pending_faculty: 'fa-hourglass-half',
          in_progress: 'fa-spinner',
          approved: 'fa-check-circle',
          completed: 'fa-check-double',
          declined: 'fa-times-circle'
        };
        return icons[status] || 'fa-circle';
      }

      recentEl.innerHTML = `
        <div class="table-wrapper">
          <table class="requests-table">
            <thead>
              <tr>
                <th>Request Code</th>
                <th>Student Name</th>
                <th>Document Name</th>
                <th>Department</th>
                <th>Date Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${requests.slice(0, 10).map(r => {
                const statusClass = Utils.getStatusBadgeClass(r.status);
                const statusText = Utils.getStatusText(r.status);
                const statusIcon = getStatusIcon(r.status);
                return `
                <tr>
                  <td><strong>${r.requestCode || 'N/A'}</strong></td>
                  <td>${r.studentName || r.student_name || 'N/A'}</td>
                  <td>${r.documentType || r.document_label || r.documentValue || 'N/A'}</td>
                  <td>${r.department || 'N/A'}</td>
                  <td>${Utils.formatDate(r.submittedAt || r.submitted_at)}</td>
                  <td>
                    <span class="status-badge ${statusClass}">
                      <i class="fas ${statusIcon}"></i>
                      ${statusText}
                    </span>
                  </td>
                  <td>
                    <button class="btn-secondary" onclick="window.facultyPortal?.viewRequest(${r.id})" title="View Details">
                      <i class="fas fa-eye"></i> View
                    </button>
                  </td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;

      // Stats
      if (statTotal) statTotal.textContent = String(requests.length || 0);
      if (statPending) statPending.textContent = String(requests.filter(x => x.status && x.status.includes('pending')).length || 0);
      if (statCompleted) statCompleted.textContent = String(requests.filter(x => x.status === 'completed' || x.status === 'approved').length || 0);

    } catch (error) {
      console.error('Failed to load recent requests', error);
    }
  }

  await loadRecent();
});
// Faculty Portal JavaScript
class FacultyPortal {
  constructor() {
    this.currentUser = Utils.getCurrentUser();
    this.requests = [];
    this.filteredRequests = [];
    this.filterStatus = 'all';
    this.init();
  }

  async init() {
    if (!Utils.requireAuth()) return;
    if (this.currentUser.role !== 'faculty') {
      Utils.showToast('Access denied. Faculty portal only.', 'error');
      Utils.clearCurrentUser();
      return;
    }

    this.loadUserInfo();
    await this.loadRequests();
    this.setupEventListeners();
    this.updateStats();
    this.renderRequests();
  }

  loadUserInfo() {
    const userNameEl = document.getElementById('userName');
    const userInfoEl = document.getElementById('userInfo');

    if (userNameEl) {
      userNameEl.textContent = this.currentUser.fullName || this.currentUser.name || 'Faculty';
    }

    if (userInfoEl) {
      const dept = this.currentUser.department || this.currentUser.departmentName || 'Department';
      const position = this.currentUser.position || 'Faculty';
      userInfoEl.textContent = `${dept} • ${position}`;
    }
  }

  async loadRequests() {
    try {
      const allRequests = await Utils.apiRequest('/requests');
      // Get requests assigned to this faculty or pending faculty approval
      this.requests = allRequests.filter(r =>
        r.status === 'pending_faculty' ||
        (r.facultyId === this.currentUser.id && r.facultyApproval === null)
      );
      this.filterRequests();
    } catch (error) {
      Utils.showToast('Failed to load requests', 'error');
    }
  }

  filterRequests() {
    if (this.filterStatus === 'all') {
      this.filteredRequests = this.requests;
    } else {
      this.filteredRequests = this.requests.filter(r => r.status === this.filterStatus);
    }
    this.renderRequests();
  }

  renderRequests() {
    const container = document.getElementById('requestsList');
    if (!container) return;

    if (this.filteredRequests.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>No requests found</h3>
          <p>There are no requests ${this.filterStatus === 'all' ? '' : `with status "${this.filterStatus}"`}.</p>
        </div>
      `;
      return;
    }

    function getStatusIcon(status) {
      const icons = {
        pending: 'fa-clock',
        pending_faculty: 'fa-hourglass-half',
        in_progress: 'fa-spinner',
        approved: 'fa-check-circle',
        completed: 'fa-check-double',
        declined: 'fa-times-circle'
      };
      return icons[status] || 'fa-circle';
    }

    const sortedRequests = this.filteredRequests.sort((a, b) => {
      // Sort by priority first (urgent first), then by date (newest first)
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
      if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
      return new Date(b.submittedAt || b.submitted_at) - new Date(a.submittedAt || a.submitted_at);
    });

    container.innerHTML = `
      <div class="table-wrapper">
        <table class="requests-table">
          <thead>
            <tr>
              <th>Request Code</th>
              <th>Student Name</th>
              <th>Document Name</th>
              <th>Department</th>
              <th>Date Submitted</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${sortedRequests.map(r => {
              const statusClass = Utils.getStatusBadgeClass(r.status);
              const statusText = Utils.getStatusText(r.status);
              const statusIcon = getStatusIcon(r.status);
              const priorityClass = r.priority === 'urgent' ? 'urgent' : 'normal';
              return `
              <tr>
                <td><strong>${r.requestCode || 'N/A'}</strong></td>
                <td>${r.studentName || r.student_name || 'N/A'}</td>
                <td>${r.documentType || r.document_label || r.documentValue || 'N/A'}</td>
                <td>${r.department || 'N/A'}</td>
                <td>${Utils.formatDate(r.submittedAt || r.submitted_at)}</td>
                <td><span class="priority-badge ${priorityClass}">${(r.priority || 'normal').toUpperCase()}</span></td>
                <td>
                  <span class="status-badge ${statusClass}">
                    <i class="fas ${statusIcon}"></i>
                    ${statusText}
                  </span>
                </td>
                <td>
                  ${r.status === 'pending_faculty' ? `
                    <button class="btn-approve" onclick="window.facultyPortal?.showApprovalModal(${r.id}, 'approve')" title="Approve" style="margin-right: 0.5rem;">
                      <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn-decline" onclick="window.facultyPortal?.showApprovalModal(${r.id}, 'decline')" title="Decline" style="margin-right: 0.5rem;">
                      <i class="fas fa-times"></i> Decline
                    </button>
                  ` : ''}
                  <button class="btn-secondary" onclick="window.facultyPortal?.viewRequest(${r.id})" title="View Details">
                    <i class="fas fa-eye"></i> View
                  </button>
                </td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  createRequestCard(request) {
    const statusClass = Utils.getStatusBadgeClass(request.status);
    const statusText = Utils.getStatusText(request.status);
    const submittedDate = Utils.formatDate(request.submittedAt);

    return `
      <div class="request-item">
        <div class="request-header">
          <div class="request-info">
            <h3>${request.documentType}</h3>
            <div class="request-meta">
              <span><strong>Student:</strong> ${request.studentName} (${request.studentIdNumber})</span>
              <span><strong>Status:</strong> <span class="status-badge ${statusClass}">${statusText}</span></span>
              <span><strong>Submitted:</strong> ${submittedDate}</span>
              ${request.purpose ? `<span><strong>Purpose:</strong> ${request.purpose}</span>` : ''}
              ${request.attachments && request.attachments.length ? `<span>📎 ${request.attachments.length} attachment(s)</span>` : ''}
            </div>
          </div>
          <div class="request-actions">
            ${request.status === 'pending_faculty' ? `
              <button class="btn-approve" onclick="facultyPortal.showApprovalModal(${request.id}, 'approve')">
                ✓ Approve
              </button>
              <button class="btn-decline" onclick="facultyPortal.showApprovalModal(${request.id}, 'decline')">
                ✗ Decline
              </button>
            ` : ''}
            <button class="btn-secondary" onclick="facultyPortal.viewRequest(${request.id})">
              View Details
            </button>
          </div>
        </div>
      </div>
    `;
  }

  updateStats() {
    const totalEl = document.getElementById('statTotal');
    const pendingEl = document.getElementById('statPending');
    const approvedEl = document.getElementById('statApproved');

    const total = this.requests.length;
    const pending = this.requests.filter(r => r.status === 'pending_faculty').length;
    const approved = this.requests.filter(r =>
      r.facultyApproval && r.facultyApproval.status === 'approved'
    ).length;

    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (approvedEl) approvedEl.textContent = approved;
  }

  setupEventListeners() {
    // Filter dropdown
    const filterSelect = document.getElementById('filterStatus');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.filterStatus = e.target.value;
        this.filterRequests();
      });
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
          Utils.clearCurrentUser();
        }
      });
    }
  }

  showApprovalModal(requestId, action) {
    const request = this.requests.find(r => r.id === requestId);
    if (!request) return;

    const actionText = action === 'approve' ? 'Approve' : 'Decline';
    const actionColor = action === 'approve' ? '#10B981' : '#EF4444';

    const modalHTML = `
      <div class="modal-overlay active" id="approvalModal">
        <div class="approval-modal">
          <div class="modal-header">
            <h2>${actionText} Request</h2>
            <button class="close-modal" onclick="document.getElementById('approvalModal').remove()">&times;</button>
          </div>
          <div style="margin-bottom: 1.5rem;">
            <p><strong>Student:</strong> ${request.studentName}</p>
            <p><strong>Document:</strong> ${request.documentType}</p>
            <p><strong>Purpose:</strong> ${request.purpose}</p>
          </div>
          <form id="approvalForm">
            <div class="form-group">
              <label for="comment">Comment ${action === 'decline' ? '(Required)' : '(Optional)'}</label>
              <textarea 
                id="comment" 
                name="comment" 
                placeholder="Enter your comment or feedback..."
                ${action === 'decline' ? 'required' : ''}
              ></textarea>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" onclick="document.getElementById('approvalModal').remove()" style="flex: 0.5;">
                Cancel
              </button>
              <button type="submit" class="btn-primary" style="background-color: ${actionColor}; flex: 1;">
                ${actionText}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Close on overlay click
    const modal = document.getElementById('approvalModal');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Form submission
    document.getElementById('approvalForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitApproval(requestId, action);
    });
  }

  async submitApproval(requestId, action) {
    const comment = document.getElementById('comment').value.trim();

    if (action === 'decline' && !comment) {
      Utils.showToast('Please provide a comment for declining the request', 'warning');
      return;
    }

    try {
      const request = this.requests.find(r => r.id === requestId);
      if (!request) return;

      // Update request with faculty approval
      const approvalData = {
        facultyId: this.currentUser.id,
        facultyName: this.currentUser.fullName || this.currentUser.name,
        status: action === 'approve' ? 'approved' : 'declined',
        comment: comment || null,
        timestamp: new Date().toISOString()
      };

      await Utils.apiRequest(`/requests/${requestId}`, {
        method: 'PATCH',
        body: {
          status: action === 'approve' ? 'in_progress' : 'declined',
          facultyId: this.currentUser.id,
          facultyApproval: approvalData,
        }
      });

      Utils.showToast(`Request ${action === 'approve' ? 'approved' : 'declined'} successfully!`, 'success');
      document.getElementById('approvalModal').remove();
      await this.loadRequests();
      this.updateStats();
      this.renderRequests();
    } catch (error) {
      Utils.showToast('Failed to submit approval', 'error');
    }
  }

  viewRequest(requestId) {
    const request = this.requests.find(r => r.id === requestId);
    if (!request) return;

    const statusClass = Utils.getStatusBadgeClass(request.status);
    const statusText = Utils.getStatusText(request.status);

    const approvalHTML = request.facultyApproval
      ? `
          <div style="padding: 0.75rem; background: ${request.facultyApproval.status === 'approved' ? '#D1FAE5' : '#FEE2E2'}; border-radius: 6px;">
            <div style="font-weight: 600; margin-bottom: 0.25rem;">
              ${request.facultyApproval.facultyName} - ${request.facultyApproval.status.toUpperCase()}
            </div>
            ${request.facultyApproval.comment ? `<div style="margin-top: 0.5rem;">${request.facultyApproval.comment}</div>` : ''}
            <div style="font-size: 0.8rem; opacity: 0.6; margin-top: 0.25rem;">${Utils.formatDate(request.facultyApproval.timestamp)}</div>
          </div>
        `
      : '<p style="opacity: 0.6;">Not yet reviewed</p>';

    const attachmentsHTML = request.attachments && request.attachments.length ? `
      <div style="margin-bottom: 1.5rem;">
        <h4 style=\"color: var(--recoletos-green); margin-bottom: 0.5rem;\">Attachments</h4>
        <div style=\"display:grid; grid-template-columns: repeat(auto-fill, minmax(120px,1fr)); gap:0.75rem;\">
          ${request.attachments.map(att => `
            <a href="${att.url}" target="_blank" rel="noopener noreferrer" style="display:block;">
              <img src="${att.url}" alt="${att.name}" style="width:100%; height:110px; object-fit:cover; border-radius:8px; border:1px solid var(--border-gray);" />
            </a>
          `).join('')}
        </div>
      </div>
    ` : '';

    const modalHTML = `
      <div class="modal-overlay active" id="viewRequestModal">
        <div class="approval-modal">
          <div class="modal-header">
            <h2>Request Details</h2>
            <button class="close-modal" onclick="document.getElementById('viewRequestModal').remove()">&times;</button>
          </div>
          <div>
            <div style="margin-bottom: 1.5rem;">
              <h3 style="color: var(--recoletos-green); margin-bottom: 0.5rem;">${request.documentType}</h3>
              <div class="status-badge ${statusClass}" style="margin-bottom: 1rem;">${statusText}</div>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
              <strong>Student:</strong> ${request.studentName} (${request.studentIdNumber})<br>
              <strong>Submitted:</strong> ${Utils.formatDate(request.submittedAt)}<br>
              <strong>Last Updated:</strong> ${Utils.formatDate(request.updatedAt)}<br>
              <strong>Quantity:</strong> ${request.quantity}<br>
              <strong>Purpose:</strong> ${request.purpose}
            </div>

            ${attachmentsHTML}

            <div style="margin-bottom: 1.5rem;">
              <h4 style="color: var(--recoletos-green); margin-bottom: 0.5rem;">Your Approval</h4>
              ${approvalHTML}
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('viewRequestModal');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
}

// Initialize portal when DOM is loaded
let facultyPortal;
document.addEventListener('DOMContentLoaded', () => {
  facultyPortal = new FacultyPortal();
  window.facultyPortal = facultyPortal;
});

