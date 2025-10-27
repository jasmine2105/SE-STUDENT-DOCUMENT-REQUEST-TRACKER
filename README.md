<<<<<<< HEAD
Student Document Request Tracker — Local Setup (Windows)

This repository contains a static frontend (HTML/CSS/JS) and a small Express backend to persist requests and send Gmail notifications when a student submits a document request.

Main features added in this update:
- A minimal Express backend at server.js with endpoints:
  - POST /api/requests — accept request data and optional attachments; saves to db.json and attempts to send an email to the student's Gmail.
  - GET /api/requests — list all requests (admin view)
  - GET /api/requests/:id — fetch specific request
- Nodemailer configured via environment variables for Gmail SMTP.
- Frontend update: student-script.js now POSTs requests to /api/requests (keeps a localStorage fallback).

Prerequisites:
- Node.js (v16+ recommended)
- A Gmail account (recommended: use an App Password if you have 2FA enabled)

Setup (Windows PowerShell):
1. Open PowerShell and change to the project folder (example):

   cd 'C:\\Users\\Admin\\Documents\\SOFTENG'

2. Install dependencies:

   npm install

3. Copy the example env file and fill your Gmail credentials:

   copy .env.example .env

   Then open .env in a text editor and set EMAIL_USER and EMAIL_PASS.

Important: If your Google account has 2FA, create an App Password and use it in EMAIL_PASS.

4. Start the server:

   npm start

5. Open the site in your browser:

   Visit http://localhost:3000 to use the site served by the backend.

How to test the flow:
1. Open http://localhost:3000.
2. Click "Login / Sign Up" and create a student account (registration stores user locally).
3. Go to Student Portal, click "Submit New Request", fill the form, and submit.
4. The UI saves the request locally and then attempts to POST it to the backend; if email config is valid, you will receive a confirmation email at the address you gave.

Notes and next steps:
- The backend uses a JSON DB (db.json) for persistence — not meant for production.
- Attachments are saved into uploads/ and their metadata stored in db.json.
- For production, migrate to a real database and secure authentication (JWT, password hashing, input sanitization).

If you want, I can now:
- Update auth to use backend endpoints (signup/login persisted),
- Create separate folders for frontend (student/, admin/, faculty/),
- Add a small admin UI to view requests using the backend,
- Add unit tests.
=======
<<<<<<< HEAD
# SE-STUDENT-DOCUMENT-REQUEST-TRACKER
=======
# Student Document Request Tracker

A comprehensive web application for managing academic document requests including TOR (Transcript of Records), Good Moral Certificates, COE (Certificate of Enrollment), and other academic documents.

## Features

### Student Portal
- **Submit Document Requests**: Create new requests for various academic documents
- **Track Progress**: Monitor request status in real-time with detailed timelines
- **View History**: Access complete history of all submitted requests
- **Notifications**: Receive updates on request status changes

### Admin Portal
- **Request Management**: View and manage all incoming document requests
- **Status Updates**: Process requests through various stages (Submitted → Processing → Ready → Completed)
- **Filter & Search**: Advanced filtering by status, type, date, and student information
- **Notes System**: Add internal notes and comments to requests
- **Dashboard Analytics**: Overview of request statistics and trends

### Faculty Portal
- **Academic Clearance**: Review and approve requests requiring academic eligibility
- **Student Records**: Access academic information for clearance decisions
- **Approval Workflow**: Streamlined approval/rejection process with notes

### Notification System
- **Multi-channel Notifications**: Email, SMS, and in-app notifications
- **Real-time Updates**: Instant notifications for status changes
- **Audit Trail**: Complete logging of all actions and status transitions

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Custom CSS with modern design principles
- **Icons**: Font Awesome 6.0
- **Responsive Design**: Mobile-first approach with Bootstrap-inspired grid system

## File Structure

```
├── index.html              # Landing page
├── student-portal.html     # Student interface
├── admin-portal.html       # Administrative interface
├── faculty-portal.html     # Faculty approval interface
├── styles.css             # Main stylesheet
├── script.js              # Core JavaScript functionality
├── student-script.js      # Student portal specific scripts
├── admin-script.js        # Admin portal specific scripts
├── faculty-script.js      # Faculty portal specific scripts
└── README.md              # Project documentation
```

## Getting Started

1. **Clone or Download** the project files to your local machine
2. **Open** `index.html` in a web browser
3. **Navigate** between different portals using the navigation links
4. **Test** the functionality with the sample data provided

## Usage Guide

### For Students
1. Access the **Student Portal** from the main page
2. Click **"Submit New Request"** to create a document request
3. Fill out the form with required information
4. Track your request status in the **"My Requests"** section
5. View detailed timelines and status updates

### For Administrators
1. Access the **Admin Portal** from the main page
2. Use the **dashboard** to view request statistics
3. **Filter and search** requests using the available options
4. **Process requests** by updating status and adding notes
5. Monitor **notifications** for new requests and updates

### For Faculty
1. Access the **Faculty Portal** from the main page
2. Review **pending clearance requests** requiring academic approval
3. Examine student academic records and standing
4. **Approve or reject** clearance requests with appropriate notes
5. Track clearance history and statistics

## Key Features Implementation

### Request Lifecycle
1. **Submitted**: Student creates new request
2. **Processing**: Admin begins processing the request
3. **Ready for Release**: Document is prepared and ready
4. **Completed**: Document has been delivered/picked up
5. **Declined**: Request was rejected with reason

### Academic Clearance Workflow
1. **Automatic Routing**: Requests requiring clearance are automatically routed to faculty
2. **Review Process**: Faculty reviews student academic standing
3. **Decision Making**: Approve or reject with detailed notes
4. **Integration**: Approved requests continue through normal processing

### Notification System
- **Event-driven**: Notifications triggered by status changes
- **Multi-recipient**: Students, admins, and faculty receive relevant updates
- **Persistent**: All notifications logged for audit purposes

## Sample Data

The application includes sample data for demonstration purposes:
- **Students**: John Doe, Jane Smith, Mike Johnson, Sarah Wilson, David Brown, Emily Davis
- **Request Types**: TOR, Good Moral, COE, COG, Honorable Dismissal, Diploma
- **Statuses**: Submitted, Processing, Ready for Release, Completed, Declined, Action Required

## Browser Compatibility

- **Chrome**: 80+
- **Firefox**: 75+
- **Safari**: 13+
- **Edge**: 80+

## Future Enhancements

- **Backend Integration**: Connect to a server-side database
- **User Authentication**: Implement proper login/logout system
- **File Upload**: Support for document attachments
- **Payment Integration**: Online payment processing for fees
- **API Development**: RESTful API for mobile applications
- **Advanced Analytics**: Detailed reporting and analytics dashboard

## Contributing

This is a demonstration project showcasing the use case requirements for a student document request tracking system. The code is structured to be easily extensible and can serve as a foundation for a production application.

## License

This project is created for educational and demonstration purposes. Feel free to use and modify as needed for your specific requirements.

## Contribution

# Jasmine Omandam
-

# Martina Monica N. Calledo
- Modified the Faculty, Student and Admin Dashboard
- Navigation
- Make the App user-friendly

# Patrick Duron
- Modified the structuring for better convience and easier debugging experience
- structured the roles like ADMIN to have their own auth, scripts, styles and views

---

**Note**: This is a frontend-only implementation with sample data. In a production environment, this would be connected to a backend server with a proper database and authentication system.
>>>>>>> 595deb6 (Document Tracker Codes)
>>>>>>> dc13fc5fc4ecf84e06785bcbfffec341c6494c8e
