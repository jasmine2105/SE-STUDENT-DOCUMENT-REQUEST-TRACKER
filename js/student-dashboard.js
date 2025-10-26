// Check authentication and load student data
document.addEventListener('DOMContentLoaded', () => {
    const studentData = JSON.parse(localStorage.getItem('studentData'));
    if (!studentData || !studentData.authenticated) {
        window.location.href = 'auth.html';
        return;
    }

    updateGreeting(studentData.name);
    loadRequests();
});

// Update greeting with student name
function updateGreeting(name) {
    const greetingElement = document.getElementById('studentGreeting');
    const hour = new Date().getHours();
    let greeting = 'Hi';
    greetingElement.textContent = `${greeting}, ${name}`;
}

// Handle document type selection
function selectDocument(type) {
    // Remove selection from all options
    document.querySelectorAll('.document-option').forEach(option => {
        option.classList.remove('selected');
    });

    // Hide all forms
    document.querySelectorAll('.request-form').forEach(form => {
        form.classList.remove('active');
    });

    // Show selected option and form
    const selectedOption = document.querySelector(`[onclick="selectDocument('${type}')"]`);
    const selectedForm = document.getElementById(`${type}Form`);

    if (selectedOption && selectedForm) {
        selectedOption.classList.add('selected');
        selectedForm.classList.add('active');
        selectedForm.scrollIntoView({ behavior: 'smooth' });
    }
}

// Handle request submission
function showRequestForm(type) {
    // Hide all forms
    document.querySelectorAll('.request-form').forEach(form => {
        form.style.display = 'none';
    });
    
    // Show selected form
    const selectedForm = document.getElementById(type + 'Form');
    if (selectedForm) {
        selectedForm.style.display = 'block';
        selectedForm.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Highlight selected document
    document.querySelectorAll('.document-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
}

function submitRequest(event, type) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    // Create request object
    const studentData = JSON.parse(localStorage.getItem('studentData'));
    const request = {
        id: Date.now(),
        type: type,
        studentId: studentData.id,
        studentName: studentData.name,
        timestamp: new Date().toISOString(),
        status: 'pending',
        data: Object.fromEntries(formData)
    };

    // Save request
    let requests = JSON.parse(localStorage.getItem('requests') || '[]');
    requests.push(request);
    localStorage.setItem('requests', JSON.stringify(requests));

    // Reset form and selection
    form.reset();
    document.querySelectorAll('.document-option').forEach(option => {
        option.classList.remove('selected');
    });
    document.querySelectorAll('.request-form').forEach(form => {
        form.classList.remove('active');
    });

    // Show success message
    alert('Request submitted successfully!');
    loadRequests();
}

// Load and display requests
function loadRequests() {
    const studentData = JSON.parse(localStorage.getItem('studentData'));
    const requests = JSON.parse(localStorage.getItem('requests') || '[]');
    const studentRequests = requests.filter(r => r.studentId === studentData.id);
    const requestsList = document.getElementById('requestsList');

    if (studentRequests.length === 0) {
        requestsList.innerHTML = '<p>No requests found.</p>';
        return;
    }

    const requestsHTML = studentRequests.map(request => `
        <div class="request-card">
            <h3>${formatDocumentType(request.type)}</h3>
            <p><strong>Status:</strong> <span class="status-${request.status}">${request.status}</span></p>
            <p><strong>Submitted:</strong> ${new Date(request.timestamp).toLocaleString()}</p>
            <p><strong>Purpose:</strong> ${request.data.purpose || 'Not specified'}</p>
        </div>
    `).join('');

    requestsList.innerHTML = requestsHTML;
}

// Format document type for display
function formatDocumentType(type) {
    const types = {
        'transcript': 'Transcript of Records',
        'good_moral': 'Good Moral Certificate',
        'enrollment': 'Certificate of Enrollment',
        'other': 'Other Document'
    };
    return types[type] || type;
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('studentData');
    window.location.href = 'auth.html';
}