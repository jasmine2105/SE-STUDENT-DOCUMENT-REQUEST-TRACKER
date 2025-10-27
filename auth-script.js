// Authentication JavaScript

let users = [];
let currentUser = null;
let selectedRole = null; // Store the selected role (student, faculty, admin)
let pendingRole = null; // Role awaiting password verification

// NOTE: These are placeholder passwords for demo purposes.
// Change them to secure values or implement server-side role auth for production.
const ADMIN_PASSWORD = 'admin123';
const FACULTY_PASSWORD = 'faculty123';

// Simple notification function for auth page
function showNotification(type, message, duration = 3000) {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.auth-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `auth-notification auth-notification-${type}`;
    notification.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    // Add to page
    const container = document.querySelector('.auth-wrapper');
    container.insertBefore(notification, container.firstChild);

    // Auto remove after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, duration);
}

// Show inline error inside the role password modal
function showRolePassError(message, timeout = 5000) {
    const el = document.getElementById('rolePassError');
    if (!el) {
        // fallback to notification
        showNotification('error', message, timeout);
        return;
    }
    el.textContent = message;
    el.style.display = 'block';
    // Auto-hide
    clearTimeout(el._hideTimeout);
    el._hideTimeout = setTimeout(() => {
        el.style.display = 'none';
    }, timeout);
}

// Show inline error at the top of the login form
function showLoginFormError(message, timeout = 4000) {
    const el = document.getElementById('loginFormError');
    if (!el) {
        showNotification('error', message, timeout);
        return;
    }
    el.textContent = message;
    el.style.display = 'block';
    clearTimeout(el._hideTimeout);
    el._hideTimeout = setTimeout(() => {
        el.style.display = 'none';
    }, timeout);
}

// Simple modal function for auth page
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}

// Initialize authentication system
document.addEventListener('DOMContentLoaded', function() {
    loadUsers();
    setupEventListeners();
    
    // If someone opens the auth page and they already have a session
    // show a small prompt instead of auto-redirecting. This lets the
    // user explicitly choose to continue to the portal, switch account,
    // or log out. If no session exists, show role selection.
    const currentUserData = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (currentUserData) {
        showLoggedInPrompt();
    } else {
        // Show role selection if not logged in
        showRoleSelection();
    }
});

