class LoginModal {
  constructor() {
    this.isSignup = false;
    this.detectedRole = null;
    this.departments = [];
    this.init();
  }

  async init() {
    await this.loadDepartments();
    this.createModal();
    this.attachEventListeners();
    // Note: toggleView is not needed here since we have separate modals for login and signup
  }

  async loadDepartments() {
    try {
      this.departments = await Utils.apiRequest('/departments');
    } catch (error) {
      console.warn('Unable to load departments yet:', error);
      this.departments = [];
    }
  }

  // Auto-detect role from ID number format
  detectRoleFromId(idNumber) {
    const id = idNumber.trim();
    
    // Student: 10 digits starting with 20 (e.g., 2022011084)
    if (/^20\d{8}$/.test(id)) {
      return 'student';
    }
    
    // Faculty: Starts with FAC- or Faculty ID pattern
    if (/^FAC-?\d+$/i.test(id) || /^F\d{4,}$/i.test(id)) {
      return 'faculty';
    }
    
    // Admin: Starts with ADM- or Admin ID pattern
    if (/^ADM-?\d+$/i.test(id) || /^A\d{4,}$/i.test(id)) {
      return 'admin';
    }
    
    return null;
  }

  createModal() {
    // Store department mapping for later use
    this.departmentMap = {};
    (this.departments || []).forEach(dept => {
      this.departmentMap[dept.id] = {
        id: dept.id,
        code: dept.code,
        name: dept.name
      };
    });

    const departmentOptions = (this.departments || [])
      .map((dept) => `<option value="${dept.id}" data-code="${dept.code || ''}" data-name="${dept.name || ''}">${dept.name}</option>`)
      .join('');

    const departmentCourses = {
      "School of Computer Studies (SCS)": [
        "BS Computer Science",
        "BS Information Technology",
        "BS Entertainment and Multimedia Computing"
      ],
      "School of Business Management (SBM)": [
        "BS Accountancy",
        "BS Business Administration",
        "BS Management Accounting",
        "BS Marketing Management"
      ],
      "School of Engineering (SOE)": [
        "BS Civil Engineering",
        "BS Computer Engineering",
        "BS Electrical Engineering",
        "BS Electronics Engineering",
        "BS Industrial Engineering",
        "BS Mechanical Engineering"
      ],
      "School of Arts and Sciences (SAS)": [
        "AB Communication",
        "AB Psychology",
        "BS Biology",
        "BS Social Work"
      ],
      "School of Education (SOEd)": [
        "BEED (Elementary Education)",
        "BSED English",
        "BSED Mathematics",
        "BSED Science",
        "BSED Social Studies"
      ],
      "School of Allied Medical Sciences (SAMS)": [
        "BS Nursing",
        "BS Medical Technology",
        "BS Pharmacy"
      ],
      "School of Law (SOL)": [
        "Bachelor of Laws (LLB)"
      ],
      "ETEEAP (Expanded Tertiary Education Equivalency and Accreditation Program)": [
        "BS Business Administration",
        "BS Information Technology"
      ],
      // Add variations and aliases for better matching
      "SCS": [
        "BS Computer Science",
        "BS Information Technology",
        "BS Entertainment and Multimedia Computing"
      ],
      "SBM": [
        "BS Accountancy",
        "BS Business Administration",
        "BS Management Accounting",
        "BS Marketing Management"
      ],
      "SOE": [
        "BS Civil Engineering",
        "BS Computer Engineering",
        "BS Electrical Engineering",
        "BS Electronics Engineering",
        "BS Industrial Engineering",
        "BS Mechanical Engineering"
      ],
      "SAS": [
        "AB Communication",
        "AB Psychology",
        "BS Biology",
        "BS Social Work"
      ],
      "SOEd": [
        "BEED (Elementary Education)",
        "BSED English",
        "BSED Mathematics",
        "BSED Science",
        "BSED Social Studies"
      ],
      "SAMS": [
        "BS Nursing",
        "BS Medical Technology",
        "BS Pharmacy"
      ],
      "SOL": [
        "Bachelor of Laws (LLB)"
      ],
      "ETEEAP": [
        "BS Business Administration",
        "BS Information Technology"
      ]
    };

    const modalHTML = `
      <!-- Login Modal (Separate) -->
      <div class="modal-overlay" id="loginModal">
        <div class="login-modal">
          <button class="close-modal" id="closeModal">&times;</button>
          <div class="modal-header">
            <h2>Welcome Back</h2>
            <p>Sign in to your account</p>
          </div>

          <div class="auth-toggle">
            <span>Don't have an account?</span>
            <button type="button" id="switchToSignup" class="link-button">Sign up</button>
          </div>

          <!-- Login Form -->
          <form id="loginForm" class="auth-form">
            <div class="form-group">
              <label for="idNumber">ID Number</label>
              <input type="text" id="idNumber" name="idNumber" placeholder="Enter your ID number" required />
              <div class="error-message" id="idNumberError"></div>
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" placeholder="Enter your password" required />
              <div class="error-message" id="passwordError"></div>
            </div>

            <button type="submit" class="btn-primary" id="loginBtn">Sign In</button>
          </form>
        </div>
      </div>

      <!-- Signup Modal (Separate) -->
      <div class="modal-overlay" id="signupModal">
        <div class="login-modal">
          <button class="close-modal" id="closeSignupModal">&times;</button>
          <div class="modal-header">
            <h2>Create Account</h2>
            <p>Sign up to get started</p>
          </div>

          <div class="auth-toggle">
            <span>Already have an account?</span>
            <button type="button" id="switchToLogin" class="link-button">Sign in</button>
          </div>

          <!-- Signup Form -->
          <form id="signupForm" class="auth-form">
            <!-- ID Number Field - Always shown first -->
            <div class="form-group">
              <label for="signupIdNumber">ID Number *</label>
              <input type="text" id="signupIdNumber" name="signupIdNumber" placeholder="Enter your ID number" required />
              <small class="form-help">Format: Students (2022011084), Faculty (FAC-001), Admin (ADM-001)</small>
              <div class="role-indicator hidden" id="roleIndicator"></div>
              <div class="error-message" id="signupIdError"></div>
            </div>

            <!-- Dynamic Fields Container -->
            <div id="dynamicFields"></div>

            <div class="form-group">
              <label for="signupPassword">Create Password *</label>
              <div class="password-input-wrapper">
                <input type="password" id="signupPassword" name="signupPassword" placeholder="Create a password (min 3 characters)" required />
                <button type="button" class="password-toggle" id="togglePassword" data-target="signupPassword" aria-label="Show password" title="Show password">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
              <div class="error-message" id="signupPasswordError"></div>
            </div>

            <div class="form-group">
              <label for="confirmPassword">Confirm Password *</label>
              <div class="password-input-wrapper">
                <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Confirm your password" required />
                <button type="button" class="password-toggle" id="toggleConfirmPassword" data-target="confirmPassword" aria-label="Show password" title="Show password">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
              <div class="error-message" id="confirmPasswordError"></div>
            </div>

            <div class="error-message" id="signupError"></div>

            <button type="submit" class="btn-primary" id="signupBtn">Create Account</button>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('loginModal');
    this.signupModal = document.getElementById('signupModal');
    
    // Initialize signup form fields when signup modal is created
    if (this.signupModal) {
      const signupIdInput = document.getElementById('signupIdNumber');
      if (signupIdInput) {
        signupIdInput.addEventListener('input', (e) => {
          this.handleIdNumberChange(e.target.value);
        });
      }
    }

    // Store department courses for dynamic population
    this.departmentCourses = departmentCourses;
    this.departmentOptions = departmentOptions;
  }

  attachEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
      console.error('❌ Login form not found!');
      return;
    }
    
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      console.log('📝 Login form submitted');
      this.handleLogin();
    });
    
    // Also add click handler to login button as backup
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', (event) => {
        event.preventDefault();
        console.log('🔔 Login button clicked');
        const form = document.getElementById('loginForm');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        } else {
          this.handleLogin();
        }
      });
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
      // Remove existing listener by cloning form
      const newForm = signupForm.cloneNode(true);
      signupForm.parentNode.replaceChild(newForm, signupForm);
      
      newForm.addEventListener('submit', (event) => {
        console.log('📝 Signup form SUBMITTED (form submit handler)');
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        try {
          this.handleSignup();
        } catch (err) {
          console.error('❌ Error in form submit handler:', err);
        }
      }, true); // Use capture phase
    } else {
      console.error('❌ Signup form not found!');
    }

    // Add a click fallback on the button in case form submit isn't firing
    const signupBtn = document.getElementById('signupBtn');
    if (signupBtn) {
      // Remove any existing listeners by cloning
      const newBtn = signupBtn.cloneNode(true);
      signupBtn.parentNode.replaceChild(newBtn, signupBtn);
      
      // Add multiple event listeners to ensure it works
      newBtn.addEventListener('click', (e) => {
        console.log('🔔 signupBtn CLICKED (click handler)', { 
          disabled: newBtn.disabled, 
          hasAttribute: newBtn.hasAttribute('disabled'),
          type: newBtn.type,
          target: e.target
        });
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Always call handleSignup - it will handle validation and show errors
        console.log('🚀 Calling handleSignup from button click');
        try {
          this.handleSignup();
        } catch (err) {
          console.error('❌ Error in handleSignup:', err);
          const errorEl = document.getElementById('signupError');
          if (errorEl) {
            errorEl.textContent = 'An error occurred. Check console for details.';
            errorEl.classList.add('show');
          }
        }
      }, true); // Use capture phase
      
      // Also add mousedown as backup
      newBtn.addEventListener('mousedown', (e) => {
        console.log('🔔 signupBtn MOUSEDOWN');
        if (e.button === 0) { // Left click only
          e.preventDefault();
        }
      });
    } else {
      console.error('❌ Signup button not found during initialization!');
    }

    // Close buttons for both modals
    const closeLoginBtn = document.getElementById('closeModal');
    const closeSignupBtn = document.getElementById('closeSignupModal');
    
    if (closeLoginBtn) {
      closeLoginBtn.addEventListener('click', () => this.hide());
    }
    
    if (closeSignupBtn) {
      closeSignupBtn.addEventListener('click', () => this.hideSignup());
    }

    // Switch from login to signup modal
    const switchToSignupBtn = document.getElementById('switchToSignup');
    if (switchToSignupBtn) {
      switchToSignupBtn.addEventListener('click', () => {
        this.hide();
        this.showSignup();
      });
    }

    // Switch from signup to login modal
    const switchToLoginBtn = document.getElementById('switchToLogin');
    if (switchToLoginBtn) {
      switchToLoginBtn.addEventListener('click', () => {
        this.hideSignup();
        this.show();
      });
    }
    
    // Close on overlay click
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.hide();
        }
      });
    }
    
    if (this.signupModal) {
      this.signupModal.addEventListener('click', (e) => {
        if (e.target === this.signupModal) {
          this.hideSignup();
        }
      });
    }

    // Real-time ID number validation and role detection for signup
    const signupIdInput = document.getElementById('signupIdNumber');
    signupIdInput.addEventListener('input', (e) => {
      this.handleIdNumberChange(e.target.value);
    });

    // Password visibility toggles
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const passwordInput = document.getElementById('signupPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    if (togglePassword && passwordInput) {
      togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.querySelector('i').classList.toggle('fa-eye');
        togglePassword.querySelector('i').classList.toggle('fa-eye-slash');
      });
    }

    if (toggleConfirmPassword && confirmPasswordInput) {
      toggleConfirmPassword.addEventListener('click', () => {
        const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        confirmPasswordInput.setAttribute('type', type);
        toggleConfirmPassword.querySelector('i').classList.toggle('fa-eye');
        toggleConfirmPassword.querySelector('i').classList.toggle('fa-eye-slash');
      });
    }

    // Delegated click handler for any password-toggle buttons (works even if form nodes are replaced)
    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('.password-toggle');
      if (!btn) return;
      e.preventDefault();
      const targetId = btn.getAttribute('data-target');
      if (!targetId) return;
      const input = document.getElementById(targetId);
      if (!input) return;
      const newType = input.type === 'password' ? 'text' : 'password';
      input.type = newType;
      const icon = btn.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
      }
      btn.setAttribute('aria-pressed', newType === 'text' ? 'true' : 'false');
      btn.title = newType === 'text' ? 'Hide password' : 'Show password';
    });

    // Real-time password confirmation validation
    if (confirmPasswordInput && passwordInput) {
      confirmPasswordInput.addEventListener('input', () => {
        this.validatePasswordMatch();
        this.updateSignupButtonState();
      });
      passwordInput.addEventListener('input', () => {
        this.validatePasswordMatch();
        this.updateSignupButtonState();
      });
    }

    // This will be called after dynamic fields are populated
  }

  attachFieldListeners() {
    // Add listeners to other fields to update button state
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('signupEmail');
    const departmentSelect = document.getElementById('departmentSelect');
    const courseSelect = document.getElementById('courseSelect');
    const yearLevelSelect = document.getElementById('yearLevelSelect');

    // Remove existing listeners by cloning (simple way to avoid duplicates)
    if (fullNameInput) {
      const newInput = fullNameInput.cloneNode(true);
      fullNameInput.parentNode.replaceChild(newInput, fullNameInput);
      newInput.addEventListener('input', () => this.updateSignupButtonState());
    }
    if (emailInput) {
      const newInput = emailInput.cloneNode(true);
      emailInput.parentNode.replaceChild(newInput, emailInput);
      newInput.addEventListener('input', () => this.updateSignupButtonState());
    }
    if (departmentSelect) {
      departmentSelect.addEventListener('change', () => {
        this.updateSignupButtonState();
        // Also trigger course select update
        if (courseSelect) {
          setTimeout(() => this.updateSignupButtonState(), 100);
        }
      });
    }
    if (courseSelect) {
      courseSelect.addEventListener('change', () => this.updateSignupButtonState());
    }
    if (yearLevelSelect) {
      yearLevelSelect.addEventListener('change', () => this.updateSignupButtonState());
    }
  }

  validatePasswordMatch() {
    const password = document.getElementById('signupPassword')?.value || '';
    const confirmPassword = document.getElementById('confirmPassword')?.value || '';
    const confirmPasswordError = document.getElementById('confirmPasswordError');

    if (confirmPasswordError) {
      if (confirmPassword && password !== confirmPassword) {
        confirmPasswordError.textContent = 'Passwords do not match';
        confirmPasswordError.classList.add('show');
      } else {
        confirmPasswordError.textContent = '';
        confirmPasswordError.classList.remove('show');
      }
      // Update button visual state
      this.updateSignupButtonState();
    }
  }

  updateSignupButtonState() {
    const signupBtn = document.getElementById('signupBtn');
    if (!signupBtn) {
      console.warn('⚠️ Signup button not found in updateSignupButtonState');
      return;
    }

    const idNumber = document.getElementById('signupIdNumber')?.value.trim() || '';
    const password = document.getElementById('signupPassword')?.value || '';
    const confirmPassword = document.getElementById('confirmPassword')?.value || '';
    const fullName = document.getElementById('fullName')?.value.trim() || '';
    const email = document.getElementById('signupEmail')?.value.trim() || '';
    const detectedRole = this.detectRoleFromId(idNumber);

    // Basic validation - visually indicate if form is ready
    // Button will always be clickable, but handleSignup will validate
    const hasBasicFields = idNumber.length >= 3 && 
                          password.length >= 3 && 
                          confirmPassword.length >= 3 &&
                          fullName.length > 0 && 
                          email.length > 0;

    let isReady = hasBasicFields && detectedRole;

    // For students, check if department, course, and year level are filled
    if (isReady && detectedRole === 'student') {
      const departmentId = document.getElementById('departmentSelect')?.value || '';
      const course = document.getElementById('courseSelect')?.value || '';
      const yearLevel = document.getElementById('yearLevelSelect')?.value || '';
      const courseSelect = document.getElementById('courseSelect');
      
      if (!departmentId || !course || !yearLevel || (courseSelect && courseSelect.disabled)) {
        isReady = false;
      }
    }

    // For faculty/admin, check if department is filled
    if (isReady && (detectedRole === 'faculty' || detectedRole === 'admin')) {
      const departmentId = document.getElementById('departmentSelect')?.value || '';
      if (!departmentId) {
        isReady = false;
      }
    }

    // Update visual state (but keep button clickable)
    if (isReady) {
      signupBtn.classList.remove('disabled');
      signupBtn.style.opacity = '1';
      signupBtn.style.cursor = 'pointer';
      signupBtn.removeAttribute('data-other-error');
    } else {
      signupBtn.classList.add('disabled');
      signupBtn.style.opacity = '0.6';
      signupBtn.style.cursor = 'not-allowed';
    }
    
    // Never actually disable the button - let handleSignup do validation
    signupBtn.disabled = false;
    signupBtn.removeAttribute('disabled');
    signupBtn.style.pointerEvents = 'auto';
  }

  handleIdNumberChange(idNumber) {
    const roleIndicator = document.getElementById('roleIndicator');
    const signupIdError = document.getElementById('signupIdError');
    const signupBtn = document.getElementById('signupBtn');
    const dynamicFields = document.getElementById('dynamicFields');

    // Clear previous errors and indicators
    signupIdError.textContent = '';
    signupIdError.classList.remove('show');

    if (idNumber.length < 3) {
      roleIndicator.classList.add('hidden');
      dynamicFields.innerHTML = '';
      console.debug('handleIdNumberChange: short id - marking button as not ready');
      if (signupBtn) {
        signupBtn.classList.add('disabled');
        signupBtn.style.opacity = '0.6';
        signupBtn.style.cursor = 'not-allowed';
        // Don't actually disable - let handleSignup validate
        signupBtn.disabled = false;
        signupBtn.removeAttribute('disabled');
      }
      return;
    }

    const detectedRole = this.detectRoleFromId(idNumber);

    if (!detectedRole) {
      roleIndicator.classList.add('hidden');
      roleIndicator.innerHTML = '';
      dynamicFields.innerHTML = '';
      console.debug('handleIdNumberChange: invalid role - marking button as not ready');
      if (signupBtn) {
        signupBtn.classList.add('disabled');
        signupBtn.style.opacity = '0.6';
        signupBtn.style.cursor = 'not-allowed';
        // Don't actually disable - let handleSignup validate
        signupBtn.disabled = false;
        signupBtn.removeAttribute('disabled');
      }
      
      if (idNumber.length >= 5) {
        signupIdError.textContent = 'Invalid ID format. Use: Student (2022011084), Faculty (FAC-001), or Admin (ADM-001)';
        signupIdError.classList.add('show');
      }
      return;
    }

    this.detectedRole = detectedRole;
    
    // Show role indicator
    const roleLabels = {
      student: 'Student',
      faculty: 'Faculty',
      admin: 'Administrator'
    };
    
    roleIndicator.innerHTML = `
      <div class="detected-role ${detectedRole}">
        <span class="role-icon">✓</span>
        Detected: <strong>${roleLabels[detectedRole]}</strong>
      </div>
    `;
    roleIndicator.classList.remove('hidden');

    // Populate dynamic fields based on role
    this.populateDynamicFields(detectedRole);
    console.debug('handleIdNumberChange: role detected, setting up form', { role: detectedRole });
    
    // Use setTimeout to ensure DOM is ready before updating button state
    setTimeout(() => {
      this.updateSignupButtonState();
      // Re-attach event listeners for new fields
      this.attachFieldListeners();
    }, 150);
  }

  populateDynamicFields(role) {
    const dynamicFields = document.getElementById('dynamicFields');

    if (role === 'student') {
      dynamicFields.innerHTML = `
        <div class="form-group">
          <label for="fullName">Full Name *</label>
          <input type="text" id="fullName" name="fullName" placeholder="Juan Dela Cruz" required />
        </div>

        <div class="form-group">
          <label for="signupEmail">Email *</label>
          <input type="email" id="signupEmail" name="signupEmail" placeholder="name@usjr.edu.ph" required />
        </div>

        <div class="form-group">
          <label for="departmentSelect">Department *</label>
          <select id="departmentSelect" name="departmentSelect" required>
            <option value="">Select department</option>
            ${this.departmentOptions}
          </select>
        </div>

        <div class="form-group">
          <label for="courseSelect">Course *</label>
          <select id="courseSelect" name="courseSelect" required disabled>
            <option value="">Select a department first</option>
          </select>
        </div>

        <div class="form-group">
          <label for="yearLevelSelect">Year Level *</label>
          <select id="yearLevelSelect" name="yearLevelSelect" required>
            <option value="">Select year level</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
            <option value="5th Year">5th Year</option>
          </select>
        </div>
      `;

      // Setup department -> course linking
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        this.setupDepartmentCourseLink();
        // Also trigger change if department is already selected (in case of form reset/reload)
        const deptSelect = document.getElementById('departmentSelect');
        if (deptSelect && deptSelect.selectedIndex > 0) {
          deptSelect.dispatchEvent(new Event('change'));
        }
        // Update button state after fields are set up
        this.updateSignupButtonState();
        this.attachFieldListeners();
      }, 100);

    } else if (role === 'faculty') {
      dynamicFields.innerHTML = `
        <div class="form-group">
          <label for="fullName">Full Name *</label>
          <input type="text" id="fullName" name="fullName" placeholder="Dr. Juan Dela Cruz" required />
        </div>

        <div class="form-group">
          <label for="signupEmail">Email *</label>
          <input type="email" id="signupEmail" name="signupEmail" placeholder="name@usjr.edu.ph" required />
        </div>

        <div class="form-group">
          <label for="departmentSelect">Department *</label>
          <select id="departmentSelect" name="departmentSelect" required>
            <option value="">Select department</option>
            ${this.departmentOptions}
          </select>
        </div>

        <div class="form-group">
          <label for="position">Position</label>
          <input type="text" id="position" name="position" placeholder="e.g., Professor, Associate Professor" />
        </div>
      `;

    } else if (role === 'admin') {
      dynamicFields.innerHTML = `
        <div class="form-group">
          <label for="fullName">Full Name *</label>
          <input type="text" id="fullName" name="fullName" placeholder="Juan Dela Cruz" required />
        </div>

        <div class="form-group">
          <label for="signupEmail">Email *</label>
          <input type="email" id="signupEmail" name="signupEmail" placeholder="name@usjr.edu.ph" required />
        </div>

        <div class="form-group">
          <label for="departmentSelect">Department *</label>
          <select id="departmentSelect" name="departmentSelect" required>
            <option value="">Select department</option>
            ${this.departmentOptions}
          </select>
        </div>
      `;
    }
  }

  setupDepartmentCourseLink() {
    const departmentSelect = document.getElementById('departmentSelect');
    const courseSelect = document.getElementById('courseSelect');

    if (!departmentSelect || !courseSelect) {
      console.warn('Department or course select not found');
      return;
    }

    // Remove any existing event listeners by cloning and replacing
    const newDeptSelect = departmentSelect.cloneNode(true);
    departmentSelect.parentNode.replaceChild(newDeptSelect, departmentSelect);

    newDeptSelect.addEventListener('change', () => {
      const selectedIndex = newDeptSelect.selectedIndex;
      if (selectedIndex === 0) {
        // "Select department" option selected
        courseSelect.innerHTML = '<option value="">Select a department first</option>';
        courseSelect.disabled = true;
        courseSelect.removeAttribute('required');
        return;
      }

      const selectedOption = newDeptSelect.options[selectedIndex];
      const selectedDeptId = selectedOption.value;
      const selectedDeptCode = selectedOption.getAttribute('data-code') || '';
      const selectedDeptName = selectedOption.getAttribute('data-name') || selectedOption.text.trim();
      
      console.log('Selected department:', {
        id: selectedDeptId,
        code: selectedDeptCode,
        name: selectedDeptName
      });
      
      // Try multiple matching strategies
      let courses = [];
      
      // Strategy 1: Match by full department name
      courses = this.departmentCourses[selectedDeptName] || [];
      
      // Strategy 2: Match by department code (SCS, SBM, etc.)
      if (courses.length === 0 && selectedDeptCode) {
        courses = this.departmentCourses[selectedDeptCode] || [];
      }
      
      // Strategy 3: Partial name matching
      if (courses.length === 0) {
        for (const [deptKey, deptCourses] of Object.entries(this.departmentCourses)) {
          // Check if department name contains key or vice versa
          if (selectedDeptName.toLowerCase().includes(deptKey.toLowerCase()) || 
              deptKey.toLowerCase().includes(selectedDeptName.toLowerCase())) {
            courses = deptCourses;
            console.log('Found partial match:', deptKey);
            break;
          }
        }
      }
      
      // Strategy 4: Match by department code in name (e.g., "School of Computer Studies (SCS)")
      if (courses.length === 0 && selectedDeptCode) {
        // Try to find department that contains the code
        for (const [deptKey, deptCourses] of Object.entries(this.departmentCourses)) {
          if (deptKey.includes(selectedDeptCode) || deptKey.includes(`(${selectedDeptCode})`)) {
            courses = deptCourses;
            console.log('Found code match:', deptKey);
            break;
          }
        }
      }

      // Strategy 5: If still no courses found, provide a fallback list
      if (courses.length === 0) {
        console.warn('No courses found for department:', selectedDeptName, 'Code:', selectedDeptCode);
        // Provide common courses as fallback based on department code
        const fallbackCourses = {
          'SCS': ['BS Computer Science', 'BS Information Technology', 'BS Entertainment and Multimedia Computing'],
          'SBM': ['BS Accountancy', 'BS Business Administration', 'BS Management Accounting', 'BS Marketing Management'],
          'SOE': ['BS Civil Engineering', 'BS Computer Engineering', 'BS Electrical Engineering', 'BS Electronics Engineering', 'BS Industrial Engineering', 'BS Mechanical Engineering'],
          'SAS': ['AB Communication', 'AB Psychology', 'BS Biology', 'BS Social Work'],
          'SOEd': ['BEED (Elementary Education)', 'BSED English', 'BSED Mathematics', 'BSED Science', 'BSED Social Studies'],
          'SAMS': ['BS Nursing', 'BS Medical Technology', 'BS Pharmacy'],
          'SOL': ['Bachelor of Laws (LLB)'],
          'ETEEAP': ['BS Business Administration', 'BS Information Technology']
        };
        
        courses = fallbackCourses[selectedDeptCode] || [
          'BS Computer Science',
          'BS Information Technology',
          'BS Business Administration',
          'BS Accountancy',
          'BS Civil Engineering',
          'BS Mechanical Engineering',
          'BS Electrical Engineering',
          'BS Nursing',
          'BS Education',
          'Other'
        ];
        console.log('Using fallback courses:', courses);
      }

      courseSelect.innerHTML = '<option value="">Select course</option>';

      if (courses.length > 0) {
        courses.forEach(course => {
          const option = document.createElement('option');
          option.value = course;
          option.textContent = course;
          courseSelect.appendChild(option);
        });
        courseSelect.disabled = false;
        courseSelect.setAttribute('required', 'required');
        console.log('Course select enabled with', courses.length, 'courses');
      } else {
        courseSelect.disabled = true;
        courseSelect.removeAttribute('required');
        courseSelect.innerHTML = '<option value="">No courses available for this department</option>';
      }
    });
  }

  toggleView(view) {
    // Ensure login is default view
    if (!view) view = 'login';
    this.isSignup = view === 'signup';
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const title = document.getElementById('authTitle');
    const subtitle = document.getElementById('authSubtitle');
    const toggleHint = document.getElementById('authToggleHint');
    
    console.log('🔄 Toggling view:', view, { isSignup: this.isSignup });
    const toggleLink = document.getElementById('toggleSignup');

    // Check if elements exist before accessing them (for separate modal structure)
    if (this.isSignup) {
      if (loginForm) loginForm.classList.add('hidden');
      if (signupForm) signupForm.classList.remove('hidden');
      if (title) title.textContent = 'Create your account';
      if (subtitle) subtitle.textContent = 'Sign up with your ID number';
      if (toggleHint) toggleHint.textContent = 'Already have an account?';
      if (toggleLink) toggleLink.textContent = 'Sign in';
      // Ensure any prefilled ID is processed so the Create Account button
      // becomes enabled immediately if the ID is valid. Use a timeout to
      // allow the DOM to finish updating before running the handler.
      setTimeout(() => {
        const currentId = document.getElementById('signupIdNumber')?.value || '';
        this.handleIdNumberChange(currentId);
        // Also update button state after a short delay to ensure all fields are ready
        setTimeout(() => {
          this.updateSignupButtonState();
        }, 200);
      }, 0);
    } else {
      if (signupForm) signupForm.classList.add('hidden');
      if (loginForm) loginForm.classList.remove('hidden');
      if (title) title.textContent = 'Welcome back';
      if (subtitle) subtitle.textContent = 'Sign in to your account';
      if (toggleHint) toggleHint.textContent = "Don't have an account?";
      if (toggleLink) toggleLink.textContent = 'Sign up';
    }
  }

  async handleLogin() {
    console.log('🚀 handleLogin() called');
    
    const idNumberInput = document.getElementById('idNumber');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const idError = document.getElementById('idNumberError');
    const passwordError = document.getElementById('passwordError');

    if (!idNumberInput || !passwordInput) {
      console.error('❌ Login form inputs not found!');
      Utils.showToast('Login form error. Please refresh the page.', 'error');
      return;
    }

    const idNumber = idNumberInput.value.trim();
    const password = passwordInput.value;

    console.log('📝 Form values:', { idNumber: idNumber ? '***' : 'empty', hasPassword: !!password });

    idError.textContent = '';
    passwordError.textContent = '';
    idError.classList.remove('show');
    passwordError.classList.remove('show');

    if (!idNumber) {
      console.warn('⚠️ ID number is empty');
      idError.textContent = 'ID number is required';
      idError.classList.add('show');
      return;
    }
    if (!password) {
      console.warn('⚠️ Password is empty');
      passwordError.textContent = 'Password is required';
      passwordError.classList.add('show');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';

    try {
      console.log('🔐 Attempting login for ID:', idNumber);
      
      const response = await Utils.apiRequest('/auth/login', {
        method: 'POST',
        body: { idNumber, password }
      });

      console.log('📥 Login response received:', response);

      if (!response) {
        throw new Error('No response from server');
      }

      const { user, token } = response;
      
      if (!user) {
        console.error('❌ No user in response:', response);
        throw new Error('Invalid response: missing user data');
      }
      
      if (!token) {
        console.error('❌ No token in response:', response);
        throw new Error('Invalid response: missing authentication token');
      }

      console.log('✅ Login successful, user role:', user.role);
      console.log('✅ User data:', user);
      console.log('✅ Token received:', token ? 'Yes' : 'No');

      // Store user data and token FIRST
      Utils.setCurrentUser(user, token);
      
      // Small delay to ensure localStorage is written (though it's synchronous)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify storage immediately
      const storedUser = Utils.getCurrentUser();
      const storedToken = Utils.getAuthToken();
      console.log('✅ Verification - Stored user:', storedUser ? 'Yes' : 'No');
      console.log('✅ Verification - Stored token:', storedToken ? 'Yes' : 'No');
      console.log('✅ Stored user role:', storedUser?.role);
      
      if (!storedUser || !storedToken) {
        console.error('❌ Failed to store authentication data');
        throw new Error('Failed to store authentication data');
      }

      Utils.showToast(`Welcome, ${user.fullName || user.name || 'User'}!`, 'success');

      // Hide modal immediately
      this.hide();
      
      // Auto-redirect based on user role from database
      // Use absolute path from root to ensure it works
      const redirectMap = {
        student: '/STUDENT/views/student-portal.html',
        faculty: '/FACULTY/views/faculty-portal.html',
        admin: '/ADMIN/views/admin-portal.html'
      };
      
      const redirectPath = redirectMap[user.role] || '/index.html';
      const fullUrl = window.location.origin + redirectPath;
      
      console.log('🔄 Redirecting to:', redirectPath);
      console.log('🔄 Full URL:', fullUrl);
      console.log('🔄 Current URL:', window.location.href);
      
      // Use a small delay to ensure toast is shown, then redirect
      setTimeout(() => {
        // Use window.location.replace to prevent back button issues
        window.location.replace(redirectPath);
      }, 300);
    } catch (error) {
      console.error('❌ Login failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // Parse error message if it's JSON
      let errorMessage = 'Login failed. Please check your credentials.';
      try {
        const parsed = JSON.parse(error.message);
        if (parsed && parsed.message) {
          errorMessage = parsed.message;
        } else if (parsed && parsed.error) {
          errorMessage = parsed.error;
        }
      } catch (e) {
        // Not JSON, use raw message
        if (error.message) {
          errorMessage = error.message;
        }
      }
      
      // Show user-friendly error
      Utils.showToast(errorMessage, 'error');
      passwordError.textContent = errorMessage;
      passwordError.classList.add('show');
      
      // Also log troubleshooting info
      console.error('💡 TROUBLESHOOTING:');
      console.error('   1. Check if server is running: npm start');
      console.error('   2. Verify ID number and password are correct');
      console.error('   3. Check browser console for network errors');
      console.error('   4. Verify database connection');
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    }
  }

  async handleSignup() {
    const idNumber = document.getElementById('signupIdNumber')?.value.trim() || '';
    const fullName = document.getElementById('fullName')?.value.trim() || '';
    const email = document.getElementById('signupEmail')?.value.trim() || '';
    const password = document.getElementById('signupPassword')?.value || '';
    const confirmPassword = document.getElementById('confirmPassword')?.value || '';
    const signupBtn = document.getElementById('signupBtn');
    const errorEl = document.getElementById('signupError');
    const signupIdError = document.getElementById('signupIdError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');

    console.log('🔔 handleSignup invoked', { idNumber, fullName, email, hasPassword: !!password, hasConfirmPassword: !!confirmPassword });

    // Clear all errors
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('show');
    }
    if (signupIdError) {
      signupIdError.textContent = '';
      signupIdError.classList.remove('show');
    }
    if (confirmPasswordError) {
      confirmPasswordError.textContent = '';
      confirmPasswordError.classList.remove('show');
    }

    // Validate role detection
    const detectedRole = this.detectRoleFromId(idNumber);
    if (!detectedRole) {
      signupIdError.textContent = 'Invalid ID format for signup.';
      signupIdError.classList.add('show');
      return;
    }

    // Validate password length
    if (!password || password.length < 3) {
      const passwordError = document.getElementById('signupPasswordError');
      if (passwordError) {
        passwordError.textContent = 'Password must be at least 3 characters long.';
        passwordError.classList.add('show');
      }
      if (errorEl) {
        errorEl.textContent = 'Password must be at least 3 characters long.';
        errorEl.classList.add('show');
      }
      console.error('Validation failed: Password too short');
      return;
    }

    // Validate password match
    if (!confirmPassword) {
      if (confirmPasswordError) {
        confirmPasswordError.textContent = 'Please confirm your password.';
        confirmPasswordError.classList.add('show');
      }
      if (errorEl) {
        errorEl.textContent = 'Please confirm your password.';
        errorEl.classList.add('show');
      }
      console.error('Validation failed: Confirm password missing');
      return;
    }

    if (password !== confirmPassword) {
      if (confirmPasswordError) {
        confirmPasswordError.textContent = 'Passwords do not match';
        confirmPasswordError.classList.add('show');
      }
      if (errorEl) {
        errorEl.textContent = 'Passwords do not match.';
        errorEl.classList.add('show');
      }
      console.error('Validation failed: Passwords do not match');
      return;
    }

    // Basic client-side validation for required fields depending on role
    if (!fullName || !email) {
      errorEl.textContent = 'Full name and email are required.';
      errorEl.classList.add('show');
      return;
    }

    if (detectedRole === 'student') {
      const departmentId = document.getElementById('departmentSelect')?.value || '';
      const course = document.getElementById('courseSelect')?.value || '';
      const yearLevel = document.getElementById('yearLevelSelect')?.value || '';
      
      // Check if course select is disabled (meaning no department selected)
      const courseSelect = document.getElementById('courseSelect');
      if (courseSelect && courseSelect.disabled) {
        errorEl.textContent = 'Please select a department first, then select a course.';
        errorEl.classList.add('show');
        // Highlight the department select
        const deptSelect = document.getElementById('departmentSelect');
        if (deptSelect) {
          deptSelect.style.borderColor = '#dc3545';
          deptSelect.focus();
          setTimeout(() => {
            deptSelect.style.borderColor = '';
          }, 3000);
        }
        return;
      }
      
      if (!departmentId || !course || !yearLevel) {
        let missingFields = [];
        if (!departmentId) missingFields.push('department');
        if (!course) missingFields.push('course');
        if (!yearLevel) missingFields.push('year level');
        errorEl.textContent = `Please fill in: ${missingFields.join(', ')}.`;
        errorEl.classList.add('show');
        
        // Highlight missing fields
        if (!departmentId) {
          const deptSelect = document.getElementById('departmentSelect');
          if (deptSelect) {
            deptSelect.style.borderColor = '#dc3545';
            deptSelect.focus();
          }
        }
        if (!course) {
          const courseSelect = document.getElementById('courseSelect');
          if (courseSelect) {
            courseSelect.style.borderColor = '#dc3545';
            if (departmentId) courseSelect.focus();
          }
        }
        if (!yearLevel) {
          const yearSelect = document.getElementById('yearLevelSelect');
          if (yearSelect) {
            yearSelect.style.borderColor = '#dc3545';
            if (departmentId && course) yearSelect.focus();
          }
        }
        
        setTimeout(() => {
          document.querySelectorAll('#signupForm select').forEach(select => {
            select.style.borderColor = '';
          });
        }, 3000);
        return;
      }
    } else if (detectedRole === 'faculty' || detectedRole === 'admin') {
      const departmentId = document.getElementById('departmentSelect')?.value || '';
      if (!departmentId) {
        errorEl.textContent = 'Department is required.';
        errorEl.classList.add('show');
        return;
      }
    }

    if (!signupBtn) {
      console.error('Signup button not found!');
      if (errorEl) {
        errorEl.textContent = 'Form error. Please refresh the page.';
        errorEl.classList.add('show');
      }
      return;
    }

    // Prevent multiple submissions
    if (signupBtn.hasAttribute('data-submitting')) {
      console.warn('⚠️ Signup already in progress, ignoring duplicate click');
      return;
    }

    signupBtn.setAttribute('data-submitting', 'true');
    signupBtn.disabled = true;
    signupBtn.textContent = 'Creating account...';
    signupBtn.style.cursor = 'wait';
    console.log('🚀 Submitting signup request...', { role: detectedRole, hasDepartment: !!document.getElementById('departmentSelect')?.value });

    try {
      let requestBody = {
        fullName,
        email,
        idNumber,
        password,
        role: detectedRole // Send detected role
      };

      // Add role-specific fields
      if (detectedRole === 'student') {
        const departmentId = document.getElementById('departmentSelect').value;
        const course = document.getElementById('courseSelect').value.trim();
        const yearLevel = document.getElementById('yearLevelSelect').value.trim();

        requestBody = {
          ...requestBody,
          departmentId,
          course,
          yearLevel
        };
      } else if (detectedRole === 'faculty') {
        const departmentId = document.getElementById('departmentSelect').value;
        const position = document.getElementById('position')?.value.trim() || '';

        requestBody = {
          ...requestBody,
          departmentId,
          position
        };
      } else if (detectedRole === 'admin') {
        const departmentId = document.getElementById('departmentSelect').value;

        requestBody = {
          ...requestBody,
          departmentId
        };
      }

      console.log('📤 Sending signup request to server...', { ...requestBody, password: '[HIDDEN]' });
      
      // Show loading state
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('show');
      }
      
      // First, check if server is reachable
      try {
        const healthCheck = await fetch(`${window.location.origin}/api/health`);
        if (!healthCheck.ok) {
          throw new Error('Server health check failed');
        }
        console.log('✅ Server is reachable');
      } catch (healthError) {
        console.error('❌ Server health check failed:', healthError);
        throw new Error('Cannot connect to server. Please make sure the server is running. Open terminal and run: npm start');
      }
      
      const response = await Utils.apiRequest('/auth/signup', {
        method: 'POST',
        body: requestBody
      });

      console.log('✅ Signup response received:', response);
      
      if (!response) {
        throw new Error('No response from server');
      }

      const { user, token } = response;
      
      if (!user || !token) {
        throw new Error('Invalid response: missing user or token');
      }

      Utils.setCurrentUser(user, token);
      Utils.showToast('Account created successfully! Redirecting...', 'success');
      console.log('✅ Account created, redirecting...');

      setTimeout(() => {
        this.hide();
        
        // Auto-redirect based on detected role
        const redirectMap = {
          student: '/STUDENT/views/student-portal.html',
          faculty: '/FACULTY/views/faculty-portal.html',
          admin: '/ADMIN/views/admin-portal.html'
        };
        
        const redirectUrl = redirectMap[detectedRole] || '/';
        console.log('🔄 Redirecting to:', redirectUrl);
        window.location.href = redirectUrl;
      }, 800);
    } catch (error) {
      console.error('❌ Signup failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Try to parse server error message (utils.apiRequest throws Error with response text)
      let friendly = 'Signup failed. Please verify your details and try again.';
      let errorDetails = '';
      
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(error.message);
        if (parsed && parsed.message) {
          friendly = parsed.message;
          errorDetails = parsed.error || '';
        } else if (parsed && parsed.error) {
          friendly = parsed.error;
        }
      } catch (e) {
        // Not JSON, use raw message if available
        if (error.message) {
          friendly = error.message;
          // If it's a network error, provide more helpful message
          if (error.message.includes('Failed to fetch') || 
              error.message.includes('NetworkError') ||
              error.message.includes('ERR_CONNECTION_REFUSED') ||
              error.message.includes('ERR_INTERNET_DISCONNECTED')) {
            friendly = 'Cannot connect to server. Please make sure the server is running on localhost:3000.';
          }
        }
      }
      
      // Always show error prominently
      if (errorEl) {
        errorEl.textContent = friendly;
        errorEl.classList.add('show');
        errorEl.style.display = 'block';
        errorEl.style.color = '#dc3545';
        errorEl.style.backgroundColor = '#f8d7da';
        errorEl.style.padding = '12px';
        errorEl.style.borderRadius = '4px';
        errorEl.style.marginTop = '10px';
        // Scroll to error
        setTimeout(() => {
          errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
      
      // Also show in ID error field if it's ID-related
      if (/id number|id_number/i.test(friendly) && signupIdError) {
        signupIdError.textContent = friendly;
        signupIdError.classList.add('show');
      }
      
      // Also show toast notification
      Utils.showToast(friendly || 'Signup failed. Please try again.', 'error');
      
      // Log to help user debug
      console.error('💡 TROUBLESHOOTING:');
      console.error('   1. Make sure the server is running: npm start');
      console.error('   2. Check if server is on port 3000');
      console.error('   3. Check browser console for network errors');
    } finally {
      if (signupBtn) {
        signupBtn.removeAttribute('data-submitting');
        signupBtn.disabled = false;
        signupBtn.removeAttribute('disabled');
        signupBtn.style.pointerEvents = 'auto';
        signupBtn.style.cursor = 'pointer';
        signupBtn.textContent = 'Create Account';
        // Update button state based on current form values
        this.updateSignupButtonState();
      }
    }
  }

  show() {
    // Show login modal
    if (this.modal) {
      this.modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  showSignup() {
    // Show signup modal
    console.log('🔔 showSignup() called', { signupModal: this.signupModal });
    if (this.signupModal) {
      // Hide login modal if it's open
      if (this.modal) {
        this.modal.classList.remove('active');
      }
      
      // Show signup modal
      this.signupModal.classList.add('active');
      document.body.style.overflow = 'hidden';
      
      console.log('✅ Signup modal shown');
      
      // Ensure signup form is visible (not hidden)
      const signupForm = document.getElementById('signupForm');
      if (signupForm) {
        signupForm.classList.remove('hidden');
        signupForm.style.display = 'block';
      }
      
      // Initialize signup form when showing
      setTimeout(() => {
        // Re-attach event listeners for signup form fields
        this.attachSignupFieldListeners();
        
        // Re-attach form submit handler
        if (signupForm) {
          signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
          });
        }
        
        const currentId = document.getElementById('signupIdNumber')?.value || '';
        if (currentId) {
          this.handleIdNumberChange(currentId);
        }
        setTimeout(() => {
          this.updateSignupButtonState();
        }, 200);
      }, 100);
    } else {
      console.error('❌ Signup modal not found!');
    }
  }

  attachSignupFieldListeners() {
    // Re-attach password visibility toggles for signup form
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const passwordInput = document.getElementById('signupPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    if (togglePassword && passwordInput) {
      togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.querySelector('i').classList.toggle('fa-eye');
        togglePassword.querySelector('i').classList.toggle('fa-eye-slash');
      });
    }

    if (toggleConfirmPassword && confirmPasswordInput) {
      toggleConfirmPassword.addEventListener('click', () => {
        const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        confirmPasswordInput.setAttribute('type', type);
        toggleConfirmPassword.querySelector('i').classList.toggle('fa-eye');
        toggleConfirmPassword.querySelector('i').classList.toggle('fa-eye-slash');
      });
    }

    // Re-attach ID number change handler
    const signupIdInput = document.getElementById('signupIdNumber');
    if (signupIdInput) {
      signupIdInput.addEventListener('input', (e) => {
        this.handleIdNumberChange(e.target.value);
      });
    }
  }

  hide() {
    if (this.modal) {
      this.modal.classList.remove('active');
    }
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.reset();
    document.body.style.overflow = '';
  }

  hideSignup() {
    if (this.signupModal) {
      this.signupModal.classList.remove('active');
    }
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
      signupForm.reset();
      const dynamicFields = document.getElementById('dynamicFields');
      if (dynamicFields) dynamicFields.innerHTML = '';
      const roleIndicator = document.getElementById('roleIndicator');
      if (roleIndicator) roleIndicator.classList.add('hidden');
    }
    document.body.style.overflow = '';
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LoginModal;
}