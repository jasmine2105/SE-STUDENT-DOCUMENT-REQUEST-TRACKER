// Authentication JavaScript

let users = [];
let currentUser = null;

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
    checkAuthState();
});

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
        // Redirect to student portal if already logged in (use absolute path to avoid nested folders)
        try {
            const origin = window.location.origin || '';
            if (origin && origin.startsWith('http')) {
                window.location.href = origin + '/STUDENT/student-portal.html';
            } else {
                window.location.href = '/STUDENT/student-portal.html';
            }
        } catch (e) {
            window.location.href = '/STUDENT/student-portal.html';
        }
    }
}

// Handle login
function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Find user
    const user = users.find(u => u.email === email && u.password === password && u.isActive);
    
    if (user) {
        currentUser = user;
        
        // Save to localStorage
        if (rememberMe) {
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        } else {
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        showNotification('success', 'Login successful! Redirecting...');
        
        setTimeout(() => {
            try {
                const origin = window.location.origin || '';
                if (origin && origin.startsWith('http')) {
                    window.location.href = origin + '/STUDENT/student-portal.html';
                } else {
                    window.location.href = '/STUDENT/student-portal.html';
                }
            } catch (e) {
                window.location.href = '/STUDENT/student-portal.html';
            }
        }, 1500);
    } else {
        showNotification('error', 'Invalid email or password. Please try again.');
    }
}

// Handle signup
function handleSignup(e) {
    e.preventDefault();
    
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
    
    // Create new user
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
        dateCreated: new Date().toISOString(),
        isActive: true
    };
    
    // Add to users array
    users.push(newUser);
    saveUsers();
    
    // Set as current user
    currentUser = newUser;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Debug: Log successful creation
    console.log('User created successfully:', newUser);
    console.log('Redirecting to student portal...');
    
    // Show success notification and redirect
    showNotification('success', 'Account created successfully! Redirecting to student portal...');
    
    setTimeout(() => {
        console.log('Redirecting now...');
        try {
            const origin = window.location.origin || '';
            if (origin && origin.startsWith('http')) {
                window.location.href = origin + '/STUDENT/student-portal.html';
            } else {
                window.location.href = '/STUDENT/student-portal.html';
            }
        } catch (e) {
            window.location.href = '/STUDENT/student-portal.html';
        }
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
        signupForm.classList.remove('d-none');
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
        loginForm.classList.remove('d-none');
        console.log('Successfully switched to login form');
    } else {
        console.error('Could not find login or signup form elements');
    }
}

// Redirect to student portal
function redirectToStudentPortal() {
    window.location.href = 'STUDENT/student-portal.html';
}

// Logout function
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    // Use absolute path to ensure redirect works from any subfolder (STUDENT/, FACULTY/, etc.)
    try {
        const target = window.location.origin + '/index.html';
        window.location.href = target;
    } catch (e) {
        // Fallback: relative path
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