// When a user with an active session visits the auth page, show a small
// banner with options to continue to their portal, switch accounts, or log out.
function showLoggedInPrompt() {
    const saved = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    let user = null;
    try {
        user = saved ? JSON.parse(saved) : null;
    } catch (e) {
        user = null;
    }

    // If parsing failed or no user, fall back to role selection
    if (!user) {
        showRoleSelection();
        return;
    }

    const wrapper = document.querySelector('.auth-wrapper');
    if (!wrapper) return showRoleSelection();

    // Remove any existing banner
    const existing = document.getElementById('loggedInBanner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'loggedInBanner';
    banner.className = 'auth-notification auth-notification-info';
    banner.style.marginBottom = '1rem';
    banner.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <strong>Signed in as ${user.firstName || ''} ${user.lastName || ''} (${user.email || ''})</strong>
                <div style="margin-top:6px">
                    <button class="btn btn-primary" id="continuePortalBtn">Continue to Portal</button>
                    <button class="btn btn-outline" id="switchAccountBtn">Switch Account</button>
                    <button class="btn btn-outline" id="logoutBtn">Logout</button>
                </div>
            </div>
        </div>
    `;

    wrapper.insertBefore(banner, wrapper.firstChild);

    // Show role selection underneath so users can still choose to register/login
    showRoleSelection();

    // Hook up buttons
    const continueBtn = document.getElementById('continuePortalBtn');
    const switchBtn = document.getElementById('switchAccountBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (continueBtn) continueBtn.addEventListener('click', redirectToStudentPortal);
    if (switchBtn) switchBtn.addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
        const b = document.getElementById('loggedInBanner');
        if (b) b.remove();
        showRoleSelection();
    });
    if (logoutBtn) logoutBtn.addEventListener('click', function() {
        logout();
    });
}

// Open the shared role password modal and wire submit behavior
function openRolePasswordModal(role) {
    const modal = document.getElementById('rolePassModal');
    const prompt = document.getElementById('rolePassPrompt');
    const passwordInput = document.getElementById('rolePasswordInput');
    const submitBtn = document.getElementById('rolePassSubmit');

    if (!modal || !passwordInput || !submitBtn) return;

    prompt.textContent = `The ${role} role requires a password. Please enter it to continue.`;
    passwordInput.value = '';
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    const cleanup = () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        submitBtn.onclick = null;
        // hide any previous role password errors
        const err = document.getElementById('rolePassError');
        if (err) { err.style.display = 'none'; clearTimeout(err._hideTimeout); }
    };

    submitBtn.onclick = function() {
        const val = passwordInput.value || '';
        if (role === 'admin' && val === ADMIN_PASSWORD) {
            selectedRole = 'admin';
            pendingRole = null;
            // Mark this browser session as having verified the admin role password
            try { sessionStorage.setItem('roleVerified', 'admin'); } catch (e) { /* ignore */ }
            cleanup();
            // Directly navigate to admin portal (no signup/login required after password)
            try {
                const origin = window.location.origin || '';
                const portalPath = '/admin-portal.html';
                if (origin && origin.startsWith('http')) {
                    window.location.href = origin + portalPath;
                } else {
                    window.location.href = portalPath;
                }
            } catch (e) {
                window.location.href = '/admin-portal.html';
            }
        } else if (role === 'faculty' && val === FACULTY_PASSWORD) {
            selectedRole = 'faculty';
            pendingRole = null;
            // Mark this browser session as having verified the faculty role password
            try { sessionStorage.setItem('roleVerified', 'faculty'); } catch (e) { /* ignore */ }
            cleanup();
            // Directly navigate to faculty portal
            try {
                const origin = window.location.origin || '';
                const portalPath = '/FACULTY/faculty-portal.html';
                if (origin && origin.startsWith('http')) {
                    window.location.href = origin + portalPath;
                } else {
                    window.location.href = portalPath;
                }
            } catch (e) {
                window.location.href = '/FACULTY/faculty-portal.html';
            }
        } else {
            // Show inline error in modal and keep it open
            showRolePassError('Incorrect role password. Only authorized persons may access this area.');
            passwordInput.value = '';
            passwordInput.focus();
        }
    };
}

// Check if user is coming back to auth page to select role
function checkForRoleSelection() {
    const currentUserData = localStorage.getItem('currentUser');
    if (!currentUserData) {
        // User is not logged in, show role selection
        showRoleSelection();
    }
}

// Show role selection screen
function showRoleSelection() {
    const roleSelection = document.getElementById('roleSelection');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (roleSelection) {
        roleSelection.classList.remove('d-none');
        roleSelection.style.display = 'block';
    }
    if (loginForm) {
        loginForm.classList.add('d-none');
        loginForm.style.display = 'none';
        const loginErr = document.getElementById('loginFormError');
        if (loginErr) { loginErr.style.display = 'none'; clearTimeout(loginErr._hideTimeout); }
    }
    if (signupForm) {
        signupForm.classList.add('d-none');
        signupForm.style.display = 'none';
    }
}

// Select role and show appropriate form
function selectRole(role) {
    console.log('Selected role:', role);
    const roleSelection = document.getElementById('roleSelection');
    const loginForm = document.getElementById('loginForm');
    const loginRoleTitle = document.getElementById('loginRoleTitle');
    const signupRoleTitle = document.getElementById('signupRoleTitle');
    const showSignupBtn = document.getElementById('showSignupBtn');

    // If admin or faculty, require password first
    if (role === 'admin' || role === 'faculty') {
        pendingRole = role;
        openRolePasswordModal(role);
        return;
    }

    // Student role: proceed to login form
    selectedRole = role;
    // Hide role selection and show login form
    if (roleSelection) {
        roleSelection.classList.add('d-none');
        roleSelection.style.display = 'none';
    }
    if (loginForm) {
        loginForm.classList.remove('d-none');
        loginForm.style.display = 'block';
    }

    // Update titles based on role
    const roleTitles = {
        'student': 'Student Login',
        'faculty': 'Faculty Login',
        'admin': 'Administrator Login'
    };
    if (loginRoleTitle) loginRoleTitle.textContent = roleTitles[role] || 'Login';
    if (signupRoleTitle) signupRoleTitle.textContent = roleTitles[role]?.replace('Login', 'Registration') || 'Registration';

    // Hide signup button for admin and faculty (they need admin approval)
    if (showSignupBtn) {
        if (role === 'admin' || role === 'faculty') {
            showSignupBtn.style.display = 'none';
        } else {
            showSignupBtn.style.display = 'block';
        }
    }
}

// Go back to role selection
function goBackToRoleSelection() {
    selectedRole = null;
    showRoleSelection();
}

// Make function globally available
window.selectRole = selectRole;
window.goBackToRoleSelection = goBackToRoleSelection;

// Load existing users from localStorage
function loadUsers() {
    const savedUsers = localStorage.getItem('docTrackerUsers');
    if (savedUsers) {
        users = JSON.parse(savedUsers);
    } else {
        // Initialize with empty array - any student can register
        users = [];
        saveUsers();
    }
}

// Save users to localStorage
function saveUsers() {
    localStorage.setItem('docTrackerUsers', JSON.stringify(users));
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginFormElement');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Signup form
    const signupForm = document.getElementById('signupFormElement');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
}

// Check authentication state
function checkAuthState() {
    const currentUserData = localStorage.getItem('currentUser');
    if (currentUserData) {
        currentUser = JSON.parse(currentUserData);
        // Redirect to appropriate portal based on role
        const role = currentUser.role || 'student';
        let portalPath = '/STUDENT/student-portal.html';
        
        if (role === 'faculty') {
            portalPath = '/FACULTY/faculty-portal.html';
        } else if (role === 'admin') {
            portalPath = '/admin-portal.html';
        }
        
        try {
            const origin = window.location.origin || '';
            if (origin && origin.startsWith('http')) {
                window.location.href = origin + portalPath;
            } else {
                window.location.href = portalPath;
            }
        } catch (e) {
            window.location.href = portalPath;
        }
    }
}

// Handle login
function handleLogin(e) {
    e.preventDefault();
    
    // Validate that a role has been selected
    if (!selectedRole) {
        showNotification('error', 'Please select a role first.');
        goBackToRoleSelection();
        return;
    }
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Validate email and password are filled
    if (!email || !password) {
        showLoginFormError('Please enter both email and password.');
        return;
    }
    
    // Debug: Log available users and search criteria
    console.log('Attempting login for role:', selectedRole);
    console.log('Total users:', users.length);
    console.log('Available users:', users.map(u => ({ email: u.email, role: u.role || 'no role' })));
    
    // Find user with matching credentials and role
    // For backward compatibility: if user has no role, assume 'student'
    const user = users.find(u => {
        if (u.email === email && u.password === password && u.isActive) {
            // If user has no role set, default to 'student'
            const userRole = u.role || 'student';
            console.log(`User ${u.email} has role: ${userRole}, searching for: ${selectedRole}`);
            return userRole === selectedRole;
        }
        return false;
    });
    
    console.log('Found user:', user ? user.email : 'none');
    
    if (user) {
        // Ensure user has a role for future logins
        if (!user.role) {
            user.role = 'student';
            saveUsers();
        }
        currentUser = user;
        
        // Save to localStorage
        if (rememberMe) {
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        } else {
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
    // Clear any previous inline login errors
    const loginErr = document.getElementById('loginFormError');
    if (loginErr) { loginErr.style.display = 'none'; clearTimeout(loginErr._hideTimeout); }

    showNotification('success', 'Login successful! Redirecting...');
        
        setTimeout(() => {
            // Route based on role
            let portalPath = '';
            if (selectedRole === 'student') {
                portalPath = '/STUDENT/student-portal.html';
            } else if (selectedRole === 'faculty') {
                portalPath = '/FACULTY/faculty-portal.html';
            } else if (selectedRole === 'admin') {
                portalPath = '/admin-portal.html';
            }
            
            try {
                const origin = window.location.origin || '';
                if (origin && origin.startsWith('http')) {
                    window.location.href = origin + portalPath;
                } else {
                    window.location.href = portalPath;
                }
            } catch (e) {
                window.location.href = portalPath;
            }
        }, 1500);
    } else {
        // Show inline error at top of login form for failed credential attempts
        showLoginFormError('Invalid email or password. Please try again.');
    }
}

// Handle signup
function handleSignup(e) {
    e.preventDefault();
    
    // Validate that a role has been selected
    if (!selectedRole) {
        showNotification('error', 'Please select a role first.');
        goBackToRoleSelection();
        return;
    }
    
    const formData = new FormData(e.target);
    const userData = Object.fromEntries(formData.entries());
    
    // Handle checkbox separately since FormData doesn't include unchecked checkboxes
    userData.agreeTerms = document.getElementById('agreeTerms').checked;
    
    // Debug: Log form data
    console.log('Form data collected:', userData);
    
    // Validate form
    if (!validateSignupForm(userData)) {
        return;
    }
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === userData.email || u.studentId === userData.studentId);
    if (existingUser) {
        showNotification('error', 'A user with this email or student ID already exists.');
        return;
    }
    
    // Create new user with role
    const newUser = {
        id: generateUserId(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        studentId: userData.studentId,
        email: userData.email,
        phone: userData.phone,
        course: userData.course,
        yearLevel: userData.yearLevel,
        password: userData.password,
        role: selectedRole || 'student', // Add role
        dateCreated: new Date().toISOString(),
        isActive: true
    };
    
    // Add to users array
    users.push(newUser);
    saveUsers();
    
    // Debug: Log successful creation
    console.log('User created successfully:', newUser);
    
    // Show success notification
    showNotification('success', 'Account created successfully! You can now log in.');
    
    // Clear the form
    document.getElementById('signupFormElement').reset();
    
    // Switch back to login form
    setTimeout(() => {
        showLoginForm();
    }, 2000);
}

// Validate signup form
function validateSignupForm(data) {
    let isValid = true;
    
    // Debug: Log the data being validated
    console.log('Validating data:', data);
    
    // Check required fields
    const requiredFields = ['firstName', 'lastName', 'studentId', 'email', 'phone', 'course', 'yearLevel', 'password', 'confirmPassword'];
    requiredFields.forEach(field => {
        if (!data[field] || data[field].trim() === '') {
            showNotification('error', `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`);
            isValid = false;
        }
    });
    
    if (!isValid) return false;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        showNotification('error', 'Please enter a valid email address.');
        isValid = false;
    }
    
    // Validate password
    if (data.password.length < 8) {
        showNotification('error', 'Password must be at least 8 characters long.');
        isValid = false;
    }
    
    // Validate password confirmation
    if (data.password !== data.confirmPassword) {
        showNotification('error', 'Passwords do not match.');
        isValid = false;
    }
    
    // Validate student ID format (more flexible)
    if (data.studentId.length < 3) {
        showNotification('error', 'Student ID must be at least 3 characters long.');
        isValid = false;
    }
    
    // Check terms agreement
    if (!data.agreeTerms) {
        showNotification('error', 'You must agree to the Terms and Conditions.');
        isValid = false;
    }
    
    return isValid;
}

// Generate unique user ID
function generateUserId() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `USER${timestamp}${random}`;
}

// Show signup form
function showSignupForm() {
    console.log('Switching to signup form');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginForm && signupForm) {
        loginForm.classList.add('d-none');
        loginForm.style.display = 'none';
        signupForm.classList.remove('d-none');
        signupForm.style.display = 'block';
        console.log('Successfully switched to signup form');
    } else {
        console.error('Could not find login or signup form elements');
    }
}

// Show login form
function showLoginForm() {
    console.log('Switching to login form');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginForm && signupForm) {
        signupForm.classList.add('d-none');
        signupForm.style.display = 'none';
        loginForm.classList.remove('d-none');
        loginForm.style.display = 'block';
        const loginErr = document.getElementById('loginFormError');
        if (loginErr) { loginErr.style.display = 'none'; clearTimeout(loginErr._hideTimeout); }
        console.log('Successfully switched to login form');
    } else {
        console.error('Could not find login or signup form elements');
    }
}

// Redirect to appropriate portal based on role
function redirectToStudentPortal() {
    const user = getCurrentUser();
    let portalPath = '/STUDENT/student-portal.html';
    
    if (user && user.role === 'faculty') {
        portalPath = '/FACULTY/faculty-portal.html';
    } else if (user && user.role === 'admin') {
        portalPath = '/admin-portal.html';
    }
    
    try {
        const origin = window.location.origin || '';
        if (origin && origin.startsWith('http')) {
            window.location.href = origin + portalPath;
        } else {
            window.location.href = portalPath;
        }
    } catch (e) {
        window.location.href = portalPath;
    }
}

// Terms modal functions
function openTermsModal() {
    const modal = document.getElementById('termsModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeTermsModal() {
    const modal = document.getElementById('termsModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function acceptTerms() {
    const checkbox = document.getElementById('agreeTerms');
    if (checkbox) {
        checkbox.checked = true;
    }
    closeTermsModal();
}

// Make functions globally available
window.openTermsModal = openTermsModal;
window.closeTermsModal = closeTermsModal;
window.acceptTerms = acceptTerms;

// Logout function
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    // After logout, go back to the main dashboard (index)
    try {
        const origin = window.location.origin || '';
        if (origin && origin.startsWith('http')) {
            window.location.href = origin + '/index.html';
        } else {
            window.location.href = '/index.html';
        }
    } catch (e) {
        window.location.href = '/index.html';
    }
}

// Get current user
function getCurrentUser() {
    if (currentUser) {
        return currentUser;
    }
    
    const savedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        return currentUser;
    }
    
    return null;
}

// Check if user is authenticated
function isAuthenticated() {
    return getCurrentUser() !== null;
}

// Export functions for use in other scripts
window.Auth = {
    getCurrentUser,
    isAuthenticated,
    logout,
    users
};

// Make form switching functions globally available
window.showSignupForm = showSignupForm;
window.showLoginForm = showLoginForm;
