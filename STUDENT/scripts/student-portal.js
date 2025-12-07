console.log('🎯 student-portal.js file loaded successfully!');

// Student Portal JavaScript
class StudentPortal {
  constructor() {
    this.currentUser = Utils.getCurrentUser();
    this.requests = [];
    this.selectedFiles = [];
    this.notifications = [];
    this.currentView = 'dashboard';
    this.departments = [];
    this.defaultDepartment = 'School of Computer Studies (SCS)';
    this.documentTypes = {};
    this.currentDocumentTypeRequest = null; // Track current request to cancel if needed

    // Pagination state
    this.currentPage = 1;
    this.itemsPerPage = 10;

    // Initialize modals
    this.profileModal = null;
    this.settingsModal = null;

    window.studentPortal = this;
    this.init();
  }

  get studentDepartmentName() {
    return this.currentUser.department || this.currentUser.departmentName || this.defaultDepartment;
  }

  get studentDepartmentId() {
    if (this.currentUser.departmentId) {
      return Number(this.currentUser.departmentId);
    }
    const match = this.departments.find((dept) => {
      if (!dept) return false;
      if (dept.id === this.currentUser.departmentId) return true;
      return dept.name === this.studentDepartmentName || dept.code === this.studentDepartmentName;
    });
    return match ? match.id : (this.departments[0]?.id || null);
  }

  async init() {
    console.log('🚀 StudentPortal init started');

    if (!Utils.requireAuth()) return;

    if (this.currentUser.role !== 'student') {
      Utils.showToast('Access denied. Student portal only.', 'error');
      Utils.clearCurrentUser();
      return;
    }

    try {
      await this.loadDepartmentsFromApi();
      this.loadUserInfo();
      this.setupEventListeners();
      this.initializeModals();

      try {
        console.log('📥 Loading requests...');
        await this.loadRequests();
        console.log('✅ Requests loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load requests:', error);
        Utils.showToast('Failed to load requests, but you can still submit new ones', 'warning');
      }

      // Load notifications
      try {
        await this.loadNotifications();
        // Set up polling for new notifications every 30 seconds
        setInterval(() => {
          this.loadNotifications().catch(err => console.error('Failed to refresh notifications:', err));
        }, 30000);
      } catch (error) {
        console.error('Failed to load notifications:', error);
        this.notifications = [];
      }

      this.updateStats();
      this.renderDashboard();
      this.renderHistory();
      this.renderNotifications();

      console.log('✅ StudentPortal initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize StudentPortal:', error);
      Utils.showToast('Failed to initialize portal. Some features may not work.', 'error');
    }
  }

  initializeModals() {
    // Modals are no longer used - Profile and Settings are now views
  }

  async loadDepartmentsFromApi() {
    if (this.departments.length > 0) return;
    try {
      const data = await Utils.apiRequest('/departments', {
        timeout: 30000 // 30 seconds timeout
      });
      if (Array.isArray(data) && data.length) {
        // Ensure all department IDs are numbers
        this.departments = data.map(dept => ({
          ...dept,
          id: typeof dept.id === 'number' ? dept.id : parseInt(dept.id, 10) || dept.id
        }));
      } else {
        throw new Error('No departments returned from API');
      }
    } catch (error) {
      console.warn('Failed to load departments from API', error);
      // Use fallback config, but convert IDs to numbers if possible
      const fallbackDepts = (window.RecoletosConfig && window.RecoletosConfig.departments) || [];
      this.departments = fallbackDepts.map((dept, index) => ({
        ...dept,
        id: typeof dept.id === 'number' ? dept.id : (parseInt(dept.id, 10) || index + 1),
        code: dept.id || dept.code || `DEPT-${index + 1}`
      }));
    }
    console.log('Loaded departments:', this.departments);
  }

  async loadDocumentTypes(departmentCode) {
    console.log('📚 loadDocumentTypes called for:', departmentCode);
    
    if (this.documentTypes[departmentCode]) {
      console.log('✅ Using cached document types for:', departmentCode);
      return this.documentTypes[departmentCode];
    }

    // First, get fallback config ready (we'll use this immediately)
    const fallbackDept = window.RecoletosConfig?.findDepartmentByName?.(departmentCode);
    const fallbackDocs = fallbackDept?.documents || [];
    console.log('📋 Fallback docs available:', fallbackDocs.length);

    // If we have fallback docs, format them now and RETURN THEM IMMEDIATELY.
    // This removes any waiting time for students while the database/API is down.
    let formattedFallback = [];
    if (fallbackDocs.length > 0) {
      formattedFallback = fallbackDocs.map(doc => ({
        id: doc.value,
        value: doc.value,
        name: doc.label || doc.value,
        requires_faculty: doc.requiresFaculty || false
      }));

      console.log('⚡ Using fallback document types ONLY (skipping API) for department:', departmentCode);
      this.documentTypes[departmentCode] = formattedFallback;
      return formattedFallback;
    }

    // If no fallback docs, try the API with a short timeout (5 seconds)
    try {
      console.log('🌐 Making API request to /requests/document-types/' + departmentCode);
      
      // Use Utils.apiRequest with timeout option (no need for Promise.race)
      const data = await Utils.apiRequest(`/requests/document-types/${departmentCode}`, {
        timeout: 5000 // 5 seconds timeout for document types
      });
      
      console.log('📥 API response received:', data);
      
      if (data && Array.isArray(data) && data.length > 0) {
        this.documentTypes[departmentCode] = data;
        console.log('✅ Cached', data.length, 'document types from API');
        return data;
      } else {
        // API returned empty array, use fallback
        console.warn('⚠️ API returned no document types, using fallback config');
        if (formattedFallback.length > 0) {
          this.documentTypes[departmentCode] = formattedFallback;
          console.log('✅ Using', formattedFallback.length, 'fallback document types');
          return formattedFallback;
        }
        console.warn('⚠️ No fallback docs available, returning empty array');
        return [];
      }
    } catch (error) {
      console.error('❌ Failed to load document types from API:', error);
      console.error('❌ Error details:', error.message);

      // No fallback docs available and API failed
      console.error('❌ No fallback available, showing error toast');
      Utils.showToast('Failed to load document types. Please try again.', 'error');
      return [];
    }
  }

  getDepartmentCode(departmentId) {
    const department = this.departments.find(dept => dept.id == departmentId);
    return department ? department.code : null;
  }

  loadUserInfo() {
    const userNameEl = document.getElementById('userName');
    const welcomeUserNameEl = document.getElementById('welcomeUserName');
    const welcomeHeaderEl = document.getElementById('welcomeHeader');

    const displayName = this.currentUser.fullName || this.currentUser.name || 'Student';
    if (userNameEl) userNameEl.textContent = displayName;
    if (welcomeUserNameEl) welcomeUserNameEl.textContent = displayName;

    const departmentFilter = document.getElementById('filterDepartment');
    if (departmentFilter) {
      departmentFilter.innerHTML = ['<option value="all">All Departments</option>'].concat(
        this.departments.map((dept) => `<option value="${dept.id}">${dept.name}</option>`)
      ).join('');
    }
  }

  async loadRequests() {
    try {
      console.log('📥 Loading requests for user ID:', this.currentUser.id, 'Type:', typeof this.currentUser.id);
      const allRequests = await Utils.apiRequest('/requests', {
        timeout: 30000 // 30 seconds timeout
      });
      console.log('📥 Received', allRequests.length, 'requests from server');
      
      // Server already filters by student_id, but double-check with type-safe comparison
      this.requests = allRequests.filter((r) => {
        const matches = Number(r.studentId) === Number(this.currentUser.id);
        if (!matches && allRequests.length > 0) {
          console.warn('⚠️ Request mismatch:', { 
            requestStudentId: r.studentId, 
            requestStudentIdType: typeof r.studentId,
            currentUserId: this.currentUser.id,
            currentUserIdType: typeof this.currentUser.id
          });
        }
        return matches;
      });
      
      console.log('✅ Filtered to', this.requests.length, 'requests for current user');
      this.updateStats();
      this.renderDashboard();
      this.renderHistory();
    } catch (error) {
      console.error('Failed to load requests:', error);
      Utils.showToast(error.message || 'Failed to load requests', 'error');
      throw error;
    }
  }

  updateStats() {
    const totalEl = document.getElementById('statTotal');
    const pendingEl = document.getElementById('statPending');
    const completedEl = document.getElementById('statCompleted');

    const total = this.requests.length;
    const pending = this.requests.filter((r) => ['pending', 'pending_faculty', 'in_progress'].includes(r.status)).length;
    const completed = this.requests.filter((r) => r.status === 'completed').length;

    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (completedEl) completedEl.textContent = completed;
  }

