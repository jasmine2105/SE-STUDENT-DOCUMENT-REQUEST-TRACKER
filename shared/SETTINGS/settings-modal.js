// Settings Modal JavaScript Component Class

class SettingsModal {
    constructor() {
        this.currentUser = null;
        this.currentTab = 'account';
        this.modal = null;
        this.hasChanges = false;
        this.init();
    }

    init() {
        // Modal will be injected into DOM when needed
    }

    async load(user) {
        this.currentUser = user;
        await this.render();
    }

    async render() {
        // Modal HTML should already be in the DOM (included in student-portal.html)
        this.modal = document.getElementById('settingsModal');
        if (!this.modal) {
            console.error('Settings modal not found in DOM');
            return;
        }

        this.populateData();
        this.attachEventListeners();
    }

    getModalHTML() {
        // Return the HTML structure (should match settings-modal.html)
        // This is a fallback if fetch fails - we'll use a simplified version
        // The full HTML should be loaded from the file
        return document.getElementById('settingsModalTemplate')?.innerHTML || `
            <div id="settingsModal" class="settings-modal-overlay hidden">
                <div class="settings-modal-container">
                    <div class="settings-modal-header">
                        <h2><i class="fas fa-cog"></i> Settings</h2>
                        <button class="settings-close-btn" id="settingsCloseBtn" title="Close">&times;</button>
                    </div>
                    <div class="settings-modal-body">
                        <p>Settings modal content will be loaded from settings-modal.html</p>
                    </div>
                </div>
            </div>
        `;
    }

    populateData() {
        if (!this.currentUser) return;

        // Account Info Tab
        document.getElementById('settingsEmail').value = this.currentUser.email || '';
        document.getElementById('settingsContact').value = this.currentUser.contactNumber || '';
        document.getElementById('settingsAlternateEmail').value = this.currentUser.alternateEmail || '';

        // Security Tab
        // Password fields are left empty for security

        // Notifications Tab
        document.getElementById('emailNotifications').checked = this.currentUser.emailNotifications !== false;
        document.getElementById('smsNotifications').checked = this.currentUser.smsNotifications === true;
        document.getElementById('appNotifications').checked = this.currentUser.appNotifications !== false;

        // Appearance Tab
        const theme = this.currentUser.theme || 'light';
        document.getElementById('themeSelect').value = theme;
        const accentColor = this.currentUser.accentColor || '#004225';
        document.getElementById('accentColor').value = accentColor;
        document.getElementById('accentColorPreview').style.background = accentColor;
    }

