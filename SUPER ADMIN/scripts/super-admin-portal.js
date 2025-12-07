// Super Admin Portal JavaScript
document.addEventListener('DOMContentLoaded', async () => {
  if (!Utils.requireAuth()) return;

  const user = Utils.getCurrentUser();
  
  // Check if user is super admin
  if (!user.isSuperAdmin && user.idNumber !== '1234') {
    Utils.showToast('Access denied. Super Admin portal only.', 'error');
    Utils.clearCurrentUser();
    return;
  }

  // Initialize Super Admin Portal
  window.superAdminPortal = new SuperAdminPortal();
  await window.superAdminPortal.init();
});

class SuperAdminPortal {
  constructor() {
    this.currentUser = Utils.getCurrentUser();
    this.stats = {
      totalRequests: 0,
      pendingFaculty: 0,
      pendingAdmin: 0,
      completed: 0,
      activeStudents: 0,
      activeFaculty: 0,
      activeAdmins: 0,
      departments: 0
    };
    this.users = [];
    this.departments = [];
    this.documentTypes = [];
    this.requests = [];
    this.logs = [];
    this.init();
  }

  async init() {
    this.loadUserInfo();
    this.setupEventListeners();
    await this.loadDashboard();
  }

  loadUserInfo() {
    const userNameEl = document.getElementById('userName');
    const sidebarUserInfo = document.getElementById('sidebarUserInfo');
    
    if (userNameEl) {
      userNameEl.textContent = this.currentUser.fullName || 'Super Admin';
    }
    
    if (sidebarUserInfo) {
      sidebarUserInfo.textContent = this.currentUser.fullName || 'Super Admin';
    }
  }