  renderDashboard() {
    // Render My Documents first for better UX
    this.renderMyDocuments();

    const container = document.getElementById('recentRequests');
    if (!container) return;

    // Recent requests (show empty state if none)
    if (!this.requests.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📄</div>
          <h3>No recent requests</h3>
          <p>Submit a request to see it here.</p>
        </div>
      `;
    } else {
      const recent = [...this.requests]
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
        .slice(0, 5)
        .map((request) => this.buildRequestRow(request, true))
        .join('');
      container.innerHTML = `<div class="request-list">${recent}</div>`;
    }
  }

  getStatusIcon(status) {
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

  getDocumentIcon(documentType) {
    const type = (documentType || '').toLowerCase();
    if (type.includes('transcript') || type.includes('record')) return 'fa-file-alt';
    if (type.includes('certificate')) return 'fa-certificate';
    if (type.includes('clearance')) return 'fa-shield-check';
    if (type.includes('moral')) return 'fa-shield-alt';
    if (type.includes('graduation')) return 'fa-graduation-cap';
    if (type.includes('recommendation')) return 'fa-envelope-open-text';
    return 'fa-file';
  }

  renderMyDocuments() {
    const container = document.getElementById('myDocuments');
    if (!container) return;
    const filterEl = document.getElementById('myDocsFilter');
    const searchEl = document.getElementById('myDocsSearch');
    const sortEl = document.getElementById('myDocsSort');
    const selectedStatus = filterEl ? filterEl.value : 'all';
    const searchTerm = searchEl ? (searchEl.value || '').toLowerCase().trim() : '';
    const sortBy = sortEl ? sortEl.value : 'date-desc';

    let filtered = [...this.requests];
    if (selectedStatus && selectedStatus !== 'all') {
      filtered = filtered.filter((r) => r.status === selectedStatus);
    }
    if (searchTerm) {
      filtered = filtered.filter((r) => {
        const doc = (r.documentType || r.document_value || '') + ' ' + (r.department || '');
        return doc.toLowerCase().includes(searchTerm);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.submittedAt) - new Date(a.submittedAt);
        case 'date-asc':
          return new Date(a.submittedAt) - new Date(b.submittedAt);
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        case 'department':
          return (a.department || '').localeCompare(b.department || '');
        case 'document':
          return (a.documentType || '').localeCompare(b.documentType || '');
        default:
          return new Date(b.submittedAt) - new Date(a.submittedAt);
      }
    });

    if (!filtered.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📁</div>
          <h3>No documents match your criteria</h3>
          <p>Try changing the filter or search term.</p>
        </div>
      `;
      return;
    }

    // Pagination
    const totalPages = Math.ceil(filtered.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedData = filtered.slice(startIndex, endIndex);

    const rows = paginatedData.map((req) => {
      const statusClass = Utils.getStatusBadgeClass(req.status);
      const statusText = Utils.getStatusText(req.status);
      const statusIcon = this.getStatusIcon(req.status);
      const submitted = Utils.formatDate(req.submittedAt);
      const docIcon = this.getDocumentIcon(req.documentType);
      const docName = req.documentType || req.documentValue || 'Document';

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center;">
              <i class="fas ${docIcon} document-icon file" style="margin-right: 0.75rem; color: var(--recoletos-green);"></i>
              ${docName}
            </div>
          </td>
          <td>${req.department || this.studentDepartmentName}</td>
          <td>${submitted}</td>
          <td>
            <span class="status-badge ${statusClass}">
              <i class="fas ${statusIcon}"></i>
              ${statusText}
            </span>
          </td>
          <td>
            <button class="btn-secondary" onclick="studentPortal.viewRequest(${req.id})">
              <i class="fas fa-eye"></i> View
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Pagination controls
    const paginationHTML = this.renderPagination(filtered.length, totalPages);

    container.innerHTML = `
      <div class="table-wrapper">
        <table class="requests-table">
          <thead>
            <tr>
              <th>Document Name</th>
              <th>Department</th>
              <th>Date Submitted</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${paginationHTML}
    `;
  }

  renderPagination(totalItems, totalPages) {
    if (totalPages <= 1) return '';

    const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
    const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);

    let paginationControls = '';

    // Previous button
    paginationControls += `
      <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} 
        onclick="studentPortal.goToPage(${this.currentPage - 1})">
        <i class="fas fa-chevron-left"></i> Previous
      </button>
    `;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
        paginationControls += `
          <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
            onclick="studentPortal.goToPage(${i})">${i}</button>
        `;
      } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
        paginationControls += `<span class="pagination-btn" style="cursor: default; opacity: 0.5;">...</span>`;
      }
    }

    // Next button
    paginationControls += `
      <button class="pagination-btn" ${this.currentPage === totalPages ? 'disabled' : ''} 
        onclick="studentPortal.goToPage(${this.currentPage + 1})">
        Next <i class="fas fa-chevron-right"></i>
      </button>
    `;

