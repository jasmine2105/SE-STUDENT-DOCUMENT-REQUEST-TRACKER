document.addEventListener('DOMContentLoaded', async () => {
  if (!Utils.requireAuth()) return;

  const user = Utils.getCurrentUser();
  const userNameEl = document.getElementById('userName');
  const userInfoEl = document.getElementById('userInfo');
  const sidebarUserInfo = document.getElementById('sidebarUserInfo');

  if (userNameEl) userNameEl.textContent = user?.fullName || user?.name || 'Admin';
  if (userInfoEl) userInfoEl.textContent = `${user?.role || ''}`;
  if (sidebarUserInfo) sidebarUserInfo.textContent = user?.fullName || '';

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

  // Profile dropdown (match student behavior)
  const userPillElem = document.getElementById('userPill');
  const profileMenu = document.getElementById('profileDropdownMenu');
  const profileLink = document.getElementById('profileLink');
  const notificationsLink = document.getElementById('notificationsLink');
  const settingsLink = document.getElementById('settingsLink');
  const logoutLink = document.getElementById('logoutLink');

  if (userPillElem && profileMenu) {
    userPillElem.addEventListener('click', (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle('hidden');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!userPillElem.contains(e.target) && !profileMenu.contains(e.target)) {
        profileMenu.classList.add('hidden');
      }
    });
  }

  if (profileLink) {
    profileLink.addEventListener('click', (e) => {
      e.preventDefault();
      profileMenu.classList.add('hidden');
      window.location.href = 'admin-profile.html';
    });
  }

  if (notificationsLink) {
    notificationsLink.addEventListener('click', (e) => {
      e.preventDefault();
      // open notifications dropdown and close profile menu
      const notifDropdown = document.getElementById('notificationDropdown');
      if (notifDropdown) {
        profileMenu.classList.add('hidden');
        notifDropdown.classList.toggle('hidden');
      }
    });
  }

  if (settingsLink) {
    settingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      profileMenu.classList.add('hidden');
      Utils.showToast('Settings page not implemented', 'info');
    });
  }

  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      Utils.clearCurrentUser();
    });
  }

  // Sidebar view switching
  const links = document.querySelectorAll('.sidebar-link');
  links.forEach(btn => btn.addEventListener('click', () => {
    links.forEach(l => l.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view;
    document.getElementById('dashboardView').classList.toggle('hidden', view !== 'dashboard');
    document.getElementById('requestsView').classList.toggle('hidden', view !== 'requests');
    document.getElementById('usersView').classList.toggle('hidden', view !== 'users');
    if (view === 'users') {
      window.adminPortal?.loadUsers();
    }
  }));

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => Utils.clearCurrentUser());

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

  async function loadRecent() {
    try {
      const requests = await Utils.apiRequest('/requests', { method: 'GET' });
      const recentEl = document.getElementById('recentRequests');
      const statTotal = document.getElementById('statTotal');
      const statPending = document.getElementById('statPending');
      const statCompleted = document.getElementById('statCompleted');

      if (!Array.isArray(requests) || requests.length === 0) {
        recentEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📄</div><h3>No recent requests</h3><p>Requests across the system will appear here.</p></div>';
        if (statTotal) statTotal.textContent = '0';
        if (statPending) statPending.textContent = '0';
        if (statCompleted) statCompleted.textContent = '0';
        return;
      }

      // Create table structure matching student portal design
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
                    <button class="btn-secondary" onclick="window.adminPortal?.viewRequest(${r.id})" title="View Details">
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

      if (statTotal) statTotal.textContent = String(requests.length || 0);
      if (statPending) statPending.textContent = String(requests.filter(x => x.status && x.status.includes('pending')).length || 0);
      if (statCompleted) statCompleted.textContent = String(requests.filter(x => x.status === 'completed' || x.status === 'approved').length || 0);

      // Store requests in adminPortal instance so viewRequest can access them
      if (window.adminPortal) {
        window.adminPortal.requests = requests;
      }

    } catch (error) {
      console.error('Failed to load recent requests', error);
    }
  }

  await loadRecent();
});
// Admin Portal JavaScript
class AdminPortal {
  constructor() {
    this.currentUser = Utils.getCurrentUser();
    this.requests = [];
    this.filteredRequests = [];
    this.allFaculties = [];
    this.allUsers = [];
    this.filterStatus = 'all';
    this.filterType = 'all';
    this.searchQuery = '';
    this.usersSearchQuery = '';
    this.usersRoleFilter = 'all';
    this.init();
  }

