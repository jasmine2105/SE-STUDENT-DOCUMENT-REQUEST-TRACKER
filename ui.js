// Common UI utilities for Document Tracker
(function(window) {
    // Initialize any missing global objects
    window.DocTracker = window.DocTracker || {};

    // Default configurations
    const config = {
        apiBaseUrl: 'http://localhost:3000/api',
        defaultNotificationDuration: 3000
    };

    // Add missing utility functions
    const utils = {
        // Show loading spinner
        showSpinner() {
            let spinner = document.getElementById('docTrackerSpinner');
            if (!spinner) {
                spinner = document.createElement('div');
                spinner.id = 'docTrackerSpinner';
                spinner.className = 'spinner-overlay';
                spinner.innerHTML = `
                    <div class="spinner">
                        <i class="fas fa-circle-notch fa-spin"></i>
                    </div>
                `;
                document.body.appendChild(spinner);
            }
            spinner.style.display = 'flex';
        },

        // Hide loading spinner
        hideSpinner() {
            const spinner = document.getElementById('docTrackerSpinner');
            if (spinner) {
                spinner.style.display = 'none';
            }
        },

        // Format currency
        formatCurrency(amount) {
            return new Intl.NumberFormat('en-PH', {
                style: 'currency',
                currency: 'PHP'
            }).format(amount);
        },

        // Format file size
        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },

        // Validate file type
        isAllowedFileType(file) {
            const allowedTypes = [
                'application/pdf',
                'image/jpeg',
                'image/png',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            return allowedTypes.includes(file.type);
        },

        // Validate file size (max 5MB)
        isAllowedFileSize(file) {
            const maxSize = 5 * 1024 * 1024; // 5MB
            return file.size <= maxSize;
        },

        // Show confirmation dialog
        confirm(message, onConfirm) {
            if (window.confirm(message)) {
                onConfirm();
            }
        },

        // Add error styling to form field
        showFieldError(fieldId, message) {
            const field = document.getElementById(fieldId);
            if (field) {
                field.classList.add('error');
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = message;
                field.parentNode.appendChild(errorDiv);
            }
        },

        // Remove error styling from form field
        clearFieldError(fieldId) {
            const field = document.getElementById(fieldId);
            if (field) {
                field.classList.remove('error');
                const errorDiv = field.parentNode.querySelector('.error-message');
                if (errorDiv) {
                    errorDiv.remove();
                }
            }
        }
    };

    // Add CSS for UI elements
    const styles = `
        <style>
        .spinner-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.8);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        }
        
        .spinner {
            font-size: 3rem;
            color: #667eea;
        }
        
        .error {
            border-color: #dc3545 !important;
        }
        
        .error-message {
            color: #dc3545;
            font-size: 0.875rem;
            margin-top: 0.25rem;
        }
        
        .form-group {
            margin-bottom: 1rem;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
        }
        
        .form-control {
            display: block;
            width: 100%;
            padding: 0.375rem 0.75rem;
            font-size: 1rem;
            line-height: 1.5;
            border: 1px solid #ced4da;
            border-radius: 0.25rem;
            transition: border-color 0.15s ease-in-out;
        }
        
        .form-control:focus {
            border-color: #667eea;
            outline: 0;
            box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }
        </style>
    `;

    // Inject styles
    document.head.insertAdjacentHTML('beforeend', styles);

    // Extend DocTracker with new utilities
    Object.assign(window.DocTracker, utils);
    window.DocTracker.config = config;

})(window);