    return `
      <div class="pagination">
        <div class="pagination-info">
          Showing ${startItem}-${endItem} of ${totalItems} entries
        </div>
        <div class="pagination-controls">
          ${paginationControls}
        </div>
      </div>
    `;
  }

  goToPage(page) {
    const totalPages = Math.ceil(
      (this.getFilteredRequests().length || this.requests.length) / this.itemsPerPage
    );
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
      this.renderMyDocuments();
      // Scroll to top of table
      const container = document.getElementById('myDocuments');
      if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  getFilteredRequests() {
    const filterEl = document.getElementById('myDocsFilter');
    const searchEl = document.getElementById('myDocsSearch');
    const selectedStatus = filterEl ? filterEl.value : 'all';
    const searchTerm = searchEl ? (searchEl.value || '').toLowerCase().trim() : '';

    let filtered = [...this.requests];
    if (selectedStatus && selectedStatus !== 'all') {
      filtered = filtered.filter((r) => r.status === selectedStatus);
    }
    if (searchTerm) {
      filtered = filtered.filter((r) => {
        const doc = (r.documentType || r.document_value || '') + ' ' + (r.department || '');
        return doc.toLowerCase().includes(searchTerm);
      });
    }
    return filtered;
  }

  renderHistory() {
    const container = document.getElementById('historyRequests');
    if (!container) return;

    const departmentFilter = document.getElementById('filterDepartment');
    const statusFilter = document.getElementById('filterStatusHistory');
    const selectedDept = departmentFilter ? departmentFilter.value : 'all';
    const selectedStatus = statusFilter ? statusFilter.value : 'all';

    let filtered = [...this.requests];
    if (selectedDept !== 'all') {
      const deptIdFilter = parseInt(selectedDept, 10);
      filtered = filtered.filter((req) => {
        if (!Number.isNaN(deptIdFilter) && req.departmentId) {
          return Number(req.departmentId) === deptIdFilter;
        }
        return req.department === this.getDepartmentName(selectedDept);
      });
    }
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((req) => req.status === selectedStatus);
    }

    if (!filtered.length) {
      container.innerHTML = `
        <div class="table-wrapper">
          <table class="requests-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Type of Document</th>
                <th>Time and Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="5" style="text-align: center; padding: 2rem;">
                  <div class="empty-state">
                    <div class="empty-state-icon">📄</div>
                    <h3>No requests found</h3>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
      return;
    }

    // Render as table
    const rows = filtered
      .sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt))
      .map((request) => {
        const statusClass = Utils.getStatusBadgeClass(request.status);
        const statusText = Utils.getStatusText(request.status);
        const statusIcon = this.getStatusIcon(request.status);
        const dateTime = Utils.formatDate(request.submittedAt || request.createdAt);
        const department = request.department || this.studentDepartmentName;
        const documentType = request.documentType || request.documentValue || 'Document';

        return `
          <tr>
            <td>${department}</td>
            <td>${documentType}</td>
            <td>${dateTime}</td>
            <td>
              <span class="status-badge ${statusClass}">
                <i class="fas ${statusIcon}"></i>
                ${statusText}
              </span>
            </td>
            <td>
              <button class="btn-secondary" onclick="studentPortal.viewRequest(${request.id})">
                <i class="fas fa-eye"></i> View
              </button>
            </td>
          </tr>
        `;
      }).join('');

    container.innerHTML = `
      <div class="table-wrapper">
        <table class="requests-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Type of Document</th>
              <th>Time and Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  buildRequestRow(request, compact = false) {
    const statusClass = Utils.getStatusBadgeClass(request.status);
    const statusText = Utils.getStatusText(request.status);
    const statusIcon = this.getStatusIcon(request.status);
    const submittedDate = Utils.formatDate(request.submittedAt);
    const docIcon = this.getDocumentIcon(request.documentType);
    return `
      <div class="request-item${compact ? ' compact' : ''}">
        <div class="request-header">
          <div class="request-info">
            <h3>
              <i class="fas ${docIcon}" style="margin-right: 0.5rem; color: var(--recoletos-green);"></i>
              ${request.documentType}
            </h3>
            <div class="request-meta">
              <span><strong>Department:</strong> ${request.department || this.studentDepartmentName}</span>
              <span><strong>Submitted:</strong> ${submittedDate}</span>
            </div>
          </div>
          <div class="request-actions">
            <span class="status-badge ${statusClass}">
              <i class="fas ${statusIcon}"></i>
              ${statusText}
            </span>
            <button class="btn-secondary" onclick="studentPortal.viewRequest(${request.id})">
              <i class="fas fa-eye"></i> View
            </button>
          </div>
        </div>
      </div>
    `;
  }

  buildHistoryRow(request) {
    const statusClass = Utils.getStatusBadgeClass(request.status);
    const statusText = Utils.getStatusText(request.status);
    return `
      <tr>
        <td>${request.documentType}</td>
        <td>${request.department || this.studentDepartmentName}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>${Utils.formatDate(request.submittedAt)}</td>
        <td>${Utils.formatDate(request.updatedAt)}</td>
        <td><button class="btn-secondary" onclick="studentPortal.viewRequest(${request.id})">Details</button></td>
      </tr>
    `;
  }

  setupEventListeners() {
    // New Request button removed from content section - using header button only
    const newRequestBtnHeader = document.getElementById('newRequestBtnHeader');
    if (newRequestBtnHeader) {
      newRequestBtnHeader.addEventListener('click', () => this.showNewRequestModal());
    }

    // Manage button removed - it was not useful

    const myDocsFilter = document.getElementById('myDocsFilter');
    if (myDocsFilter) {
      myDocsFilter.addEventListener('change', () => {
        this.currentPage = 1; // Reset to first page on filter change
        this.renderMyDocuments();
      });
    }
    const myDocsSearch = document.getElementById('myDocsSearch');
    if (myDocsSearch) {
      myDocsSearch.addEventListener('input', () => {
        this.currentPage = 1; // Reset to first page on search
        this.renderMyDocuments();
      });
    }
    const myDocsSort = document.getElementById('myDocsSort');
    if (myDocsSort) {
      myDocsSort.addEventListener('change', () => {
        this.currentPage = 1; // Reset to first page on sort change
        this.renderMyDocuments();
      });
    }

    this.setupModalEventListeners();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) Utils.clearCurrentUser();
      });
    }

    document.querySelectorAll('.sidebar-link').forEach((btn) => {
      btn.addEventListener('click', () => this.switchView(btn.dataset.view));
    });

    const departmentFilter = document.getElementById('filterDepartment');
    const statusFilter = document.getElementById('filterStatusHistory');
    if (departmentFilter) departmentFilter.addEventListener('change', () => this.renderHistory());
    if (statusFilter) statusFilter.addEventListener('change', () => this.renderHistory());

    // Profile and Settings are now handled by switchView via data-view attribute

    // Floating button
    const floatingBtn = document.getElementById('floatingNewRequestBtn');
    if (floatingBtn) {
      floatingBtn.addEventListener('click', () => this.showNewRequestModal());
    }

    // Header new request button - event listener already set up above

    const bell = document.getElementById('notificationBell');
    if (bell) {
      bell.addEventListener('click', () => {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) dropdown.classList.toggle('hidden');
      });
    }

    const markAllRead = document.getElementById('markAllRead');
    const markAllReadSecondary = document.getElementById('markAllReadSecondary');
    if (markAllRead) markAllRead.addEventListener('click', () => this.markAllNotificationsRead());
    if (markAllReadSecondary) markAllReadSecondary.addEventListener('click', () => this.markAllNotificationsRead());

    document.addEventListener('click', (event) => {
      const dropdown = document.getElementById('notificationDropdown');
      const bellWrapper = document.getElementById('notificationBell');
      if (!dropdown || !bellWrapper) return;
      if (!bellWrapper.contains(event.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }

  setupModalEventListeners() {
    const modal = document.getElementById('requestModal');
    const closeModalBtn = document.getElementById('closeModal');
    const cancelRequestBtn = document.getElementById('cancelRequest');
    const documentRequestForm = document.getElementById('documentRequestForm');

    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => this.closeRequestModal());
    }

    if (cancelRequestBtn) {
      cancelRequestBtn.addEventListener('click', () => this.closeRequestModal());
    }

    if (documentRequestForm) {
      // Remove existing listener by cloning form
      const newForm = documentRequestForm.cloneNode(true);
      documentRequestForm.parentNode.replaceChild(newForm, documentRequestForm);

      newForm.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('📝 Form submit event triggered');
        this.submitNewRequest();
      }, true); // Use capture phase

      // Also add click handler to submit button as backup
      const submitBtn = document.getElementById('submitRequestBtn');
      if (submitBtn) {
        const newBtn = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newBtn, submitBtn);

        newBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🔔 Submit button clicked');
          const form = document.getElementById('documentRequestForm');
          if (form) {
            this.submitNewRequest();
          }
        }, true);
      }
    }

    const departmentSelect = document.getElementById('department');
    if (departmentSelect) {
      departmentSelect.addEventListener('change', async (e) => {
        const selectedValue = e.target.value;
        const selectedText = e.target.options[e.target.selectedIndex]?.text || '';
        console.log('🏢 Department changed:', { value: selectedValue, text: selectedText });

        // Use the department code (value) to load document types
        if (selectedValue) {
          try {
            console.log('🔄 Calling updateDocumentTypes from department change handler...');
            await this.updateDocumentTypes(selectedValue);
            console.log('✅ updateDocumentTypes completed from department change handler');
          } catch (err) {
            console.error('❌ Failed to update document types on department change:', err);
            // Even on error, make sure select is enabled
            const documentTypeSelect = document.getElementById('documentType');
            if (documentTypeSelect) {
              documentTypeSelect.disabled = false;
              documentTypeSelect.removeAttribute('disabled');
              documentTypeSelect.style.pointerEvents = 'auto';
            }
          }
        } else {
          // Reset document types if no department selected
          console.log('⚠️ No department selected, resetting documentType');
          const documentTypeSelect = document.getElementById('documentType');
          if (documentTypeSelect) {
            documentTypeSelect.innerHTML = '<option value="">Select Department First</option>';
            documentTypeSelect.disabled = true;
            documentTypeSelect.style.pointerEvents = '';
          }
        }
      });
    }

    const documentTypeSelect = document.getElementById('documentType');
    if (documentTypeSelect) {
      documentTypeSelect.addEventListener('change', () => this.evaluateAttachmentRequirement());
    }

    const purposeInput = document.getElementById('purpose');
    if (purposeInput) {
      purposeInput.addEventListener('input', () => this.evaluateAttachmentRequirement());
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeRequestModal();
        }
      });
    }

    this.setupFileUpload();
  }

  showNewRequestModal() {
    const modal = document.getElementById('requestModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      this.resetRequestForm();
      this.autoFillUserInfo();

      // After form reset, check if department has a value and load document types
      const departmentSelect = document.getElementById('department');
      if (departmentSelect && departmentSelect.value) {
        console.log('🔄 Modal opened with department already selected:', departmentSelect.value);
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          this.updateDocumentTypes(departmentSelect.value).catch(err => {
            console.error('❌ Error loading document types on modal open:', err);
          });
        }, 50);
      }
      // ensure attachment visibility/requirement is evaluated on open
      setTimeout(() => this.evaluateAttachmentRequirement(), 100);
    }
  }

  closeRequestModal() {
    const modal = document.getElementById('requestModal');
    if (modal) {
      modal.classList.remove('active');
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  resetRequestForm() {
    const form = document.getElementById('documentRequestForm');
    if (form) {
      form.reset();
    }

    const documentTypeSelect = document.getElementById('documentType');
    if (documentTypeSelect) {
      documentTypeSelect.innerHTML = '<option value="">Select Department First</option>';
      documentTypeSelect.disabled = true;
      documentTypeSelect.style.pointerEvents = '';
      // Extra safety: ensure disabled attribute is in a known state
      documentTypeSelect.setAttribute('disabled', 'disabled');
    }

    const documentTypeLoading = document.getElementById('documentTypeLoading');
    if (documentTypeLoading) {
      documentTypeLoading.classList.add('hidden');
    }

    this.selectedFiles = [];
    this.renderPreviews();

    // hide other-document input and attachments required indicator
    const otherGroup = document.getElementById('otherDocumentGroup');
    if (otherGroup) otherGroup.classList.add('hidden');
    const uploadArea = document.getElementById('fileUploadArea');
    if (uploadArea) uploadArea.removeAttribute('data-required');
  }

  autoFillUserInfo() {
    // No longer auto-filling personal info fields; user must enter them manually.
  }

  ensureSelectEnabled(documentTypeSelect, loadingElement) {
    if (!documentTypeSelect) return;
    
    // Always make the select clickable - NO MATTER WHAT
    console.log('🔓 Ensuring documentType select is enabled');
    
    try {
      documentTypeSelect.disabled = false;
      documentTypeSelect.removeAttribute('disabled');
      documentTypeSelect.style.pointerEvents = 'auto';
      documentTypeSelect.style.cursor = 'pointer';
      documentTypeSelect.style.opacity = '1';
      
      // Double-check it's actually enabled
      if (documentTypeSelect.disabled) {
        console.warn('⚠️ Select still disabled after enabling, forcing again...');
        documentTypeSelect.disabled = false;
        documentTypeSelect.removeAttribute('disabled');
      }
      
      if (loadingElement) loadingElement.classList.add('hidden');
      
      console.log('✅ documentType select enabled. disabled attribute:', documentTypeSelect.hasAttribute('disabled'), 'disabled property:', documentTypeSelect.disabled);
    } catch (e) {
      console.error('❌ Error enabling select:', e);
      // Last resort - try one more time
      setTimeout(() => {
        if (documentTypeSelect) {
          documentTypeSelect.disabled = false;
          documentTypeSelect.removeAttribute('disabled');
          documentTypeSelect.style.pointerEvents = 'auto';
        }
      }, 100);
    }
  }

  async updateDocumentTypes(departmentCode) {
    console.log('🔄 updateDocumentTypes called with departmentCode:', departmentCode);
    
    // Cancel any pending request
    if (this.currentDocumentTypeRequest) {
      console.log('⚠️ Cancelling previous document type request');
      // Note: We can't actually cancel fetch, but we can ignore its result
    }
    
    const documentTypeSelect = document.getElementById('documentType');
    const loadingElement = document.getElementById('documentTypeLoading');

    if (!documentTypeSelect) {
      console.error('❌ documentTypeSelect element not found!');
      return;
    }

    console.log('📝 Resetting documentType select...');
    // Reset state before loading (but don't permanently disable)
    documentTypeSelect.innerHTML = '<option value="">Select Document Type</option>';
    documentTypeSelect.disabled = true; // Temporarily disable while loading

    if (!departmentCode) {
      console.log('⚠️ No departmentCode provided, disabling select');
      documentTypeSelect.innerHTML = '<option value="">Select Department First</option>';
      documentTypeSelect.disabled = true;
      documentTypeSelect.style.pointerEvents = '';
      documentTypeSelect.setAttribute('disabled', 'disabled');
      this.currentDocumentTypeRequest = null;
      return;
    }

    if (loadingElement) {
      loadingElement.classList.remove('hidden');
      console.log('⏳ Showing loading indicator');
    }

    // Create a request identifier to track this specific request
    const requestId = Date.now();
    this.currentDocumentTypeRequest = requestId;

    try {
      console.log('📡 Calling loadDocumentTypes for:', departmentCode);
      const documentTypesPromise = this.loadDocumentTypes(departmentCode);
      const documentTypes = await documentTypesPromise;
      
      // Check if this request is still current (user hasn't changed department)
      if (this.currentDocumentTypeRequest !== requestId) {
        console.log('⚠️ Request outdated, ignoring result');
        // Still ensure select is enabled even if request is outdated
        this.ensureSelectEnabled(documentTypeSelect, loadingElement);
        return;
      }
      
      console.log('✅ Loaded document types for department', departmentCode, ':', documentTypes);

      if (Array.isArray(documentTypes) && documentTypes.length > 0) {
        // Normal happy-path: we have document types from API or config
        console.log('✅ Populating', documentTypes.length, 'document types');
        documentTypeSelect.innerHTML =
          '<option value="">Select Document Type</option>' +
          documentTypes
            .map(
              (doc) => `
                <option value="${doc.value}" data-requires-faculty="${doc.requires_faculty}" data-requires-attachment="${doc.requires_attachment || false}">
                  ${doc.name || doc.label}
                </option>
              `
            )
            .join('') +
          '<option value="others">Others</option>';
      } else {
        // Defensive fallback: still allow user interaction even if nothing came back
        console.warn('⚠️ No document types returned for department', departmentCode);
        documentTypeSelect.innerHTML =
          '<option value="">No document types configured – please select "Others" and specify</option>' +
          '<option value="others">Others</option>';
      }
    } catch (error) {
      // Check if this request is still current
      if (this.currentDocumentTypeRequest !== requestId) {
        console.log('⚠️ Request outdated, ignoring error');
        // Still ensure select is enabled even if request is outdated
        this.ensureSelectEnabled(documentTypeSelect, loadingElement);
        return;
      }
      console.error('❌ Error populating document options:', error);
      documentTypeSelect.innerHTML = '<option value="">Error loading document types</option>';
    } finally {
      // Always ensure select is enabled, even if request is outdated
      // This prevents the select from staying disabled when requests are cancelled
      if (this.currentDocumentTypeRequest === requestId) {
        // This is the current request - enable and clear request ID
        this.ensureSelectEnabled(documentTypeSelect, loadingElement);
        this.currentDocumentTypeRequest = null;
      } else {
        // Request is outdated, but still ensure select is enabled
        console.log('⚠️ Request outdated, but ensuring select is enabled anyway');
        this.ensureSelectEnabled(documentTypeSelect, loadingElement);
      }
    }
  }

  evaluateAttachmentRequirement() {
    const documentTypeSelect = document.getElementById('documentType');
    const otherGroup = document.getElementById('otherDocumentGroup');
    const uploadArea = document.getElementById('fileUploadArea');
    const purposeInput = document.getElementById('purpose');

    let requiresAttachment = false;
    let showOther = false;

    if (documentTypeSelect) {
      const selected = documentTypeSelect.options[documentTypeSelect.selectedIndex];
      const text = selected ? (selected.text || '').toLowerCase() : '';
      const dataRequires = selected ? selected.getAttribute('data-requires-attachment') : null;
      if (dataRequires === 'true') requiresAttachment = true;
      if (text.includes('id replacement') || text.includes('id replacement'.toLowerCase())) requiresAttachment = true;
      if ((selected && selected.value === 'others') || text === 'others') showOther = true;
    }

    if (purposeInput) {
      const p = (purposeInput.value || '').toLowerCase();
      if (p.includes('others') || p.trim() === 'other' || p.trim() === 'others') {
        requiresAttachment = true;
      }
    }

    if (otherGroup) otherGroup.classList.toggle('hidden', !showOther);
    if (uploadArea) {
      if (requiresAttachment) {
        uploadArea.setAttribute('data-required', 'true');
      } else {
        uploadArea.removeAttribute('data-required');
      }
    }
  }

  setupFileUpload() {
    const fileInput = document.getElementById('attachments');
    const addBtn = document.getElementById('addAttachmentBtn');
    if (!fileInput || !addBtn) return;
    addBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      this.handleFileSelect(e.target.files);
    });
  }

  switchView(view) {
    this.currentView = view;
    document.querySelectorAll('.sidebar-link').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    const views = {
      dashboard: document.getElementById('dashboardView'),
      history: document.getElementById('historyView'),
      notifications: document.getElementById('notificationsView'),
      profile: document.getElementById('profileView'),
      settings: document.getElementById('settingsView')
    };

    Object.entries(views).forEach(([key, el]) => {
      if (!el) return;
      if (key === view) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });

    // Render view-specific content
    if (view === 'profile') {
      this.renderProfile();
    } else if (view === 'settings') {
      this.renderSettings();
    }
  }

  handleFileSelect(files) {
    const fileArray = Array.from(files || []);
    const uploadError = document.getElementById('uploadError');
    if (uploadError) uploadError.style.display = 'none';

    const combined = [...this.selectedFiles, ...fileArray];
    if (combined.length > 3) {
      if (uploadError) {
        uploadError.textContent = 'Maximum of 3 files allowed.';
        uploadError.style.display = 'block';
      }
      return;
    }

    const validFiles = [];
    for (const file of fileArray) {
      if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
        if (uploadError) {
          uploadError.textContent = 'Invalid file format. Only JPG, PNG, and PDF are allowed.';
          uploadError.style.display = 'block';
        }
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        if (uploadError) {
          uploadError.textContent = 'File too large. Max size is 5MB per file.';
          uploadError.style.display = 'block';
        }
        continue;
      }
      validFiles.push(file);
    }

    const slotsLeft = Math.max(0, 3 - this.selectedFiles.length);
    this.selectedFiles = this.selectedFiles.concat(validFiles.slice(0, slotsLeft));
    this.renderPreviews();
  }

  renderPreviews() {
    const previewContainer = document.getElementById('file-preview');
    if (!previewContainer) return;

    if (this.selectedFiles.length === 0) {
      previewContainer.innerHTML = '';
      return;
    }

    previewContainer.innerHTML = this.selectedFiles.map((file, idx) => {
      const url = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
      const isPDF = file.type === 'application/pdf';

      return `
        <div class="file-preview-item">
          <div class="file-preview-info">
            ${isPDF ?
          '<div class="file-preview-icon">📄</div>' :
          `<img src="${url}" alt="preview" class="file-preview-image" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;" />`
        }
            <span class="file-preview-name">${file.name}</span>
          </div>
          <button type="button" class="file-preview-remove" onclick="studentPortal.removeSelectedFile(${idx})">
            &times;
          </button>
        </div>
      `;
    }).join('');
  }

  removeSelectedFile(index) {
    this.selectedFiles.splice(index, 1);
    this.renderPreviews();
  }

  async uploadSelectedFiles() {
    if (this.selectedFiles.length === 0) return [];
    
    const formData = new FormData();
    formData.append('studentId', this.currentUser.id);
    this.selectedFiles.forEach((file) => formData.append('files', file));

    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
      
      const response = await fetch(`${window.location.origin}/api/uploads`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Upload failed');
      }
      
      const data = await response.json();
      return data.attachments || [];
    } catch (error) {
      console.error('File upload error:', error);
      
      // Handle timeout specifically
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        console.warn('File upload timed out - continuing without attachments');
      } else {
        console.warn('File upload failed - continuing without attachments:', error.message);
      }
      
      // Don't throw - allow request to continue without attachments if upload fails
      return [];
    }
  }

  getDepartmentName(id) {
    const department = this.departments.find((dept) => dept.id === id);
    return department ? department.name : id;
  }

  async submitNewRequest() {
    const form = document.getElementById('documentRequestForm');
    if (!form) return;
    // Validate required personal info fields
    const fullName = form.querySelector('[name="fullName"]').value.trim();
    const idNumber = form.querySelector('[name="idNumber"]').value.trim();
    const course = form.querySelector('[name="course"]').value.trim();
    const yearLevel = form.querySelector('[name="yearLevel"]').value.trim();
    const email = form.querySelector('[name="studentEmail"]').value.trim();
    if (!fullName || !idNumber || !course || !yearLevel || !email) {
      Utils.showToast('Please ensure your personal information is filled.', 'warning');
      return;
    }

    const formData = new FormData(form);
    const departmentCode = formData.get('department');
    const documentValue = formData.get('documentType');

    if (!departmentCode || !documentValue) {
      Utils.showToast('Please select both department and document type.', 'warning');
      return;
    }

    const documentSelect = document.getElementById('documentType');
    const selectedOption = documentSelect?.options[documentSelect.selectedIndex];
    const requiresFaculty = selectedOption ? selectedOption.getAttribute('data-requires-faculty') === 'true' : true;

    // Find department by code or name
    let department = this.departments.find(dept => dept.code === departmentCode);
    if (!department) {
      // Try finding by name if code doesn't match
      department = this.departments.find(dept =>
        dept.name && dept.name.toLowerCase().includes(departmentCode.toLowerCase())
      );
    }

    if (!department) {
      console.error('Department not found:', departmentCode, 'Available departments:', this.departments);
      Utils.showToast('Invalid department selected. Please refresh the page and try again.', 'error');
      return;
    }

    // Ensure departmentId is a number
    let departmentId = department.id;
    if (typeof departmentId !== 'number') {
      departmentId = parseInt(departmentId, 10);
      if (isNaN(departmentId)) {
        console.error('Invalid department ID:', department);
        Utils.showToast('Invalid department ID. Please refresh the page and try again.', 'error');
        return;
      }
    }

    const quantity = parseInt(formData.get('quantity'), 10) || 1;
    if (isNaN(quantity) || quantity < 1 || quantity > 10) {
      Utils.showToast('Number of copies must be between 1 and 10.', 'warning');
      return;
    }

    const requestData = {
      departmentId: departmentId,
      documentValue: documentValue,
      documentType: selectedOption ? selectedOption.text : documentValue,
      quantity: quantity,
      purpose: formData.get('purpose') || '',
      contactNumber: formData.get('contactNumber') || '',
      additionalNotes: formData.get('additionalNotes') || '',
      crossDepartment: departmentId != this.studentDepartmentId,
      requiresFaculty: requiresFaculty
    };

    console.log('Submitting request with data:', { ...requestData, attachments: '[...]' });

    // check attachment requirement
    const uploadArea = document.getElementById('fileUploadArea');
    const attachmentsRequired = uploadArea && uploadArea.getAttribute('data-required') === 'true';
    if (attachmentsRequired && this.selectedFiles.length === 0) {
      Utils.showToast('This document type requires supporting documents. Please attach files.', 'warning');
      return;
    }

    try {
      const submitBtn = document.getElementById('submitRequestBtn');
      const btnText = submitBtn.querySelector('.btn-text');
      const btnLoading = submitBtn.querySelector('.btn-loading');

      submitBtn.disabled = true;
      btnText.classList.add('hidden');
      btnLoading.classList.remove('hidden');

      console.log('📤 Uploading files...');
      const attachments = await this.uploadSelectedFiles();
      requestData.attachments = attachments;
      console.log('✅ Files uploaded:', attachments.length);

      console.log('📤 Submitting request to API...');
      console.log('📤 Request data:', JSON.stringify(requestData, null, 2));
      
      // Use Utils.apiRequest with timeout option (no need for Promise.race - apiRequest handles timeout)
      const newRequest = await Utils.apiRequest('/requests', {
        method: 'POST',
        body: requestData,
        timeout: 30000 // 30 seconds timeout
      });
      console.log('✅ Request submitted successfully:', newRequest);
      console.log('📋 New request details:', {
        id: newRequest.id,
        studentId: newRequest.studentId,
        studentIdType: typeof newRequest.studentId,
        currentUserId: this.currentUser.id,
        currentUserIdType: typeof this.currentUser.id,
        status: newRequest.status,
        documentType: newRequest.documentType
      });

      // Close modal first for better UX
      this.closeRequestModal();
      
      // Clear form
      this.selectedFiles = [];
      const form = document.getElementById('documentRequestForm');
      if (form) form.reset();

      Utils.showToast('Request submitted successfully!', 'success');

      // Refresh dashboard immediately
      console.log('🔄 Refreshing dashboard...');
      console.log('🔄 Current requests count before refresh:', this.requests.length);
      try {
        await this.loadRequests();
        console.log('🔄 Requests count after refresh:', this.requests.length);
        this.updateStats();
        this.renderDashboard();
        this.renderHistory();
        console.log('✅ Dashboard refreshed successfully');
        
        // Scroll to top of dashboard to show new request
        const dashboardView = document.getElementById('dashboardView');
        if (dashboardView) {
          dashboardView.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch (refreshError) {
        console.error('❌ Error refreshing dashboard:', refreshError);
        console.error('❌ Refresh error details:', refreshError.message);
        // Still show success message even if refresh fails
        Utils.showToast('Request submitted, but failed to refresh dashboard. Please reload the page.', 'warning');
      }
    } catch (error) {
      console.error('Submit request error:', error);

      // Parse error message to show user-friendly message
      let errorMessage = 'Failed to submit request. Please try again.';
      
      if (error.message) {
        // Try to parse as JSON first
        try {
          const parsed = JSON.parse(error.message);
          if (parsed && parsed.message) {
            errorMessage = parsed.message;
          } else if (typeof parsed === 'string') {
            errorMessage = parsed;
          }
        } catch (e) {
          // If error.message is not JSON, use it directly
          errorMessage = error.message;
        }
      }

      Utils.showToast(errorMessage, 'error');

      const submitBtn = document.getElementById('submitRequestBtn');
      if (submitBtn) {
        submitBtn.disabled = false;
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        if (btnText) btnText.classList.remove('hidden');
        if (btnLoading) btnLoading.classList.add('hidden');
      }
    }
  }

  async loadNotifications() {
    try {
      const notifications = await Utils.apiRequest('/notifications', {
        timeout: 10000
      });
      
      // Filter notifications for current user
      this.notifications = notifications.filter(notif => {
        // Include notifications for this student
        const userId = notif.user_id || notif.userId;
        return Number(userId) === Number(this.currentUser.id);
      });

      // Sort by date (newest first)
      this.notifications.sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt || 0);
        const dateB = new Date(b.created_at || b.createdAt || 0);
        return dateB - dateA;
      });
      
      this.renderNotifications();
      return this.notifications;
    } catch (error) {
      console.error('Failed to load notifications:', error);
      this.notifications = [];
      return [];
    }
  }

  async markAllNotificationsRead() {
    const unread = this.notifications.filter((notif) => !(notif.read_flag || notif.read || notif.read_at));
    for (const notification of unread) {
      try {
        await Utils.apiRequest(`/notifications/${notification.id}`, {
          method: 'PATCH',
          body: { read: true, read_flag: true }
        });
        notification.read = true;
        notification.read_flag = true;
        notification.read_at = new Date().toISOString();
      } catch (error) {
        console.error(`Failed to mark notification ${notification.id} as read:`, error);
      }
    }
    this.renderNotifications();
  }

  async toggleNotificationRead(notificationId, read) {
    try {
      await Utils.apiRequest(`/notifications/${notificationId}`, {
        method: 'PATCH',
        body: { read }
      });
      const notification = this.notifications.find((n) => n.id === notificationId);
      if (notification) notification.read = read;
      this.renderNotifications();
    } catch (error) {
      console.error(`Failed to toggle notification ${notificationId}:`, error);
    }
  }

  renderNotifications() {
    const dropdownList = document.getElementById('notificationList');
    const fullList = document.getElementById('notificationsFullList');
    const countBadge = document.getElementById('notificationCount');

    const unreadCount = this.notifications.filter((n) => !(n.read_flag || n.read || n.read_at)).length;
    if (countBadge) {
      countBadge.textContent = unreadCount;
      countBadge.classList.toggle('hidden', unreadCount === 0);
    }

    const buildNotificationItem = (notif, isDropdown = false) => {
      const isRead = notif.read_flag || notif.read || notif.read_at;
      const title = notif.title || notif.subject || 'Notification';
      const message = notif.message || notif.content || notif.body || '';
      const createdAt = notif.created_at || notif.createdAt || notif.timestamp;
      const type = notif.type || 'general';
      const requestId = notif.request_id || notif.requestId;
      
      // Handle feedback/comments from faculty/admin
      let notificationContent = message;
      if (type === 'comment' || type === 'feedback' || message.includes('sent a comment')) {
        // Message already formatted by server
        notificationContent = message;
      }

      const clickHandler = isDropdown ? '' : `onclick="studentPortal.handleNotificationClick(${notif.id}, ${requestId || 'null'})"`;
      
      return `
        <div class="notification-item ${isRead ? '' : 'unread'}" ${clickHandler} style="cursor: ${isDropdown ? 'default' : 'pointer'};">
          <div class="notification-header">
            <h4>${title}</h4>
            ${!isRead ? '<span class="notification-dot"></span>' : ''}
          </div>
          <p>${notificationContent}</p>
          <time>${Utils.formatRelativeTime(createdAt)}</time>
        </div>
      `;
    };

    if (dropdownList) {
      dropdownList.innerHTML = this.notifications.length
        ? this.notifications.slice(0, 5).map(n => buildNotificationItem(n, true)).join('')
        : '<p style="text-align:center; opacity:0.6; padding: 1rem;">No notifications</p>';
    }

    if (fullList) {
      fullList.innerHTML = this.notifications.length
        ? `<div class="notification-center">${this.notifications.map(n => buildNotificationItem(n, false)).join('')}</div>`
        : '<div class="empty-state"><div class="empty-state-icon">🔔</div><h3>No notifications yet</h3><p>You will receive notifications when faculty or admin send feedback on your requests.</p></div>';
    }
  }

  async handleNotificationClick(notificationId, requestId) {
    // Mark as read
    try {
      await Utils.apiRequest(`/notifications/${notificationId}`, {
        method: 'PATCH',
        body: { read: true, read_flag: true }
      });
      
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        notification.read_flag = true;
        notification.read_at = new Date().toISOString();
      }
      this.renderNotifications();

      // If notification is related to a request, open it
      if (requestId && requestId !== 'null') {
        this.viewRequest(Number(requestId));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async viewRequest(requestId) {
    const request = this.requests.find((r) => r.id === requestId);
    if (!request) return;

    const statusClass = Utils.getStatusBadgeClass(request.status);
    const statusText = Utils.getStatusText(request.status);

    // Load conversation messages
    let conversationMessages = [];
    try {
      conversationMessages = await Utils.apiRequest(`/conversations/${requestId}`, {
        timeout: 10000
      });
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }

    // Combine all messages (admin and student) from request and conversation
    const adminNotesFromRequest = request.adminNotes && request.adminNotes.length > 0 
      ? request.adminNotes.map(note => ({
          role: 'admin',
          name: note.adminName || 'Admin',
          message: note.note,
          timestamp: note.timestamp
        }))
      : [];
    
    // Get all conversation messages (admin and student)
    const conversationMessagesFormatted = conversationMessages.map(msg => ({
      role: msg.role,
      name: msg.full_name || (msg.role === 'admin' ? 'Admin' : 'You'),
      message: msg.message,
      timestamp: msg.created_at
    }));
    
    // Combine and sort by timestamp
    const allMessages = [...adminNotesFromRequest, ...conversationMessagesFormatted]
      .sort((a, b) => new Date(a.timestamp || a.created_at) - new Date(b.timestamp || b.created_at));

    const notesHTML = allMessages.length > 0
      ? allMessages.map((msg) => {
          const isAdmin = msg.role === 'admin';
          return `
            <div style="display: flex; flex-direction: column; align-items: ${isAdmin ? 'flex-start' : 'flex-end'}; margin-bottom: 1rem;">
              <div style="background: ${isAdmin ? 'var(--bg-cream)' : 'var(--recoletos-green)'}; border: 1px solid ${isAdmin ? 'var(--border-gray)' : 'var(--recoletos-green)'}; border-radius: 8px; padding: 0.875rem 1rem; max-width: 85%; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                ${isAdmin ? `
                  <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text-dark); font-size: 0.9rem;">${msg.name}</div>
                  <div style="font-size: 0.9rem; color: var(--text-dark); line-height: 1.5; margin-bottom: 0.5rem;">${msg.message}</div>
                  <div style="font-size: 0.75rem; color: var(--text-dark); opacity: 0.6;">${Utils.formatDate(msg.timestamp || msg.created_at)}</div>
                ` : `
                  <div style="font-size: 0.9rem; color: var(--white); line-height: 1.5; margin-bottom: 0.5rem;">${msg.message}</div>
                  <div style="font-size: 0.75rem; color: var(--white); opacity: 0.9; text-align: right;">${Utils.formatDate(msg.timestamp || msg.created_at)}</div>
                `}
              </div>
            </div>
          `;
        }).join('')
      : '<p style="opacity: 0.6; padding: 1rem; text-align: center; font-style: italic; background: var(--bg-cream); border-radius: 8px; border: 1px solid var(--border-gray);">No messages yet. Start the conversation!</p>';

    // Determine progress stage based on status
    const getProgressStage = (status) => {
      switch(status) {
        case 'pending':
        case 'in_progress':
          return 2; // Admin Processing
        case 'pending_faculty':
          return 3; // Faculty Approval
        case 'approved':
        case 'completed':
          return 4; // Ready for Pickup
        case 'declined':
          return 1; // Stay at Submitted if declined
        default:
          return 1; // Submitted
      }
    };

    const currentStage = getProgressStage(request.status);
    const stages = [
      { id: 1, label: 'Submitted', icon: 'fa-check-circle' },
      { id: 2, label: 'Admin Processing', icon: 'fa-cog' },
      { id: 3, label: 'Faculty Approval', icon: 'fa-user-check' },
      { id: 4, label: 'Ready for Pickup', icon: 'fa-check-circle' }
    ];

    const progressHTML = `
      <div style="background: var(--bg-cream); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-gray); margin-bottom: 2rem;">
        <h3 style="color: var(--recoletos-green); margin-bottom: 1.5rem; font-size: 1.1rem; font-weight: 600;">Request Progress</h3>
        <div style="position: relative;">
          <!-- Progress Bar Line -->
          <div style="position: absolute; top: 20px; left: 0; right: 0; height: 3px; background: var(--border-gray); z-index: 1;"></div>
          <div style="position: absolute; top: 20px; left: 0; height: 3px; background: var(--recoletos-green); z-index: 2; width: ${((currentStage - 1) / (stages.length - 1)) * 100}%; transition: width 0.3s ease;"></div>
          
          <!-- Stage Indicators -->
          <div style="display: flex; justify-content: space-between; position: relative; z-index: 3;">
            ${stages.map((stage, index) => {
              const isCompleted = stage.id < currentStage;
              const isActive = stage.id === currentStage;
              const isFuture = stage.id > currentStage;
              
              return `
                <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                  <div style="width: 40px; height: 40px; border-radius: 50%; background: ${isCompleted ? 'var(--recoletos-green)' : isActive ? 'var(--recoletos-green)' : 'var(--white)'}; border: 3px solid ${isCompleted || isActive ? 'var(--recoletos-green)' : 'var(--border-gray)'}; display: flex; align-items: center; justify-content: center; margin-bottom: 0.5rem; box-shadow: ${isActive ? '0 0 0 4px rgba(0, 102, 51, 0.1)' : 'none'};">
                    ${isCompleted ? `
                      <i class="fas fa-check" style="color: var(--white); font-size: 1rem;"></i>
                    ` : isActive ? `
                      <i class="fas ${stage.icon}" style="color: var(--white); font-size: 1rem;"></i>
                    ` : `
                      <i class="fas ${stage.icon}" style="color: var(--text-dark); opacity: 0.4; font-size: 1rem;"></i>
                    `}
                  </div>
                  <span style="font-size: 0.85rem; font-weight: ${isActive ? '600' : '500'}; color: ${isCompleted || isActive ? 'var(--recoletos-green)' : 'var(--text-dark)'}; opacity: ${isFuture ? '0.4' : '1'}; text-align: center; max-width: 120px;">
                    ${stage.label}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    const modalHTML = `
      <div class="modal-overlay active" id="viewRequestModal">
        <div class="request-modal">
          <div class="modal-header">
            <h2>Request Details</h2>
            <button class="close-modal" onclick="document.getElementById('viewRequestModal').remove()">&times;</button>
          </div>
          <div class="request-modal-body">
            ${progressHTML}
            <div class="request-modal-content">
            <!-- First Column: Document Details -->
            <div class="request-modal-column">
              <h3>Document Details</h3>

              <div class="document-details-horizontal">
                <div class="detail-label">Document Type:</div>
                <div class="detail-value">${request.documentType || request.documentValue || 'N/A'}</div>
                
                <div class="detail-label">Department:</div>
                <div class="detail-value">${request.department || this.studentDepartmentName}</div>
                
                <div class="detail-label">Submitted:</div>
                <div class="detail-value">${Utils.formatDate(request.submittedAt)}</div>
                
                <div class="detail-label">Last Updated:</div>
                <div class="detail-value">${Utils.formatDate(request.updatedAt)}</div>
                
                <div class="detail-label">Quantity:</div>
                <div class="detail-value">${request.quantity || 1}</div>
                
                <div class="detail-label">Purpose:</div>
                <div class="detail-value">${request.purpose || 'None'}</div>
              </div>

              ${request.attachments && request.attachments.length ? `
              <div>
                <h4 style="color: var(--recoletos-green); margin-bottom: 0.75rem; font-size: 1.1rem;">
                  <i class="fas fa-paperclip"></i> Attachments
                </h4>
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(120px,1fr)); gap:0.75rem;">
                  ${request.attachments.map((att) => `
                    <a href="${att.url}" target="_blank" rel="noopener noreferrer" style="display:block;">
                      <img src="${att.url}" alt="${att.name}" style="width:100%; height:110px; object-fit:cover; border-radius:8px; border:1px solid var(--border-gray);" />
                    </a>
                  `).join('')}
                </div>
              </div>
              ` : ''}
            </div>

            <!-- Second Column: Notes & Communication -->
            <div class="request-modal-column">
              <h3>Notes & Communication</h3>
              
              <div>
                <!-- Chat Messages Display -->
                <div style="margin-bottom: 1.5rem; max-height: 350px; overflow-y: auto; padding: 0.5rem; background: var(--white); border-radius: 8px; border: 1px solid var(--border-gray);">
                  ${notesHTML}
                </div>

                <!-- Student Input Section -->
                <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-gray);">
                  <textarea 
                    id="studentNoteInput" 
                    placeholder="Add a note for the admin"
                    style="width: 100%; min-height: 100px; padding: 0.75rem; border: 1px solid var(--border-gray); border-radius: 8px; font-size: 0.9rem; font-family: inherit; resize: vertical; background: var(--white); margin-bottom: 0.75rem;"
                  ></textarea>
                  <div style="display: flex; justify-content: flex-end;">
                    <button 
                      id="sendNoteBtn" 
                      onclick="studentPortal.sendNote(${requestId})"
                      style="padding: 0.75rem 1.5rem; background: var(--recoletos-green); color: var(--white); border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: background 0.2s ease; display: flex; align-items: center; gap: 0.5rem;"
                      onmouseover="this.style.background='#003318'"
                      onmouseout="this.style.background='var(--recoletos-green)'"
                    >
                      <i class="fas fa-paper-plane" style="font-size: 0.85rem;"></i> Send Note
                    </button>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove any existing modal first
    const existingModal = document.getElementById('viewRequestModal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('viewRequestModal');
    
    // Auto-scroll chat messages to bottom
    const chatContainer = modal.querySelector('[style*="max-height: 350px"]');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Close on close button click
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.remove();
      });
    }

    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape' && modal) {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  async sendNote(requestId) {
    const noteInput = document.getElementById('studentNoteInput');
    const sendBtn = document.getElementById('sendNoteBtn');
    
    if (!noteInput || !sendBtn) return;

    const message = noteInput.value.trim();
    if (!message) {
      Utils.showToast('Please enter a message', 'warning');
      return;
    }

    // Disable button while sending
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
      await Utils.apiRequest(`/conversations/${requestId}`, {
        method: 'POST',
        body: { message },
        timeout: 10000
      });

      Utils.showToast('Note sent successfully!', 'success');
      noteInput.value = '';

      // Reload the request view to show the new note
      this.viewRequest(requestId);
    } catch (error) {
      console.error('Failed to send note:', error);
      Utils.showToast('Failed to send note. Please try again.', 'error');
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Note';
    }
  }

  renderProfile() {
    const container = document.getElementById('profileContent');
    if (!container) return;

    const formatValue = (value) => {
      if (!value || value === '-' || (typeof value === 'string' && value.trim() === '')) {
        return 'Not Provided';
      }
      return value;
    };

    const displayName = this.currentUser.fullName || this.currentUser.name || 'Student';
    const deptName = this.studentDepartmentName;
    const courseYear = `${formatValue(this.currentUser.course)} • ${formatValue(this.currentUser.yearLevel)}`;

    // Calculate stats
    const total = this.requests.length;
    const pending = this.requests.filter((r) => ['pending', 'pending_faculty', 'in_progress'].includes(r.status)).length;
    const approved = this.requests.filter((r) => r.status === 'approved' || r.status === 'completed').length;
    const rejected = this.requests.filter((r) => r.status === 'declined').length;

    container.innerHTML = `
      <div class="profile-view-content">
        <div class="profile-header-card">
          <div class="profile-photo-wrapper">
            <div class="profile-photo">
              <i class="fas fa-user"></i>
            </div>
          </div>
          <div class="profile-header-info">
            <h3>${displayName}</h3>
            <p class="profile-student-number">${formatValue(this.currentUser.idNumber)}</p>
            <p class="profile-course-year">${courseYear}</p>
            <p class="profile-email">${formatValue(this.currentUser.email)}</p>
          </div>
          <div class="profile-header-actions">
            <button class="btn-edit-profile" onclick="studentPortal.switchView('settings')">
              <i class="fas fa-edit"></i> Edit Profile
            </button>
            <button class="btn-settings-profile" onclick="studentPortal.switchView('settings')">
              <i class="fas fa-cog"></i> Settings
            </button>
          </div>
        </div>

        <div class="profile-section-card">
          <h4 class="profile-section-title">
            <i class="fas fa-id-card"></i> Personal Information
          </h4>
          <div class="profile-info-grid">
            <div class="profile-info-column">
              <div class="profile-info-item">
                <span class="profile-info-label">Full Name</span>
                <span class="profile-info-value">${formatValue(displayName)}</span>
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">ID Number</span>
                <span class="profile-info-value">${formatValue(this.currentUser.idNumber)}</span>
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">Email</span>
                <span class="profile-info-value">${formatValue(this.currentUser.email)}</span>
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">Contact Number</span>
                <span class="profile-info-value">${formatValue(this.currentUser.contactNumber)}</span>
              </div>
            </div>
            <div class="profile-info-column">
              <div class="profile-info-item">
                <span class="profile-info-label">Birthdate</span>
                <span class="profile-info-value">${formatValue(this.currentUser.birthdate)}</span>
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">Address</span>
                <span class="profile-info-value">${formatValue(this.currentUser.address)}</span>
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">Gender</span>
                <span class="profile-info-value">${formatValue(this.currentUser.gender)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="profile-section-card">
          <h4 class="profile-section-title">
            <i class="fas fa-graduation-cap"></i> Academic Information
          </h4>
          <div class="profile-academic-grid">
            <div class="profile-academic-item">
              <span class="profile-academic-label">Department</span>
              <span class="profile-academic-value">${formatValue(deptName)}</span>
            </div>
            <div class="profile-academic-item">
              <span class="profile-academic-label">Program</span>
              <span class="profile-academic-value">${formatValue(this.currentUser.course)}</span>
            </div>
            <div class="profile-academic-item">
              <span class="profile-academic-label">Year Level</span>
              <span class="profile-academic-value">${formatValue(this.currentUser.yearLevel)}</span>
            </div>
            <div class="profile-academic-item">
              <span class="profile-academic-label">Status</span>
              <span class="profile-academic-value">${formatValue(this.currentUser.status || 'Active')}</span>
            </div>
            <div class="profile-academic-item">
              <span class="profile-academic-label">Advisor</span>
              <span class="profile-academic-value">${formatValue(this.currentUser.advisor)}</span>
            </div>
            <div class="profile-academic-item">
              <span class="profile-academic-label">Academic Standing</span>
              <span class="profile-academic-value">${formatValue(this.currentUser.academicStanding || 'Good Standing')}</span>
            </div>
          </div>
        </div>

        <div class="profile-section-card">
          <h4 class="profile-section-title">
            <i class="fas fa-file-alt"></i> Document Records
          </h4>
          <div class="profile-records-grid">
            <div class="profile-record-card">
              <div class="profile-record-value">${total}</div>
              <div class="profile-record-label">Total Requests</div>
            </div>
            <div class="profile-record-card">
              <div class="profile-record-value">${pending}</div>
              <div class="profile-record-label">Pending</div>
            </div>
            <div class="profile-record-card">
              <div class="profile-record-value">${approved}</div>
              <div class="profile-record-label">Approved</div>
            </div>
            <div class="profile-record-card">
              <div class="profile-record-value">${rejected}</div>
              <div class="profile-record-label">Rejected</div>
            </div>
          </div>
          <div class="profile-records-actions">
            <button class="btn-view-history" onclick="studentPortal.switchView('history')">
              <i class="fas fa-history"></i> View Document History
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderSettings() {
    const container = document.getElementById('settingsContent');
    if (!container) return;

    container.innerHTML = `
      <div class="settings-view-content">
        <div class="settings-tabs">
          <button class="settings-tab active" data-tab="account" onclick="studentPortal.switchSettingsTab('account')">
            <i class="fas fa-user"></i> Account Info
          </button>
          <button class="settings-tab" data-tab="security" onclick="studentPortal.switchSettingsTab('security')">
            <i class="fas fa-lock"></i> Security
          </button>
          <button class="settings-tab" data-tab="notifications" onclick="studentPortal.switchSettingsTab('notifications')">
            <i class="fas fa-bell"></i> Notifications
          </button>
          <button class="settings-tab" data-tab="appearance" onclick="studentPortal.switchSettingsTab('appearance')">
            <i class="fas fa-palette"></i> Appearance
          </button>
        </div>

        <div class="settings-tab-content">
          <div class="settings-tab-panel active" id="settingsTabAccount">
            <div class="settings-section">
              <h3><i class="fas fa-envelope"></i> Email Address</h3>
              <div class="settings-input-group">
                <input type="email" id="settingsEmail" class="settings-input" value="${this.currentUser.email || ''}" />
              </div>
            </div>
            <div class="settings-section">
              <h3><i class="fas fa-phone"></i> Contact Number</h3>
              <div class="settings-input-group">
                <input type="tel" id="settingsContact" class="settings-input" value="${this.currentUser.contactNumber || ''}" />
              </div>
            </div>
          </div>

          <div class="settings-tab-panel" id="settingsTabSecurity">
            <div class="settings-section">
              <h3><i class="fas fa-key"></i> Change Password</h3>
              <div class="settings-password-group">
                <label>Current Password</label>
                <div class="settings-input-group">
                  <input type="password" id="currentPassword" class="settings-input" placeholder="Enter current password" />
                  <button class="btn-toggle-password" onclick="studentPortal.togglePasswordVisibility('currentPassword', this)">
                    <i class="fas fa-eye"></i>
                  </button>
                </div>
              </div>
              <div class="settings-password-group">
                <label>New Password</label>
                <div class="settings-input-group">
                  <input type="password" id="newPassword" class="settings-input" placeholder="Enter new password" />
                  <button class="btn-toggle-password" onclick="studentPortal.togglePasswordVisibility('newPassword', this)">
                    <i class="fas fa-eye"></i>
                  </button>
                </div>
              </div>
              <div class="settings-password-group">
                <label>Confirm New Password</label>
                <div class="settings-input-group">
                  <input type="password" id="confirmNewPassword" class="settings-input" placeholder="Confirm new password" />
                  <button class="btn-toggle-password" onclick="studentPortal.togglePasswordVisibility('confirmNewPassword', this)">
                    <i class="fas fa-eye"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-tab-panel" id="settingsTabNotifications">
            <div class="settings-section">
              <h3><i class="fas fa-bell"></i> Notification Preferences</h3>
              <div class="settings-toggle-group">
                <label class="settings-toggle-label">
                  <span>Email Notifications</span>
                  <input type="checkbox" id="emailNotifications" class="settings-toggle" ${this.currentUser.emailNotifications !== false ? 'checked' : ''} />
                  <span class="settings-toggle-slider"></span>
                </label>
                <small>Receive notifications via email</small>
              </div>
              <div class="settings-toggle-group">
                <label class="settings-toggle-label">
                  <span>SMS Notifications</span>
                  <input type="checkbox" id="smsNotifications" class="settings-toggle" ${this.currentUser.smsNotifications === true ? 'checked' : ''} />
                  <span class="settings-toggle-slider"></span>
                </label>
                <small>Receive notifications via SMS</small>
              </div>
            </div>
          </div>

          <div class="settings-tab-panel" id="settingsTabAppearance">
            <div class="settings-section">
              <h3><i class="fas fa-moon"></i> Theme</h3>
              <div class="settings-select-group">
                <label>Theme</label>
                <select id="themeSelect" class="settings-select">
                  <option value="light" ${(this.currentUser.theme || 'light') === 'light' ? 'selected' : ''}>Light</option>
                  <option value="dark" ${this.currentUser.theme === 'dark' ? 'selected' : ''}>Dark</option>
                  <option value="auto" ${this.currentUser.theme === 'auto' ? 'selected' : ''}>Auto</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-save-footer">
          <button class="btn-save-changes" onclick="studentPortal.saveSettings()">
            <i class="fas fa-save"></i> Save Changes
          </button>
        </div>
      </div>
    `;
  }

  switchSettingsTab(tabName) {
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    document.querySelectorAll('.settings-tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `settingsTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    });
  }

  togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  }

  async saveSettings() {
    const email = document.getElementById('settingsEmail').value.trim();
    const contact = document.getElementById('settingsContact').value.trim();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    const emailNotifications = document.getElementById('emailNotifications').checked;
    const smsNotifications = document.getElementById('smsNotifications').checked;
    const theme = document.getElementById('themeSelect').value;

    try {
      const updates = {};
      if (email && email !== this.currentUser.email) updates.email = email;
      if (contact !== (this.currentUser.contactNumber || '')) updates.contactNumber = contact;
      updates.emailNotifications = emailNotifications;
      updates.smsNotifications = smsNotifications;
      updates.theme = theme;

      if (newPassword) {
        if (!currentPassword) {
          Utils.showToast('Please enter your current password', 'error');
          return;
        }
        if (newPassword !== confirmPassword) {
          Utils.showToast('New passwords do not match', 'error');
          return;
        }
        if (newPassword.length < 3) {
          Utils.showToast('Password must be at least 3 characters', 'error');
          return;
        }
        await Utils.apiRequest('/auth/update-password', {
          method: 'PUT',
          body: { currentPassword, newPassword }
        });
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';
      }

      if (Object.keys(updates).length > 0) {
        await Utils.apiRequest('/auth/update-profile', {
          method: 'PUT',
          body: updates
        });
        Object.assign(this.currentUser, updates);
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      }

      Utils.showToast('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Save settings error:', error);
      Utils.showToast(error.message || 'Failed to save settings', 'error');
    }
  }

  async updateEmail() {
    const emailInput = document.getElementById('settingsEmail');
    const newEmail = emailInput.value.trim();

    if (!newEmail || !newEmail.includes('@')) {
      Utils.showToast('Please enter a valid email address', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: newEmail })
      });

      const data = await response.json();
      if (response.ok) {
        this.currentUser.email = newEmail;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        Utils.showToast('Email updated successfully', 'success');
        this.loadUserInfo();
      } else {
        Utils.showToast(data.message || 'Failed to update email', 'error');
      }
    } catch (error) {
      console.error('Update email error:', error);
      Utils.showToast('Failed to update email. Please try again.', 'error');
    }
  }

  async updateContact() {
    const contactInput = document.getElementById('settingsContact');
    const newContact = contactInput.value.trim();

    if (!newContact) {
      Utils.showToast('Please enter a contact number', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contactNumber: newContact })
      });

      const data = await response.json();
      if (response.ok) {
        this.currentUser.contactNumber = newContact;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        Utils.showToast('Contact number updated successfully', 'success');
      } else {
        Utils.showToast(data.message || 'Failed to update contact number', 'error');
      }
    } catch (error) {
      console.error('Update contact error:', error);
      Utils.showToast('Failed to update contact number. Please try again.', 'error');
    }
  }

  async updatePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      Utils.showToast('Please fill in all password fields', 'error');
      return;
    }

    if (newPassword.length < 3) {
      Utils.showToast('New password must be at least 3 characters', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      Utils.showToast('New passwords do not match', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/update-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();
      if (response.ok) {
        Utils.showToast('Password updated successfully', 'success');
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';
      } else {
        Utils.showToast(data.message || 'Failed to update password', 'error');
      }
    } catch (error) {
      console.error('Update password error:', error);
      Utils.showToast('Failed to update password. Please try again.', 'error');
    }
  }

  saveNotificationSettings() {
    const emailNotif = document.getElementById('emailNotifications').checked;
    const smsNotif = document.getElementById('smsNotifications').checked;

    this.currentUser.emailNotifications = emailNotif;
    this.currentUser.smsNotifications = smsNotif;
    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    Utils.showToast('Notification settings saved', 'success');
  }

  updateTheme() {
    const themeSelect = document.getElementById('themeSelect');
    const theme = themeSelect.value;

    this.currentUser.theme = theme;
    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

    // Apply theme (basic implementation)
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }

    Utils.showToast('Theme updated', 'success');
  }
}

let studentPortal;
document.addEventListener('DOMContentLoaded', () => {
  studentPortal = new StudentPortal();
});