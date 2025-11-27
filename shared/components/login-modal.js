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
    this.toggleView('login');
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
      <div class="modal-overlay" id="loginModal">
        <div class="login-modal">
          <button class="close-modal" id="closeModal">&times;</button>
          <div class="modal-header">
            <h2 id="authTitle">Welcome Back</h2>
            <p id="authSubtitle">Sign in to your account</p>
          </div>

          <div class="auth-toggle">
            <span id="authToggleHint">Don't have an account?</span>
            <button type="button" id="toggleSignup" class="link-button">Sign up</button>
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

          <!-- Signup Form -->
          <form id="signupForm" class="auth-form hidden">
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
              <label for="signupPassword">Password *</label>
              <input type="password" id="signupPassword" name="signupPassword" placeholder="Create a password (min 3 characters)" required />
              <div class="error-message" id="signupError"></div>
            </div>

            <button type="submit" class="btn-primary" id="signupBtn" disabled>Create Account</button>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('loginModal');

    // Store department courses for dynamic population
    this.departmentCourses = departmentCourses;
    this.departmentOptions = departmentOptions;
  }

  attachEventListeners() {
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      this.handleLogin();
    });

    const signupForm = document.getElementById('signupForm');
    signupForm.addEventListener('submit', (event) => {
      event.preventDefault();
      this.handleSignup();
    });

    // Add a click fallback on the button in case form submit isn't firing
    const signupBtn = document.getElementById('signupBtn');
    if (signupBtn) {
      signupBtn.addEventListener('click', (e) => {
        if (signupBtn.disabled) return;
        e.preventDefault();
        // Defensive: call handleSignup directly and log for debugging
        console.log('🔔 signupBtn clicked (fallback)');
        this.handleSignup();
      });
    }

    document.getElementById('toggleSignup').addEventListener('click', () => {
      this.toggleView(this.isSignup ? 'login' : 'signup');
    });

    document.getElementById('closeModal').addEventListener('click', () => this.hide());

    this.modal.addEventListener('click', (event) => {
      if (event.target === this.modal) this.hide();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.modal.classList.contains('active')) this.hide();
    });

    // Real-time ID number validation and role detection for signup
    const signupIdInput = document.getElementById('signupIdNumber');
    signupIdInput.addEventListener('input', (e) => {
      this.handleIdNumberChange(e.target.value);
    });
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
      console.debug('handleIdNumberChange: short id - disabling signupBtn', { hasAttr: signupBtn?.hasAttribute('disabled'), propDisabled: signupBtn?.disabled });
      signupBtn.disabled = true;
      signupBtn.setAttribute('disabled', '');
      signupBtn.style.pointerEvents = 'none';
      return;
    }

    const detectedRole = this.detectRoleFromId(idNumber);

    if (!detectedRole) {
      roleIndicator.classList.add('hidden');
      roleIndicator.innerHTML = '';
      dynamicFields.innerHTML = '';
      console.debug('handleIdNumberChange: invalid role - disabling signupBtn', { hasAttr: signupBtn?.hasAttribute('disabled'), propDisabled: signupBtn?.disabled });
      signupBtn.disabled = true;
      signupBtn.setAttribute('disabled', '');
      signupBtn.style.pointerEvents = 'none';
      
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
    console.debug('handleIdNumberChange: enabling signupBtn for detected role', { role: detectedRole, beforeAttr: signupBtn?.getAttribute('disabled'), beforeProp: signupBtn?.disabled });
    signupBtn.disabled = false;
    signupBtn.removeAttribute('disabled');
    signupBtn.style.pointerEvents = 'auto';
    console.debug('handleIdNumberChange: signupBtn enabled', { afterAttr: signupBtn?.getAttribute('disabled'), afterProp: signupBtn?.disabled });
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
    this.isSignup = view === 'signup';
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const title = document.getElementById('authTitle');
    const subtitle = document.getElementById('authSubtitle');
    const toggleHint = document.getElementById('authToggleHint');
    const toggleLink = document.getElementById('toggleSignup');

    if (this.isSignup) {
      loginForm.classList.add('hidden');
      signupForm.classList.remove('hidden');
      title.textContent = 'Create your account';
      subtitle.textContent = 'Sign up with your ID number';
      toggleHint.textContent = 'Already have an account?';
      toggleLink.textContent = 'Sign in';
      // Ensure any prefilled ID is processed so the Create Account button
      // becomes enabled immediately if the ID is valid. Use a timeout to
      // allow the DOM to finish updating before running the handler.
      setTimeout(() => {
        const currentId = document.getElementById('signupIdNumber')?.value || '';
        this.handleIdNumberChange(currentId);
      }, 0);
    } else {
      signupForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
      title.textContent = 'Welcome back';
      subtitle.textContent = 'Sign in to your account';
      toggleHint.textContent = "Don't have an account?";
      toggleLink.textContent = 'Sign up';
    }
  }

  async handleLogin() {
    const idNumber = document.getElementById('idNumber').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const idError = document.getElementById('idNumberError');
    const passwordError = document.getElementById('passwordError');

    idError.textContent = '';
    passwordError.textContent = '';
    idError.classList.remove('show');
    passwordError.classList.remove('show');

    if (!idNumber) {
      idError.textContent = 'ID number is required';
      idError.classList.add('show');
      return;
    }
    if (!password) {
      passwordError.textContent = 'Password is required';
      passwordError.classList.add('show');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';

    try {
      const response = await Utils.apiRequest('/auth/login', {
        method: 'POST',
        body: { idNumber, password }
      });

      const { user, token } = response;
      if (!user || !token) throw new Error('Invalid response from server');

      // Store user data and token
      Utils.setCurrentUser(user, token);
      Utils.showToast(`Welcome, ${user.fullName || user.name || 'User'}!`, 'success');

      setTimeout(() => {
        this.hide();
        
        // Auto-redirect based on user role from database
        const redirectMap = {
          student: '/STUDENT/views/student-portal.html',
          faculty: '/FACULTY/views/faculty-portal.html',
          admin: '/ADMIN/views/admin-portal.html'
        };
        
        window.location.href = redirectMap[user.role] || '/';
      }, 500);
    } catch (error) {
      console.error('Login failed:', error);
      Utils.showToast('Login failed. Please check your credentials.', 'error');
      passwordError.textContent = 'Invalid credentials.';
      passwordError.classList.add('show');
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    }
  }

  async handleSignup() {
    const idNumber = document.getElementById('signupIdNumber')?.value.trim() || '';
    const fullName = document.getElementById('fullName')?.value.trim() || '';
    const email = document.getElementById('signupEmail')?.value.trim() || '';
    const password = document.getElementById('signupPassword').value;
    const signupBtn = document.getElementById('signupBtn');
    const errorEl = document.getElementById('signupError');
    const signupIdError = document.getElementById('signupIdError');

    console.log('🔔 handleSignup invoked', { idNumber, fullName, email });

    errorEl.textContent = '';
    errorEl.classList.remove('show');
    signupIdError.textContent = '';
    signupIdError.classList.remove('show');

    // Validate role detection
    const detectedRole = this.detectRoleFromId(idNumber);
    if (!detectedRole) {
      signupIdError.textContent = 'Invalid ID format for signup.';
      signupIdError.classList.add('show');
      return;
    }

    // Validate password length
    if (password.length < 3) {
      errorEl.textContent = 'Password must be at least 3 characters long.';
      errorEl.classList.add('show');
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

    signupBtn.disabled = true;
    signupBtn.textContent = 'Creating account...';

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

      const response = await Utils.apiRequest('/auth/signup', {
        method: 'POST',
        body: requestBody
      });

      const { user, token } = response;
      Utils.setCurrentUser(user, token);
      Utils.showToast('Account created successfully. Redirecting...', 'success');

      setTimeout(() => {
        this.hide();
        
        // Auto-redirect based on detected role
        const redirectMap = {
          student: '/STUDENT/views/student-portal.html',
          faculty: '/FACULTY/views/faculty-portal.html',
          admin: '/ADMIN/views/admin-portal.html'
        };
        
        window.location.href = redirectMap[detectedRole] || '/';
      }, 800);
    } catch (error) {
      console.error('Signup failed:', error);
      // Try to parse server error message (utils.apiRequest throws Error with response text)
      let friendly = 'Signup failed. Please verify your details and try again.';
      try {
        const parsed = JSON.parse(error.message);
        if (parsed && parsed.message) friendly = parsed.message;
        else if (parsed && parsed.error) friendly = parsed.error;
      } catch (e) {
        // Not JSON, use raw message if available
        if (error.message) friendly = error.message;
      }
      // If the server message relates to the ID, show it under the ID field
      const signupIdError = document.getElementById('signupIdError');
      if (/id number/i.test(friendly) && signupIdError) {
        signupIdError.textContent = friendly;
        signupIdError.classList.add('show');
      } else {
        errorEl.textContent = friendly;
        errorEl.classList.add('show');
      }
    } finally {
      signupBtn.disabled = false;
      signupBtn.removeAttribute('disabled');
      signupBtn.style.pointerEvents = 'auto';
      signupBtn.textContent = 'Create Account';
    }
  }

  show() {
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  hide() {
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    if (loginForm) loginForm.reset();
    if (signupForm) {
      signupForm.reset();
      document.getElementById('dynamicFields').innerHTML = '';
      document.getElementById('roleIndicator').classList.add('hidden');
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LoginModal;
}