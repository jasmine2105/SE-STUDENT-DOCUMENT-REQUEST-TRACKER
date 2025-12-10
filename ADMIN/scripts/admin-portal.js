document.addEventListener('DOMContentLoaded', async () => {
  if (!Utils.requireAuth()) return;

  const user = Utils.getCurrentUser();
  const userNameEl = document.getElementById('userName');
  const userInfoEl = document.getElementById('userInfo');
  const sidebarUserInfo = document.getElementById('sidebarUserInfo');

  if (userNameEl) userNameEl.textContent = user?.fullName || user?.name || 'Admin';
  const deptDisplay = user?.departmentName || user?.department || '';
  if (userInfoEl) userInfoEl.textContent = deptDisplay ? `${deptDisplay} • Administrator` : 'Administrator';
  if (sidebarUserInfo) sidebarUserInfo.textContent = user?.fullName || '';

  // Initialize notifications
  let notificationsInstance = null;
  try {
    notificationsInstance = await Notifications.init({
      userId: user?.id,
      bellId: 'notificationBell',
      countId: 'notificationCount',
      dropdownId: 'notificationDropdown',
      listId: 'notificationList',
      markAllBtnId: 'markAllRead',
      onNotificationClick: async (requestId, notification) => {
        console.log('🔔 Notification clicked, request ID:', requestId);
        
        // Mark notification as read when clicked
        if (notification && !(notification.read_flag || notification.read || notification.read_at)) {
          try {
            await Notifications.markAllRead([notification.id]);
            // Update local state
            notification.read = true;
            notification.read_flag = true;
            notification.read_at = new Date().toISOString();
            // Refresh to update badge count - use the instance from closure
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
        
        // Switch to requests view
        const links = document.querySelectorAll('.sidebar-link');
        links.forEach(l => l.classList.remove('active'));
        const requestsLink = document.querySelector('.sidebar-link[data-view="requests"]');
        if (requestsLink) requestsLink.classList.add('active');
        
        // Hide all views, show requests view
        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('requestsView').classList.remove('hidden');
        document.getElementById('usersView').classList.add('hidden');
        document.getElementById('notificationsView').classList.add('hidden');
        document.getElementById('profileView').classList.add('hidden');
        document.getElementById('settingsView').classList.add('hidden');
        
        // View the specific request after a short delay to ensure view is loaded
        setTimeout(() => {
          if (window.adminPortal && window.adminPortal.viewRequest) {
            window.adminPortal.viewRequest(requestId);
          }
        }, 100);
      }
    });
    
    // Override the mark all read button to use the correct endpoint
    if (notificationsInstance) {
      const markAllBtn = document.getElementById('markAllRead');
      if (markAllBtn) {
        // Remove existing listener by cloning the button
        const newMarkAllBtn = markAllBtn.cloneNode(true);
        markAllBtn.parentNode.replaceChild(newMarkAllBtn, markAllBtn);
        
        newMarkAllBtn.addEventListener('click', async () => {
          try {
            const allNotifications = await Notifications.fetchNotifications(user?.id);
            const unreadNotifications = allNotifications.filter(n => !(n.read_flag || n.read || n.read_at));
            const ids = unreadNotifications.map(n => n.id).filter(Boolean);
            
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
    }
    
    // Function to refresh notifications and update sidebar badge
    async function refreshNotificationsAndBadge() {
      try {
        if (notificationsInstance && notificationsInstance.refresh) {
          await notificationsInstance.refresh();
        }
        // Also fetch and update sidebar badge
        const notifications = await Notifications.fetchNotifications(user?.id);
        updateSidebarNotificationBadge(notifications);
      } catch (err) {
        // Silently fail - don't spam console
      }
    }

    // Set up polling for new notifications every 30 seconds
    setInterval(refreshNotificationsAndBadge, 30000);
    
    // Initial sidebar badge update
    refreshNotificationsAndBadge();
    
    console.log('✅ Notifications initialized with polling');
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
    document.getElementById('dashboardView').classList.toggle('hidden', view !== 'dashboard');
    document.getElementById('requestsView').classList.toggle('hidden', view !== 'requests');
    document.getElementById('usersView').classList.toggle('hidden', view !== 'users');
    document.getElementById('notificationsView').classList.toggle('hidden', view !== 'notifications');
    document.getElementById('profileView').classList.toggle('hidden', view !== 'profile');
    document.getElementById('settingsView').classList.toggle('hidden', view !== 'settings');
    
    // Load content based on view
    if (view === 'users') {
      window.adminPortal?.loadUsers();
    }
    if (view === 'profile') {
      renderAdminProfile();
    }
    if (view === 'settings') {
      renderAdminSettings();
    }
    if (view === 'notifications') {
      renderNotificationsView();
    }
  }));

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => Utils.clearCurrentUser());
  
  // Mark all read button in notifications view
  const markAllReadSecondary = document.getElementById('markAllReadSecondary');
  if (markAllReadSecondary) {
    markAllReadSecondary.addEventListener('click', async () => {
      try {
        const allNotifications = await Notifications.fetchNotifications(user?.id);
        const unreadNotifications = allNotifications.filter(n => !(n.read_flag || n.read || n.read_at));
        const ids = unreadNotifications.map(n => n.id).filter(Boolean);
        
        if (ids.length === 0) {
          Utils.showToast('All notifications are already read', 'info');
          return;
        }
        
        await Notifications.markAllRead(ids);
        Utils.showToast('All notifications marked as read', 'success');
        renderNotificationsView();
        // Update sidebar badge
        updateSidebarNotificationBadge(allNotifications);
        // Refresh bell count
        if (notificationsInstance && notificationsInstance.refresh) {
          await notificationsInstance.refresh();
        }
      } catch (err) {
        console.error('Failed to mark all notifications as read:', err);
        Utils.showToast('Failed to mark notifications as read', 'error');
      }
    });
  }

  // Profile rendering function
  function renderAdminProfile(isEditMode = false) {
    const container = document.getElementById('profileContent');
    if (!container) return;
    
    const user = Utils.getCurrentUser();
    
    const formatValue = (value) => {
      if (!value || value === '-' || (typeof value === 'string' && value.trim() === '')) {
        return 'Not Provided';
      }
      return value;
    };

    const displayName = user?.fullName || user?.name || 'Administrator';
    const deptName = user?.departmentName || user?.department || 'Not Assigned';
    const roleName = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Admin';

    // Store edit mode state
    window.adminProfileEditMode = isEditMode;

    container.innerHTML = `
      <div class="profile-view-content">
        <div class="profile-header-card">
          <div class="profile-photo-wrapper">
            <div class="profile-photo" id="profilePhotoDisplay" style="${user?.profilePhoto ? `background-image: url('${user.profilePhoto}'); background-size: cover; background-position: center;` : ''}">
              ${!user?.profilePhoto ? '<i class="fas fa-user"></i>' : ''}
            </div>
            <button class="profile-photo-edit" id="profilePhotoEditBtn" title="Upload Photo" onclick="document.getElementById('adminProfilePhotoInput').click()">
              <i class="fas fa-camera"></i>
            </button>
            <input type="file" id="adminProfilePhotoInput" accept="image/*" style="display: none;" onchange="handleAdminPhotoUpload(event)" />
          </div>
          <div class="profile-header-info">
            <h3>${displayName}</h3>
            <p class="profile-student-number">${formatValue(user?.idNumber)}</p>
            <p class="profile-course-year">${deptName} • ${roleName}</p>
            <p class="profile-email">${formatValue(user?.email)}</p>
          </div>
          <div class="profile-header-actions">
            ${isEditMode ? `
              <button class="btn-save-profile" onclick="saveAdminProfile()">
                <i class="fas fa-save"></i> Save Changes
              </button>
              <button class="btn-cancel-profile" onclick="renderAdminProfile(false)">
                <i class="fas fa-times"></i> Cancel
              </button>
            ` : `
              <button class="btn-edit-profile" onclick="renderAdminProfile(true)">
                <i class="fas fa-edit"></i> Edit Profile
              </button>
              <button class="btn-settings-profile" onclick="switchToSettingsView()">
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
                  <input type="text" id="editFullName" class="profile-edit-input" value="${user?.fullName || user?.name || ''}" />
                ` : `
                  <span class="profile-info-value">${formatValue(displayName)}</span>
                `}
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">ID Number</span>
                <span class="profile-info-value">${formatValue(user?.idNumber)}</span>
                <small style="color: #666; font-size: 0.85rem; display: block; margin-top: 0.25rem;">ID Number cannot be changed</small>
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">Email</span>
                ${isEditMode ? `
                  <input type="email" id="editEmail" class="profile-edit-input" value="${user?.email || ''}" />
                ` : `
                  <span class="profile-info-value">${formatValue(user?.email)}</span>
                `}
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">Contact Number</span>
                ${isEditMode ? `
                  <input type="tel" id="editContactNumber" class="profile-edit-input" value="${user?.contactNumber || ''}" placeholder="Enter contact number" />
                ` : `
                  <span class="profile-info-value">${formatValue(user?.contactNumber)}</span>
                `}
              </div>
            </div>
            <div class="profile-info-column">
              <div class="profile-info-item">
                <span class="profile-info-label">Birthdate</span>
                ${isEditMode ? `
                  <input type="date" id="editBirthdate" class="profile-edit-input" value="${user?.birthdate || ''}" />
                ` : `
                  <span class="profile-info-value">${formatValue(user?.birthdate)}</span>
                `}
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">Address</span>
                ${isEditMode ? `
                  <textarea id="editAddress" class="profile-edit-textarea" placeholder="Enter address">${user?.address || ''}</textarea>
                ` : `
                  <span class="profile-info-value">${formatValue(user?.address)}</span>
                `}
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">Gender</span>
                ${isEditMode ? `
                  <select id="editGender" class="profile-edit-input">
                    <option value="">Select Gender</option>
                    <option value="Male" ${user?.gender === 'Male' ? 'selected' : ''}>Male</option>
                    <option value="Female" ${user?.gender === 'Female' ? 'selected' : ''}>Female</option>
                    <option value="Other" ${user?.gender === 'Other' ? 'selected' : ''}>Other</option>
                    <option value="Prefer not to say" ${user?.gender === 'Prefer not to say' ? 'selected' : ''}>Prefer not to say</option>
                  </select>
                ` : `
                  <span class="profile-info-value">${formatValue(user?.gender)}</span>
                `}
              </div>
            </div>
          </div>
        </div>

        <div class="profile-section-card">
          <h4 class="profile-section-title">
            <i class="fas fa-briefcase"></i> Administrative Information
          </h4>
          <div class="profile-academic-grid">
            <div class="profile-academic-item">
              <span class="profile-academic-label">Department</span>
              <span class="profile-academic-value">${formatValue(deptName)}</span>
              <small style="color: #666; font-size: 0.85rem; display: block; margin-top: 0.25rem;">Cannot be changed</small>
            </div>
            <div class="profile-academic-item">
              <span class="profile-academic-label">Role</span>
              <span class="profile-academic-value">${roleName}</span>
              <small style="color: #666; font-size: 0.85rem; display: block; margin-top: 0.25rem;">Cannot be changed</small>
            </div>
            <div class="profile-academic-item">
              <span class="profile-academic-label">Position</span>
              <span class="profile-academic-value">${formatValue(user?.position || 'Administrator')}</span>
              <small style="color: #666; font-size: 0.85rem; display: block; margin-top: 0.25rem;">Cannot be changed</small>
            </div>
            <div class="profile-academic-item">
              <span class="profile-academic-label">Status</span>
              <span class="profile-academic-value">${formatValue(user?.status || 'Active')}</span>
            </div>
          </div>
          </div>
        </div>
      </div>
    `;

    // Load profile photo after rendering
    setTimeout(() => {
      if (typeof loadAdminProfilePhoto === 'function') {
        loadAdminProfilePhoto();
      }
    }, 100);
  }

  // Make renderAdminProfile globally accessible
  window.renderAdminProfile = renderAdminProfile;

  // Switch to settings view
  function switchToSettingsView() {
    const links = document.querySelectorAll('.sidebar-link');
    links.forEach(l => l.classList.remove('active'));
    const settingsLink = document.querySelector('.sidebar-link[data-view="settings"]');
    if (settingsLink) settingsLink.classList.add('active');
    
    document.getElementById('dashboardView').classList.add('hidden');
    document.getElementById('requestsView').classList.add('hidden');
    document.getElementById('usersView').classList.add('hidden');
    document.getElementById('notificationsView').classList.add('hidden');
    document.getElementById('profileView').classList.add('hidden');
    document.getElementById('settingsView').classList.remove('hidden');
    
    renderAdminSettings();
  }
  window.switchToSettingsView = switchToSettingsView;

  // Handle admin photo upload
  async function handleAdminPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Utils.showToast('Please select an image file', 'error');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      Utils.showToast('Image size must be less than 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target.result;
      const user = Utils.getCurrentUser();
      const userId = user.id;
      const storageKey = `profileImage_${userId}`;
      
      // Store in localStorage
      localStorage.setItem(storageKey, imageData);
      
      // Update current user object
      user.profilePhoto = imageData;
      localStorage.setItem('currentUser', JSON.stringify(user));
      
      // Update display immediately
      const photoDisplay = document.getElementById('profilePhotoDisplay');
      if (photoDisplay) {
        photoDisplay.style.backgroundImage = `url('${imageData}')`;
        photoDisplay.style.backgroundSize = 'cover';
        photoDisplay.style.backgroundPosition = 'center';
        const icon = photoDisplay.querySelector('i');
        if (icon) icon.style.display = 'none';
      }
      
      // Also update header profile display if it exists
      updateAdminHeaderProfilePhoto(imageData);
      
      Utils.showToast('Profile photo updated!', 'success');
    };
    reader.onerror = () => {
      Utils.showToast('Failed to read image file', 'error');
    };
    reader.readAsDataURL(file);
    
    // Reset input
    event.target.value = '';
  }
  window.handleAdminPhotoUpload = handleAdminPhotoUpload;

  // Update header profile photo for admin
  function updateAdminHeaderProfilePhoto(imageData) {
    // Update profile photo in header if it exists
    const headerProfile = document.querySelector('.user-profile-display .user-pill i');
    if (headerProfile && imageData) {
      // Create an img element or update background
      const parent = headerProfile.parentElement;
      if (parent) {
        let img = parent.querySelector('img.profile-photo-img');
        if (!img) {
          img = document.createElement('img');
          img.className = 'profile-photo-img';
          img.style.cssText = 'width: 32px; height: 32px; border-radius: 50%; object-fit: cover; margin-right: 0.5rem;';
          parent.insertBefore(img, headerProfile);
        }
        img.src = imageData;
        headerProfile.style.display = 'none';
      }
    }
  }

  // Load admin profile photo
  function loadAdminProfilePhoto() {
    const user = Utils.getCurrentUser();
    if (!user) return;
    
    const userId = user.id;
    const storageKey = `profileImage_${userId}`;
    const savedImage = localStorage.getItem(storageKey);
    
    if (savedImage) {
      user.profilePhoto = savedImage;
      const photoDisplay = document.getElementById('profilePhotoDisplay');
      if (photoDisplay) {
        photoDisplay.style.backgroundImage = `url('${savedImage}')`;
        photoDisplay.style.backgroundSize = 'cover';
        photoDisplay.style.backgroundPosition = 'center';
        const icon = photoDisplay.querySelector('i');
        if (icon) icon.style.display = 'none';
      }
      updateAdminHeaderProfilePhoto(savedImage);
    }
  }
  window.loadAdminProfilePhoto = loadAdminProfilePhoto;

  // Save admin profile
  async function saveAdminProfile() {
    const user = Utils.getCurrentUser();
    
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
      Object.assign(user, updates);
      localStorage.setItem('currentUser', JSON.stringify(user));

      Utils.showToast('Profile updated successfully!', 'success');
      
      // Refresh profile view (exit edit mode)
      renderAdminProfile(false);
      
      // Update header display name
      const userNameEl = document.getElementById('userName');
      if (userNameEl) userNameEl.textContent = user.fullName || user.name || 'Admin';
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
  window.saveAdminProfile = saveAdminProfile;

  // Settings rendering function
  function renderAdminSettings() {
    const container = document.getElementById('settingsContent');
    if (!container) return;

    const user = Utils.getCurrentUser();

    container.innerHTML = `
      <div class="settings-view-content">
        <div class="settings-tabs">
          <button class="settings-tab active" data-tab="security" onclick="switchAdminSettingsTab('security')">
            <i class="fas fa-lock"></i> Security
          </button>
          <button class="settings-tab" data-tab="notifications" onclick="switchAdminSettingsTab('notifications')">
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
                  <button class="btn-toggle-password" onclick="toggleAdminPasswordVisibility('currentPassword', this)">
                    <i class="fas fa-eye"></i>
                  </button>
                </div>
              </div>
              <div class="settings-password-group">
                <label>New Password</label>
                <div class="settings-input-group">
                  <input type="password" id="newPassword" class="settings-input" placeholder="Enter new password" />
                  <button class="btn-toggle-password" onclick="toggleAdminPasswordVisibility('newPassword', this)">
                    <i class="fas fa-eye"></i>
                  </button>
                </div>
              </div>
              <div class="settings-password-group">
                <label>Confirm New Password</label>
                <div class="settings-input-group">
                  <input type="password" id="confirmNewPassword" class="settings-input" placeholder="Confirm new password" />
                  <button class="btn-toggle-password" onclick="toggleAdminPasswordVisibility('confirmNewPassword', this)">
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
                  <input type="checkbox" id="emailNotifications" class="settings-toggle" ${user?.emailNotifications !== false ? 'checked' : ''} />
                  <span class="settings-toggle-slider"></span>
                </label>
                <small>Receive notifications via email</small>
              </div>
              <div class="settings-toggle-group">
                <label class="settings-toggle-label">
                  <span>SMS Notifications</span>
                  <input type="checkbox" id="smsNotifications" class="settings-toggle" ${user?.smsNotifications === true ? 'checked' : ''} />
                  <span class="settings-toggle-slider"></span>
                </label>
                <small>Receive notifications via SMS</small>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-save-footer">
          <button class="btn-save-changes" onclick="saveAdminSettings()">
            <i class="fas fa-save"></i> Save Changes
          </button>
        </div>
      </div>
    `;
  }

  // Switch admin settings tab
  function switchAdminSettingsTab(tabName) {
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    document.querySelectorAll('.settings-tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `settingsTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    });
  }
  window.switchAdminSettingsTab = switchAdminSettingsTab;

  // Toggle password visibility for admin
  function toggleAdminPasswordVisibility(inputId, button) {
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
  window.toggleAdminPasswordVisibility = toggleAdminPasswordVisibility;

  // Save admin settings
  async function saveAdminSettings() {
    const user = Utils.getCurrentUser();
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
      user.emailNotifications = emailNotifications;
      user.smsNotifications = smsNotifications;
      localStorage.setItem('currentUser', JSON.stringify(user));

      Utils.showToast('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Save settings error:', error);
      Utils.showToast(error.message || 'Failed to save settings', 'error');
    }
  }
  window.saveAdminSettings = saveAdminSettings;

  // Show change password modal
  function showChangePasswordModal() {
    // Remove existing modal if any
    const existingModal = document.getElementById('changePasswordModal');
    if (existingModal) {
      existingModal.remove();
    }

    const modalHTML = `
      <div class="modal-overlay active" id="changePasswordModal">
        <div class="modal-content change-password-modal">
          <div class="modal-header">
            <h2><i class="fas fa-key"></i> Change Password</h2>
            <button class="modal-close" onclick="closeChangePasswordModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="changePasswordForm">
              <div class="form-group">
                <label for="currentPassword">Current Password</label>
                <div class="password-input-wrapper">
                  <input type="password" id="currentPassword" name="currentPassword" placeholder="Enter current password" required />
                  <button type="button" class="password-toggle" onclick="togglePasswordVisibility('currentPassword', this)">
                    <i class="fas fa-eye"></i>
                  </button>
                </div>
                <div class="error-message" id="currentPasswordError"></div>
              </div>

              <div class="form-group">
                <label for="newPassword">New Password</label>
                <div class="password-input-wrapper">
                  <input type="password" id="newPassword" name="newPassword" placeholder="Enter new password (min 3 characters)" required />
                  <button type="button" class="password-toggle" onclick="togglePasswordVisibility('newPassword', this)">
                    <i class="fas fa-eye"></i>
                  </button>
                </div>
                <div class="error-message" id="newPasswordError"></div>
              </div>

              <div class="form-group">
                <label for="confirmNewPassword">Confirm New Password</label>
                <div class="password-input-wrapper">
                  <input type="password" id="confirmNewPassword" name="confirmNewPassword" placeholder="Confirm new password" required />
                  <button type="button" class="password-toggle" onclick="togglePasswordVisibility('confirmNewPassword', this)">
                    <i class="fas fa-eye"></i>
                  </button>
                </div>
                <div class="error-message" id="confirmNewPasswordError"></div>
              </div>

              <div class="error-message" id="changePasswordError"></div>

              <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="closeChangePasswordModal()">Cancel</button>
                <button type="submit" class="btn-primary" id="changePasswordBtn">
                  <i class="fas fa-save"></i> Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Attach form submit handler
    const form = document.getElementById('changePasswordForm');
    if (form) {
      form.addEventListener('submit', handleChangePassword);
    }

    // Add real-time validation for confirm password
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmNewPassword');
    
    if (newPasswordInput && confirmPasswordInput) {
      confirmPasswordInput.addEventListener('input', validatePasswordMatch);
      newPasswordInput.addEventListener('input', validatePasswordMatch);
    }
  }
  window.showChangePasswordModal = showChangePasswordModal;

  // Close change password modal
  function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
      modal.remove();
    }
  }
  window.closeChangePasswordModal = closeChangePasswordModal;

  // Toggle password visibility
  function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const type = input.type === 'password' ? 'text' : 'password';
    input.type = type;

    const icon = btn.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-eye');
      icon.classList.toggle('fa-eye-slash');
    }
  }
  window.togglePasswordVisibility = togglePasswordVisibility;

  // Validate password match
  function validatePasswordMatch() {
    const newPassword = document.getElementById('newPassword')?.value || '';
    const confirmPassword = document.getElementById('confirmNewPassword')?.value || '';
    const errorEl = document.getElementById('confirmNewPasswordError');

    if (errorEl) {
      if (confirmPassword && newPassword !== confirmPassword) {
        errorEl.textContent = 'Passwords do not match';
        errorEl.classList.add('show');
      } else {
        errorEl.textContent = '';
        errorEl.classList.remove('show');
      }
    }
  }

  // Handle change password form submission
  async function handleChangePassword(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword')?.value || '';
    const newPassword = document.getElementById('newPassword')?.value || '';
    const confirmPassword = document.getElementById('confirmNewPassword')?.value || '';
    const btn = document.getElementById('changePasswordBtn');
    const errorEl = document.getElementById('changePasswordError');
    const currentPasswordError = document.getElementById('currentPasswordError');
    const newPasswordError = document.getElementById('newPasswordError');
    const confirmPasswordError = document.getElementById('confirmNewPasswordError');

    // Clear all errors
    [errorEl, currentPasswordError, newPasswordError, confirmPasswordError].forEach(el => {
      if (el) {
        el.textContent = '';
        el.classList.remove('show');
      }
    });

    // Client-side validation
    if (!currentPassword) {
      currentPasswordError.textContent = 'Current password is required';
      currentPasswordError.classList.add('show');
      return;
    }

    if (!newPassword) {
      newPasswordError.textContent = 'New password is required';
      newPasswordError.classList.add('show');
      return;
    }

    if (newPassword.length < 3) {
      newPasswordError.textContent = 'New password must be at least 3 characters';
      newPasswordError.classList.add('show');
      return;
    }

    if (!confirmPassword) {
      confirmPasswordError.textContent = 'Please confirm your new password';
      confirmPasswordError.classList.add('show');
      return;
    }

    if (newPassword !== confirmPassword) {
      confirmPasswordError.textContent = 'Passwords do not match';
      confirmPasswordError.classList.add('show');
      return;
    }

    if (currentPassword === newPassword) {
      newPasswordError.textContent = 'New password must be different from current password';
      newPasswordError.classList.add('show');
      return;
    }

    // Disable button and show loading state
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing...';
    }

    try {
      const response = await Utils.apiRequest('/auth/change-password', {
        method: 'POST',
        body: {
          currentPassword,
          newPassword,
          confirmPassword
        }
      });

      Utils.showToast('Password changed successfully!', 'success');
      closeChangePasswordModal();

    } catch (error) {
      console.error('❌ Change password error:', error);

      let errorMessage = 'Failed to change password. Please try again.';
      try {
        const parsed = JSON.parse(error.message);
        if (parsed && parsed.message) {
          errorMessage = parsed.message;
        }
      } catch (e) {
        if (error.message) {
          errorMessage = error.message;
        }
      }

      // Show error in appropriate field
      if (errorMessage.toLowerCase().includes('current password') || errorMessage.toLowerCase().includes('incorrect')) {
        currentPasswordError.textContent = errorMessage;
        currentPasswordError.classList.add('show');
      } else {
        errorEl.textContent = errorMessage;
        errorEl.classList.add('show');
      }

      Utils.showToast(errorMessage, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Change Password';
      }
    }
  }

  // Notifications view rendering
  async function renderNotificationsView() {
    const container = document.getElementById('notificationsFullList');
    if (!container) return;

    try {
      const notifications = await Utils.apiRequest('/notifications');
      
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

      container.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.is_read ? '' : 'unread'} ${notif.request_id ? 'clickable' : ''}" 
             ${notif.request_id ? `data-request-id="${notif.request_id}" onclick="handleNotificationClick(${notif.request_id})"` : ''}>
          <div class="notification-icon">
            <i class="fas fa-bell"></i>
          </div>
          <div class="notification-content">
            <div class="notification-title">${notif.title}</div>
            <div class="notification-message">${notif.message}</div>
            <div class="notification-time">${Utils.formatDate(notif.created_at)}</div>
          </div>
          ${notif.request_id ? '<div class="notification-arrow"><i class="fas fa-chevron-right"></i></div>' : ''}
        </div>
      `).join('');
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

  // Update sidebar notification badge
  function updateSidebarNotificationBadge(notifications) {
    const badge = document.getElementById('sidebarNotificationCount');
    if (!badge) return;

    const notificationsArray = Array.isArray(notifications) ? notifications : [];
    const unreadCount = notificationsArray.filter(n => !(n.read_flag || n.read || n.is_read)).length;
    const totalCount = notificationsArray.length;

    if (totalCount > 0) {
      badge.textContent = totalCount > 9 ? '9+' : String(totalCount);
      badge.classList.remove('hidden');
    } else {
      badge.textContent = '0';
      badge.classList.add('hidden');
    }
  }
  window.updateSidebarNotificationBadge = updateSidebarNotificationBadge;

  // Handle notification click from notifications view
  function handleNotificationClick(requestId) {
    console.log('🔔 Notification clicked from view, request ID:', requestId);
    
    // Switch to requests view
    const links = document.querySelectorAll('.sidebar-link');
    links.forEach(l => l.classList.remove('active'));
    const requestsLink = document.querySelector('.sidebar-link[data-view="requests"]');
    if (requestsLink) requestsLink.classList.add('active');
    
    // Hide all views, show requests view
    document.getElementById('dashboardView').classList.add('hidden');
    document.getElementById('requestsView').classList.remove('hidden');
    document.getElementById('usersView').classList.add('hidden');
    document.getElementById('notificationsView').classList.add('hidden');
    document.getElementById('profileView').classList.add('hidden');
    document.getElementById('settingsView').classList.add('hidden');
    
    // View the specific request after a short delay
    setTimeout(() => {
      if (window.adminPortal && window.adminPortal.viewRequest) {
        window.adminPortal.viewRequest(requestId);
      }
    }, 100);
  }
  window.handleNotificationClick = handleNotificationClick;

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

  // Store dashboard requests globally for filtering
  let dashboardRequests = [];

  function filterAndRenderDashboard() {
    const recentEl = document.getElementById('recentRequests');
    const statTotal = document.getElementById('statTotal');
    const statPending = document.getElementById('statPending');
    const statCompleted = document.getElementById('statCompleted');
    const searchInput = document.getElementById('dashboardSearchInput');
    const statusFilter = document.getElementById('dashboardFilterStatus');
    const priorityFilter = document.getElementById('dashboardFilterPriority');

    if (!recentEl) return;

    const searchQuery = searchInput ? (searchInput.value || '').toLowerCase().trim() : '';
    const selectedStatus = statusFilter ? statusFilter.value : 'all';
    const selectedPriority = priorityFilter ? priorityFilter.value : 'all';

    // Filter requests
    let filtered = dashboardRequests.filter(request => {
      // Status filter
      if (selectedStatus !== 'all' && request.status !== selectedStatus) {
        return false;
      }

      // Priority filter
      if (selectedPriority !== 'all' && request.priority !== selectedPriority) {
        return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = (request.studentName || request.student_name || '').toLowerCase().includes(query);
        const matchesId = (request.studentIdNumber || request.student_id_number || '').toLowerCase().includes(query);
        const matchesDoc = (request.documentType || request.document_label || request.documentValue || '').toLowerCase().includes(query);
        const matchesCode = (request.requestCode || '').toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesDoc && !matchesCode) {
          return false;
        }
      }

      return true;
    });

    if (filtered.length === 0) {
      recentEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>No requests found</h3>
          <p>Try adjusting your filters or search query.</p>
        </div>
      `;
      return;
    }

    // Sort requests: Completed at bottom, urgent non-completed at top
    const sortedRequests = filtered.sort((a, b) => {
        const aIsUrgent = a.priority === 'urgent';
        const bIsUrgent = b.priority === 'urgent';
        const aIsCompleted = a.status === 'completed';
        const bIsCompleted = b.status === 'completed';
        
        // Completed requests ALWAYS go to bottom (regardless of priority)
        if (aIsCompleted && !bIsCompleted) return 1; // a is completed, b is not - a goes to bottom
        if (!aIsCompleted && bIsCompleted) return -1; // a is not completed, b is - b goes to bottom
        
        // If both completed or both not completed, then check priority
        // Urgent non-completed requests come first
        if (!aIsCompleted && !bIsCompleted) {
          if (aIsUrgent && !bIsUrgent) return -1; // a is urgent, b is not - a comes first
          if (!aIsUrgent && bIsUrgent) return 1; // b is urgent, a is not - b comes first
        }
        
        // If both completed, urgent completed can be above normal completed
        if (aIsCompleted && bIsCompleted) {
          if (aIsUrgent && !bIsUrgent) return -1; // urgent completed above normal completed
          if (!aIsUrgent && bIsUrgent) return 1;
        }
        
        // If same completion status and priority, sort by date (newest first)
        return new Date(b.submittedAt || b.submitted_at) - new Date(a.submittedAt || a.submitted_at);
      });

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
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${sortedRequests.slice(0, 10).map(r => {
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

      if (statTotal) statTotal.textContent = String(dashboardRequests.length || 0);
      if (statPending) statPending.textContent = String(dashboardRequests.filter(x => x.status && x.status.includes('pending')).length || 0);
      if (statCompleted) statCompleted.textContent = String(dashboardRequests.filter(x => x.status === 'completed' || x.status === 'approved').length || 0);

      // Store requests in adminPortal instance so viewRequest can access them
      if (window.adminPortal) {
        window.adminPortal.requests = dashboardRequests;
      }
  }

  async function loadRecent() {
    try {
      dashboardRequests = await Utils.apiRequest('/requests', { method: 'GET' });
      
      if (!Array.isArray(dashboardRequests) || dashboardRequests.length === 0) {
        const recentEl = document.getElementById('recentRequests');
        if (recentEl) {
          recentEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📄</div><h3>No recent requests</h3><p>Requests across the system will appear here.</p></div>';
        }
        const statTotal = document.getElementById('statTotal');
        const statPending = document.getElementById('statPending');
        const statCompleted = document.getElementById('statCompleted');
        if (statTotal) statTotal.textContent = '0';
        if (statPending) statPending.textContent = '0';
        if (statCompleted) statCompleted.textContent = '0';
        return;
      }

      // Render with filters
      filterAndRenderDashboard();

    } catch (error) {
      console.error('Failed to load recent requests', error);
    }
  }

  // Set up dashboard filter event listeners
  function setupDashboardFilters() {
    const searchInput = document.getElementById('dashboardSearchInput');
    const statusFilter = document.getElementById('dashboardFilterStatus');
    const priorityFilter = document.getElementById('dashboardFilterPriority');

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        filterAndRenderDashboard();
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        filterAndRenderDashboard();
      });
    }

    if (priorityFilter) {
      priorityFilter.addEventListener('change', () => {
        filterAndRenderDashboard();
      });
    }
  }

  await loadRecent();
  setupDashboardFilters();
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
    this.filterPriority = 'all';
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
      this.renderRecentRequests();
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

      // Priority filter
      if (this.filterPriority !== 'all' && request.priority !== this.filterPriority) {
        return false;
      }

      // Search query
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        const matchesName = (request.studentName || '').toLowerCase().includes(query);
        const matchesId = (request.studentIdNumber || '').toLowerCase().includes(query);
        const matchesDoc = (request.documentType || '').toLowerCase().includes(query);
        const matchesCode = (request.requestCode || '').toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesDoc && !matchesCode) {
          return false;
        }
      }

      return true;
    });

    this.renderRequests();
  }

  renderRecentRequests() {
    const container = document.getElementById('recentRequestsList');
    if (!container) return;

    // Get recent requests (last 7 days or last 20 requests, whichever is more)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    let recentRequests = this.requests.filter(r => {
      const submittedDate = new Date(r.submittedAt || r.submitted_at);
      return submittedDate >= sevenDaysAgo;
    });

    // Sort: Completed always at bottom, then urgent non-completed at top, then normal non-completed
    recentRequests.sort((a, b) => {
      const aIsUrgent = a.priority === 'urgent';
      const bIsUrgent = b.priority === 'urgent';
      const aIsCompleted = a.status === 'completed';
      const bIsCompleted = b.status === 'completed';
      
      // Completed requests ALWAYS go to bottom (regardless of priority)
      if (aIsCompleted && !bIsCompleted) return 1; // a is completed, b is not - a goes to bottom
      if (!aIsCompleted && bIsCompleted) return -1; // a is not completed, b is - b goes to bottom
      
      // If both completed or both not completed, then check priority
      // Urgent non-completed requests come first
      if (!aIsCompleted && !bIsCompleted) {
        if (aIsUrgent && !bIsUrgent) return -1; // a is urgent, b is not - a comes first
        if (!aIsUrgent && bIsUrgent) return 1; // b is urgent, a is not - b comes first
      }
      
      // If both completed, urgent completed can be above normal completed
      if (aIsCompleted && bIsCompleted) {
        if (aIsUrgent && !bIsUrgent) return -1; // urgent completed above normal completed
        if (!aIsUrgent && bIsUrgent) return 1;
      }
      
      // If same completion status and priority, sort by date (newest first)
      return new Date(b.submittedAt || b.submitted_at) - new Date(a.submittedAt || a.submitted_at);
    });

    // Limit to 20 most recent
    recentRequests = recentRequests.slice(0, 20);

    if (recentRequests.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📄</div>
          <h3>No recent requests</h3>
          <p>Requests submitted in the last 7 days will appear here.</p>
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
            ${recentRequests.map(r => {
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
      const aIsUrgent = a.priority === 'urgent';
      const bIsUrgent = b.priority === 'urgent';
      const aIsCompleted = a.status === 'completed';
      const bIsCompleted = b.status === 'completed';
      
      // Completed requests ALWAYS go to bottom (regardless of priority)
      if (aIsCompleted && !bIsCompleted) return 1; // a is completed, b is not - a goes to bottom
      if (!aIsCompleted && bIsCompleted) return -1; // a is not completed, b is - b goes to bottom
      
      // If both completed or both not completed, then check priority
      // Urgent non-completed requests come first
      if (!aIsCompleted && !bIsCompleted) {
        if (aIsUrgent && !bIsUrgent) return -1; // a is urgent, b is not - a comes first
        if (!aIsUrgent && bIsUrgent) return 1; // b is urgent, a is not - b comes first
      }
      
      // If both completed, urgent completed can be above normal completed
      if (aIsCompleted && bIsCompleted) {
        if (aIsUrgent && !bIsUrgent) return -1; // urgent completed above normal completed
        if (!aIsUrgent && bIsUrgent) return 1;
      }
      
      // If same completion status and priority, sort by date (newest first)
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

    // Priority filter
    const priorityFilter = document.getElementById('filterPriority');
    if (priorityFilter) {
      priorityFilter.addEventListener('change', (e) => {
        this.filterPriority = e.target.value;
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

  async showUpdateModal(requestId) {
    // Always fetch fresh request data to ensure attachments are included
    let request;
    try {
      request = await Utils.apiRequest(`/requests/${requestId}`, { method: 'GET' });
    } catch (error) {
      console.error('Failed to load request:', error);
      Utils.showToast('Failed to load request details', 'error');
      return;
    }
    
    if (!request) {
      Utils.showToast('Request not found', 'error');
      return;
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
      : '<p style="opacity: 0.6; padding: 1rem; text-align: center; font-style: italic; background: var(--bg-cream); border-radius: 8px; border: 1px solid var(--border-gray);">No messages yet. Start the conversation with faculty!</p>';

    const facultyOptions = this.allFaculties.map(f => 
      `<option value="${f.id}" ${request.facultyId === f.id ? 'selected' : ''}>${f.fullName || f.name}</option>`
    ).join('');

    // Supporting Documents HTML
    const attachmentsHTML = request.attachments && request.attachments.length ? `
      <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-gray);">
        <h4 style="color: var(--recoletos-green); margin-bottom: 0.75rem; font-size: 0.95rem; font-weight: 600;">
          <i class="fas fa-paperclip"></i> Supporting Documents
        </h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 0.5rem;">
          ${request.attachments.map((att) => {
            const isPDF = att.url && (att.url.toLowerCase().endsWith('.pdf') || att.name && att.name.toLowerCase().endsWith('.pdf'));
            const isImage = att.url && (att.url.toLowerCase().match(/\.(jpg|jpeg|png)$/i) || att.name && att.name.toLowerCase().match(/\.(jpg|jpeg|png)$/i));
            
            if (isPDF) {
              return `
                <div style="display: flex; flex-direction: column; align-items: center; padding: 0.5rem; background: var(--white); border: 1px solid var(--border-gray); border-radius: 6px;">
                  <div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; background: #dc2626; border-radius: 6px; margin-bottom: 0.25rem;">
                    <i class="fas fa-file-pdf" style="color: var(--white); font-size: 1.5rem;"></i>
                  </div>
                  <div style="font-size: 0.7rem; color: var(--text-dark); text-align: center; word-break: break-word; margin-bottom: 0.25rem; font-weight: 500;">
                    ${(att.name || 'Document.pdf').substring(0, 15)}${(att.name || '').length > 15 ? '...' : ''}
                  </div>
                  <a 
                    href="${att.url}" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style="padding: 0.25rem 0.5rem; background: var(--recoletos-green); color: var(--white); border-radius: 4px; text-decoration: none; font-size: 0.7rem; font-weight: 500;"
                  >
                    View
                  </a>
                </div>
              `;
            } else {
              return `
                <a href="${att.url}" target="_blank" rel="noopener noreferrer" style="display: block; text-decoration: none;">
                  <div style="position: relative; width: 100px; height: 100px; border-radius: 6px; border: 1px solid var(--border-gray); overflow: hidden; background: var(--bg-cream);">
                    <img 
                      src="${att.url}" 
                      alt="${att.name || 'Supporting Document'}" 
                      style="width: 100%; height: 100%; object-fit: cover; display: block;"
                      onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'%3E%3Crect fill=\'%23f3f4f6\' width=\'100\' height=\'100\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%239ca3af\' font-family=\'Arial\' font-size=\'10\'%3EImage%3C/text%3E%3C/svg%3E';"
                    />
                  </div>
                  <div style="font-size: 0.65rem; color: var(--text-dark); text-align: center; margin-top: 0.25rem; word-break: break-word; padding: 0 0.25rem;">
                    ${(att.name || 'Image').substring(0, 12)}${(att.name || '').length > 12 ? '...' : ''}
                  </div>
                </a>
              `;
            }
          }).join('')}
        </div>
      </div>
    ` : '';

    const modalHTML = `
      <div class="modal-overlay active" id="updateModal">
        <div class="action-modal" style="max-width: 1000px; max-height: 90vh; overflow-y: auto;">
          <div class="modal-header">
            <h2>Update Request Status</h2>
            <button class="close-modal" onclick="document.getElementById('updateModal').remove()">&times;</button>
          </div>
          <form id="updateForm">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
              <div>
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

                ${attachmentsHTML}
              </div>

              <div>
                <div style="background: var(--bg-cream); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-gray); display: flex; flex-direction: column; height: 100%;">
                  <h3 style="color: var(--recoletos-green); margin-bottom: 0.75rem; font-size: 1rem; font-weight: 600;">
                    <i class="fas fa-comments"></i> Notes & Communication (Faculty)
                  </h3>
                  
                  <!-- Chat Messages Display -->
                  <div style="margin-bottom: 1rem; max-height: 300px; overflow-y: auto; padding: 0.5rem; background: var(--white); border-radius: 8px; border: 1px solid var(--border-gray); flex: 1;">
                    ${messagesHTML}
                  </div>

                  <!-- Admin Input Section for Faculty -->
                  <div style="padding-top: 0.75rem; border-top: 1px solid var(--border-gray); margin-top: auto;">
                    <textarea 
                      id="facultyNoteInput" 
                      placeholder="Send a message to faculty..."
                      style="width: 100%; min-height: 80px; padding: 0.75rem; border: 1px solid var(--border-gray); border-radius: 8px; font-size: 0.9rem; font-family: inherit; resize: vertical; background: var(--white); margin-bottom: 0.75rem; box-sizing: border-box;"
                    ></textarea>
                    <div style="display: flex; justify-content: flex-end;">
                      <button 
                        type="button"
                        id="sendFacultyNoteBtn" 
                        onclick="window.adminPortal.sendFacultyNote(${requestId})"
                        style="padding: 0.5rem 1rem; background: var(--recoletos-green); color: var(--white); border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.85rem; transition: background 0.2s ease; display: flex; align-items: center; gap: 0.5rem;"
                        onmouseover="this.style.background='#003318'"
                        onmouseout="this.style.background='var(--recoletos-green)'"
                      >
                        <i class="fas fa-paper-plane" style="font-size: 0.75rem;"></i> Send to Faculty
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-gray);">
              <button type="button" class="btn-secondary" onclick="document.getElementById('updateModal').remove()">
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

    // Auto-scroll chat messages to bottom
    const chatContainer = modal.querySelector('[style*="max-height: 250px"]');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  async updateRequest(requestId) {
    const form = document.getElementById('updateForm');
    const formData = new FormData(form);

    const status = formData.get('status');
    const facultyId = formData.get('facultyId');
    const priority = formData.get('priority');

    try {
      const payload = {
        status,
        priority,
      };

      if (facultyId) {
        payload.facultyId = status === 'pending_faculty' ? parseInt(facultyId, 10) : null;
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

  async sendFacultyNote(requestId) {
    const noteInput = document.getElementById('facultyNoteInput');
    const sendBtn = document.getElementById('sendFacultyNoteBtn');
    
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

      Utils.showToast('Message sent to faculty!', 'success');
      noteInput.value = '';

      // Reload the modal to show the new message
      const modal = document.getElementById('updateModal');
      if (modal) {
        const request = this.requests.find(r => r.id === requestId);
        if (request) {
          modal.remove();
          await this.showUpdateModal(requestId);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      Utils.showToast('Failed to send message', 'error');
    } finally {
      // Re-enable button
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<i class="fas fa-paper-plane" style="font-size: 0.75rem;"></i> Send to Faculty';
    }
  }

  async viewRequest(requestId) {
    // Always fetch fresh data from API to ensure attachments are included
    let request;
    try {
      request = await Utils.apiRequest(`/requests/${requestId}`, { method: 'GET' });
      console.log('📎 Request loaded with attachments:', {
        requestId,
        attachmentsCount: request.attachments ? request.attachments.length : 0,
        attachments: request.attachments
      });
    } catch (error) {
      console.error('Failed to load request:', error);
      Utils.showToast('Failed to load request details', 'error');
      return;
    }
    
    if (!request) return;

    const statusClass = Utils.getStatusBadgeClass(request.status);
    const statusText = Utils.getStatusText(request.status);

    // Load conversation messages - ONLY public messages (admin-student communication)
    // Internal messages (admin-faculty) are NOT shown here - they're in the Update modal
    let conversationMessages = [];
    try {
      const allMessages = await Utils.apiRequest(`/conversations/${requestId}`, {
        timeout: 10000
      });
      // Filter to only show PUBLIC messages (is_internal = false, 0, null, or undefined)
      // This is for admin-student communication
      // Exclude messages where is_internal is true, 1, or "1"
      conversationMessages = allMessages.filter(msg => {
        const isInternal = msg.is_internal;
        // Return true if message is NOT internal (public message)
        return isInternal === false || 
               isInternal === 0 || 
               isInternal === '0' ||
               isInternal === null || 
               isInternal === undefined ||
               isInternal === '';
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
    
    // Get all conversation messages (admin and student) - only public ones
    const conversationMessagesFormatted = conversationMessages.map(msg => ({
      role: msg.role,
      name: msg.full_name || (msg.role === 'admin' ? 'Admin' : msg.role === 'student' ? request.studentName || 'Student' : 'User'),
      message: msg.message,
      timestamp: msg.created_at
    }));
    
    // Combine and sort by timestamp
    const allMessages = [...adminNotesFromRequest, ...conversationMessagesFormatted]
      .sort((a, b) => new Date(a.timestamp || a.created_at) - new Date(b.timestamp || b.created_at));

    const notesHTML = allMessages.length > 0
      ? allMessages.map((msg) => {
          const isAdmin = msg.role === 'admin';
          const isStudent = msg.role === 'student';
          return `
            <div style="display: flex; flex-direction: column; align-items: ${isAdmin ? 'flex-start' : 'flex-end'}; margin-bottom: 1rem;">
              <div style="background: ${isAdmin ? 'var(--bg-cream)' : '#D1FAE5'}; border: 1px solid ${isAdmin ? 'var(--border-gray)' : '#10B981'}; border-radius: 8px; padding: 0.875rem 1rem; max-width: 85%; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                ${isAdmin ? `
                  <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text-dark); font-size: 0.9rem;">${msg.name}</div>
                  <div style="font-size: 0.9rem; color: var(--text-dark); line-height: 1.5; margin-bottom: 0.5rem;">${msg.message}</div>
                  <div style="font-size: 0.75rem; color: var(--text-dark); opacity: 0.6;">${Utils.formatDate(msg.timestamp || msg.created_at)}</div>
                ` : `
                  <div style="font-weight: 600; margin-bottom: 0.5rem; color: #065F46; font-size: 0.9rem;">${msg.name || request.studentName || 'Student'}</div>
                  <div style="font-size: 0.9rem; color: #065F46; line-height: 1.5; margin-bottom: 0.5rem;">${msg.message}</div>
                  <div style="font-size: 0.75rem; color: #065F46; opacity: 0.7;">${Utils.formatDate(msg.timestamp || msg.created_at)}</div>
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

    const assignedFaculty = request.facultyId 
      ? this.allFaculties.find(f => f.id === request.facultyId)
      : null;

    const approvalHTML = request.facultyApproval && request.facultyApproval.status
      ? `
          <div style="padding: 0.75rem; background: ${request.facultyApproval.status === 'approved' ? '#D1FAE5' : '#FEE2E2'}; border-radius: 6px; margin-top: 1rem;">
            <div style="font-weight: 600; margin-bottom: 0.25rem;">
              ${request.facultyApproval.facultyName || 'Faculty'} - ${(request.facultyApproval.status || 'pending').toUpperCase()}
            </div>
            ${request.facultyApproval.comment ? `<div style="margin-top: 0.5rem;">${request.facultyApproval.comment}</div>` : ''}
            ${request.facultyApproval.timestamp ? `<div style="font-size: 0.8rem; opacity: 0.6; margin-top: 0.25rem;">${Utils.formatDate(request.facultyApproval.timestamp)}</div>` : ''}
          </div>
        `
      : '';

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
                  
                  <div class="detail-label">Priority:</div>
                  <div class="detail-value"><span class="priority-badge ${request.priority || 'normal'}">${(request.priority || 'normal').toUpperCase()}</span></div>
                  
                  ${assignedFaculty ? `
                  <div class="detail-label">Assigned Faculty:</div>
                  <div class="detail-value">${assignedFaculty.fullName || assignedFaculty.name || 'N/A'}</div>
                  ` : ''}
                  
                  ${request.completedAt ? `
                  <div class="detail-label">Completed:</div>
                  <div class="detail-value">${Utils.formatDate(request.completedAt)}</div>
                  ` : ''}
                </div>
              </div>

              ${request.attachments && request.attachments.length ? `
              <div style="margin-top: 1.5rem;">
                <h4 style="color: var(--recoletos-green); margin-bottom: 0.75rem; font-size: 1.1rem;">
                  <i class="fas fa-paperclip"></i> Supporting Documents
                </h4>
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
                <h4 style="color: var(--recoletos-green); margin-bottom: 0.75rem; font-size: 1.1rem;">
                  <i class="fas fa-user-check"></i> Faculty Approval
                </h4>
                ${approvalHTML}
              </div>
              ` : ''}
            </div>

            <!-- Second Column: Notes & Communication -->
            <div class="request-modal-column">
              <h3>Notes & Communication (Student)</h3>
              
              <div>
                <!-- Chat Messages Display -->
                <div style="margin-bottom: 1.5rem; max-height: 350px; overflow-y: auto; padding: 0.5rem; background: var(--white); border-radius: 8px; border: 1px solid var(--border-gray);">
                  ${notesHTML}
                </div>

                <!-- Admin Input Section -->
                <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-gray);">
                  <textarea 
                    id="adminNoteInput" 
                    placeholder="Add a note or message for the student"
                    style="width: 100%; min-height: 100px; padding: 0.75rem; border: 1px solid var(--border-gray); border-radius: 8px; font-size: 0.9rem; font-family: inherit; resize: vertical; background: var(--white); margin-bottom: 0.75rem;"
                  ></textarea>
                  <div style="display: flex; justify-content: flex-end;">
                    <button 
                      id="sendNoteBtn" 
                      onclick="window.adminPortal.sendNote(${requestId})"
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
    const noteInput = document.getElementById('adminNoteInput');
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
      // Send as PUBLIC message (is_internal = false) for admin-student communication
      await Utils.apiRequest(`/conversations/${requestId}`, {
        method: 'POST',
        body: { 
          message,
          isInternal: false  // Public message - visible to student
        },
        timeout: 10000
      });

      Utils.showToast('Note sent successfully!', 'success');
      noteInput.value = '';

      // Reload the request modal to show the new message
      // Close current modal and reopen
      const modal = document.getElementById('viewRequestModal');
      if (modal) {
        modal.remove();
      }
      
      // Reload the request view
      await this.viewRequest(requestId);
    } catch (error) {
      console.error('Failed to send note:', error);
      Utils.showToast('Failed to send note. Please try again.', 'error');
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<i class="fas fa-paper-plane" style="font-size: 0.85rem;"></i> Send Note';
    }
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

    // Sort by created_at (newest first)
    const sortedUsers = [...users].sort((a, b) => {
      const dateA = new Date(a.created_at || a.createdAt || 0);
      const dateB = new Date(b.created_at || b.createdAt || 0);
      return dateB - dateA; // Newest first
    });

    // Format date and time
    function formatDateTime(dateString) {
      if (!dateString) return 'N/A';
      try {
        const date = new Date(dateString);
        const dateStr = date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
        const timeStr = date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true
        });
        return `${dateStr} at ${timeStr}`;
      } catch (e) {
        return dateString;
      }
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
              <th>Date & Time</th>
            </tr>
          </thead>
          <tbody>
            ${sortedUsers.map(user => `
              <tr>
                <td><strong>${user.fullName || 'N/A'}</strong></td>
                <td>${user.email || 'N/A'}</td>
                <td><span class="role-badge role-${user.role}">${user.role === 'student' ? 'Student' : user.role === 'faculty' ? 'Faculty' : 'Admin'}</span></td>
                <td>${user.studentIdNumber || user.idNumber || '—'}</td>
                <td>${user.course || '—'}</td>
                <td>${user.year || user.yearLevel || '—'}</td>
                <td>${user.departmentName || 'N/A'}</td>
                <td>${formatDateTime(user.created_at || user.createdAt)}</td>
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

