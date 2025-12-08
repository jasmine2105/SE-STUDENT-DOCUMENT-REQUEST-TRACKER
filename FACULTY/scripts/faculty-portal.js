document.addEventListener('DOMContentLoaded', async () => {
  if (!Utils.requireAuth()) return;

  const user = Utils.getCurrentUser();
  const userNameEl = document.getElementById('userName');
  const userInfoEl = document.getElementById('userInfo');
  const sidebarUserInfo = document.getElementById('sidebarUserInfo');

  if (userNameEl) userNameEl.textContent = user?.fullName || user?.name || user?.idNumber || 'User';
  if (userInfoEl) userInfoEl.textContent = `${user?.role || ''}`;
  if (sidebarUserInfo) sidebarUserInfo.textContent = user?.fullName || '';

  // Faculty Portal class for profile and settings
  class FacultyPortal {
    constructor() {
      this.currentUser = user;
      this.profileEditMode = false;
    }

    formatValue(value) {
      if (!value || value === '-' || (typeof value === 'string' && value.trim() === '')) {
        return 'Not Provided';
      }
      return value;
    }

    renderProfile(isEditMode = false) {
      const container = document.getElementById('profileContent');
      if (!container) return;

      const displayName = this.currentUser.fullName || this.currentUser.name || 'Faculty';
      const deptName = this.currentUser.department || this.currentUser.departmentName || 'Not Provided';
      const position = this.currentUser.position || 'Not Provided';

      this.profileEditMode = isEditMode;

      container.innerHTML = `
        <div class="profile-view-content">
          <div class="profile-header-card">
            <div class="profile-photo-wrapper">
              <div class="profile-photo" id="profilePhotoDisplay" style="${this.currentUser.profilePhoto ? `background-image: url('${this.currentUser.profilePhoto}'); background-size: cover; background-position: center;` : ''}">
                ${!this.currentUser.profilePhoto ? '<i class="fas fa-user"></i>' : ''}
              </div>
              <button class="profile-photo-edit" id="profilePhotoEditBtn" title="Upload Photo" onclick="document.getElementById('profilePhotoInput').click()">
                <i class="fas fa-camera"></i>
              </button>
              <input type="file" id="profilePhotoInput" accept="image/*" style="display: none;" onchange="facultyPortalProfile.handlePhotoUpload(event)" />
            </div>
            <div class="profile-header-info">
              <h3>${displayName}</h3>
              <p class="profile-student-number">${this.formatValue(this.currentUser.idNumber)}</p>
              <p class="profile-course-year">${this.formatValue(position)} • ${this.formatValue(deptName)}</p>
              <p class="profile-email">${this.formatValue(this.currentUser.email)}</p>
            </div>
            <div class="profile-header-actions">
              ${isEditMode ? `
                <button class="btn-save-profile" onclick="facultyPortalProfile.saveProfile()">
                  <i class="fas fa-save"></i> Save Changes
                </button>
                <button class="btn-cancel-profile" onclick="facultyPortalProfile.renderProfile(false)">
                  <i class="fas fa-times"></i> Cancel
                </button>
              ` : `
                <button class="btn-edit-profile" onclick="facultyPortalProfile.renderProfile(true)">
                  <i class="fas fa-edit"></i> Edit Profile
                </button>
                <button class="btn-settings-profile" onclick="facultyPortalProfile.switchView('settings')">
                  <i class="fas fa-cog"></i> Settings
                </button>
              `}
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
                  ${isEditMode ? `
                    <input type="text" id="editFullName" class="profile-edit-input" value="${this.currentUser.fullName || this.currentUser.name || ''}" />
                  ` : `
                    <span class="profile-info-value">${this.formatValue(displayName)}</span>
                  `}
                </div>
                <div class="profile-info-item">
                  <span class="profile-info-label">ID Number</span>
                  <span class="profile-info-value">${this.formatValue(this.currentUser.idNumber)}</span>
                  <small style="color: #666; font-size: 0.85rem; display: block; margin-top: 0.25rem;">ID Number cannot be changed</small>
                </div>
                <div class="profile-info-item">
                  <span class="profile-info-label">Email</span>
                  ${isEditMode ? `
                    <input type="email" id="editEmail" class="profile-edit-input" value="${this.currentUser.email || ''}" />
                  ` : `
                    <span class="profile-info-value">${this.formatValue(this.currentUser.email)}</span>
                  `}
                </div>
                <div class="profile-info-item">
                  <span class="profile-info-label">Contact Number</span>
                  ${isEditMode ? `
                    <input type="tel" id="editContactNumber" class="profile-edit-input" value="${this.currentUser.contactNumber || ''}" placeholder="Enter contact number" />
                  ` : `
                    <span class="profile-info-value">${this.formatValue(this.currentUser.contactNumber)}</span>
                  `}
                </div>
              </div>
              <div class="profile-info-column">
                <div class="profile-info-item">
                  <span class="profile-info-label">Birthdate</span>
                  ${isEditMode ? `
                    <input type="date" id="editBirthdate" class="profile-edit-input" value="${this.currentUser.birthdate || ''}" />
                  ` : `
                    <span class="profile-info-value">${this.formatValue(this.currentUser.birthdate)}</span>
                  `}
                </div>
                <div class="profile-info-item">
                  <span class="profile-info-label">Address</span>
                  ${isEditMode ? `
                    <textarea id="editAddress" class="profile-edit-textarea" placeholder="Enter address">${this.currentUser.address || ''}</textarea>
                  ` : `
                    <span class="profile-info-value">${this.formatValue(this.currentUser.address)}</span>
                  `}
                </div>
                <div class="profile-info-item">
                  <span class="profile-info-label">Gender</span>
                  ${isEditMode ? `
                    <select id="editGender" class="profile-edit-input">
                      <option value="">Select Gender</option>
                      <option value="Male" ${this.currentUser.gender === 'Male' ? 'selected' : ''}>Male</option>
                      <option value="Female" ${this.currentUser.gender === 'Female' ? 'selected' : ''}>Female</option>
                      <option value="Other" ${this.currentUser.gender === 'Other' ? 'selected' : ''}>Other</option>
                      <option value="Prefer not to say" ${this.currentUser.gender === 'Prefer not to say' ? 'selected' : ''}>Prefer not to say</option>
                    </select>
                  ` : `
                    <span class="profile-info-value">${this.formatValue(this.currentUser.gender)}</span>
                  `}
                </div>
              </div>
            </div>
          </div>

          <div class="profile-section-card">
            <h4 class="profile-section-title">
              <i class="fas fa-briefcase"></i> Professional Information
            </h4>
            <div class="profile-academic-grid">
              <div class="profile-academic-item">
                <span class="profile-academic-label">Department</span>
                <span class="profile-academic-value">${this.formatValue(deptName)}</span>
                <small style="color: #666; font-size: 0.85rem; display: block; margin-top: 0.25rem;">Cannot be changed</small>
              </div>
              <div class="profile-academic-item">
                <span class="profile-academic-label">Position</span>
                ${isEditMode ? `
                  <input type="text" id="editPosition" class="profile-edit-input" value="${this.currentUser.position || ''}" placeholder="e.g., Professor, Associate Professor" />
                ` : `
                  <span class="profile-academic-value">${this.formatValue(position)}</span>
                `}
              </div>
              <div class="profile-academic-item">
                <span class="profile-academic-label">Status</span>
                <span class="profile-academic-value">${this.formatValue(this.currentUser.status || 'Active')}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    async handlePhotoUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        Utils.showToast('Please select an image file', 'error');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        Utils.showToast('Image size must be less than 5MB', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target.result;
        const userId = this.currentUser.id;
        const storageKey = `profileImage_${userId}`;
        
        localStorage.setItem(storageKey, imageData);
        this.currentUser.profilePhoto = imageData;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        const photoDisplay = document.getElementById('profilePhotoDisplay');
        if (photoDisplay) {
          photoDisplay.style.backgroundImage = `url('${imageData}')`;
          photoDisplay.style.backgroundSize = 'cover';
          photoDisplay.style.backgroundPosition = 'center';
          const icon = photoDisplay.querySelector('i');
          if (icon) icon.style.display = 'none';
        }
        Utils.showToast('Profile photo updated successfully', 'success');
      };
      reader.readAsDataURL(file);
    }

    async saveProfile() {
      const fullName = document.getElementById('editFullName')?.value;
      const email = document.getElementById('editEmail')?.value;
      const contactNumber = document.getElementById('editContactNumber')?.value;
      const birthdate = document.getElementById('editBirthdate')?.value;
      const address = document.getElementById('editAddress')?.value;
      const gender = document.getElementById('editGender')?.value;
      const position = document.getElementById('editPosition')?.value;

      try {
        await Utils.apiRequest(`/users/${this.currentUser.id}`, {
          method: 'PUT',
          body: {
            fullName: fullName,
            email: email,
            contactNumber: contactNumber,
            birthdate: birthdate,
            address: address,
            gender: gender,
            position: position
          }
        });

        this.currentUser.fullName = fullName;
        this.currentUser.email = email;
        this.currentUser.contactNumber = contactNumber;
        this.currentUser.birthdate = birthdate;
        this.currentUser.address = address;
        this.currentUser.gender = gender;
        this.currentUser.position = position;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

        Utils.showToast('Profile updated successfully', 'success');
        this.renderProfile(false);
      } catch (error) {
        console.error('Failed to save profile:', error);
        Utils.showToast('Failed to update profile. Please try again.', 'error');
      }
    }

    renderSettings() {
      const container = document.getElementById('settingsContent');
      if (!container) return;

      container.innerHTML = `
        <div class="settings-view-content">
          <div class="settings-tabs">
            <button class="settings-tab active" data-tab="security" onclick="facultyPortalProfile.switchSettingsTab('security')">
              <i class="fas fa-lock"></i> Security
            </button>
            <button class="settings-tab" data-tab="notifications" onclick="facultyPortalProfile.switchSettingsTab('notifications')">
              <i class="fas fa-bell"></i> Notifications
            </button>
          </div>

          <div class="settings-tab-content">
            <div class="settings-tab-panel active" id="settingsTabSecurity">
              <div class="settings-section">
                <h3><i class="fas fa-key"></i> Change Password</h3>
                <div class="settings-password-group">
                  <label>Current Password</label>
                  <div class="settings-input-group">
                    <input type="password" id="currentPassword" class="settings-input" placeholder="Enter current password" />
                    <button class="btn-toggle-password" onclick="facultyPortalProfile.togglePasswordVisibility('currentPassword', this)">
                      <i class="fas fa-eye"></i>
                    </button>
                  </div>
                </div>
                <div class="settings-password-group">
                  <label>New Password</label>
                  <div class="settings-input-group">
                    <input type="password" id="newPassword" class="settings-input" placeholder="Enter new password" />
                    <button class="btn-toggle-password" onclick="facultyPortalProfile.togglePasswordVisibility('newPassword', this)">
                      <i class="fas fa-eye"></i>
                    </button>
                  </div>
                </div>
                <div class="settings-password-group">
                  <label>Confirm New Password</label>
                  <div class="settings-input-group">
                    <input type="password" id="confirmNewPassword" class="settings-input" placeholder="Confirm new password" />
                    <button class="btn-toggle-password" onclick="facultyPortalProfile.togglePasswordVisibility('confirmNewPassword', this)">
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
          </div>

          <div class="settings-save-footer">
            <button class="btn-save-changes" onclick="facultyPortalProfile.saveSettings()">
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
      const currentPassword = document.getElementById('currentPassword')?.value;
      const newPassword = document.getElementById('newPassword')?.value;
      const confirmPassword = document.getElementById('confirmNewPassword')?.value;
      const emailNotifications = document.getElementById('emailNotifications')?.checked;
      const smsNotifications = document.getElementById('smsNotifications')?.checked;

      if (newPassword && newPassword !== confirmPassword) {
        Utils.showToast('New passwords do not match', 'error');
        return;
      }

      try {
        const updates = {};
        if (newPassword) {
          updates.currentPassword = currentPassword;
          updates.newPassword = newPassword;
        }
        updates.emailNotifications = emailNotifications;
        updates.smsNotifications = smsNotifications;

        await Utils.apiRequest(`/users/${this.currentUser.id}/settings`, {
          method: 'PUT',
          body: updates
        });

        this.currentUser.emailNotifications = emailNotifications;
        this.currentUser.smsNotifications = smsNotifications;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

        Utils.showToast('Settings saved successfully', 'success');
        if (newPassword) {
          document.getElementById('currentPassword').value = '';
          document.getElementById('newPassword').value = '';
          document.getElementById('confirmNewPassword').value = '';
        }
      } catch (error) {
        console.error('Failed to save settings:', error);
        Utils.showToast('Failed to save settings. Please try again.', 'error');
      }
    }

    switchView(viewName) {
      const links = document.querySelectorAll('.sidebar-link');
      links.forEach(l => l.classList.remove('active'));
      const targetLink = document.querySelector(`[data-view="${viewName}"]`);
      if (targetLink) {
        targetLink.classList.add('active');
        targetLink.click();
      }
    }
  }

  // Initialize faculty portal instance for profile/settings
  const facultyPortalProfile = new FacultyPortal();
  window.facultyPortalProfile = facultyPortalProfile;

  // Initialize profile and settings views
  async function initProfileView() {
    const container = document.getElementById('profileContent');
    if (!container) return;
    facultyPortalProfile.renderProfile(false);
  }

  async function initSettingsView() {
    const container = document.getElementById('settingsContent');
    if (!container) return;
    facultyPortalProfile.renderSettings();
  }

  // Initialize notifications (pass userId as fallback if server doesn't use auth header)
  try {
    const notificationsInstance = await Notifications.init({
      userId: user?.id,
      bellId: 'notificationBell',
      countId: 'notificationCount',
      dropdownId: 'notificationDropdown',
      listId: 'notificationList',
      markAllBtnId: 'markAllRead'
    });
    // Store refresh function globally for use in notifications view
    if (notificationsInstance && notificationsInstance.refresh) {
      window.notificationsRefresh = notificationsInstance.refresh;
    }
  } catch (err) {
    console.warn('Notifications init failed', err.message || err);
  }

  // Sidebar view switching
  const links = document.querySelectorAll('.sidebar-link');
  links.forEach(btn => btn.addEventListener('click', () => {
    links.forEach(l => l.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view;
    
    // Hide all views
    const dashboardView = document.getElementById('dashboardView');
    const requestsView = document.getElementById('requestsView');
    const notificationsView = document.getElementById('notificationsView');
    const profileView = document.getElementById('profileView');
    const settingsView = document.getElementById('settingsView');
    
    if (dashboardView) dashboardView.classList.toggle('hidden', view !== 'dashboard');
    if (requestsView) requestsView.classList.toggle('hidden', view !== 'requests');
    if (notificationsView) {
      notificationsView.classList.toggle('hidden', view !== 'notifications');
      // Load notifications when switching to notifications view
      if (view === 'notifications') {
        loadNotificationsView();
      }
    }
    if (profileView) {
      profileView.classList.toggle('hidden', view !== 'profile');
      // Load profile when switching to profile view
      if (view === 'profile') {
        initProfileView();
      }
    }
    if (settingsView) {
      settingsView.classList.toggle('hidden', view !== 'settings');
      // Load settings when switching to settings view
      if (view === 'settings') {
        initSettingsView();
      }
    }
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

  // Load notifications view
  async function loadNotificationsView() {
    try {
      const notifications = await Notifications.fetchNotifications(user?.id);
      const container = document.getElementById('notificationsFullList');
      if (!container) return;

      if (!notifications || notifications.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🔕</div>
            <h3>No notifications</h3>
            <p>You don't have any notifications yet.</p>
          </div>
        `;
        return;
      }

      // Build table
      const rows = notifications.map(n => {
        const isRead = n.read_flag || n.read;
        const rowClass = isRead ? '' : 'unread';
        const timeAgo = Utils.formatRelativeTime(n.created_at || n.createdAt);
        const requestCell = n.request_id || n.requestId
          ? `<button class="btn-secondary" data-request-id="${n.request_id || n.requestId}"><i class="fas fa-eye"></i> View</button>`
          : '<span class="muted">-</span>';
        return `
          <tr class="${rowClass}">
            <td>${n.title || 'Notification'}</td>
            <td>${n.message || ''}</td>
            <td>${timeAgo}</td>
            <td>${requestCell}</td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <div class="table-wrapper">
          <table class="requests-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Message</th>
                <th>Received</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;

      // Add click handlers for notifications with request IDs
      container.querySelectorAll('[data-request-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const requestId = btn.dataset.requestId;
          if (requestId && window.facultyPortal) {
            window.facultyPortal.viewRequest(parseInt(requestId, 10));
          }
        });
      });

      // Mark all as read button
      const markAllBtn = document.getElementById('markAllReadNotifications');
      if (markAllBtn) {
        markAllBtn.onclick = async () => {
          const ids = notifications.map(n => n.id).filter(Boolean);
          await Notifications.markAllRead(ids);
          // Reload view
          await loadNotificationsView();
          // Refresh bell count
          if (window.notificationsRefresh) {
            await window.notificationsRefresh();
          }
        };
      }
    } catch (error) {
      console.error('Failed to load notifications view:', error);
      const container = document.getElementById('notificationsFullList');
      if (container) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <h3>Error loading notifications</h3>
            <p>${error.message || 'Please try again later.'}</p>
          </div>
        `;
      }
    }
  }

  // Expose loadNotificationsView globally for refresh
  window.loadNotificationsView = loadNotificationsView;
});
// Faculty Portal JavaScript (for requests management)
class FacultyPortalRequests {
  constructor() {
    this.currentUser = Utils.getCurrentUser();
    this.allRequests = [];
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
      this.allRequests = await Utils.apiRequest('/requests');
      // Include requests relevant to this faculty:
      // - Pending faculty in same department
      // - Assigned to this faculty (any status)
      // - Requires faculty in same department and not yet approved
      this.requests = this.allRequests.filter(r => {
        const isPendingFaculty = r.status === 'pending_faculty';
        const isAssignedToMe = r.facultyId === this.currentUser.id;
        const isMyDepartment = r.departmentId === this.currentUser.departmentId;
        const requiresFaculty = r.requiresFaculty === true || r.requires_faculty === true;

        return (
          (isPendingFaculty && isMyDepartment) ||
          isAssignedToMe ||
          (requiresFaculty && isMyDepartment && !r.facultyApproval)
        );
      });
      this.filterRequests();
    } catch (error) {
      console.error('Failed to load requests:', error);
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
    let request = this.requests.find(r => r.id === requestId);
    if (!request && this.allRequests && this.allRequests.length) {
      request = this.allRequests.find(r => r.id === requestId);
    }
    if (!request) {
      Utils.showToast('Request not found', 'error');
      return;
    }

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

