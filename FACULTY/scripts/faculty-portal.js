document.addEventListener('DOMContentLoaded', async () => {
  if (!Utils.requireAuth()) return;

  const user = Utils.getCurrentUser();
  const sidebarUserInfo = document.getElementById('sidebarUserInfo');

  // Set sidebar user info (userName and userInfo will be set by FacultyPortalRequests.loadUserInfo())
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
      const fullName = document.getElementById('editFullName')?.value.trim() || '';
      const email = document.getElementById('editEmail')?.value.trim() || '';
      const contactNumber = document.getElementById('editContactNumber')?.value.trim() || '';
      const birthdate = document.getElementById('editBirthdate')?.value || '';
      const address = document.getElementById('editAddress')?.value.trim() || '';
      const gender = document.getElementById('editGender')?.value || '';

      if (!fullName) {
        Utils.showToast('Full name is required', 'error');
        return;
      }

      if (!email || !email.includes('@')) {
        Utils.showToast('Please enter a valid email address', 'error');
        return;
      }

      // Check if user is authenticated before making request
      const token = Utils.getAuthToken();
      if (!token) {
        Utils.showToast('Your session has expired. Please log in again.', 'error');
        setTimeout(() => {
          Utils.clearCurrentUser();
        }, 2000);
        return;
      }

      try {
        const updates = {
          fullName,
          email,
          contactNumber: contactNumber || null,
          birthdate: birthdate || null,
          address: address || null,
          gender: gender || null
        };

        await Utils.apiRequest('/auth/update-profile', {
          method: 'PUT',
          body: updates
        });

        // Update local user data
        Object.assign(this.currentUser, updates);
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

        Utils.showToast('Profile updated successfully!', 'success');
        
        // Refresh profile view (exit edit mode)
        this.renderProfile(false);
        
        // Update header display name
        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = this.currentUser.fullName || this.currentUser.name || 'Faculty';
      } catch (error) {
        console.error('Save profile error:', error);
        
        // Check if it's an authentication error
        if (error.message && (error.message.includes('401') || error.message.includes('Authorization token missing') || error.message.includes('Unauthorized'))) {
          Utils.showToast('Your session has expired. Please log in again.', 'error');
          setTimeout(() => {
            Utils.clearCurrentUser();
          }, 2000);
        } else {
          Utils.showToast(error.message || 'Failed to update profile. Please try again.', 'error');
        }
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
      const currentPassword = document.getElementById('currentPassword')?.value || '';
      const newPassword = document.getElementById('newPassword')?.value || '';
      const confirmPassword = document.getElementById('confirmNewPassword')?.value || '';
      const emailNotifications = document.getElementById('emailNotifications')?.checked ?? true;
      const smsNotifications = document.getElementById('smsNotifications')?.checked ?? false;

      try {
        // Handle password change first
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

        // Store notification preferences in localStorage only
        // (These are client-side preferences, not stored in database)
        this.currentUser.emailNotifications = emailNotifications;
        this.currentUser.smsNotifications = smsNotifications;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

        Utils.showToast('Settings saved successfully!', 'success');
      } catch (error) {
        console.error('Save settings error:', error);
        Utils.showToast(error.message || 'Failed to save settings', 'error');
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

  // Filter notifications to show only faculty-relevant ones
  // Faculty should ONLY see notifications for requests:
  // 1. Assigned to them specifically (type: 'request_assigned')
  // 2. Pending their approval (type: 'pending_approval')
  // NOT generic admin notes - exclude ALL admin_note notifications
  // Also deduplicate notifications (same request_id + type)
  function filterFacultyNotifications(allNotifications) {
    if (!Array.isArray(allNotifications)) return [];
    
    const user = Utils.getCurrentUser();
    if (!user || !user.id) return [];
    
    // First, filter to only show relevant notifications
    const relevant = allNotifications.filter(n => {
      const type = (n.type || '').toLowerCase();
      const title = (n.title || '').toLowerCase();
      const message = (n.message || '').toLowerCase();
      
      // EXCLUDE all admin notes - faculty don't need to see admin notes
      if (type === 'admin_note' || title.includes('admin note')) {
        return false;
      }
      
      // Always include if explicitly assigned to them
      if (type === 'request_assigned' || title.includes('assigned to you') || message.includes('assigned to you')) {
        return true;
      }
      
      // Always include if pending their approval
      if (type === 'pending_approval' || 
          title.includes('pending approval') || 
          message.includes('requires your approval') ||
          message.includes('that requires your approval')) {
        return true;
      }
      
      // Exclude student-specific notifications
      if (n.role === 'student') {
        return false;
      }
      
      // For other types with role='faculty', only include if it's clearly for them
      if (n.role === 'faculty') {
        const allowedTypes = ['request_assigned', 'pending_approval', 'status_update'];
        if (allowedTypes.includes(type)) {
          return true;
        }
        return false;
      }
      
      return false;
    });
    
    // Deduplicate: Keep only the most recent notification for each (request_id + type) combination
    const seen = new Map();
    const deduplicated = [];
    
    // Sort by created_at descending (newest first) to keep the most recent ones
    const sorted = relevant.sort((a, b) => {
      const dateA = new Date(a.created_at || a.createdAt || 0);
      const dateB = new Date(b.created_at || b.createdAt || 0);
      return dateB - dateA;
    });
    
    for (const notification of sorted) {
      const requestId = notification.request_id || notification.requestId;
      const type = (notification.type || '').toLowerCase();
      const key = `${requestId}_${type}`;
      
      // Only add if we haven't seen this (request_id + type) combination before
      if (!seen.has(key)) {
        seen.set(key, true);
        deduplicated.push(notification);
      }
    }
    
    // Sort again by date (newest first) for display
    return deduplicated.sort((a, b) => {
      const dateA = new Date(a.created_at || a.createdAt || 0);
      const dateB = new Date(b.created_at || b.createdAt || 0);
      return dateB - dateA;
    });
  }

  // Update sidebar notification badge
  function updateSidebarNotificationBadge(notifications) {
    const badge = document.getElementById('sidebarNotificationCount');
    if (!badge) return;

    // Filter to only faculty-relevant notifications
    const filteredNotifications = filterFacultyNotifications(notifications);
    const totalCount = filteredNotifications.length;

    if (totalCount > 0) {
      badge.textContent = totalCount > 9 ? '9+' : String(totalCount);
      badge.classList.remove('hidden');
    } else {
      badge.textContent = '0';
      badge.classList.add('hidden');
    }
  }
  window.updateSidebarNotificationBadge = updateSidebarNotificationBadge;

  // Initialize notifications (pass userId as fallback if server doesn't use auth header)
  try {
    const notificationsInstance = await Notifications.init({
      userId: user?.id,
      bellId: 'notificationBell',
      countId: 'notificationCount',
      dropdownId: 'notificationDropdown',
      listId: 'notificationList',
      markAllBtnId: 'markAllRead',
      onNotificationClick: async (requestId, notification) => {
        // Mark notification as read when clicked
        if (notification && !(notification.read_flag || notification.read || notification.read_at)) {
          try {
            await Notifications.markAllRead([notification.id]);
            // Update local state
            notification.read = true;
            notification.read_flag = true;
            notification.read_at = new Date().toISOString();
            // Refresh to update badge count
            if (notificationsInstance && notificationsInstance.refresh) {
              await notificationsInstance.refresh();
            }
            // Update sidebar badge
            const allNotifications = await Notifications.fetchNotifications(user?.id);
            updateSidebarNotificationBadge(allNotifications);
          } catch (error) {
            console.error('Failed to mark notification as read:', error);
          }
        }
        // Handle the click (open request)
        handleNotificationClick(requestId);
      }
    });
    // Store refresh function globally for use in notifications view
    if (notificationsInstance && notificationsInstance.refresh) {
      window.notificationsRefresh = notificationsInstance.refresh;
      
      // Wrap refresh to filter notifications and update counts correctly
      const originalRefresh = notificationsInstance.refresh;
      notificationsInstance.refresh = async function() {
        // Fetch all notifications
        const allNotifications = await Notifications.fetchNotifications(user?.id);
        // Filter to only show faculty-relevant notifications
        const filteredNotifications = filterFacultyNotifications(allNotifications);
        
        // Update the dropdown list with filtered notifications
        const list = document.getElementById('notificationList');
        const countEl = document.getElementById('notificationCount');
        const dropdown = document.getElementById('notificationDropdown');
        
        if (list) {
          list.innerHTML = '';
          if (!filteredNotifications.length) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML = '<div class="empty-state-icon">🔕</div><h4>No notifications</h4>';
            list.appendChild(empty);
            if (countEl) {
              countEl.classList.add('hidden');
              countEl.textContent = '0';
            }
          } else {
            filteredNotifications.forEach(n => {
              const item = Notifications.renderNotificationItem(n, async (requestId, notification) => {
                // Close dropdown
                if (dropdown) dropdown.classList.add('hidden');
                // Mark notification as read when clicked
                if (notification && !(notification.read_flag || notification.read || notification.read_at)) {
                  try {
                    await Notifications.markAllRead([notification.id]);
                    // Update local state
                    notification.read = true;
                    notification.read_flag = true;
                    notification.read_at = new Date().toISOString();
                    // Refresh to update badge count
                    if (notificationsInstance && notificationsInstance.refresh) {
                      await notificationsInstance.refresh();
                    }
                    // Update sidebar badge
                    const allNotifications = await Notifications.fetchNotifications(user?.id);
                    updateSidebarNotificationBadge(allNotifications);
                  } catch (error) {
                    console.error('Failed to mark notification as read:', error);
                  }
                }
                // Handle the click (open request)
                handleNotificationClick(requestId);
              });
              list.appendChild(item);
            });
            
            // Update count badge with filtered unread count
            const unreadCount = filteredNotifications.filter(n => !(n.read_flag || n.read || n.read_at)).length || 0;
            if (countEl) {
              if (unreadCount > 0) {
                countEl.classList.remove('hidden');
                countEl.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
              } else {
                countEl.classList.add('hidden');
                countEl.textContent = '0';
              }
            }
          }
        }
        
        // Update sidebar badge with filtered notifications
        updateSidebarNotificationBadge(allNotifications);
      };
      
      // Store onNotificationClick for use in refresh
      notificationsInstance.onNotificationClick = async (requestId, notification) => {
        // Mark notification as read when clicked
        if (notification && !(notification.read_flag || notification.read || notification.read_at)) {
          try {
            await Notifications.markAllRead([notification.id]);
            // Update local state
            notification.read = true;
            notification.read_flag = true;
            notification.read_at = new Date().toISOString();
            // Refresh to update badge count
            if (notificationsInstance && notificationsInstance.refresh) {
              await notificationsInstance.refresh();
            }
            // Update sidebar badge
            const allNotifications = await Notifications.fetchNotifications(user?.id);
            updateSidebarNotificationBadge(allNotifications);
          } catch (error) {
            console.error('Failed to mark notification as read:', error);
          }
        }
        // Handle the click (open request)
        handleNotificationClick(requestId);
      };
      
      // Override the mark all read button to use filtered notifications
      const markAllBtn = document.getElementById('markAllRead');
      if (markAllBtn) {
        // Remove existing listener by cloning the button
        const newMarkAllBtn = markAllBtn.cloneNode(true);
        markAllBtn.parentNode.replaceChild(newMarkAllBtn, markAllBtn);
        
        newMarkAllBtn.addEventListener('click', async () => {
          try {
            const allNotifications = await Notifications.fetchNotifications(user?.id);
            const filteredNotifications = filterFacultyNotifications(allNotifications);
            const unreadFiltered = filteredNotifications.filter(n => !(n.read_flag || n.read || n.read_at));
            const ids = unreadFiltered.map(n => n.id).filter(Boolean);
            
            if (ids.length === 0) {
              Utils.showToast('All notifications are already read', 'info');
              return;
            }
            
            await Notifications.markAllRead(ids);
            Utils.showToast('All notifications marked as read', 'success');
            
            // Refresh notifications display
            if (notificationsInstance && notificationsInstance.refresh) {
              await notificationsInstance.refresh();
            }
            // Update sidebar badge
            updateSidebarNotificationBadge(allNotifications);
          } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
            Utils.showToast('Failed to mark notifications as read', 'error');
          }
        });
      }
      
      // Initial sidebar badge update with filtered notifications
      const initialNotifications = await Notifications.fetchNotifications(user?.id);
      // updateSidebarNotificationBadge already filters inside, so just pass all notifications
      updateSidebarNotificationBadge(initialNotifications);
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

  // Load notifications view (matching admin side design)
  async function loadNotificationsView() {
    const container = document.getElementById('notificationsFullList');
    if (!container) return;

    try {
      const allNotifications = await Notifications.fetchNotifications(user?.id);
      
      // Filter to show only faculty-relevant notifications
      const notifications = filterFacultyNotifications(allNotifications);
      
      // Update sidebar notification badge
      updateSidebarNotificationBadge(notifications);

      if (!notifications || notifications.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🔔</div>
            <h3>No notifications yet</h3>
            <p>You'll see notifications here when there are updates.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = notifications.map(notif => {
        const isRead = notif.read_flag || notif.read || notif.is_read;
        const requestId = notif.request_id || notif.requestId;
        return `
        <div class="notification-item ${isRead ? '' : 'unread'} ${requestId ? 'clickable' : ''}" 
             ${requestId ? `data-request-id="${requestId}" onclick="handleNotificationClick(${requestId})"` : ''}>
          <div class="notification-icon">
            <i class="fas fa-bell"></i>
          </div>
          <div class="notification-content">
            <div class="notification-title">${notif.title || 'Notification'}</div>
            <div class="notification-message">${notif.message || ''}</div>
            <div class="notification-time">${Utils.formatDate(notif.created_at || notif.createdAt)}</div>
          </div>
          ${requestId ? '<div class="notification-arrow"><i class="fas fa-chevron-right"></i></div>' : ''}
        </div>
      `;
      }).join('');
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <h3>Failed to load notifications</h3>
        </div>
      `;
      // Update badge even on error (set to 0)
      updateSidebarNotificationBadge([]);
    }
  }

  // Handle notification click (matching admin side)
  function handleNotificationClick(requestId) {
    console.log('🔔 Notification clicked from view, request ID:', requestId);
    
    // Switch to requests view
    const links = document.querySelectorAll('.sidebar-link');
    links.forEach(l => l.classList.remove('active'));
    const requestsLink = document.querySelector('.sidebar-link[data-view="requests"]');
    if (requestsLink) requestsLink.classList.add('active');
    
    // Hide all views, show requests view
    document.getElementById('dashboardView')?.classList.add('hidden');
    document.getElementById('requestsView')?.classList.remove('hidden');
    document.getElementById('notificationsView')?.classList.add('hidden');
    document.getElementById('profileView')?.classList.add('hidden');
    document.getElementById('settingsView')?.classList.add('hidden');
    
    // View the specific request after a short delay
    setTimeout(() => {
      if (window.facultyPortal && window.facultyPortal.viewRequest) {
        window.facultyPortal.viewRequest(requestId);
      }
    }, 100);
  }
  window.handleNotificationClick = handleNotificationClick;

  // Mark all as read button handler (matching admin side)
  const markAllReadSecondary = document.getElementById('markAllReadSecondary');
  if (markAllReadSecondary) {
    markAllReadSecondary.addEventListener('click', async () => {
      try {
        const allNotifications = await Notifications.fetchNotifications(user?.id);
        const filteredNotifications = filterFacultyNotifications(allNotifications);
        const ids = filteredNotifications.map(n => n.id).filter(Boolean);
        
        if (ids.length > 0) {
          await Notifications.markAllRead(ids);
        }
        
        Utils.showToast('All notifications marked as read', 'success');
        await loadNotificationsView();
        // Refresh bell count
        if (window.notificationsRefresh) {
          await window.notificationsRefresh();
        }
      } catch (err) {
        console.error('Failed to mark all as read:', err);
        Utils.showToast('Failed to mark notifications as read', 'error');
      }
    });
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
    this.allDepartmentRequests = [];
    this.filteredAllRequests = [];
    this.filterStatus = 'all';
    this.filterPriority = 'all';
    this.searchQuery = '';
    this.allFilterStatus = 'all';
    this.allFilterPriority = 'all';
    this.allSearchQuery = '';
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
    this.renderAllRequests();
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
      
      // All requests in the faculty's department (for "All Document Requests" section)
      this.allDepartmentRequests = this.allRequests.filter(r => {
        return r.departmentId === this.currentUser.departmentId;
      });
      
      this.filterRequests();
      this.filterAllRequests();
    } catch (error) {
      console.error('Failed to load requests:', error);
      Utils.showToast('Failed to load requests', 'error');
    }
  }

  filterRequests() {
    let filtered = [...this.requests];
    
    // Status filter
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === this.filterStatus);
    }
    
    // Priority filter
    if (this.filterPriority !== 'all') {
      filtered = filtered.filter(r => r.priority === this.filterPriority);
    }
    
    // Search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(request => {
        const matchesName = (request.studentName || request.student_name || '').toLowerCase().includes(query);
        const matchesId = (request.studentIdNumber || request.student_id_number || '').toLowerCase().includes(query);
        const matchesDoc = (request.documentType || request.document_label || request.documentValue || '').toLowerCase().includes(query);
        const matchesCode = (request.requestCode || '').toLowerCase().includes(query);
        return matchesName || matchesId || matchesDoc || matchesCode;
      });
    }
    
    this.filteredRequests = filtered;
    this.renderRequests();
  }

  filterAllRequests() {
    let filtered = [...this.allDepartmentRequests];
    
    // Status filter
    if (this.allFilterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === this.allFilterStatus);
    }
    
    // Priority filter
    if (this.allFilterPriority !== 'all') {
      filtered = filtered.filter(r => r.priority === this.allFilterPriority);
    }
    
    // Search filter
    if (this.allSearchQuery) {
      const query = this.allSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(request => {
        const matchesName = (request.studentName || request.student_name || '').toLowerCase().includes(query);
        const matchesId = (request.studentIdNumber || request.student_id_number || '').toLowerCase().includes(query);
        const matchesDoc = (request.documentType || request.document_label || request.documentValue || '').toLowerCase().includes(query);
        const matchesCode = (request.requestCode || '').toLowerCase().includes(query);
        return matchesName || matchesId || matchesDoc || matchesCode;
      });
    }
    
    this.filteredAllRequests = filtered;
    this.renderAllRequests();
  }

  renderRequests() {
    const container = document.getElementById('requestsList');
    if (!container) return;

    if (this.filteredRequests.length === 0) {
      let message = 'No requests found';
      if (this.searchQuery || this.filterStatus !== 'all' || this.filterPriority !== 'all') {
        message = 'No requests match your filters';
      }
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>${message}</h3>
          <p>Try adjusting your filters or search query.</p>
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

  renderAllRequests() {
    const container = document.getElementById('allRequestsList');
    if (!container) return;

    if (this.filteredAllRequests.length === 0) {
      let message = 'No requests found';
      if (this.allSearchQuery || this.allFilterStatus !== 'all' || this.allFilterPriority !== 'all') {
        message = 'No requests match your filters';
      }
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🗂️</div>
          <h3>${message}</h3>
          <p>Try adjusting your filters or search query.</p>
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

    // Sort: Completed always at bottom, then urgent non-completed at top, then normal non-completed
    const sortedRequests = this.filteredAllRequests.sort((a, b) => {
      const aIsUrgent = a.priority === 'urgent';
      const bIsUrgent = b.priority === 'urgent';
      const aIsCompleted = a.status === 'completed';
      const bIsCompleted = b.status === 'completed';
      
      // Completed requests ALWAYS go to bottom (regardless of priority)
      if (aIsCompleted && !bIsCompleted) return 1;
      if (!aIsCompleted && bIsCompleted) return -1;
      
      // If both completed or both not completed, then check priority
      // Urgent non-completed requests come first
      if (!aIsCompleted && !bIsCompleted) {
        if (aIsUrgent && !bIsUrgent) return -1;
        if (!aIsUrgent && bIsUrgent) return 1;
      }
      
      // If both completed, urgent completed can be above normal completed
      if (aIsCompleted && bIsCompleted) {
        if (aIsUrgent && !bIsUrgent) return -1;
        if (!aIsUrgent && bIsUrgent) return 1;
      }
      
      // If same completion status and priority, sort by date (newest first)
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
    // Status filter dropdown
    const filterSelect = document.getElementById('filterStatus');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.filterStatus = e.target.value;
        this.filterRequests();
      });
    }
    
    // Priority filter dropdown
    const prioritySelect = document.getElementById('filterPriority');
    if (prioritySelect) {
      prioritySelect.addEventListener('change', (e) => {
        this.filterPriority = e.target.value;
        this.filterRequests();
      });
    }
    
    // Search input
    const searchInput = document.getElementById('requestsSearchInput');
    if (searchInput) {
      // Filter on input with debounce
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.searchQuery = e.target.value;
          this.filterRequests();
        }, 300); // Wait 300ms after user stops typing
      });
    }

    // All Document Requests - Status filter dropdown
    const allFilterSelect = document.getElementById('allFilterStatus');
    if (allFilterSelect) {
      allFilterSelect.addEventListener('change', (e) => {
        this.allFilterStatus = e.target.value;
        this.filterAllRequests();
      });
    }
    
    // All Document Requests - Priority filter dropdown
    const allPrioritySelect = document.getElementById('allFilterPriority');
    if (allPrioritySelect) {
      allPrioritySelect.addEventListener('change', (e) => {
        this.allFilterPriority = e.target.value;
        this.filterAllRequests();
      });
    }
    
    // All Document Requests - Search input
    const allSearchInput = document.getElementById('allRequestsSearchInput');
    if (allSearchInput) {
      // Filter on input with debounce
      let allSearchTimeout;
      allSearchInput.addEventListener('input', (e) => {
        clearTimeout(allSearchTimeout);
        allSearchTimeout = setTimeout(() => {
          this.allSearchQuery = e.target.value;
          this.filterAllRequests();
        }, 300); // Wait 300ms after user stops typing
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

      const response = await Utils.apiRequest(`/requests/${requestId}`, {
        method: 'PATCH',
        body: {
          status: action === 'approve' ? 'in_progress' : 'declined',
          facultyId: this.currentUser.id,
          facultyApproval: approvalData,
        }
      });

      Utils.showToast(`Request ${action === 'approve' ? 'approved' : 'declined'} successfully!`, 'success');
      
      // Close approval modal
      const approvalModal = document.getElementById('approvalModal');
      if (approvalModal) approvalModal.remove();
      
      // Close and refresh request details modal if open
      const viewRequestModal = document.getElementById('viewRequestModal');
      if (viewRequestModal) {
        viewRequestModal.remove();
      }
      
      // Reload requests to get updated status
      await this.loadRequests();
      this.updateStats();
      this.renderRequests();
      this.renderAllRequests();
      
      // If the request details modal was open, reopen it with updated data
      if (viewRequestModal) {
        // Small delay to ensure data is refreshed
        setTimeout(() => {
          this.viewRequest(requestId);
        }, 300);
      }
    } catch (error) {
      Utils.showToast('Failed to submit approval', 'error');
    }
  }

  async viewRequest(requestId) {
    // Always fetch fresh data from API to ensure status is up-to-date
    let request;
    try {
      request = await Utils.apiRequest(`/requests/${requestId}`, { method: 'GET' });
    } catch (error) {
      console.error('Failed to load request:', error);
      Utils.showToast('Request not found', 'error');
      return;
    }
    
    if (!request) {
      Utils.showToast('Request not found', 'error');
      return;
    }
    
    // Update local cache with fresh data
    const localRequestIndex = this.requests?.findIndex(r => r.id === requestId);
    if (localRequestIndex !== undefined && localRequestIndex >= 0) {
      this.requests[localRequestIndex] = request;
    }
    
    const allRequestIndex = this.allRequests?.findIndex(r => r.id === requestId);
    if (allRequestIndex !== undefined && allRequestIndex >= 0) {
      this.allRequests[allRequestIndex] = request;
    }

    // Load internal messages (admin-faculty only)
    let internalMessages = [];
    try {
      const allMessages = await Utils.apiRequest(`/conversations/${requestId}`, {
        timeout: 10000
      });
      // Filter to only show internal messages (admin-faculty communication)
      internalMessages = allMessages.filter(msg => msg.is_internal === true || msg.is_internal === 1);
    } catch (error) {
      console.error('Failed to load internal messages:', error);
    }

    // Format messages for display
    const messagesHTML = internalMessages.length > 0
      ? internalMessages.map((msg) => {
          const isAdmin = msg.role === 'admin';
          const isFaculty = msg.role === 'faculty';
          return `
            <div style="display: flex; flex-direction: column; align-items: ${isAdmin ? 'flex-start' : 'flex-end'}; margin-bottom: 1rem;">
              <div style="background: ${isAdmin ? 'var(--bg-cream)' : '#D1FAE5'}; border: 1px solid ${isAdmin ? 'var(--border-gray)' : '#10B981'}; border-radius: 8px; padding: 0.875rem 1rem; max-width: 85%; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                ${isAdmin ? `
                  <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text-dark); font-size: 0.9rem;">${msg.full_name || 'Admin'}</div>
                  <div style="font-size: 0.9rem; color: var(--text-dark); line-height: 1.5; margin-bottom: 0.5rem;">${msg.message}</div>
                  <div style="font-size: 0.75rem; color: var(--text-dark); opacity: 0.6;">${Utils.formatDate(msg.created_at)}</div>
                ` : `
                  <div style="font-weight: 600; margin-bottom: 0.5rem; color: #065F46; font-size: 0.9rem;">${msg.full_name || 'Faculty'}</div>
                  <div style="font-size: 0.9rem; color: #065F46; line-height: 1.5; margin-bottom: 0.5rem;">${msg.message}</div>
                  <div style="font-size: 0.75rem; color: #065F46; opacity: 0.7;">${Utils.formatDate(msg.created_at)}</div>
                `}
              </div>
            </div>
          `;
        }).join('')
      : '<p style="opacity: 0.6; padding: 1rem; text-align: center; font-style: italic; background: var(--bg-cream); border-radius: 8px; border: 1px solid var(--border-gray);">No messages yet. Start the conversation!</p>';

    const statusClass = Utils.getStatusBadgeClass(request.status);
    const statusText = Utils.getStatusText(request.status);

    // Parse faculty approval if it's a JSON string
    let facultyApproval = request.facultyApproval;
    if (typeof facultyApproval === 'string') {
      try {
        facultyApproval = JSON.parse(facultyApproval);
      } catch (e) {
        facultyApproval = null;
      }
    }

    const approvalHTML = facultyApproval && facultyApproval.status
      ? `
          <div style="padding: 0.75rem; background: ${facultyApproval.status === 'approved' ? '#D1FAE5' : '#FEE2E2'}; border-radius: 6px;">
            <div style="font-weight: 600; margin-bottom: 0.25rem;">
              ${facultyApproval.facultyName || 'Faculty'} - ${(facultyApproval.status || 'pending').toUpperCase()}
            </div>
            ${facultyApproval.comment ? `<div style="margin-top: 0.5rem;">${facultyApproval.comment}</div>` : ''}
            ${facultyApproval.timestamp ? `<div style="font-size: 0.8rem; opacity: 0.6; margin-top: 0.25rem;">${Utils.formatDate(facultyApproval.timestamp)}</div>` : ''}
          </div>
        `
      : '<p style="opacity: 0.6;">Not yet reviewed</p>';

    const modalHTML = `
      <div class="modal-overlay active" id="viewRequestModal">
        <div class="request-modal">
          <div class="modal-header">
            <h2>Request Details</h2>
            <button class="close-modal" onclick="document.getElementById('viewRequestModal').remove()">&times;</button>
          </div>
          <div class="request-modal-body">
            <div class="request-modal-content">
            <!-- First Column: Student Information & Document Details -->
            <div class="request-modal-column">
              <!-- Student Information Section -->
              <div style="margin-bottom: 2rem;">
                <h3 style="color: var(--recoletos-green); margin-bottom: 1rem; font-size: 1.1rem; font-weight: 600;">
                  <i class="fas fa-user"></i> Student Information
                </h3>
                <div class="document-details-horizontal" style="background: var(--bg-cream); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-gray);">
                  <div class="detail-label">Full Name:</div>
                  <div class="detail-value">${request.studentName || 'N/A'}</div>
                  
                  <div class="detail-label">ID Number:</div>
                  <div class="detail-value">${request.studentIdNumber || 'N/A'}</div>
                  
                  <div class="detail-label">Course:</div>
                  <div class="detail-value">${request.studentCourse || 'N/A'}</div>
                  
                  <div class="detail-label">Year Level:</div>
                  <div class="detail-value">${request.studentYearLevel || 'N/A'}</div>
                  
                  <div class="detail-label">Email:</div>
                  <div class="detail-value">${request.studentEmail || 'N/A'}</div>
                </div>
              </div>

              <!-- Document Details Section -->
              <div>
                <h3 style="color: var(--recoletos-green); margin-bottom: 1rem; font-size: 1.1rem; font-weight: 600;">
                  <i class="fas fa-file-alt"></i> Document Details
                </h3>
                <div class="document-details-horizontal">
                  <div class="detail-label">Request Code:</div>
                  <div class="detail-value">${request.requestCode || 'N/A'}</div>
                  
                  <div class="detail-label">Document Type:</div>
                  <div class="detail-value">${request.documentType || request.documentValue || 'N/A'}</div>
                  
                  <div class="detail-label">Department:</div>
                  <div class="detail-value">${request.department || 'N/A'}</div>
                  
                  <div class="detail-label">Submitted:</div>
                  <div class="detail-value">${Utils.formatDate(request.submittedAt || request.submitted_at)}</div>
                  
                  <div class="detail-label">Last Updated:</div>
                  <div class="detail-value">${Utils.formatDate(request.updatedAt || request.updated_at)}</div>
                  
                  <div class="detail-label">Quantity:</div>
                  <div class="detail-value">${request.quantity || 1}</div>
                  
                  <div class="detail-label">Purpose:</div>
                  <div class="detail-value">${request.purpose || 'None'}</div>
                  
                  <div class="detail-label">Status:</div>
                  <div class="detail-value"><span class="status-badge ${statusClass}">${statusText}</span></div>
                </div>
              </div>

              ${request.attachments && request.attachments.length ? `
              <div style="margin-top: 1.5rem;">
                <h3 style="color: var(--recoletos-green); margin-bottom: 0.75rem; font-size: 1.1rem; font-weight: 600;">
                  <i class="fas fa-paperclip"></i> Supporting Documents
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.75rem;">
                  ${request.attachments.map((att) => {
                    const isPDF = att.url && (att.url.toLowerCase().endsWith('.pdf') || att.name && att.name.toLowerCase().endsWith('.pdf'));
                    const isImage = att.url && (att.url.toLowerCase().match(/\.(jpg|jpeg|png)$/i) || att.name && att.name.toLowerCase().match(/\.(jpg|jpeg|png)$/i));
                    
                    if (isPDF) {
                      // PDF files - show as file link
                      return `
                        <div style="display: flex; flex-direction: column; align-items: center; padding: 0.75rem; background: var(--bg-cream); border: 1px solid var(--border-gray); border-radius: 8px;">
                          <div style="width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; background: #dc2626; border-radius: 8px; margin-bottom: 0.5rem;">
                            <i class="fas fa-file-pdf" style="color: var(--white); font-size: 2.5rem;"></i>
                          </div>
                          <div style="font-size: 0.85rem; color: var(--text-dark); text-align: center; word-break: break-word; margin-bottom: 0.5rem; font-weight: 500;">
                            ${att.name || 'Document.pdf'}
                          </div>
                          <a 
                            href="${att.url}" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style="padding: 0.4rem 0.75rem; background: var(--recoletos-green); color: var(--white); border-radius: 6px; text-decoration: none; font-size: 0.8rem; font-weight: 500; display: inline-flex; align-items: center; gap: 0.4rem; transition: background 0.2s;"
                            onmouseover="this.style.background='#003318'"
                            onmouseout="this.style.background='var(--recoletos-green)'"
                          >
                            <i class="fas fa-external-link-alt"></i> View
                          </a>
                        </div>
                      `;
                    } else {
                      // Image files - show as 120x120 thumbnail
                      return `
                        <a href="${att.url}" target="_blank" rel="noopener noreferrer" style="display: block; text-decoration: none;">
                          <div style="position: relative; width: 120px; height: 120px; border-radius: 8px; border: 1px solid var(--border-gray); overflow: hidden; background: var(--bg-cream); margin: 0 auto;">
                            <img 
                              src="${att.url}" 
                              alt="${att.name || 'Supporting Document'}" 
                              style="width: 100%; height: 100%; object-fit: cover; display: block;"
                              onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'%3E%3Crect fill=\'%23f3f4f6\' width=\'120\' height=\'120\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%239ca3af\' font-family=\'Arial\' font-size=\'12\'%3EImage%3C/text%3E%3C/svg%3E';"
                            />
                          </div>
                          <div style="font-size: 0.75rem; color: var(--text-dark); text-align: center; margin-top: 0.5rem; word-break: break-word; padding: 0 0.25rem;">
                            ${att.name || 'Image'}
                          </div>
                        </a>
                      `;
                    }
                  }).join('')}
                </div>
              </div>
              ` : ''}

              ${request.facultyApproval !== null || request.status === 'pending_faculty' ? `
              <div style="margin-top: 1.5rem;">
                <h3 style="color: var(--recoletos-green); margin-bottom: 0.75rem; font-size: 1.1rem; font-weight: 600;">
                  <i class="fas fa-user-check"></i> Your Approval
                </h3>
                ${approvalHTML}
              </div>
              ` : ''}
            </div>

            <!-- Second Column: Notes & Communication -->
            <div class="request-modal-column">
              <h3>Notes & Communication (Admin)</h3>
              
              <div>
                <!-- Chat Messages Display -->
                <div style="margin-bottom: 1.5rem; max-height: 350px; overflow-y: auto; padding: 0.5rem; background: var(--white); border-radius: 8px; border: 1px solid var(--border-gray);">
                  ${messagesHTML}
                </div>

                <!-- Faculty Input Section -->
                <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-gray);">
                  <textarea 
                    id="facultyAdminNoteInput" 
                    placeholder="Send a message to admin..."
                    style="width: 100%; min-height: 100px; padding: 0.75rem; border: 1px solid var(--border-gray); border-radius: 8px; font-size: 0.9rem; font-family: inherit; resize: vertical; background: var(--white); margin-bottom: 0.75rem;"
                  ></textarea>
                  <div style="display: flex; justify-content: flex-end;">
                    <button 
                      type="button"
                      id="sendAdminNoteBtn" 
                      onclick="window.facultyPortal.sendAdminNote(${requestId})"
                      style="padding: 0.75rem 1.5rem; background: var(--recoletos-green); color: var(--white); border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: background 0.2s ease; display: flex; align-items: center; gap: 0.5rem;"
                      onmouseover="this.style.background='#003318'"
                      onmouseout="this.style.background='var(--recoletos-green)'"
                    >
                      <i class="fas fa-paper-plane" style="font-size: 0.85rem;"></i> Send to Admin
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

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('viewRequestModal');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Auto-scroll chat messages to bottom
    const chatContainer = modal.querySelector('[style*="max-height: 300px"]');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  async sendAdminNote(requestId) {
    const noteInput = document.getElementById('facultyAdminNoteInput');
    const sendBtn = document.getElementById('sendAdminNoteBtn');
    
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
      // Send as internal message (is_internal = true) so only admin and faculty can see it
      await Utils.apiRequest(`/conversations/${requestId}`, {
        method: 'POST',
        body: { 
          message,
          isInternal: true  // This makes it visible only to admin and faculty
        },
        timeout: 10000
      });

      Utils.showToast('Message sent to admin!', 'success');
      noteInput.value = '';

      // Reload the modal to show the new message
      const modal = document.getElementById('viewRequestModal');
      if (modal) {
        modal.remove();
        await this.viewRequest(requestId);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      Utils.showToast('Failed to send message', 'error');
    } finally {
      // Re-enable button
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<i class="fas fa-paper-plane" style="font-size: 0.75rem;"></i> Send to Admin';
    }
  }
}

// Initialize requests portal when DOM is loaded (separate from profile/settings)
let facultyPortalRequests;
document.addEventListener('DOMContentLoaded', () => {
  facultyPortalRequests = new FacultyPortalRequests();
  window.facultyPortal = facultyPortalRequests; // Keep this for backward compatibility with request handlers
});

