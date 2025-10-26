// Handle login form submission
function handleLogin(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('studentId').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    // In a real application, this would be an API call
    const userData = {
        id: studentId,
        name: 'John Doe', // This would come from the server
        authenticated: true,
        timestamp: new Date().toISOString()
    };

    // Store user data
    if (rememberMe) {
        localStorage.setItem('studentData', JSON.stringify(userData));
    } else {
        sessionStorage.setItem('studentData', JSON.stringify(userData));
    }

    // Redirect to student portal
    window.location.href = 'student-portal.html';
}

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggle = document.querySelector('.password-toggle');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggle.classList.remove('fa-eye');
        toggle.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggle.classList.remove('fa-eye-slash');
        toggle.classList.add('fa-eye');
    }
}

// Show forgot password modal
function showForgotPassword() {
    const modal = document.getElementById('forgotPasswordModal');
    modal.style.display = 'block';
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// Close modal
function closeModal() {
    document.getElementById('forgotPasswordModal').style.display = 'none';
}

// Handle password reset
function handlePasswordReset(event) {
    event.preventDefault();
    
    const email = document.getElementById('resetEmail').value;
    const studentId = document.getElementById('resetStudentId').value;

    // In a real application, this would be an API call
    alert('If your email matches our records, you will receive a password reset link shortly.');
    closeModal();
}

// Check if already logged in
window.addEventListener('load', () => {
    const userData = JSON.parse(localStorage.getItem('studentData') || sessionStorage.getItem('studentData') || '{}');
    
    if (userData.authenticated) {
        window.location.href = 'student-portal.html';
    }
});