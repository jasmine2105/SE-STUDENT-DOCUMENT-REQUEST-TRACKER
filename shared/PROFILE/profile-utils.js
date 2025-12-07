// Profile Helper Functions

const ProfileUtils = {
    /**
     * Format a value for display, showing "Not Provided" if empty
     */
    formatValue(value) {
        if (!value || value === '-' || (typeof value === 'string' && value.trim() === '')) {
            return 'Not Provided';
        }
        return value;
    },

    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        } catch (e) {
            return dateString;
        }
    },

    /**
     * Get status badge class
     */
    getStatusClass(status) {
        const statusMap = {
            'pending': 'pending',
            'pending_faculty': 'pending',
            'in_progress': 'in-progress',
            'approved': 'approved',
            'completed': 'completed',
            'declined': 'declined'
        };
        return statusMap[status] || 'pending';
    },

    /**
     * Get status text
     */
    getStatusText(status) {
        const statusMap = {
            'pending': 'Pending',
            'pending_faculty': 'Awaiting Approval',
            'in_progress': 'In Progress',
            'approved': 'Approved',
            'completed': 'Completed',
            'declined': 'Declined'
        };
        return statusMap[status] || 'Pending';
    },

    /**
     * Calculate document statistics from requests
     */
    calculateStats(requests) {
        return {
            total: requests.length,
            pending: requests.filter(r => ['pending', 'pending_faculty', 'in_progress'].includes(r.status)).length,
            approved: requests.filter(r => r.status === 'approved' || r.status === 'completed').length,
            rejected: requests.filter(r => r.status === 'declined').length
        };
    },

    /**
     * Get recent requests sorted by date
     */
    getRecentRequests(requests, limit = 5) {
        return [...requests]
            .sort((a, b) => {
                const dateA = new Date(a.submittedAt || a.createdAt || 0);
                const dateB = new Date(b.submittedAt || b.createdAt || 0);
                return dateB - dateA;
            })
            .slice(0, limit);
    }
};

// Export for use in other files
if (typeof window !== 'undefined') {
    window.ProfileUtils = ProfileUtils;
}
