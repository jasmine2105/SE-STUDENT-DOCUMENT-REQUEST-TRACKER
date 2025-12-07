// Profile Modal JavaScript Component Class

class ProfileModal {
    constructor() {
        this.currentUser = null;
        this.requests = [];
        this.modal = null;
        this.init();
    }

    init() {
        // Modal will be injected into DOM when needed
    }

    async load(user, requests = []) {
        this.currentUser = user;
        this.requests = requests;
        await this.render();
    }

    async render() {
        // Modal HTML should already be in the DOM (included in student-portal.html)
        this.modal = document.getElementById('profileModal');
        if (!this.modal) {
            console.error('Profile modal not found in DOM');
            return;
        }

        this.populateData();
        this.attachEventListeners();
    }

    getModalHTML() {
        // Return the HTML structure (should match profile-modal.html)
        // This is a fallback if fetch fails
        return document.getElementById('profileModalTemplate')?.innerHTML || `
            <div id="profileModal" class="profile-modal-overlay hidden">
                <div class="profile-modal-container">
                    <div class="profile-modal-header">
                        <h2><i class="fas fa-user"></i> My Profile</h2>
                        <button class="profile-close-btn" id="profileCloseBtn" title="Close">&times;</button>
                    </div>
                    <div class="profile-modal-body">
                        <div class="profile-header-card">
                            <div class="profile-photo-wrapper">
                                <div class="profile-photo" id="profilePhoto">
                                    <i class="fas fa-user"></i>
                                </div>
                                <button class="profile-photo-edit" id="profilePhotoEdit" title="Update Photo">
                                    <i class="fas fa-camera"></i>
                                </button>
                            </div>
                            <div class="profile-header-info">
                                <h3 id="profileHeaderName">Loading...</h3>
                                <p class="profile-student-number" id="profileHeaderIdNumber">-</p>
                                <p class="profile-course-year" id="profileHeaderCourseYear">-</p>
                                <p class="profile-email" id="profileHeaderEmail">-</p>
                            </div>
                            <div class="profile-header-actions">
                                <button class="btn-edit-profile" id="profileEditBtn">
                                    <i class="fas fa-edit"></i> Edit Profile
                                </button>
                                <button class="btn-settings-profile" id="profileSettingsBtn">
                                    <i class="fas fa-cog"></i> Settings
                                </button>
                            </div>
                        </div>
                        <div class="profile-section-card">
                            <h4 class="profile-section-title">
                                <i class="fas fa-id-card"></i> Personal Information
                            </h4>
                            <div class="profile-info-grid">
                                <div class="profile-info-column">
                                    <div class="profile-info-item">
                                        <span class="profile-info-label">Full Name</span>
                                        <span class="profile-info-value" id="profileFullName">-</span>
                                    </div>
                                    <div class="profile-info-item">
                                        <span class="profile-info-label">ID Number</span>
                                        <span class="profile-info-value" id="profileIdNumber">-</span>
                                    </div>
                                    <div class="profile-info-item">
                                        <span class="profile-info-label">Email</span>
                                        <span class="profile-info-value" id="profileEmail">-</span>
                                    </div>
                                    <div class="profile-info-item">
                                        <span class="profile-info-label">Contact Number</span>
                                        <span class="profile-info-value" id="profileContact">-</span>
                                    </div>
                                </div>
                                <div class="profile-info-column">
                                    <div class="profile-info-item">
                                        <span class="profile-info-label">Birthdate</span>
                                        <span class="profile-info-value" id="profileBirthdate">-</span>
                                    </div>
                                    <div class="profile-info-item">
                                        <span class="profile-info-label">Address</span>
                                        <span class="profile-info-value" id="profileAddress">-</span>
                                    </div>
                                    <div class="profile-info-item">
                                        <span class="profile-info-label">Gender</span>
                                        <span class="profile-info-value" id="profileGender">-</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="profile-section-card">
                            <h4 class="profile-section-title">
                                <i class="fas fa-graduation-cap"></i> Academic Information
                            </h4>
                            <div class="profile-academic-grid">
                                <div class="profile-academic-item">
                                    <span class="profile-academic-label">Department</span>
                                    <span class="profile-academic-value" id="profileDepartment">-</span>
                                </div>
                                <div class="profile-academic-item">
                                    <span class="profile-academic-label">Program</span>
                                    <span class="profile-academic-value" id="profileProgram">-</span>
                                </div>
                                <div class="profile-academic-item">
                                    <span class="profile-academic-label">Year Level</span>
                                    <span class="profile-academic-value" id="profileYearLevel">-</span>
                                </div>
                                <div class="profile-academic-item">
                                    <span class="profile-academic-label">Status</span>
                                    <span class="profile-academic-value" id="profileStatus">-</span>
                                </div>
                                <div class="profile-academic-item">
                                    <span class="profile-academic-label">Advisor</span>
                                    <span class="profile-academic-value" id="profileAdvisor">-</span>
                                </div>
                                <div class="profile-academic-item">
                                    <span class="profile-academic-label">Academic Standing</span>
                                    <span class="profile-academic-value" id="profileAcademicStanding">-</span>
                                </div>
                            </div>
                        </div>
                        <div class="profile-section-card">
                            <h4 class="profile-section-title">
                                <i class="fas fa-file-alt"></i> Document Records
                            </h4>
                            <div class="profile-records-grid">
                                <div class="profile-record-card">
                                    <div class="profile-record-value" id="profileTotalRequests">0</div>
                                    <div class="profile-record-label">Total Requests</div>
                                </div>
                                <div class="profile-record-card">
                                    <div class="profile-record-value" id="profilePendingRequests">0</div>
                                    <div class="profile-record-label">Pending</div>
                                </div>
                                <div class="profile-record-card">
                                    <div class="profile-record-value" id="profileApprovedRequests">0</div>
                                    <div class="profile-record-label">Approved</div>
                                </div>
                                <div class="profile-record-card">
                                    <div class="profile-record-value" id="profileRejectedRequests">0</div>
                                    <div class="profile-record-label">Rejected</div>
                                </div>
                            </div>
                            <div class="profile-records-actions">
                                <button class="btn-view-history" id="profileViewHistoryBtn">
                                    <i class="fas fa-history"></i> View Document History
                                </button>
                            </div>
                            <div class="profile-recent-requests" id="profileRecentRequests"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    populateData() {
        if (!this.currentUser) return;

        const formatValue = (value) => {
            if (!value || value === '-' || (typeof value === 'string' && value.trim() === '')) {
                return 'Not Provided';
            }
            return value;
        };

        // Header Info
        const displayName = this.currentUser.fullName || this.currentUser.name || 'Student';
        document.getElementById('profileHeaderName').textContent = displayName;
        document.getElementById('profileHeaderIdNumber').textContent = formatValue(this.currentUser.idNumber);
        document.getElementById('profileHeaderEmail').textContent = formatValue(this.currentUser.email);
        
        const courseYear = `${formatValue(this.currentUser.course)} • ${formatValue(this.currentUser.yearLevel)}`;
        document.getElementById('profileHeaderCourseYear').textContent = courseYear;

        // Personal Information
        document.getElementById('profileFullName').textContent = formatValue(displayName);
        document.getElementById('profileIdNumber').textContent = formatValue(this.currentUser.idNumber);
        document.getElementById('profileEmail').textContent = formatValue(this.currentUser.email);
        document.getElementById('profileContact').textContent = formatValue(this.currentUser.contactNumber);
        document.getElementById('profileBirthdate').textContent = formatValue(this.currentUser.birthdate);
        document.getElementById('profileAddress').textContent = formatValue(this.currentUser.address);
        document.getElementById('profileGender').textContent = formatValue(this.currentUser.gender);

        // Academic Information
        const deptName = this.currentUser.department || this.currentUser.departmentName || 'Not Provided';
        document.getElementById('profileDepartment').textContent = formatValue(deptName);
        document.getElementById('profileProgram').textContent = formatValue(this.currentUser.course);
        document.getElementById('profileYearLevel').textContent = formatValue(this.currentUser.yearLevel);
        document.getElementById('profileStatus').textContent = formatValue(this.currentUser.status || 'Active');
        document.getElementById('profileAdvisor').textContent = formatValue(this.currentUser.advisor);
        document.getElementById('profileAcademicStanding').textContent = formatValue(this.currentUser.academicStanding || 'Good Standing');

        // Document Records
        const total = this.requests.length;
        const pending = this.requests.filter(r => ['pending', 'pending_faculty', 'in_progress'].includes(r.status)).length;
        const approved = this.requests.filter(r => r.status === 'approved' || r.status === 'completed').length;
        const rejected = this.requests.filter(r => r.status === 'declined').length;

        document.getElementById('profileTotalRequests').textContent = total;
        document.getElementById('profilePendingRequests').textContent = pending;
        document.getElementById('profileApprovedRequests').textContent = approved;
        document.getElementById('profileRejectedRequests').textContent = rejected;

        // Recent Requests Preview
        this.renderRecentRequests();
    }

    renderRecentRequests() {
        const container = document.getElementById('profileRecentRequests');
        if (!container) return;

        const recent = [...this.requests]
            .sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt))
            .slice(0, 5);

        if (recent.length === 0) {
            container.innerHTML = '<p style="text-align: center; opacity: 0.6; padding: 1rem;">No recent requests</p>';
            return;
        }

        const rows = recent.map(req => {
            const statusClass = this.getStatusClass(req.status);
            const statusText = this.getStatusText(req.status);
            const date = this.formatDate(req.submittedAt || req.createdAt);
            
            return `
                <tr>
                    <td>${req.documentType || req.documentValue || 'Document'}</td>
                    <td>${date}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Document</th>
                        <th>Date</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

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
    }

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
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    attachEventListeners() {
        // Close button
        const closeBtn = document.getElementById('profileCloseBtn');
        if (closeBtn) {
            closeBtn.onclick = () => this.hide();
        }

        // Edit Profile button
        const editBtn = document.getElementById('profileEditBtn');
        if (editBtn) {
            editBtn.onclick = () => {
                this.hide();
                if (window.settingsModal) {
                    window.settingsModal.show();
                } else if (window.studentPortal) {
                    window.studentPortal.showSettingsModal();
                }
            };
        }

        // Settings button
        const settingsBtn = document.getElementById('profileSettingsBtn');
        if (settingsBtn) {
            settingsBtn.onclick = () => {
                this.hide();
                if (window.settingsModal) {
                    window.settingsModal.show();
                } else if (window.studentPortal) {
                    window.studentPortal.showSettingsModal();
                }
            };
        }

        // View History button
        const historyBtn = document.getElementById('profileViewHistoryBtn');
        if (historyBtn) {
            historyBtn.onclick = () => {
                this.hide();
                if (window.studentPortal) {
                    window.studentPortal.switchView('history');
                }
            };
        }

        // Photo edit button
        const photoEditBtn = document.getElementById('profilePhotoEdit');
        if (photoEditBtn) {
            photoEditBtn.onclick = () => {
                if (window.Utils) {
                    window.Utils.showToast('Photo upload feature coming soon!', 'info');
                }
            };
        }

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

    show() {
        if (this.modal) {
            this.modal.classList.remove('hidden');
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    hide() {
        if (this.modal) {
            this.modal.classList.add('hidden');
            this.modal.classList.remove('active');
        }
        document.body.style.overflow = '';
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.ProfileModal = ProfileModal;
}