    attachEventListeners() {
        // Tab switching
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Close button
        const closeBtn = document.getElementById('settingsCloseBtn');
        if (closeBtn) {
            closeBtn.onclick = () => this.hide();
        }

        // Password visibility toggles
        this.setupPasswordToggles();

        // Password strength meter
        this.setupPasswordStrengthMeter();

        // Save button
        const saveBtn = document.getElementById('saveChangesBtn');
        if (saveBtn) {
            saveBtn.onclick = () => this.saveChanges();
        }

        // Photo upload
        const uploadBtn = document.getElementById('uploadPhotoBtn');
        const fileInput = document.getElementById('photoFileInput');
        if (uploadBtn && fileInput) {
            uploadBtn.onclick = () => fileInput.click();
            fileInput.onchange = (e) => this.handlePhotoUpload(e.target.files[0]);
        }

        // Accent color picker
        const accentColorInput = document.getElementById('accentColor');
        const accentColorPreview = document.getElementById('accentColorPreview');
        if (accentColorInput && accentColorPreview) {
            accentColorInput.onchange = (e) => {
                accentColorPreview.style.background = e.target.value;
                this.hasChanges = true;
            };
        }

        // Track changes
        this.trackChanges();

        // Close on overlay click
        if (this.modal) {
            this.modal.onclick = (e) => {
                if (e.target === this.modal) {
                    this.hide();
                }
            };
        }

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && !this.modal.classList.contains('hidden')) {
                this.hide();
            }
        });
    }

    switchTab(tabName) {
        this.currentTab = tabName;

        // Update tab buttons
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab panels
        document.querySelectorAll('.settings-tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
        });
    }

    setupPasswordToggles() {
        const toggles = [
            { id: 'toggleCurrentPassword', inputId: 'currentPassword' },
            { id: 'toggleNewPassword', inputId: 'newPassword' },
            { id: 'toggleConfirmPassword', inputId: 'confirmNewPassword' }
        ];

        toggles.forEach(({ id, inputId }) => {
            const toggle = document.getElementById(id);
            const input = document.getElementById(inputId);
            if (toggle && input) {
                toggle.onclick = () => {
                    const type = input.type === 'password' ? 'text' : 'password';
                    input.type = type;
                    const icon = toggle.querySelector('i');
                    if (icon) {
                        icon.classList.toggle('fa-eye');
                        icon.classList.toggle('fa-eye-slash');
                    }
                };
            }
        });
    }

    setupPasswordStrengthMeter() {
        const newPasswordInput = document.getElementById('newPassword');
        const strengthBar = document.querySelector('.password-strength-bar');
        const strengthText = document.getElementById('passwordStrengthText');

        if (newPasswordInput && strengthBar && strengthText) {
            newPasswordInput.oninput = () => {
                const password = newPasswordInput.value;
                const strength = this.calculatePasswordStrength(password);
                
                strengthBar.className = 'password-strength-bar';
                if (password.length > 0) {
                    strengthBar.classList.add(strength.level);
                    strengthText.textContent = `Password strength: ${strength.text}`;
                } else {
                    strengthText.textContent = 'Password strength: Weak';
                }
            };
        }
    }

    calculatePasswordStrength(password) {
        if (!password) return { level: 'weak', text: 'Weak' };

        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z\d]/.test(password)) strength++;

        if (strength <= 2) return { level: 'weak', text: 'Weak' };
        if (strength <= 4) return { level: 'medium', text: 'Medium' };
        return { level: 'strong', text: 'Strong' };
    }

    handlePhotoUpload(file) {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            if (window.Utils) {
                window.Utils.showToast('Please select an image file', 'error');
            }
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('settingsPhotoPreview');
            if (preview) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Profile photo" />`;
            }
            this.hasChanges = true;
        };
        reader.readAsDataURL(file);
    }

    trackChanges() {
        const inputs = document.querySelectorAll('.settings-input, .settings-select, .settings-toggle, .settings-color-input');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.hasChanges = true;
            });
        });
    }

    async saveChanges() {
        const saveBtn = document.getElementById('saveChangesBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        try {
            const updates = {};

            // Account Info
            const email = document.getElementById('settingsEmail').value.trim();
            const contact = document.getElementById('settingsContact').value.trim();
            const alternateEmail = document.getElementById('settingsAlternateEmail').value.trim();

            if (email && email !== this.currentUser.email) {
                updates.email = email;
            }
            if (contact !== (this.currentUser.contactNumber || '')) {
                updates.contactNumber = contact;
            }
            if (alternateEmail !== (this.currentUser.alternateEmail || '')) {
                updates.alternateEmail = alternateEmail;
            }

            // Security - Password
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmNewPassword').value;

            if (newPassword) {
                if (!currentPassword) {
                    throw new Error('Please enter your current password');
                }
                if (newPassword !== confirmPassword) {
                    throw new Error('New passwords do not match');
                }
                if (newPassword.length < 3) {
                    throw new Error('Password must be at least 3 characters');
                }
                updates.currentPassword = currentPassword;
                updates.newPassword = newPassword;
            }

            // Notifications
            updates.emailNotifications = document.getElementById('emailNotifications').checked;
            updates.smsNotifications = document.getElementById('smsNotifications').checked;
            updates.appNotifications = document.getElementById('appNotifications').checked;

            // Appearance
            updates.theme = document.getElementById('themeSelect').value;
            updates.accentColor = document.getElementById('accentColor').value;

            // Save to server
            if (Object.keys(updates).length > 0) {
                await this.saveToServer(updates);
            }

            // Update local user object
            Object.assign(this.currentUser, updates);
            if (window.Utils && window.Utils.setCurrentUser) {
                window.Utils.setCurrentUser(this.currentUser, localStorage.getItem('authToken'));
            }

            this.hasChanges = false;
            if (window.Utils) {
                window.Utils.showToast('Settings saved successfully!', 'success');
            }

            // Clear password fields
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmNewPassword').value = '';

        } catch (error) {
            console.error('Save settings error:', error);
            if (window.Utils) {
                window.Utils.showToast(error.message || 'Failed to save settings', 'error');
            }
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            }
        }
    }

    async saveToServer(updates) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('Not authenticated');
        }

        // Separate password update from other updates
        if (updates.newPassword) {
            const passwordUpdate = {
                currentPassword: updates.currentPassword,
                newPassword: updates.newPassword
            };
            delete updates.currentPassword;
            delete updates.newPassword;

            // Update password separately
            if (window.Utils && window.Utils.apiRequest) {
                await window.Utils.apiRequest('/auth/update-password', {
                    method: 'PUT',
                    body: passwordUpdate
                });
            }
        }

        // Update profile
        if (Object.keys(updates).length > 0) {
            if (window.Utils && window.Utils.apiRequest) {
                await window.Utils.apiRequest('/auth/update-profile', {
                    method: 'PUT',
                    body: updates
                });
            }
        }
    }

    show() {
        if (this.modal) {
            this.modal.classList.remove('hidden');
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    hide() {
        if (this.hasChanges) {
            if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
                return;
            }
        }

        if (this.modal) {
            this.modal.classList.add('hidden');
            this.modal.classList.remove('active');
        }
        document.body.style.overflow = '';
        this.hasChanges = false;
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.SettingsModal = SettingsModal;
}
