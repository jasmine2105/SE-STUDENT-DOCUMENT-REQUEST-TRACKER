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
    const portalGreeting = document.getElementById('portalGreeting');
    
    const displayName = this.currentUser.fullName || 'Super Admin';
    
    if (userNameEl) {
      userNameEl.textContent = displayName;
    }
    
    if (sidebarUserInfo) {
      sidebarUserInfo.textContent = displayName;
    }

    // Update greeting in header
    if (portalGreeting) {
      portalGreeting.textContent = `Hi, ${displayName}`;
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
        if (addUserModal) {
          addUserModal.classList.remove('hidden');
          addUserModal.classList.add('active');
        }
        this.loadDepartmentsForSelect();
      });
    }
    
    if (closeAddUserModal) {
      closeAddUserModal.addEventListener('click', () => {
        if (addUserModal) {
          addUserModal.classList.remove('active');
          addUserModal.classList.add('hidden');
        }
      });
    }
    
    if (cancelAddUser) {
      cancelAddUser.addEventListener('click', () => {
        if (addUserModal) {
          addUserModal.classList.remove('active');
          addUserModal.classList.add('hidden');
        }
      });
    }

    // Close modal when clicking outside
    if (addUserModal) {
      addUserModal.addEventListener('click', (e) => {
        if (e.target === addUserModal) {
          addUserModal.classList.remove('active');
          addUserModal.classList.add('hidden');
        }
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
    const logsDateFrom = document.getElementById('logsDateFrom');
    const logsDateTo = document.getElementById('logsDateTo');
    if (logsUserFilter) logsUserFilter.addEventListener('change', () => this.filterLogs());
    if (logsActivityFilter) logsActivityFilter.addEventListener('change', () => this.filterLogs());
    if (logsDateFrom) logsDateFrom.addEventListener('change', () => this.filterLogs());
    if (logsDateTo) logsDateTo.addEventListener('change', () => this.filterLogs());

    // Add Department button
    const btnAddDepartment = document.getElementById('btnAddDepartment');
    if (btnAddDepartment) {
      btnAddDepartment.addEventListener('click', () => this.handleAddDepartment());
    }

    // Export buttons for Reports
    const btnExportPDF = document.getElementById('btnExportPDF');
    const btnExportExcel = document.getElementById('btnExportExcel');
    if (btnExportPDF) {
      btnExportPDF.addEventListener('click', () => this.exportReport('PDF'));
    }
    if (btnExportExcel) {
      btnExportExcel.addEventListener('click', () => this.exportReport('Excel'));
    }

    // Settings buttons
    const btnSaveSettings = document.getElementById('btnSaveSettings');
    const btnBackup = document.getElementById('btnBackup');
    const btnRestore = document.getElementById('btnRestore');
    const restoreFile = document.getElementById('restoreFile');
    
    if (btnSaveSettings) {
      btnSaveSettings.addEventListener('click', () => this.saveSettings());
    }
    if (btnBackup) {
      btnBackup.addEventListener('click', () => this.createBackup());
    }
    if (btnRestore) {
      btnRestore.addEventListener('click', () => restoreFile?.click());
    }
    if (restoreFile) {
      restoreFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.restoreBackup(file);
        }
      });
    }
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

    tbody.innerHTML = this.users.map(user => {
      const roleDisplay = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';
      return `
      <tr>
        <td>${user.idNumber || ''}</td>
        <td>${user.fullName || ''}</td>
        <td><span class="role-badge role-${user.role}">${roleDisplay}</span></td>
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
    `;
    }).join('');
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

    tbody.innerHTML = filtered.map(user => {
      const roleDisplay = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';
      return `
      <tr>
        <td>${user.idNumber || ''}</td>
        <td>${user.fullName || ''}</td>
        <td><span class="role-badge role-${user.role}">${roleDisplay}</span></td>
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
    `;
    }).join('');
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
      const response = await Utils.apiRequest('/departments');
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
              const docs = await Utils.apiRequest(`/departments/${dept.id}/documents`);
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
      const depts = await Utils.apiRequest('/departments');
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
      // Populate user filter before rendering
      await this.populateLogsUserFilter();
      this.renderLogs();
    } catch (error) {
      console.error('Failed to load logs:', error);
      // Still try to populate user filter even if logs fail
      try {
        await this.populateLogsUserFilter();
      } catch (filterError) {
        console.error('Failed to populate user filter:', filterError);
      }
      // Show empty state instead of error toast
      const container = document.getElementById('logsList');
      if (container) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><h3>No activity logs found</h3><p>Activity logs will appear here when users interact with documents.</p></div>';
      }
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
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><h3>No activity logs found</h3><p>Activity logs will appear here when users interact with documents.</p></div>';
      return;
    }

    container.innerHTML = this.logs.map(log => {
      const activityIcon = this.getActivityIcon(log.activity);
      return `
      <div class="log-item" style="padding: 1rem; border-bottom: 1px solid var(--border-gray); display: flex; justify-content: space-between; align-items: start; transition: background 0.2s ease;">
        <div class="log-info" style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span style="font-size: 1.2rem;">${activityIcon}</span>
            <strong style="color: var(--recoletos-green);">${log.userName || 'Unknown'}</strong>
            <span class="role-badge role-${log.userRole || 'student'}" style="font-size: 0.75rem; padding: 0.2rem 0.5rem;">
              ${log.userRole ? log.userRole.charAt(0).toUpperCase() + log.userRole.slice(1) : ''}
            </span>
            <span style="color: var(--text-dark); font-weight: 500;">${log.activity || ''}</span>
          </div>
          <div style="font-size: 0.9rem; color: var(--text-dark); line-height: 1.5; margin-left: 1.7rem;">
            ${log.details || ''}
          </div>
          ${log.requestCode ? `
            <div style="font-size: 0.85rem; color: var(--text-dark); opacity: 0.6; margin-top: 0.5rem; margin-left: 1.7rem;">
              Request: ${log.requestCode} | Document: ${log.documentLabel || 'N/A'} | Department: ${log.departmentName || 'N/A'}
            </div>
          ` : ''}
        </div>
        <div class="log-time" style="color: var(--text-dark); opacity: 0.7; font-size: 0.85rem; white-space: nowrap; margin-left: 1rem;">
          ${log.timestamp ? new Date(log.timestamp).toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit', 
            minute: '2-digit' 
          }) : 'N/A'}
        </div>
      </div>
    `;
    }).join('');
  }

  getActivityIcon(activity) {
    const icons = {
      'Approve': '✅',
      'Decline': '❌',
      'Create': '📝',
      'Update': '✏️',
      'Delete': '🗑️'
    };
    return icons[activity] || '📋';
  }

  async loadReports() {
    try {
      // Load report data
      const reportsData = await Utils.apiRequest('/super-admin/reports');
      
      // Render monthly document output
      this.renderMonthlyReport(reportsData.monthlyOutput || []);
      
      // Render department performance
      this.renderDepartmentPerformance(reportsData.departmentPerformance || []);
      
      // Render most requested documents
      this.renderTopDocuments(reportsData.topDocuments || []);
      
      // Render staff performance
      this.renderStaffPerformance(reportsData.staffPerformance || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
      // Show empty state with message
      this.renderEmptyReports();
    }
  }

  renderMonthlyReport(data) {
    const container = document.getElementById('monthlyReportChart');
    if (!container) return;

    if (!data || data.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No data available</p></div>';
      return;
    }

    const maxValue = Math.max(...data.map(d => d.count || 0), 1);
    const html = data.map(item => `
      <div style="margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
          <span style="font-weight: 500;">${item.month || 'N/A'}</span>
          <span style="color: var(--recoletos-green); font-weight: 600;">${item.count || 0}</span>
        </div>
        <div style="width: 100%; height: 8px; background: var(--border-gray); border-radius: 4px; overflow: hidden;">
          <div style="width: ${((item.count || 0) / maxValue) * 100}%; height: 100%; background: var(--recoletos-green); transition: width 0.3s ease;"></div>
        </div>
      </div>
    `).join('');
    
    container.innerHTML = html;
  }

  renderDepartmentPerformance(data) {
    const container = document.getElementById('departmentPerformanceChart');
    if (!container) return;

    if (!data || data.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No data available</p></div>';
      return;
    }

    const maxValue = Math.max(...data.map(d => d.completed || 0), 1);
    const html = data.map(item => `
      <div style="margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
          <span style="font-weight: 500;">${item.name || 'N/A'}</span>
          <span style="color: var(--recoletos-green); font-weight: 600;">${item.completed || 0}/${item.total || 0}</span>
        </div>
        <div style="width: 100%; height: 8px; background: var(--border-gray); border-radius: 4px; overflow: hidden;">
          <div style="width: ${((item.completed || 0) / maxValue) * 100}%; height: 100%; background: var(--recoletos-green); transition: width 0.3s ease;"></div>
        </div>
      </div>
    `).join('');
    
    container.innerHTML = html;
  }

  renderTopDocuments(data) {
    const container = document.getElementById('topDocumentsChart');
    if (!container) return;

    if (!data || data.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No data available</p></div>';
      return;
    }

    const html = data.slice(0, 10).map((item, index) => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border-gray);">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="width: 24px; height: 24px; border-radius: 50%; background: var(--recoletos-green); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600;">${index + 1}</span>
          <span style="font-weight: 500;">${item.label || item.value || 'N/A'}</span>
        </div>
        <span style="color: var(--recoletos-green); font-weight: 600;">${item.count || 0}</span>
      </div>
    `).join('');
    
    container.innerHTML = html;
  }

  renderStaffPerformance(data) {
    const container = document.getElementById('staffPerformanceChart');
    if (!container) return;

    if (!data || data.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No data available</p></div>';
      return;
    }

    const html = data.map(item => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border-gray);">
        <div>
          <div style="font-weight: 600;">${item.name || 'N/A'}</div>
          <div style="font-size: 0.85rem; opacity: 0.7;">${item.role ? item.role.charAt(0).toUpperCase() + item.role.slice(1) : 'N/A'}</div>
        </div>
        <div style="text-align: right;">
          <div style="color: var(--recoletos-green); font-weight: 600; font-size: 1.1rem;">${item.processed || 0}</div>
          <div style="font-size: 0.85rem; opacity: 0.7;">processed</div>
        </div>
      </div>
    `).join('');
    
    container.innerHTML = html;
  }

  renderEmptyReports() {
    const containers = ['monthlyReportChart', 'departmentPerformanceChart', 'topDocumentsChart', 'staffPerformanceChart'];
    containers.forEach(id => {
      const container = document.getElementById(id);
      if (container) {
        container.innerHTML = '<div class="empty-state"><p>No data available</p></div>';
      }
    });
  }

  exportReport(format) {
    Utils.showToast(`Exporting to ${format}... This feature will be implemented soon.`, 'info');
    // TODO: Implement actual export functionality
  }

  async loadSettings() {
    try {
      const settings = await Utils.apiRequest('/super-admin/settings');
      
      // Load email notification settings
      const emailNotifications = document.getElementById('emailNotifications');
      const reminderFrequency = document.getElementById('reminderFrequency');
      if (emailNotifications) emailNotifications.checked = settings.emailNotifications !== false;
      if (reminderFrequency) reminderFrequency.value = settings.reminderFrequency || 24;

      // Load maintenance settings
      const maintenanceMode = document.getElementById('maintenanceMode');
      const maintenanceMessage = document.getElementById('maintenanceMessage');
      if (maintenanceMode) maintenanceMode.checked = settings.maintenanceMode === true;
      if (maintenanceMessage) maintenanceMessage.value = settings.maintenanceMessage || 'System is under maintenance. Please check back later.';

      // Load security settings
      const sessionTimeout = document.getElementById('sessionTimeout');
      const require2FA = document.getElementById('require2FA');
      if (sessionTimeout) sessionTimeout.value = settings.sessionTimeout || 60;
      if (require2FA) require2FA.checked = settings.require2FA === true;

      // Load branding settings
      const schoolName = document.getElementById('schoolName');
      const logoURL = document.getElementById('logoURL');
      if (schoolName) schoolName.value = settings.schoolName || 'USJR Recoletos';
      if (logoURL) logoURL.value = settings.logoURL || '';
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use default values if loading fails
    }
  }

  async saveSettings() {
    try {
      const settings = {
        emailNotifications: document.getElementById('emailNotifications')?.checked ?? true,
        reminderFrequency: parseInt(document.getElementById('reminderFrequency')?.value || '24', 10),
        maintenanceMode: document.getElementById('maintenanceMode')?.checked === true,
        maintenanceMessage: document.getElementById('maintenanceMessage')?.value || '',
        sessionTimeout: parseInt(document.getElementById('sessionTimeout')?.value || '60', 10),
        require2FA: document.getElementById('require2FA')?.checked === true,
        schoolName: document.getElementById('schoolName')?.value || 'USJR Recoletos',
        logoURL: document.getElementById('logoURL')?.value || ''
      };

      await Utils.apiRequest('/super-admin/settings', {
        method: 'PUT',
        body: settings
      });

      Utils.showToast('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      Utils.showToast('Failed to save settings: ' + (error.message || 'Unknown error'), 'error');
    }
  }

  async createBackup() {
    try {
      Utils.showToast('Creating backup...', 'info');
      
      const backup = await Utils.apiRequest('/super-admin/backup', {
        method: 'POST'
      });

      // Create download link
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      Utils.showToast('Backup created and downloaded successfully!', 'success');
    } catch (error) {
      console.error('Failed to create backup:', error);
      Utils.showToast('Failed to create backup: ' + (error.message || 'Unknown error'), 'error');
    }
  }

  async restoreBackup(file) {
    const restoreFileInput = document.getElementById('restoreFile');
    try {
      if (!confirm('Are you sure you want to restore from this backup? This will overwrite current data.')) {
        if (restoreFileInput) restoreFileInput.value = '';
        return;
      }

      Utils.showToast('Restoring backup...', 'info');

      const text = await file.text();
      const backupData = JSON.parse(text);

      await Utils.apiRequest('/super-admin/restore', {
        method: 'POST',
        body: backupData
      });

      if (restoreFileInput) restoreFileInput.value = '';
      Utils.showToast('Backup restored successfully! Please refresh the page.', 'success');
      
      // Reload page after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Failed to restore backup:', error);
      Utils.showToast('Failed to restore backup: ' + (error.message || 'Invalid backup file'), 'error');
      if (restoreFileInput) restoreFileInput.value = '';
    }
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
      // Get form elements
      const roleEl = document.getElementById('newUserRole');
      const idNumberEl = document.getElementById('newUserIdNumber');
      const fullNameEl = document.getElementById('newUserFullName');
      const emailEl = document.getElementById('newUserEmail');
      const passwordEl = document.getElementById('newUserPassword');
      const departmentEl = document.getElementById('newUserDepartment');
      const courseEl = document.getElementById('newUserCourse');
      const yearLevelEl = document.getElementById('newUserYearLevel');
      const positionEl = document.getElementById('newUserPosition');

      // Validate required fields
      if (!roleEl || !roleEl.value) {
        Utils.showToast('Please select a role', 'warning');
        return;
      }
      if (!idNumberEl || !idNumberEl.value.trim()) {
        Utils.showToast('Please enter an ID number', 'warning');
        return;
      }
      if (!fullNameEl || !fullNameEl.value.trim()) {
        Utils.showToast('Please enter a full name', 'warning');
        return;
      }
      if (!emailEl || !emailEl.value.trim()) {
        Utils.showToast('Please enter an email address', 'warning');
        return;
      }
      if (!passwordEl || !passwordEl.value.trim()) {
        Utils.showToast('Please enter a password', 'warning');
        return;
      }

      const userData = {
        role: roleEl.value,
        idNumber: idNumberEl.value.trim(),
        fullName: fullNameEl.value.trim(),
        email: emailEl.value.trim(),
        password: passwordEl.value,
        departmentId: departmentEl?.value || null,
        course: courseEl?.value?.trim() || null,
        yearLevel: yearLevelEl?.value?.trim() || null,
        position: positionEl?.value?.trim() || null
      };

      // Show loading state
      const submitBtn = document.querySelector('#addUserForm button[type="submit"]');
      const originalText = submitBtn?.textContent;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';
      }

      try {
        await Utils.apiRequest('/super-admin/users', {
          method: 'POST',
          body: userData
        });
        
        Utils.showToast('User created successfully', 'success');
        
        // Close modal
        const addUserModal = document.getElementById('addUserModal');
        if (addUserModal) {
          addUserModal.classList.remove('active');
          addUserModal.classList.add('hidden');
        }
        
        // Reset form
        const addUserForm = document.getElementById('addUserForm');
        if (addUserForm) {
          addUserForm.reset();
          // Reset role-dependent fields visibility
          this.toggleUserFormFields();
        }
        
        // Reload users list
        await this.loadUsers();
      } finally {
        // Restore button state
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText || 'Create User';
        }
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      let errorMessage = 'Failed to create user. Please try again.';
      
      // Try to extract a meaningful error message
      if (error.message) {
        try {
          const parsed = JSON.parse(error.message);
          if (parsed && parsed.message) {
            errorMessage = parsed.message;
          } else if (typeof parsed === 'string') {
            errorMessage = parsed;
          }
        } catch (e) {
          // If not JSON, use the message directly
          if (error.message.includes('ID number already exists') || error.message.includes('duplicate')) {
            errorMessage = 'This ID number already exists. Please use a different ID number.';
          } else if (error.message.includes('email') && error.message.includes('exists')) {
            errorMessage = 'This email address is already in use. Please use a different email.';
          } else {
            errorMessage = error.message;
          }
        }
      }
      
      Utils.showToast(errorMessage, 'error');
    }
  }

  // Placeholder methods for user actions
  async editUser(userId) {
    Utils.showToast('Edit user feature coming soon', 'info');
  }

  async resetPassword(userId) {
    if (!confirm('Reset password for this user?')) return;
    try {
      await Utils.apiRequest(`/super-admin/users/${userId}/reset-password`, {
        method: 'POST'
      });
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
      await Utils.apiRequest(`/super-admin/users/${userId}/toggle-status`, {
        method: 'POST'
      });
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
      await Utils.apiRequest(`/departments/${deptId}`, {
        method: 'PUT',
        body: {
          name: newName.trim(),
          code: newCode.trim()
        }
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
      await Utils.apiRequest(`/super-admin/departments/${deptId}`, {
        method: 'DELETE'
      });
      Utils.showToast('Department deleted successfully', 'success');
      await this.loadDepartments();
    } catch (error) {
      Utils.showToast('Failed to delete department', 'error');
    }
  }

  async handleAddDepartment() {
    const name = prompt('Enter department name:');
    if (!name || name.trim() === '') return;

    const code = prompt('Enter department code (e.g., SCS, SBM):');
    if (!code || code.trim() === '') return;

    try {
      await Utils.apiRequest('/departments', {
        method: 'POST',
        body: {
          name: name.trim(),
          code: code.trim().toUpperCase()
        }
      });
      Utils.showToast('Department created successfully', 'success');
      await this.loadDepartments();
    } catch (error) {
      console.error('Failed to create department:', error);
      Utils.showToast('Failed to create department: ' + (error.message || 'Unknown error'), 'error');
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
      await Utils.apiRequest(`/super-admin/document-types/${docId}`, {
        method: 'PUT',
        body: {
          label: newLabel.trim(),
          value: newValue.trim(),
          requiresFaculty: requiresFaculty
        }
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
      await Utils.apiRequest(`/super-admin/document-types/${docId}`, {
        method: 'DELETE'
      });
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
          await Utils.apiRequest('/super-admin/users', {
            method: 'POST',
            body: user
          });
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

