// Main JavaScript file for general functionality

// Sample data storage (in a real application, this would be server-side)
let requests = [];
let notifications = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Load sample data
    loadSampleData();
    
    // Initialize any global functionality
    initializeApp();
});

// Load sample data for demonstration
function loadSampleData() {
    requests = [
        {
            id: 'REQ001',
            studentId: '2023-001',
            studentName: 'John Doe',
            documentType: 'TOR',
            purpose: 'Employment Application',
            status: 'Submitted',
            dateSubmitted: '2024-01-15',
            copies: 2,
            deliveryMethod: 'Pickup',
            notes: 'Urgent request for job application'
        },
        {
            id: 'REQ002',
            studentId: '2023-002',
            studentName: 'Jane Smith',
            documentType: 'GoodMoral',
            purpose: 'Scholarship Application',
            status: 'Processing',
            dateSubmitted: '2024-01-14',
            copies: 1,
            deliveryMethod: 'Delivery',
            notes: 'For scholarship application'
        },
        {
            id: 'REQ003',
            studentId: '2023-003',
            studentName: 'Mike Johnson',
            documentType: 'COE',
            purpose: 'Internship',
            status: 'Completed',
            dateSubmitted: '2024-01-10',
            copies: 1,
            deliveryMethod: 'Pickup',
            notes: ''
        }
    ];

    notifications = [
        {
            id: 1,
            type: 'info',
            title: 'New Request Submitted',
            message: 'John Doe submitted a TOR request',
            timestamp: '2024-01-15 10:30:00',
            read: false
        },
        {
            id: 2,
            type: 'success',
            title: 'Request Completed',
            message: 'Mike Johnson\'s COE request has been completed',
            timestamp: '2024-01-15 09:15:00',
            read: true
        }
    ];
}

// Initialize application
function initializeApp() {
    // Add smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Initialize form validation
    initializeFormValidation();

    // Highlight active nav link if hash matches
    try {
        const path = window.location.pathname || '';
        document.querySelectorAll('.nav-link').forEach(a => {
            if (a.getAttribute('href') && path.endsWith(a.getAttribute('href'))) {
                a.classList.add('text-usjrgold');
            }
        });
    } catch (e) { /* ignore */ }
}

// Form validation
function initializeFormValidation() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (validateForm(this)) {
                // Form is valid, proceed with submission
                handleFormSubmission(this);
            }
        });
    });
}

// Validate form
function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            showFieldError(field, 'This field is required');
            isValid = false;
        } else {
            clearFieldError(field);
        }
    });

    // Additional validation for specific fields
    const emailFields = form.querySelectorAll('input[type="email"]');
    emailFields.forEach(field => {
        if (field.value && !isValidEmail(field.value)) {
            showFieldError(field, 'Please enter a valid email address');
            isValid = false;
        }
    });

    return isValid;
}

// Show field error
function showFieldError(field, message) {
    field.classList.add('error');
    let errorElement = field.parentNode.querySelector('.error-message');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        field.parentNode.appendChild(errorElement);
    }
    errorElement.textContent = message;
}

// Clear field error
function clearFieldError(field) {
    field.classList.remove('error');
    const errorElement = field.parentNode.querySelector('.error-message');
    if (errorElement) {
        errorElement.remove();
    }
}

// Validate email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Handle form submission
function handleFormSubmission(form) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    submitButton.disabled = true;

    // Simulate API call
    setTimeout(() => {
        // Reset button
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
        
        // Show success message
        showNotification('success', 'Form submitted successfully!');
        
        // Reset form if needed
        if (form.id === 'requestForm') {
            form.reset();
            hideSubmitForm();
        }
    }, 2000);
}

// Show notification
function showNotification(type, message, duration = 4000) {
    // Tailwind-based toast (bottom right)
    const id = 'toast-container';
    let container = document.getElementById(id);
    if (!container) {
        container = document.createElement('div');
        container.id = id;
        container.style.position = 'fixed';
        container.style.right = '1rem';
        container.style.bottom = '1rem';
        container.style.zIndex = '3000';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '0.5rem';
        document.body.appendChild(container);
    }

    const palette = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        warning: 'bg-yellow-600',
        info: 'bg-blue-600'
    };

    const toast = document.createElement('div');
    toast.setAttribute('role', 'status');
    toast.className = `text-white shadow-lg rounded-md px-4 py-3 flex items-start gap-3 transition transform duration-200 ease-out ${palette[type] || 'bg-green-600'}`;
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    toast.innerHTML = `
        <div class="flex-1">${message}</div>
        <button aria-label="Close" class="opacity-80 hover:opacity-100" style="background:none;border:none;color:inherit;">
            <i class="fas fa-times"></i>
        </button>
    `;
    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => toast.remove());
    container.appendChild(toast);
    // animate in
    requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
    // auto dismiss
    setTimeout(() => {
        if (!toast.parentNode) return;
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(6px)';
        setTimeout(() => toast.remove(), 200);
    }, duration);
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function generateRequestId() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `REQ${timestamp}${random}`;
}

function getStatusBadgeClass(status) {
    const statusClasses = {
        'Submitted': 'status-submitted',
        'Processing': 'status-processing',
        'Ready for Release': 'status-ready',
        'Completed': 'status-completed',
        'Declined': 'status-declined',
        'Pending': 'status-submitted',
        'Approved': 'status-completed',
        'Rejected': 'status-declined'
    };
    return statusClasses[status] || 'status-submitted';
}

// Modal functions
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

// Close modal when clicking outside
window.addEventListener('click', function(e) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (e.target === modal) {
            closeModal();
        }
    });
});

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // In a real application, this would clear session data
        window.location.href = 'index.html';
    }
}

// Export functions for use in other scripts
window.DocTracker = {
    requests,
    notifications,
    showNotification,
    formatDate,
    formatDateTime,
    generateRequestId,
    getStatusBadgeClass,
    openModal,
    closeModal,
    logout
};