  async init() {
    if (!Utils.requireAuth()) return;
    if (this.currentUser.role !== 'admin') {
      Utils.showToast('Access denied. Admin portal only.', 'error');
      Utils.clearCurrentUser();
      return;
    }

    this.loadUserInfo();
    await this.loadFaculties();
    await this.loadRequests();
    this.setupEventListeners();
    this.updateStats();
    this.renderRequests();
  }

  loadUserInfo() {
    const userNameEl = document.getElementById('userName');
    const userInfoEl = document.getElementById('userInfo');
    
    if (userNameEl) {
      userNameEl.textContent = this.currentUser.fullName || this.currentUser.name || 'Administrator';
    }
    
    if (userInfoEl) {
      const department = this.currentUser.department || this.currentUser.departmentName || 'Registrar\'s Office';
      const position = this.currentUser.position || 'Administrator';
      userInfoEl.textContent = `${department} • ${position}`;
    }
  }

  async loadFaculties() {
    try {
      this.allFaculties = await Utils.apiRequest('/users/faculty');
    } catch (error) {
      console.error('Failed to load faculties', error);
    }
  }

  async loadRequests() {
    try {
      this.requests = await Utils.apiRequest('/requests');
      this.filterRequests();
    } catch (error) {
      Utils.showToast('Failed to load requests', 'error');
    }
  }

