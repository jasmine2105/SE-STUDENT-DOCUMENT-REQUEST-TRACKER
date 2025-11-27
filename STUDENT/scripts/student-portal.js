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
      
      try {
        console.log('📥 Loading requests...');
        await this.loadRequests();
        console.log('✅ Requests loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load requests:', error);
        Utils.showToast('Failed to load requests, but you can still submit new ones', 'warning');
      }
      
      console.log('⏭️ Skipping notifications for now (will be fixed)');
      this.notifications = [];
      
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

  async loadDepartmentsFromApi() {
    if (this.departments.length > 0) return;
    try {
      const data = await Utils.apiRequest('/departments');
      if (Array.isArray(data) && data.length) {
        this.departments = data;
      }
    } catch (error) {
      console.warn('Failed to load departments from API', error);
      this.departments = (window.RecoletosConfig && window.RecoletosConfig.departments) || [];
    }
  }

  async loadDocumentTypes(departmentCode) {
    if (this.documentTypes[departmentCode]) {
      return this.documentTypes[departmentCode];
    }

    try {
      const data = await Utils.apiRequest(`/requests/document-types/${departmentCode}`);
      this.documentTypes[departmentCode] = data;
      return data;
    } catch (error) {
      console.error('Failed to load document types:', error);
      Utils.showToast('Failed to load document types', 'error');
      return [];
    }
  }

  getDepartmentCode(departmentId) {
    const department = this.departments.find(dept => dept.id == departmentId);
    return department ? department.code : null;
  }

  loadUserInfo() {
    const userNameEl = document.getElementById('userName');
    const userInfoEl = document.getElementById('userInfo');
    const sidebarInfo = document.getElementById('sidebarUserInfo');

    const displayName = this.currentUser.fullName || this.currentUser.name || 'Student';
    if (userNameEl) userNameEl.textContent = displayName;
    const infoText = `${this.currentUser.course || ''} • ${this.currentUser.yearLevel || ''}`.trim();
    if (userInfoEl) userInfoEl.textContent = infoText;
    if (sidebarInfo) sidebarInfo.textContent = this.studentDepartmentName;

    const departmentFilter = document.getElementById('filterDepartment');
    if (departmentFilter) {
      departmentFilter.innerHTML = ['<option value="all">All Departments</option>'].concat(
        this.departments.map((dept) => `<option value="${dept.id}">${dept.name}</option>`)
      ).join('');
    }
  }

  async loadRequests() {
    try {
      const allRequests = await Utils.apiRequest('/requests');
      this.requests = allRequests.filter((r) => r.studentId === this.currentUser.id);
      this.updateStats();
      this.renderDashboard();
      this.renderHistory();
    } catch (error) {
      console.error('Failed to load requests:', error);
      Utils.showToast('Failed to load requests', 'error');
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

  renderMyDocuments() {
    const container = document.getElementById('myDocuments');
    if (!container) return;
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

    const rows = filtered
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .map((req) => {
        const statusClass = Utils.getStatusBadgeClass(req.status);
        const statusText = Utils.getStatusText(req.status);
        const submitted = Utils.formatDate(req.submittedAt);
        const atts = Array.isArray(req.attachments) ? req.attachments : [];
        const attCount = atts.length;
        const firstAttUrl = atts[0] && atts[0].url ? atts[0].url : null;

        return `
          <tr>
            <td>${req.documentType || req.documentValue || 'Document'}</td>
            <td>${req.department || this.studentDepartmentName}</td>
            <td>${submitted}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
              <button class="btn-secondary" onclick="studentPortal.viewRequest(${req.id})">View</button>
            </td>
          </tr>
        `;
      }).join('');

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
    `;
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
        <div class="empty-state">
          <div class="empty-state-icon">📄</div>
          <h3>No requests found</h3>
        </div>
      `;
      return;
    }

    // Render history as admin-style request cards for consistent spacing/alignment
    const cards = filtered
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .map((request) => this.buildRequestRow(request, false))
      .join('');

    // Insert cards directly into the container to match Admin's layout
    container.innerHTML = cards;
  }

  buildRequestRow(request, compact = false) {
    const statusClass = Utils.getStatusBadgeClass(request.status);
    const statusText = Utils.getStatusText(request.status);
    const submittedDate = Utils.formatDate(request.submittedAt);
    return `
      <div class="request-item${compact ? ' compact' : ''}">
        <div class="request-header">
          <div class="request-info">
            <h3>${request.documentType}</h3>
            <div class="request-meta">
              <span><strong>Department:</strong> ${request.department || this.studentDepartmentName}</span>
              <span><strong>Submitted:</strong> ${submittedDate}</span>
            </div>
          </div>
          <div class="request-actions">
            <span class="status-badge ${statusClass}">${statusText}</span>
            <button class="btn-secondary" onclick="studentPortal.viewRequest(${request.id})">View</button>
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
    const newRequestBtn = document.getElementById('newRequestBtn');
    if (newRequestBtn) {
      newRequestBtn.addEventListener('click', () => this.showNewRequestModal());
    }

    const manageDocsBtn = document.getElementById('manageDocsBtn');
    if (manageDocsBtn) manageDocsBtn.addEventListener('click', () => {
      const el = document.getElementById('myDocuments');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    const myDocsFilter = document.getElementById('myDocsFilter');
    if (myDocsFilter) myDocsFilter.addEventListener('change', () => this.renderMyDocuments());
    const myDocsSearch = document.getElementById('myDocsSearch');
    if (myDocsSearch) myDocsSearch.addEventListener('input', () => this.renderMyDocuments());

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
        documentRequestForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitNewRequest();
        });
    }

    const departmentSelect = document.getElementById('department');
    if (departmentSelect) {
        departmentSelect.addEventListener('change', (e) => {
            this.updateDocumentTypes(e.target.value);
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
        
        const departmentSelect = document.getElementById('department');
        if (departmentSelect && departmentSelect.value) {
            this.updateDocumentTypes(departmentSelect.value);
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

  async updateDocumentTypes(departmentCode) {
    const documentTypeSelect = document.getElementById('documentType');
    const loadingElement = document.getElementById('documentTypeLoading');

    if (!documentTypeSelect) return;

    documentTypeSelect.innerHTML = '<option value="">Select Document Type</option>';
    documentTypeSelect.disabled = true;

    if (!departmentCode) {
        documentTypeSelect.innerHTML = '<option value="">Select Department First</option>';
        return;
    }

    if (loadingElement) loadingElement.classList.remove('hidden');

    try {
        const documentTypes = await this.loadDocumentTypes(departmentCode);
        
        if (documentTypes.length > 0) {
            documentTypeSelect.innerHTML = '<option value="">Select Document Type</option>' + 
              documentTypes.map((doc) => `
                <option value="${doc.value}" data-requires-faculty="${doc.requires_faculty}" data-requires-attachment="${doc.requires_attachment || false}">
                  ${doc.name || doc.label}
                </option>
              `).join('') +
              '<option value="others">Others</option>';
            documentTypeSelect.disabled = false;
        } else {
            documentTypeSelect.innerHTML = '<option value="">No document types available</option>';
        }
    } catch (error) {
        console.error('Error populating document options:', error);
        documentTypeSelect.innerHTML = '<option value="">Error loading document types</option>';
    } finally {
        if (loadingElement) loadingElement.classList.add('hidden');
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
      notifications: document.getElementById('notificationsView')
    };

    Object.entries(views).forEach(([key, el]) => {
      if (!el) return;
      if (key === view) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
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
              `<img src="${url}" alt="preview" class="file-preview-image" />`
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
      const response = await fetch(`${window.location.origin}/api/uploads`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      return data.attachments || [];
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
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

    const department = this.departments.find(dept => dept.code === departmentCode);
    if (!department) {
      Utils.showToast('Invalid department selected.', 'error');
      return;
    }

    const requestData = {
      departmentId: department.id,
      documentValue: documentValue,
      documentType: selectedOption ? selectedOption.text : documentValue,
      quantity: parseInt(formData.get('quantity'), 10),
      purpose: formData.get('purpose'),
      contactNumber: formData.get('contactNumber'),
      additionalNotes: formData.get('additionalNotes'),
      crossDepartment: department.id != this.studentDepartmentId,
      requiresFaculty: requiresFaculty
    };

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

      const attachments = await this.uploadSelectedFiles();
      requestData.attachments = attachments;

      const newRequest = await Utils.apiRequest('/requests', {
        method: 'POST',
        body: requestData
      });

      Utils.showToast('Request submitted successfully!', 'success');
      this.closeRequestModal();
      this.selectedFiles = [];
      
      await this.loadRequests();
      this.updateStats();
      this.renderDashboard();
      this.renderHistory();
    } catch (error) {
      console.error('Submit request error:', error);
      Utils.showToast('Failed to submit request', 'error');
      
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
    console.log('⏭️ Notifications disabled temporarily');
    this.notifications = [];
    return [];
  }

  async markAllNotificationsRead() {
    const unread = this.notifications.filter((notif) => !notif.read);
    for (const notification of unread) {
      try {
        await Utils.apiRequest(`/notifications/${notification.id}`, {
          method: 'PATCH',
          body: { read: true }
        });
        notification.read = true;
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

    const unreadCount = this.notifications.filter((n) => !n.read).length;
    if (countBadge) {
      countBadge.textContent = unreadCount;
      countBadge.classList.toggle('hidden', unreadCount === 0);
    }

    const buildNotificationItem = (notif) => `
      <div class="notification-item ${notif.read ? '' : 'unread'}">
        <h4>${notif.title}</h4>
        <p>${notif.message}</p>
        <time>${Utils.formatRelativeTime(notif.createdAt)}</time>
      </div>
    `;

    if (dropdownList) {
      dropdownList.innerHTML = this.notifications.length
        ? this.notifications.slice(0, 5).map(buildNotificationItem).join('')
        : '<p style="text-align:center; opacity:0.6;">No notifications</p>';
    }

    if (fullList) {
      fullList.innerHTML = this.notifications.length
        ? `<div class="notification-center">${this.notifications.map(buildNotificationItem).join('')}</div>`
        : '<div class="empty-state"><div class="empty-state-icon">🔔</div><h3>No notifications yet</h3></div>';
    }
  }

  viewRequest(requestId) {
    const request = this.requests.find((r) => r.id === requestId);
    if (!request) return;

    const statusClass = Utils.getStatusBadgeClass(request.status);
    const statusText = Utils.getStatusText(request.status);

    const notesHTML = request.adminNotes && request.adminNotes.length > 0
      ? request.adminNotes.map((note) => `
          <div style="padding: 0.75rem; background: var(--bg-cream); border-radius: 6px; margin-bottom: 0.5rem;">
            <div style="font-weight: 600; margin-bottom: 0.25rem;">${note.adminName}</div>
            <div style="font-size: 0.9rem; opacity: 0.8;">${note.note}</div>
            <div style="font-size: 0.8rem; opacity: 0.6; margin-top: 0.25rem;">${Utils.formatDate(note.timestamp)}</div>
          </div>
        `).join('')
      : '<p style="opacity: 0.6;">No notes yet</p>';

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
      : '<p style="opacity: 0.6;">Awaiting approval</p>';

    const modalHTML = `
      <div class="modal-overlay active" id="viewRequestModal">
        <div class="request-modal">
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
              <strong>Department:</strong> ${request.department || this.studentDepartmentName}<br>
              <strong>Submitted:</strong> ${Utils.formatDate(request.submittedAt)}<br>
              <strong>Last Updated:</strong> ${Utils.formatDate(request.updatedAt)}<br>
              <strong>Quantity:</strong> ${request.quantity}<br>
              <strong>Purpose:</strong> ${request.purpose}<br>
              ${request.crossDepartment ? `<strong>Cross Department Details:</strong> ${request.crossDepartmentDetails || 'N/A'}<br>` : ''}
            </div>

            ${request.attachments && request.attachments.length ? `
            <div style="margin-bottom: 1.5rem;">
              <h4 style="color: var(--recoletos-green); margin-bottom: 0.5rem;">Attachments</h4>
              <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(120px,1fr)); gap:0.75rem;">
                ${request.attachments.map((att) => `
                  <a href="${att.url}" target="_blank" rel="noopener noreferrer" style="display:block;">
                    <img src="${att.url}" alt="${att.name}" style="width:100%; height:110px; object-fit:cover; border-radius:8px; border:1px solid var(--border-gray);" />
                  </a>
                `).join('')}
              </div>
            </div>
            ` : ''}

            <div style="margin-bottom: 1.5rem;">
              <h4 style="color: var(--recoletos-green); margin-bottom: 0.5rem;">Admin Notes</h4>
              ${notesHTML}
            </div>

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
      if (e.target === modal) modal.remove();
    });
  }
}

let studentPortal;
document.addEventListener('DOMContentLoaded', () => {
  studentPortal = new StudentPortal();
});