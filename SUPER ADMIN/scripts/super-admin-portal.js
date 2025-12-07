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
    const usersDeptFilter = document.getElementById('usersDeptFilter');
    if (usersSearch) usersSearch.addEventListener('input', () => this.filterUsers());
    if (usersRoleFilter) usersRoleFilter.addEventListener('change', () => this.filterUsers());
    if (usersDeptFilter) usersDeptFilter.addEventListener('change', () => this.filterUsers());

    // Import CSV button
    const btnImportUsers = document.getElementById('btnImportUsers');
    if (btnImportUsers) {
      btnImportUsers.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv';
        fileInput.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            this.handleCSVImport(file);
          }
        };
        fileInput.click();
      });
    }

    // Requests filters
    const requestsStatusFilter = document.getElementById('requestsStatusFilter');
    const requestsDeptFilter = document.getElementById('requestsDeptFilter');
    const requestsSearch = document.getElementById('requestsSearch');
    if (requestsStatusFilter) requestsStatusFilter.addEventListener('change', () => this.filterRequests());
    if (requestsDeptFilter) requestsDeptFilter.addEventListener('change', () => this.filterRequests());
    if (requestsSearch) requestsSearch.addEventListener('input', () => this.filterRequests());

    // Logs filters
    const logsUserFilter = document.getElementById('logsUserFilter');
    const logsActivityFilter = document.getElementById('logsActivityFilter');
    if (logsUserFilter) logsUserFilter.addEventListener('change', () => this.filterLogs());
    if (logsActivityFilter) logsActivityFilter.addEventListener('change', () => this.filterLogs());
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
               <div style="font-size: 1.5rem; font-weight: 700; color: var(--recoletos-green);">${dept.completedCount || 0}</div>
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

    // Use Map to ensure unique departments by ID
    const deptMap = new Map();
    this.users.forEach(u => {
      if (u.departmentId && u.department) {
        if (!deptMap.has(u.departmentId)) {
          deptMap.set(u.departmentId, { id: u.departmentId, name: u.department });
        }
      }
    });
    
    const uniqueDepts = Array.from(deptMap.values());
    select.innerHTML = '<option value="all">All Departments</option>' +
      uniqueDepts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  }

  async loadDepartments() {
    try {
      const response = await Utils.apiRequest('/api/departments');
      if (!response || !Array.isArray(response)) {
        throw new Error('Invalid response from server');
      }
      
      this.departments = response;
      
      // Get document count for each department
      for (let dept of this.departments) {
        try {
          // Count documents from the department's documents array if available
          if (dept.documents && Array.isArray(dept.documents)) {
            dept.documentCount = dept.documents.length;
          } else {
            // Fallback: try to fetch documents
            try {
              const docs = await Utils.apiRequest(`/api/departments/${dept.id}/documents`);
              dept.documentCount = docs ? docs.length : 0;
            } catch (e) {
              dept.documentCount = 0;
            }
          }
        } catch (e) {
          dept.documentCount = 0;
        }
      }
      this.renderDepartments();
    } catch (error) {
      console.error('Failed to load departments:', error);
      const container = document.getElementById('departmentsList');
      if (container) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <h3>Failed to load departments</h3>
            <p>${error.message || 'Please try refreshing the page'}</p>
          </div>
        `;
      }
      Utils.showToast('Failed to load departments', 'error');
    }
  }

  renderDepartments() {
    const container = document.getElementById('departmentsList');
    if (!container) return;

    if (!this.departments || this.departments.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🏛️</div>
          <h3>No departments found</h3>
          <p>Click "Add Department" to create a new department</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.departments.map(dept => {
      if (!dept.id || !dept.name) return '';
      return `
        <div class="dept-card">
          <div class="dept-card-header">
            <h3>${dept.name}${dept.code ? ` (${dept.code})` : ''}</h3>
            <div>
              <button class="btn-action" onclick="window.superAdminPortal.editDepartment(${dept.id})">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button class="btn-action danger" onclick="window.superAdminPortal.deleteDepartment(${dept.id})">
                <i class="fas fa-trash"></i> Delete
              </button>
            </div>
          </div>
          <p>Document Types: ${dept.documentCount !== undefined ? dept.documentCount : (dept.documents ? dept.documents.length : 0)}</p>
        </div>
      `;
    }).filter(html => html !== '').join('');
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
      this.populateRequestsDepartmentFilter();
      this.renderRequests();
    } catch (error) {
      console.error('Failed to load requests:', error);
      Utils.showToast('Failed to load requests', 'error');
    }
  }

  async populateRequestsDepartmentFilter() {
    try {
      const depts = await Utils.apiRequest('/api/departments');
      const select = document.getElementById('requestsDeptFilter');
      if (select && depts && Array.isArray(depts)) {
        // Use Map to ensure unique departments by ID
        const deptMap = new Map();
        depts.forEach(d => {
          if (d.id && d.name && !deptMap.has(d.id)) {
            deptMap.set(d.id, { id: d.id, name: d.name });
          }
        });
        const uniqueDepts = Array.from(deptMap.values());
        select.innerHTML = '<option value="all">All Departments</option>' +
          uniqueDepts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
      }
    } catch (error) {
      console.error('Failed to load departments for filter:', error);
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
      await this.populateLogsUserFilter();
      this.renderLogs();
    } catch (error) {
      console.error('Failed to load logs:', error);
      Utils.showToast('Failed to load activity logs', 'error');
    }
  }

  async populateLogsUserFilter() {
    try {
      const users = await Utils.apiRequest('/super-admin/users');
      const select = document.getElementById('logsUserFilter');
      if (select) {
        const uniqueUsers = [...new Map(users.map(u => [u.id, u])).values()];
        select.innerHTML = '<option value="all">All Users</option>' +
          uniqueUsers.map(u => `<option value="${u.id}">${u.fullName || u.idNumber || 'Unknown'}</option>`).join('');
      }
    } catch (error) {
      console.error('Failed to load users for filter:', error);
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
      const depts = await Utils.apiRequest('/departments');
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
    const dept = this.departments.find(d => d.id === deptId);
    if (!dept) {
      Utils.showToast('Department not found', 'error');
      return;
    }

    const newName = prompt('Enter new department name:', dept.name);
    if (!newName || newName.trim() === '') return;

    const newCode = prompt('Enter new department code:', dept.code);
    if (!newCode || newCode.trim() === '') return;

    try {
      await Utils.apiRequest(`/api/departments/${deptId}`, 'PUT', {
        name: newName.trim(),
        code: newCode.trim()
      });
      Utils.showToast('Department updated successfully', 'success');
      await this.loadDepartments();
    } catch (error) {
      Utils.showToast('Failed to update department', 'error');
      console.error(error);
    }
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
    const doc = this.documentTypes.find(d => d.id === docId);
    if (!doc) {
      Utils.showToast('Document type not found', 'error');
      return;
    }

    const newLabel = prompt('Enter new document label:', doc.label);
    if (!newLabel || newLabel.trim() === '') return;

    const newValue = prompt('Enter new document value:', doc.value);
    if (!newValue || newValue.trim() === '') return;

    const requiresFaculty = confirm('Does this document require faculty approval?');

    try {
      await Utils.apiRequest(`/super-admin/document-types/${docId}`, 'PUT', {
        label: newLabel.trim(),
        value: newValue.trim(),
        requiresFaculty: requiresFaculty
      });
      Utils.showToast('Document type updated successfully', 'success');
      await this.loadDocumentTypes();
    } catch (error) {
      Utils.showToast('Failed to update document type', 'error');
      console.error(error);
    }
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
    const request = this.requests.find(r => r.id === requestId);
    if (!request) {
      Utils.showToast('Request not found', 'error');
      return;
    }

    // Show request details in an alert (can be improved with a modal later)
    const details = `
Request Code: ${request.requestCode || 'N/A'}
Student: ${request.studentName || 'N/A'}
Department: ${request.departmentName || 'N/A'}
Document: ${request.documentLabel || request.documentValue || 'N/A'}
Faculty Status: ${request.facultyStatus || 'Pending'}
Admin Status: ${request.status || 'Pending'}
Submitted: ${request.submittedAt ? new Date(request.submittedAt).toLocaleString() : 'N/A'}
    `.trim();
    
    alert(details);
  }

  // Simple CSV parser that handles quoted values
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  async handleCSVImport(file) {
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length < 2) {
        Utils.showToast('CSV file must have at least a header row and one data row', 'error');
        return;
      }

      // Parse CSV header
      const headers = this.parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const requiredHeaders = ['role', 'id_number', 'full_name', 'email', 'password'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        Utils.showToast(`Missing required columns: ${missingHeaders.join(', ')}. Required: ${requiredHeaders.join(', ')}`, 'error');
        return;
      }

      const users = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = this.parseCSVLine(lines[i]);
        if (values.length < headers.length) continue;
        
        const user = {};
        headers.forEach((header, index) => {
          user[header] = (values[index] || '').replace(/^"|"$/g, '').trim();
        });
        
        // Validate required fields
        if (user.role && user.id_number && user.full_name && user.email && user.password) {
          users.push({
            role: user.role.toLowerCase(),
            idNumber: user.id_number,
            fullName: user.full_name,
            email: user.email,
            password: user.password,
            departmentId: user.department_id || null,
            course: user.course || null,
            yearLevel: user.year_level || null,
            position: user.position || null
          });
        }
      }

      if (users.length === 0) {
        Utils.showToast('No valid users found in CSV file', 'error');
        return;
      }

      // Confirm import
      if (!confirm(`Import ${users.length} user(s) from CSV?`)) return;

      // Show loading
      Utils.showToast('Importing users...', 'info');

      // Import users
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      
      for (const user of users) {
        try {
          await Utils.apiRequest('/super-admin/users', 'POST', user);
          successCount++;
        } catch (error) {
          console.error(`Failed to import user ${user.idNumber}:`, error);
          errorCount++;
          errors.push(`${user.idNumber}: ${error.message || 'Import failed'}`);
        }
      }

      if (successCount > 0) {
        Utils.showToast(`Successfully imported ${successCount} user(s)${errorCount > 0 ? `. ${errorCount} failed.` : ''}`, 'success');
        if (errorCount > 0 && errors.length > 0) {
          console.error('Import errors:', errors);
        }
        await this.loadUsers();
      } else {
        Utils.showToast('Failed to import all users. Please check the CSV format and try again.', 'error');
      }
    } catch (error) {
      console.error('CSV import error:', error);
      Utils.showToast('Failed to import CSV file: ' + (error.message || 'Unknown error'), 'error');
    }
  }

  filterRequests() {
    const statusFilter = document.getElementById('requestsStatusFilter')?.value || 'all';
    const deptFilter = document.getElementById('requestsDeptFilter')?.value || 'all';
    const search = document.getElementById('requestsSearch')?.value.toLowerCase() || '';

    const filtered = this.requests.filter(req => {
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;
      if (deptFilter !== 'all' && req.departmentId != deptFilter) return false;
      if (search && !req.studentName?.toLowerCase().includes(search) &&
          !req.requestCode?.toLowerCase().includes(search) &&
          !req.documentLabel?.toLowerCase().includes(search) &&
          !req.documentValue?.toLowerCase().includes(search)) return false;
      return true;
    });

    const tbody = document.getElementById('requestsTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">No requests found</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(req => `
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

  filterLogs() {
    const userFilter = document.getElementById('logsUserFilter')?.value || 'all';
    const activityFilter = document.getElementById('logsActivityFilter')?.value || 'all';

    const filtered = this.logs.filter(log => {
      if (userFilter !== 'all' && log.userId != userFilter) return false;
      if (activityFilter !== 'all' && log.activity?.toLowerCase() !== activityFilter.toLowerCase()) return false;
      return true;
    });

    const container = document.getElementById('logsList');
    if (!container) return;

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No activity logs match the filters</p></div>';
      return;
    }

    container.innerHTML = filtered.map(log => `
      <div class="log-item">
        <div class="log-info">
          <strong>${log.userName || 'Unknown'}</strong> ${log.activity || ''}
          <div style="font-size: 0.85rem; opacity: 0.7; margin-top: 0.25rem;">${log.details || ''}</div>
        </div>
        <div class="log-time">${log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</div>
      </div>
    `).join('');
  }
}

