// API Base URL
const API_BASE = window.location.origin + '/api';

// Utility Functions
const Utils = {
  // Format date to readable string
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Format relative time (e.g., "2 hours ago")
  formatRelativeTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return this.formatDate(dateString);
  },

  // Get status badge class
  getStatusBadgeClass(status) {
    const statusMap = {
      'pending': 'pending',
      'pending_faculty': 'pending_faculty',
      'in_progress': 'in_progress',
      'approved': 'approved',
      'completed': 'completed',
      'declined': 'declined'
    };
    return statusMap[status] || 'pending';
  },

  // Get status display text
  getStatusText(status) {
    const statusMap = {
      'pending': 'Pending',
      'pending_faculty': 'Awaiting Faculty Approval',
      'in_progress': 'In Progress',
      'approved': 'Approved',
      'completed': 'Completed',
      'declined': 'Declined'
    };
    return statusMap[status] || status;
  },

  // Show notification toast
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Style the toast
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '1rem 1.5rem',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '500',
      zIndex: '10000',
      animation: 'slideIn 0.3s ease',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    });

    const colors = {
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6'
    };
    toast.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // API Request Helper
  getAuthToken() {
    const token = localStorage.getItem('authToken');
    return token;
  },

  setSession(user, token) {
    console.log('💾 setSession called');
    console.log('💾 User:', user);
    console.log('💾 Token:', token);
    
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      console.log('✅ User saved to localStorage');
    }
    if (token) {
      localStorage.setItem('authToken', token);
      console.log('✅ Token saved to localStorage');
    }
  },

  async apiRequest(endpoint, options = {}) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };

      const token = this.getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const fetchOptions = { ...options, headers };

      if (fetchOptions.body && typeof fetchOptions.body === 'object' && !(fetchOptions.body instanceof FormData)) {
        fetchOptions.body = JSON.stringify(fetchOptions.body);
      }

      const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);

      if (!response.ok) {
        if (response.status === 401) {
          this.clearCurrentUser();
        }
        const errorText = await response.text();
        throw new Error(errorText || `API Error: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await response.json();
      }
      return await response.text();
    } catch (error) {
      console.error('API Request Error:', error);
      
      // Provide more specific error messages
      let errorMessage = error.message || 'Network error';
      
      if (error.message && (
        error.message.includes('Failed to fetch') ||
        error.message.includes('ERR_CONNECTION_REFUSED') ||
        error.message.includes('ERR_INTERNET_DISCONNECTED') ||
        error.message.includes('NetworkError')
      )) {
        errorMessage = 'Cannot connect to server. Please make sure the server is running. Run "npm start" in the terminal.';
      }
      
      this.showToast(errorMessage, 'error');
      throw new Error(errorMessage);
    }
  },

  // Get current user from localStorage
  getCurrentUser() {
    const userString = localStorage.getItem('currentUser');
    
    const user = userString ? JSON.parse(userString) : null;
    return user;
  },

  // Set current user in localStorage
  setCurrentUser(user, token) {
    console.log('📝 setCurrentUser called');
    console.log('📝 User:', user);
    console.log('📝 Token:', token);
    this.setSession(user, token);
  },

  // Clear current user
  clearCurrentUser() {
    console.log('🗑️ clearCurrentUser called - REDIRECTING TO /');
    console.trace('Stack trace:');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    window.location.href = '/';
  },

  // Check if user is authenticated
  isAuthenticated() {
    const user = this.getCurrentUser();
    const token = this.getAuthToken();
    const result = user !== null && !!token;
    
    return result;
  },

  // Require authentication (redirect if not logged in)
  requireAuth() {
    const authenticated = this.isAuthenticated();
    
    if (!authenticated) {
      console.log('❌ NOT authenticated - will redirect to /');
      window.location.href = '/';
      return false;
    }
    return true;
  }
};

// Add toast animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);