  filterRequests() {
    this.filteredRequests = this.requests.filter(request => {
      // Status filter
      if (this.filterStatus !== 'all' && request.status !== this.filterStatus) {
        return false;
      }

      // Document type filter
      if (this.filterType !== 'all' && request.documentType !== this.filterType) {
        return false;
      }

      // Search query
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        const matchesName = request.studentName.toLowerCase().includes(query);
        const matchesId = request.studentIdNumber.toLowerCase().includes(query);
        const matchesDoc = request.documentType.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesDoc) {
          return false;
        }
      }

      return true;
    });

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
          <p>Try adjusting your filters or search query.</p>
        </div>
      `;
      return;
    }

    const sortedRequests = this.filteredRequests.sort((a, b) => {
      // Sort by priority first (urgent first), then by date (newest first)
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
      if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
      return new Date(b.submittedAt || b.submitted_at) - new Date(a.submittedAt || a.submitted_at);
    });

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
                  <button class="btn-secondary" onclick="adminPortal.showUpdateModal(${r.id})" title="Update Request" style="margin-right: 0.5rem;">
                    <i class="fas fa-edit"></i> Update
                  </button>
                  <button class="btn-secondary" onclick="window.adminPortal?.viewRequest(${r.id})" title="View Details">
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
    const priorityClass = request.priority === 'urgent' ? 'urgent' : 'normal';

    return `
      <div class="request-item">
        <div class="request-header">
          <div class="request-info">
            <h3>${request.documentType} 
              <span class="priority-badge ${priorityClass}" style="margin-left: 0.5rem;">${request.priority.toUpperCase()}</span>
            </h3>
            <div class="request-meta">
              <span><strong>Student:</strong> ${request.studentName} (${request.studentIdNumber})</span>
              <span><strong>Status:</strong> <span class="status-badge ${statusClass}">${statusText}</span></span>
              <span><strong>Submitted:</strong> ${submittedDate}</span>
              ${request.purpose ? `<span><strong>Purpose:</strong> ${request.purpose}</span>` : ''}
              ${request.quantity ? `<span><strong>Quantity:</strong> ${request.quantity}</span>` : ''}
              ${request.attachments && request.attachments.length ? `<span>📎 ${request.attachments.length} attachment(s)</span>` : ''}
            </div>
            ${request.adminNotes && request.adminNotes.length > 0 ? `
              <div style="margin-top: 0.5rem; font-size: 0.85rem; opacity: 0.7;">
                <strong>Notes:</strong> ${request.adminNotes.length} note(s)
              </div>
            ` : ''}
          </div>
          <div class="request-actions">
            <button class="btn-update" onclick="adminPortal.showUpdateModal(${request.id})">
              Update Status
            </button>
            <button class="btn-secondary" onclick="adminPortal.viewRequest(${request.id})">
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
    const inProgressEl = document.getElementById('statInProgress');
    const completedEl = document.getElementById('statCompleted');

    const total = this.requests.length;
    const pending = this.requests.filter(r => r.status === 'pending').length;
    const inProgress = this.requests.filter(r => ['pending_faculty', 'in_progress'].includes(r.status)).length;
    const completed = this.requests.filter(r => r.status === 'completed').length;

    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (inProgressEl) inProgressEl.textContent = inProgress;
    if (completedEl) completedEl.textContent = completed;
  }

  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.filterRequests();
      });
    }

    // Status filter
    const statusFilter = document.getElementById('filterStatus');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filterStatus = e.target.value;
        this.filterRequests();
      });
    }

    // Document type filter
    const typeFilter = document.getElementById('filterType');
    if (typeFilter) {
      typeFilter.addEventListener('change', (e) => {
        this.filterType = e.target.value;
        this.filterRequests();
      });
    }

    // Users search input
    const usersSearch = document.getElementById('usersSearch');
    if (usersSearch) {
      usersSearch.addEventListener('input', (e) => {
        this.usersSearchQuery = e.target.value;
        this.filterAndRenderUsers();
      });
    }

    // Users role filter
    const usersRoleFilter = document.getElementById('usersRoleFilter');
    if (usersRoleFilter) {
      usersRoleFilter.addEventListener('change', (e) => {
        this.usersRoleFilter = e.target.value;
        this.filterAndRenderUsers();
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

  showUpdateModal(requestId) {
    const request = this.requests.find(r => r.id === requestId);
    if (!request) return;

    const facultyOptions = this.allFaculties.map(f => 
      `<option value="${f.id}" ${request.facultyId === f.id ? 'selected' : ''}>${f.fullName || f.name}</option>`
    ).join('');

    const modalHTML = `
      <div class="modal-overlay active" id="updateModal">
        <div class="action-modal">
          <div class="modal-header">
            <h2>Update Request Status</h2>
            <button class="close-modal" onclick="document.getElementById('updateModal').remove()">&times;</button>
          </div>
          <form id="updateForm">
            <div class="form-group">
              <label for="status">Status *</label>
              <select id="status" name="status" required>
                <option value="pending" ${request.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="pending_faculty" ${request.status === 'pending_faculty' ? 'selected' : ''}>Pending Faculty Approval</option>
                <option value="in_progress" ${request.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                <option value="approved" ${request.status === 'approved' ? 'selected' : ''}>Approved</option>
                <option value="completed" ${request.status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="declined" ${request.status === 'declined' ? 'selected' : ''}>Declined</option>
              </select>
            </div>

            <div class="form-group">
              <label for="facultyId">Assign to Faculty</label>
              <select id="facultyId" name="facultyId">
                <option value="">None</option>
                ${facultyOptions}
              </select>
            </div>

            <div class="form-group">
              <label for="priority">Priority</label>
              <select id="priority" name="priority">
                <option value="normal" ${request.priority === 'normal' ? 'selected' : ''}>Normal</option>
                <option value="urgent" ${request.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
              </select>
            </div>

            <div class="form-group">
              <label for="note">Add Note (Optional)</label>
              <textarea id="note" name="note" placeholder="Add an internal note about this request..."></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-secondary" onclick="document.getElementById('updateModal').remove()" style="flex: 0.5;">
                Cancel
              </button>
              <button type="submit" class="btn-primary">
                Update Request
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Close on overlay click
    const modal = document.getElementById('updateModal');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Form submission
    document.getElementById('updateForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.updateRequest(requestId);
    });
  }

  async updateRequest(requestId) {
    const form = document.getElementById('updateForm');
    const formData = new FormData(form);

    const status = formData.get('status');
    const facultyId = formData.get('facultyId');
    const priority = formData.get('priority');
    const note = formData.get('note').trim();

    try {
      const payload = {
        status,
        priority,
      };

      if (facultyId) {
        payload.facultyId = status === 'pending_faculty' ? parseInt(facultyId, 10) : null;
      }

      if (note) {
        payload.adminNote = note;
      }

      await Utils.apiRequest(`/requests/${requestId}`, {
        method: 'PATCH',
        body: payload
      });

      Utils.showToast('Request updated successfully!', 'success');
      document.getElementById('updateModal').remove();
      await this.loadRequests();
      this.updateStats();
    } catch (error) {
      Utils.showToast('Failed to update request', 'error');
    }
  }

  async viewRequest(requestId) {
    // Try to find request in loaded requests first
    let request = this.requests?.find(r => r.id === requestId);
    
    // If not found, fetch it from the API
    if (!request) {
      try {
        request = await Utils.apiRequest(`/requests/${requestId}`, { method: 'GET' });
      } catch (error) {
        console.error('Failed to load request:', error);
        Utils.showToast('Failed to load request details', 'error');
        return;
      }
    }
    
    if (!request) return;

    const statusClass = Utils.getStatusBadgeClass(request.status);
    const statusText = Utils.getStatusText(request.status);

    const notesHTML = request.adminNotes && request.adminNotes.length > 0
      ? request.adminNotes.map(note => `
          <div class="note-item">
            <div class="note-header">
              <span class="note-author">${note.adminName}</span>
              <span class="note-time">${Utils.formatDate(note.timestamp)}</span>
            </div>
            <div class="note-content">${note.note}</div>
          </div>
        `).join('')
      : '<p style="opacity: 0.6; padding: 1rem;">No notes yet</p>';

    const approvalHTML = request.facultyApproval && request.facultyApproval.status
      ? `
          <div style="padding: 0.75rem; background: ${request.facultyApproval.status === 'approved' ? '#D1FAE5' : '#FEE2E2'}; border-radius: 6px;">
            <div style="font-weight: 600; margin-bottom: 0.25rem;">
              ${request.facultyApproval.facultyName || 'Faculty'} - ${(request.facultyApproval.status || 'pending').toUpperCase()}
            </div>
            ${request.facultyApproval.comment ? `<div style="margin-top: 0.5rem;">${request.facultyApproval.comment}</div>` : ''}
            ${request.facultyApproval.timestamp ? `<div style="font-size: 0.8rem; opacity: 0.6; margin-top: 0.25rem;">${Utils.formatDate(request.facultyApproval.timestamp)}</div>` : ''}
          </div>
        `
      : '<p style="opacity: 0.6;">No faculty approval yet</p>';

    const assignedFaculty = request.facultyId 
      ? this.allFaculties.find(f => f.id === request.facultyId)
      : null;

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
        <div class="action-modal">
          <div class="modal-header">
            <h2>Request Details</h2>
            <button class="close-modal" onclick="document.getElementById('viewRequestModal').remove()">&times;</button>
          </div>
          <div>
            <div style="margin-bottom: 1.5rem;">
              <h3 style="color: var(--recoletos-green); margin-bottom: 0.5rem;">${request.documentType || request.documentValue || 'N/A'}</h3>
              <div class="status-badge ${statusClass}" style="margin-bottom: 1rem;">${statusText}</div>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
              <strong>Request Code:</strong> ${request.requestCode || 'N/A'}<br>
              <strong>Student:</strong> ${request.studentName || 'N/A'} (${request.studentIdNumber || 'N/A'})<br>
              <strong>Department:</strong> ${request.department || 'N/A'}<br>
              <strong>Submitted:</strong> ${Utils.formatDate(request.submittedAt || request.submitted_at)}<br>
              <strong>Last Updated:</strong> ${Utils.formatDate(request.updatedAt || request.updated_at)}<br>
              <strong>Quantity:</strong> ${request.quantity || 1}<br>
              <strong>Purpose:</strong> ${request.purpose || 'N/A'}<br>
              <strong>Priority:</strong> <span class="priority-badge ${request.priority || 'normal'}">${(request.priority || 'normal').toUpperCase()}</span><br>
            ${assignedFaculty ? `<strong>Assigned Faculty:</strong> ${assignedFaculty.fullName || assignedFaculty.name}<br>` : ''}
              ${request.completedAt ? `<strong>Completed:</strong> ${Utils.formatDate(request.completedAt)}<br>` : ''}
            </div>

            <div style="margin-bottom: 1.5rem;">
              <h4 style="color: var(--recoletos-green); margin-bottom: 0.5rem;">Admin Notes</h4>
              <div class="notes-list">
                ${notesHTML}
              </div>
            </div>

            ${attachmentsHTML}

            ${request.facultyApproval !== null || request.status === 'pending_faculty' ? `
              <div style="margin-bottom: 1.5rem;">
                <h4 style="color: var(--recoletos-green); margin-bottom: 0.5rem;">Faculty Approval</h4>
                ${approvalHTML}
              </div>
            ` : ''}
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

  async loadUsers() {
    try {
      const users = await Utils.apiRequest('/users/all');
      const departments = await Utils.apiRequest('/departments');
      
      this.allUsers = Array.isArray(users) ? users : [];
      this.departments = Array.isArray(departments) ? departments : [];
      
      // Map department IDs to names
      this.allUsers = this.allUsers.map(user => ({
        ...user,
        departmentName: this.departments.find(d => d.id === user.departmentId)?.name || 'N/A'
      }));
      
      this.usersSearchQuery = '';
      this.usersRoleFilter = 'all';
      this.filterAndRenderUsers();
    } catch (error) {
      console.error('Failed to load users:', error);
      Utils.showToast('Failed to load users', 'error');
      const container = document.getElementById('usersList');
      if (container) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><h3>Failed to load users</h3></div>';
      }
    }
  }

  filterAndRenderUsers() {
    if (!this.allUsers) return;

    let filtered = this.allUsers;

    // Filter by role
    if (this.usersRoleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === this.usersRoleFilter);
    }

    // Filter by search query
    if (this.usersSearchQuery) {
      const query = this.usersSearchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        (u.fullName && u.fullName.toLowerCase().includes(query)) ||
        (u.email && u.email.toLowerCase().includes(query)) ||
        (u.studentIdNumber && u.studentIdNumber.toLowerCase().includes(query))
      );
    }

    this.renderUsers(filtered);
  }

  renderUsers(users) {
    const container = document.getElementById('usersList');
    if (!container) return;

    if (users.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><h3>No users found</h3><p>Try adjusting your filters or search query.</p></div>';
      return;
    }

    container.innerHTML = `
      <div class="table-wrapper">
        <table class="requests-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Student ID</th>
              <th>Course</th>
              <th>Year</th>
              <th>Department</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(user => `
              <tr>
                <td><strong>${user.fullName || 'N/A'}</strong></td>
                <td>${user.email || 'N/A'}</td>
                <td><span class="role-badge role-${user.role}">${user.role === 'student' ? 'Student' : user.role === 'faculty' ? 'Faculty' : 'Admin'}</span></td>
                <td>${user.studentIdNumber || '—'}</td>
                <td>${user.course || '—'}</td>
                <td>${user.year || '—'}</td>
                <td>${user.departmentName || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}
// Initialize portal when DOM is loaded
let adminPortal;
document.addEventListener('DOMContentLoaded', () => {
  adminPortal = new AdminPortal();
  window.adminPortal = adminPortal;
});

