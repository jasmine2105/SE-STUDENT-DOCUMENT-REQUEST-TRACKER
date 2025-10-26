// Utility functions for DocTracker
window.DocTracker = {
    // Get status badge class
    getStatusBadgeClass(status) {
        const classes = {
            'Submitted': 'status-badge-primary',
            'Processing': 'status-badge-warning',
            'Ready for Release': 'status-badge-info',
            'Completed': 'status-badge-success',
            'Declined': 'status-badge-danger'
        };
        return classes[status] || 'status-badge-default';
    },

    // Format date
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    },

    // Format date and time
    formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Show notification
    showNotification(type, message, duration = 3000) {
        const existingNotification = document.querySelector('.doc-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `doc-notification doc-notification-${type}`;
        notification.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), duration);
    },

    // Open modal
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    },

    // Close modal
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    },

    // Generate a unique request ID
    generateRequestId() {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substr(2, 3).toUpperCase();
        return `REQ${timestamp}${random}`;
    }
};

// Add notification styles
const notificationStyles = `
<style>
.doc-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 5px;
    z-index: 1050;
    max-width: 350px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease-out;
}

.doc-notification-success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.doc-notification-error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

.doc-notification-warning {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeeba;
}

.doc-notification-info {
    background: #cce5ff;
    color: #004085;
    border: 1px solid #b8daff;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.status-badge {
    padding: 5px 10px;
    border-radius: 15px;
    font-size: 0.875rem;
    font-weight: 500;
}

.status-badge-primary {
    background: #cce5ff;
    color: #004085;
}

.status-badge-warning {
    background: #fff3cd;
    color: #856404;
}

.status-badge-info {
    background: #d1ecf1;
    color: #0c5460;
}

.status-badge-success {
    background: #d4edda;
    color: #155724;
}

.status-badge-danger {
    background: #f8d7da;
    color: #721c24;
}

.status-badge-default {
    background: #e9ecef;
    color: #495057;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', notificationStyles);