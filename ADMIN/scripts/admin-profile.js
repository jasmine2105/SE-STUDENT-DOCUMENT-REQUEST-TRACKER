(function () {
  const el = id => document.getElementById(id);

  // Use Utils.formatDate instead of duplicate function

  function loadProfileImage() {
    const userId = (Utils.getCurrentUser() || {}).id;
    const storageKey = `profileImage_${userId}`;
    const savedImage = localStorage.getItem(storageKey);
    
    if (savedImage) {
      const profileImg = el('profileImage');
      const defaultIcon = el('profileDefaultIcon');
      if (profileImg) {
        profileImg.src = savedImage;
        profileImg.style.display = 'block';
      }
      if (defaultIcon) {
        defaultIcon.style.display = 'none';
      }
    }
  }

  function setupImageUpload() {
    const uploadInput = el('profileImageInput');
    
    if (!uploadInput) return;
    
    uploadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target.result;
        const userId = (Utils.getCurrentUser() || {}).id;
        const storageKey = `profileImage_${userId}`;
        
        localStorage.setItem(storageKey, imageData);
        
        const profileImg = el('profileImage');
        const defaultIcon = el('profileDefaultIcon');
        if (profileImg) {
          profileImg.src = imageData;
          profileImg.style.display = 'block';
        }
        if (defaultIcon) {
          defaultIcon.style.display = 'none';
        }
        
        Utils.showToast('Profile photo updated!', 'success');
      };
      reader.readAsDataURL(file);
    });
  }

  async function loadProfile() {
    const user = await Utils.getCurrentUser();
    if (!user) {
      el('profileFullName').textContent = 'Not signed in';
      return;
    }

    el('profileFullName').textContent = user.full_name || user.fullName || user.name || 'User';
    el('profileRole').textContent = user.role === 'admin' ? 'Administrator' : user.role || 'User';
    const profileDeptEl = el('profileDept');
    if (profileDeptEl) {
      profileDeptEl.textContent = user.department_name || '';
      profileDeptEl.style.display = user.department_name ? 'block' : 'none';
    }

    el('infoFullName').textContent = user.full_name || user.fullName || '-';
    el('infoEmail').textContent = user.email || '-';
    el('infoIdNumber').textContent = user.id_number || '-';
    
    // Fetch and display department
    let departmentName = '-';
    if (user.department_id || user.departmentId) {
      try {
        const departments = await Utils.apiRequest('/departments');
        if (Array.isArray(departments)) {
          const dept = departments.find(d => d.id === (user.department_id || user.departmentId));
          departmentName = dept ? dept.name : '-';
        }
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      }
    }
    el('infoDept').textContent = departmentName;

    // header and sidebar user info
    const sidebarUserInfo = document.getElementById('sidebarUserInfo');
    if (sidebarUserInfo) sidebarUserInfo.textContent = user.full_name || user.fullName || '';
    const userNameHeader = document.getElementById('userNameHeader');
    if (userNameHeader) userNameHeader.textContent = user.full_name || user.fullName || '';
    
    loadProfileImage();
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    setupImageUpload();

    // Mark profile page - no sidebar link highlighted (not part of main nav)
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => link.classList.remove('active'));

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
      await Utils.apiRequest('/api/auth/logout', 'POST');
      window.location.href = '/';
    });
  });
})();
