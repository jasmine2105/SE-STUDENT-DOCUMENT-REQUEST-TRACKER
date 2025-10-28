// Faculty Authentication Script
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleButton = document.querySelector('.toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleButton.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleButton.className = 'fas fa-eye';
    }
}

// Handle login form submission
document.getElementById('facultyLoginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('facultyAuthError');
    
    // Clear previous errors
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
    
    // Basic validation
    if (!username || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    // Simple authentication (replace with actual API call)
    if (authenticateFaculty(username, password)) {
        // Successful login - redirect to faculty portal
        window.location.href = '../views/faculty-portal.html';
    } else {
        showError('Invalid faculty ID or password');
    }
});

function authenticateFaculty(username, password) {
    // This is a mock authentication - replace with actual API call to your backend
    const validFaculty = [
        { username: 'faculty001', password: 'password123' },
        { username: 'professor', password: 'admin123' },
        { username: 'teacher', password: 'test123' }
    ];
    
    return validFaculty.some(faculty => 
        faculty.username === username && faculty.password === password
    );
}

function showError(message) {
    const errorDiv = document.getElementById('facultyAuthError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// Enter key support
document.addEventListener('DOMContentLoaded', function() {
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('facultyLoginForm').dispatchEvent(new Event('submit'));
            }
        });
    });
});