  setupEventListeners() {
    // Sidebar navigation
    const links = document.querySelectorAll('.sidebar-link');
    links.forEach(btn => {
      btn.addEventListener('click', () => {
        links.forEach(l => l.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.dataset.view;
        this.showView(view);
      });
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutLink = document.getElementById('logoutLink');
    if (logoutBtn) logoutBtn.addEventListener('click', () => Utils.clearCurrentUser());
    if (logoutLink) logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      Utils.clearCurrentUser();
    });

    // Profile dropdown
    const userPill = document.getElementById('userPill');
    const profileMenu = document.getElementById('profileDropdownMenu');
    if (userPill && profileMenu) {
      userPill.addEventListener('click', (e) => {
        e.stopPropagation();
        profileMenu.classList.toggle('hidden');
      });
      document.addEventListener('click', (e) => {
        if (!userPill.contains(e.target) && !profileMenu.contains(e.target)) {
          profileMenu.classList.add('hidden');
        }
      });
    }

    // Add User Modal
    const btnAddUser = document.getElementById('btnAddUser');
    const addUserModal = document.getElementById('addUserModal');
    const closeAddUserModal = document.getElementById('closeAddUserModal');
    const cancelAddUser = document.getElementById('cancelAddUser');
    
    if (btnAddUser) {
      btnAddUser.addEventListener('click', () => {
        if (addUserModal) addUserModal.classList.remove('hidden');
        this.loadDepartmentsForSelect();
      });
    }
    
    if (closeAddUserModal) {
      closeAddUserModal.addEventListener('click', () => {
        if (addUserModal) addUserModal.classList.add('hidden');
      });
    }
    
    if (cancelAddUser) {
      cancelAddUser.addEventListener('click', () => {
        if (addUserModal) addUserModal.classList.add('hidden');
      });
    }

    // Add User Form
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
      addUserForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAddUser();
      });
    }

    // Role change handler for form fields
    const newUserRole = document.getElementById('newUserRole');
    if (newUserRole) {
      newUserRole.addEventListener('change', () => {
        this.toggleUserFormFields();
      });
    }

    // Search and filters
    const usersSearch = document.getElementById('usersSearch');
    const usersRoleFilter = document.getElementById('usersRoleFilter');
    if (usersSearch) usersSearch.addEventListener('input', () => this.filterUsers());
    if (usersRoleFilter) usersRoleFilter.addEventListener('change', () => this.filterUsers());
  }

  showView(viewName) {
    const views = ['dashboard', 'users', 'departments', 'documents', 'requests', 'logs', 'reports', 'settings'];
    views.forEach(v => {
      const el = document.getElementById(v + 'View');
      if (el) el.classList.toggle('hidden', v !== viewName);
    });

    // Load data for specific views
    switch(viewName) {
      case 'dashboard':
        this.loadDashboard();
        break;
      case 'users':
        this.loadUsers();
        break;
      case 'departments':
        this.loadDepartments();
        break;
      case 'documents':
        this.loadDocumentTypes();
        break;
      case 'requests':
        this.loadAllRequests();
        break;
      case 'logs':
        this.loadActivityLogs();
        break;
      case 'reports':
        this.loadReports();
        break;
      case 'settings':
        this.loadSettings();
        break;
    }
  }

  async loadDashboard() {
    try {
      // Load stats
      const statsData = await Utils.apiRequest('/super-admin/stats');
      if (statsData) {
        this.stats = statsData;
        this.updateStatsDisplay();
      }

      // Load department stats
      await this.loadDepartmentStats();
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      Utils.showToast('Failed to load dashboard data', 'error');
    }
  }

  updateStatsDisplay() {
    const elements = {
      statTotalRequests: this.stats.totalRequests || 0,
      statPendingFaculty: this.stats.pendingFaculty || 0,
      statPendingAdmin: this.stats.pendingAdmin || 0,
      statCompleted: this.stats.completed || 0,
      statActiveStudents: this.stats.activeStudents || 0,
      statActiveFaculty: this.stats.activeFaculty || 0,
      statActiveAdmins: this.stats.activeAdmins || 0,
      statDepartments: this.stats.departments || 0
    };

    Object.keys(elements).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = elements[id];
    });
  }

  async loadDepartmentStats() {
    try {
      const deptStats = await Utils.apiRequest('/super-admin/department-stats');
      const container = document.getElementById('departmentStatsChart');
      if (!container) return;

      if (!deptStats || deptStats.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No department statistics available</p></div>';
        return;
      }

      let html = '<div style="display: grid; gap: 1rem;">';
      deptStats.forEach(dept => {
        html += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--bg-cream); border-radius: 8px;">
            <div>
              <strong>${dept.name}</strong>
              <div style="font-size: 0.9rem; opacity: 0.7;">${dept.requestCount || 0} requests</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 1.5rem; font-weight: 700; color: var(--super-admin-purple);">${dept.completedCount || 0}</div>
              <div style="font-size: 0.85rem; opacity: 0.7;">completed</div>
            </div>
          </div>
        `;
      });
      html += '</div>';
      container.innerHTML = html;
    } catch (error) {
      console.error('Failed to load department stats:', error);
    }
  }

  async loadUsers() {
    try {
      this.users = await Utils.apiRequest('/super-admin/users');
      this.renderUsers();
      this.populateDepartmentFilter();
    } catch (error) {
      console.error('Failed to load users:', error);
      Utils.showToast('Failed to load users', 'error');
    }
  }

  renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (this.users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
      return;
    }

    tbody.innerHTML = this.users.map(user => `
      <tr>
        <td>${user.idNumber || ''}</td>
        <td>${user.fullName || ''}</td>
        <td><span class="role-badge role-${user.role}">${user.role || ''}</span></td>
        <td>${user.department || 'N/A'}</td>
        <td>${user.email || ''}</td>
        <td><span class="status-badge ${user.isActive !== false ? 'approved' : 'declined'}">${user.isActive !== false ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button class="btn-action" onclick="window.superAdminPortal.editUser(${user.id})">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn-action" onclick="window.superAdminPortal.resetPassword(${user.id})">
            <i class="fas fa-key"></i> Reset
          </button>
          <button class="btn-action danger" onclick="window.superAdminPortal.toggleUserStatus(${user.id})">
            <i class="fas fa-${user.isActive !== false ? 'ban' : 'check'}"></i> ${user.isActive !== false ? 'Disable' : 'Enable'}
          </button>
        </td>
      </tr>
    `).join('');
  }

  filterUsers() {
    const search = document.getElementById('usersSearch')?.value.toLowerCase() || '';
    const roleFilter = document.getElementById('usersRoleFilter')?.value || 'all';
    const deptFilter = document.getElementById('usersDeptFilter')?.value || 'all';

    const filtered = this.users.filter(user => {
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;
      if (deptFilter !== 'all' && user.departmentId != deptFilter) return false;
      if (search && !user.fullName?.toLowerCase().includes(search) && 
          !user.idNumber?.toLowerCase().includes(search) &&
          !user.email?.toLowerCase().includes(search)) return false;
      return true;
    });

    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No users match the filters</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(user => `
      <tr>
        <td>${user.idNumber || ''}</td>
        <td>${user.fullName || ''}</td>
        <td><span class="role-badge role-${user.role}">${user.role || ''}</span></td>
        <td>${user.department || 'N/A'}</td>
        <td>${user.email || ''}</td>
        <td><span class="status-badge ${user.isActive !== false ? 'approved' : 'declined'}">${user.isActive !== false ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button class="btn-action" onclick="window.superAdminPortal.editUser(${user.id})">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn-action" onclick="window.superAdminPortal.resetPassword(${user.id})">
            <i class="fas fa-key"></i> Reset
          </button>
          <button class="btn-action danger" onclick="window.superAdminPortal.toggleUserStatus(${user.id})">
            <i class="fas fa-${user.isActive !== false ? 'ban' : 'check'}"></i> ${user.isActive !== false ? 'Disable' : 'Enable'}
          </button>
        </td>
      </tr>
    `).join('');
  }

  populateDepartmentFilter() {
    const select = document.getElementById('usersDeptFilter');
    if (!select) return;

    const depts = [...new Set(this.users.map(u => ({ id: u.departmentId, name: u.department })).filter(d => d.name))];
    select.innerHTML = '<option value="all">All Departments</option>' +
      depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  }

  async loadDepartments() {
    try {
      this.departments = await Utils.apiRequest('/api/departments');
      this.renderDepartments();
    } catch (error) {
      console.error('Failed to load departments:', error);
      Utils.showToast('Failed to load departments', 'error');
    }
  }

  renderDepartments() {
    const container = document.getElementById('departmentsList');
    if (!container) return;

    if (this.departments.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No departments found</p></div>';
      return;
    }

    container.innerHTML = this.departments.map(dept => `
      <div class="dept-card">
        <div class="dept-card-header">
          <h3>${dept.name} (${dept.code})</h3>
          <div>
            <button class="btn-action" onclick="window.superAdminPortal.editDepartment(${dept.id})">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn-action danger" onclick="window.superAdminPortal.deleteDepartment(${dept.id})">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
        <p>Document Types: ${dept.documentCount || 0}</p>
      </div>
    `).join('');
  }

  async loadDocumentTypes() {
    try {
      this.documentTypes = await Utils.apiRequest('/super-admin/document-types');
      this.renderDocumentTypes();
    } catch (error) {
      console.error('Failed to load document types:', error);
      Utils.showToast('Failed to load document types', 'error');
    }
  }

  renderDocumentTypes() {
    const container = document.getElementById('documentsList');
    if (!container) return;

    if (this.documentTypes.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No document types found</p></div>';
      return;
    }

    // Group by department
    const grouped = {};
    this.documentTypes.forEach(doc => {
      const dept = doc.departmentName || 'Unknown';
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push(doc);
    });

    let html = '';
    Object.keys(grouped).forEach(dept => {
      html += `
        <div class="doc-card">
          <div class="doc-card-header">
            <h3>${dept}</h3>
          </div>
          <div>
            ${grouped[dept].map(doc => `
              <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-gray);">
                <span>${doc.label}</span>
                <div>
                  <button class="btn-action" onclick="window.superAdminPortal.editDocumentType(${doc.id})">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn-action danger" onclick="window.superAdminPortal.deleteDocumentType(${doc.id})">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  async loadAllRequests() {
    try {
      this.requests = await Utils.apiRequest('/super-admin/requests');
      this.renderRequests();
    } catch (error) {
      console.error('Failed to load requests:', error);
      Utils.showToast('Failed to load requests', 'error');
    }
  }

  renderRequests() {
    const tbody = document.getElementById('requestsTableBody');
    if (!tbody) return;

    if (this.requests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">No requests found</td></tr>';
      return;
    }

    tbody.innerHTML = this.requests.map(req => `
      <tr>
        <td>${req.requestCode || 'N/A'}</td>
        <td>${req.studentName || ''}</td>
        <td>${req.departmentName || ''}</td>
        <td>${req.documentLabel || req.documentValue || ''}</td>
        <td><span class="status-badge ${req.facultyStatus || 'pending'}">${req.facultyStatus || 'Pending'}</span></td>
        <td><span class="status-badge ${req.status || 'pending'}">${req.status || 'Pending'}</span></td>
        <td>${req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : 'N/A'}</td>
        <td>
          <button class="btn-action" onclick="window.superAdminPortal.viewRequest(${req.id})">
            <i class="fas fa-eye"></i> View
          </button>
        </td>
      </tr>
    `).join('');
  }

  async loadActivityLogs() {
    try {
      this.logs = await Utils.apiRequest('/super-admin/logs');
      this.renderLogs();
    } catch (error) {
      console.error('Failed to load logs:', error);
      Utils.showToast('Failed to load activity logs', 'error');
    }
  }

  renderLogs() {
    const container = document.getElementById('logsList');
    if (!container) return;

    if (this.logs.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No activity logs found</p></div>';
      return;
    }

    container.innerHTML = this.logs.map(log => `
      <div class="log-item">
        <div class="log-info">
          <strong>${log.userName || 'Unknown'}</strong> ${log.activity || ''}
          <div style="font-size: 0.85rem; opacity: 0.7; margin-top: 0.25rem;">${log.details || ''}</div>
        </div>
        <div class="log-time">${log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</div>
      </div>
    `).join('');
  }

  async loadReports() {
    // Placeholder for reports
    Utils.showToast('Reports feature coming soon', 'info');
  }

  async loadSettings() {
    // Placeholder for settings
    Utils.showToast('Settings feature coming soon', 'info');
  }

  async loadDepartmentsForSelect() {
    try {
      const depts = await Utils.apiRequest('/api/departments');
      const select = document.getElementById('newUserDepartment');
      if (select) {
        select.innerHTML = '<option value="">Select department</option>' +
          depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  }

  toggleUserFormFields() {
    const role = document.getElementById('newUserRole')?.value;
    const courseGroup = document.getElementById('newUserCourseGroup');
    const yearGroup = document.getElementById('newUserYearGroup');
    const positionGroup = document.getElementById('newUserPositionGroup');

    if (courseGroup) courseGroup.style.display = role === 'student' ? 'block' : 'none';
    if (yearGroup) yearGroup.style.display = role === 'student' ? 'block' : 'none';
    if (positionGroup) positionGroup.style.display = role === 'faculty' ? 'block' : 'none';
  }

  async handleAddUser() {
    try {
      const userData = {
        role: document.getElementById('newUserRole').value,
        idNumber: document.getElementById('newUserIdNumber').value,
        fullName: document.getElementById('newUserFullName').value,
        email: document.getElementById('newUserEmail').value,
        password: document.getElementById('newUserPassword').value,
        departmentId: document.getElementById('newUserDepartment').value || null,
        course: document.getElementById('newUserCourse')?.value || null,
        yearLevel: document.getElementById('newUserYearLevel')?.value || null,
        position: document.getElementById('newUserPosition')?.value || null
      };

      await Utils.apiRequest('/super-admin/users', 'POST', userData);
      Utils.showToast('User created successfully', 'success');
      document.getElementById('addUserModal').classList.add('hidden');
      document.getElementById('addUserForm').reset();
      await this.loadUsers();
    } catch (error) {
      Utils.showToast('Failed to create user', 'error');
      console.error(error);
    }
  }

  // Placeholder methods for user actions
  async editUser(userId) {
    Utils.showToast('Edit user feature coming soon', 'info');
  }

  async resetPassword(userId) {
    if (!confirm('Reset password for this user?')) return;
    try {
      await Utils.apiRequest(`/super-admin/users/${userId}/reset-password`, 'POST');
      Utils.showToast('Password reset successfully', 'success');
    } catch (error) {
      Utils.showToast('Failed to reset password', 'error');
    }
  }

  async toggleUserStatus(userId) {
    const user = this.users.find(u => u.id === userId);
    const action = user?.isActive !== false ? 'disable' : 'enable';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this user?`)) return;
    
    try {
      await Utils.apiRequest(`/super-admin/users/${userId}/toggle-status`, 'POST');
      Utils.showToast(`User ${action}d successfully`, 'success');
      await this.loadUsers();
    } catch (error) {
      Utils.showToast(`Failed to ${action} user`, 'error');
    }
  }

  async editDepartment(deptId) {
    Utils.showToast('Edit department feature coming soon', 'info');
  }

  async deleteDepartment(deptId) {
    if (!confirm('Delete this department? This action cannot be undone.')) return;
    try {
      await Utils.apiRequest(`/super-admin/departments/${deptId}`, 'DELETE');
      Utils.showToast('Department deleted successfully', 'success');
      await this.loadDepartments();
    } catch (error) {
      Utils.showToast('Failed to delete department', 'error');
    }
  }

  async editDocumentType(docId) {
    Utils.showToast('Edit document type feature coming soon', 'info');
  }

  async deleteDocumentType(docId) {
    if (!confirm('Delete this document type? This action cannot be undone.')) return;
    try {
      await Utils.apiRequest(`/super-admin/document-types/${docId}`, 'DELETE');
      Utils.showToast('Document type deleted successfully', 'success');
      await this.loadDocumentTypes();
    } catch (error) {
      Utils.showToast('Failed to delete document type', 'error');
    }
  }

  async viewRequest(requestId) {
    Utils.showToast('View request feature coming soon', 'info');
  }
}

