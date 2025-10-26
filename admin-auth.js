// Admin/Faculty credentials (In a real app, these would be stored securely on the server)
const ADMIN_CREDENTIALS = {
    admin: {
        username: 'admin',
        password: 'admin123', // This should be hashed in production
        role: 'admin'
    }
};

const FACULTY_CREDENTIALS = {
    professor1: {
        username: 'professor1',
        password: 'faculty123', // This should be hashed in production
        role: 'faculty',
        department: 'Computer Science'
    },
    professor2: {
        username: 'professor2',
        password: 'faculty123',
        role: 'faculty',
        department: 'Engineering'
    }
};

document.getElementById('adminLoginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const userType = document.getElementById('userType').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    let credentials;
    let redirectPath;

    if (userType === 'admin') {
        credentials = ADMIN_CREDENTIALS[username];
        redirectPath = 'admin-portal.html';
    } else if (userType === 'faculty') {
        credentials = FACULTY_CREDENTIALS[username];
        redirectPath = 'faculty-portal.html';
    }

    if (!credentials) {
        alert('Invalid username');
        return;
    }

    if (credentials.password === password && credentials.role === userType) {
        const userData = {
            username: username,
            role: userType,
            department: credentials.department,
            authenticated: true,
            timestamp: new Date().toISOString()
        };

        if (rememberMe) {
            localStorage.setItem('adminData', JSON.stringify(userData));
        } else {
            sessionStorage.setItem('adminData', JSON.stringify(userData));
        }

        window.location.href = redirectPath;
    } else {
        alert('Invalid password or user type');
    }
});

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const icon = document.querySelector('.password-toggle');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Check if already logged in
window.addEventListener('load', function() {
    const adminData = JSON.parse(localStorage.getItem('adminData') || sessionStorage.getItem('adminData') || '{}');
    
    if (adminData.authenticated) {
        window.location.href = adminData.role === 'admin' ? 'admin-portal.html' : 'faculty-portal.html';
    }
});