// Settings Helper Functions

const SettingsUtils = {
    /**
     * Validate email format
     */
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Validate phone number format (basic)
     */
    validatePhone(phone) {
        const re = /^[\d\s\-\+\(\)]+$/;
        return re.test(phone) && phone.replace(/\D/g, '').length >= 10;
    },

    /**
     * Calculate password strength
     */
    calculatePasswordStrength(password) {
        if (!password) return { score: 0, level: 'weak', text: 'Weak' };

        let score = 0;
        const checks = {
            length: password.length >= 8,
            longLength: password.length >= 12,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            number: /\d/.test(password),
            special: /[^a-zA-Z\d]/.test(password)
        };

        if (checks.length) score++;
        if (checks.longLength) score++;
        if (checks.lowercase && checks.uppercase) score++;
        if (checks.number) score++;
        if (checks.special) score++;

        if (score <= 2) return { score, level: 'weak', text: 'Weak' };
        if (score <= 4) return { score, level: 'medium', text: 'Medium' };
        return { score, level: 'strong', text: 'Strong' };
    },

    /**
     * Format phone number for display
     */
    formatPhone(phone) {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        return phone;
    },

    /**
     * Apply theme to document
     */
    applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        
        // Store theme preference
        localStorage.setItem('theme', theme);
    },

    /**
     * Apply accent color
     */
    applyAccentColor(color) {
        document.documentElement.style.setProperty('--recoletos-green', color);
        localStorage.setItem('accentColor', color);
    },

    /**
     * Load saved preferences
     */
    loadPreferences() {
        const theme = localStorage.getItem('theme') || 'light';
        const accentColor = localStorage.getItem('accentColor') || '#004225';
        
        return {
            theme,
            accentColor
        };
    },

    /**
     * Save preferences
     */
    savePreferences(preferences) {
        if (preferences.theme) {
            localStorage.setItem('theme', preferences.theme);
            this.applyTheme(preferences.theme);
        }
        if (preferences.accentColor) {
            localStorage.setItem('accentColor', preferences.accentColor);
            this.applyAccentColor(preferences.accentColor);
        }
    }
};

// Export for use in other files
if (typeof window !== 'undefined') {
    window.SettingsUtils = SettingsUtils;
}
