# Student Document Request Tracker - Procedural Design

## Table of Contents
1. [System Overview](#system-overview)
2. [User Roles](#user-roles)
3. [Complete Request Lifecycle](#complete-request-lifecycle)
4. [Detailed Procedures by Role](#detailed-procedures-by-role)
5. [System Interactions](#system-interactions)
6. [Exception Handling](#exception-handling)

---

## System Overview

The Student Document Request Tracker is a web-based system that manages document requests from students through approval workflows involving administrators and faculty members. The system tracks requests from submission to completion, ensuring proper authorization and documentation.

**Key Features:**
- Student document request submission
- Department-based routing
- Faculty approval workflow
- Admin management and oversight
- Real-time notifications
- Request tracking and history

---

## User Roles

### 1. **Student**
- Submits document requests
- Tracks request status
- Communicates with admins/faculty
- Views request history

### 2. **Admin** (Department Administrator)
- Reviews and processes requests
- Routes requests to faculty when needed
- Updates request status
- Manages department requests
- Adds notes and comments

### 3. **Faculty**
- Approves/declines requests requiring faculty approval
- Reviews request details
- Provides feedback

### 4. **Super Admin**
- System-wide administration
- User management
- Department management
- System configuration

---

## Complete Request Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    REQUEST LIFECYCLE FLOW                        │
└─────────────────────────────────────────────────────────────────┘

1. STUDENT SUBMITS REQUEST
   ↓
2. REQUEST STATUS: "pending"
   ↓
3. ADMIN REVIEWS REQUEST
   ↓
4a. NO FACULTY APPROVAL NEEDED → Admin processes directly
   ↓
4b. FACULTY APPROVAL NEEDED → Status: "pending_faculty"
   ↓
5. FACULTY REVIEWS & DECIDES
   ├─ APPROVE → Status: "approved" → Admin processes
   └─ DECLINE → Status: "declined" → Student notified
   ↓
6. ADMIN PROCESSES APPROVED REQUEST
   ↓
7. STATUS: "in_progress"
   ↓
8. DOCUMENT PREPARED & COMPLETED
   ↓
9. STATUS: "completed"
   ↓
10. STUDENT NOTIFIED
```

---

## Detailed Procedures by Role

### PROCEDURE 1: Student Registration & Login

#### Step 1.1: Access System
1. Navigate to the application URL
2. System displays login page

#### Step 1.2: Registration (First Time Users)
1. Click "Sign Up" or "Register" button
2. Select role: **Student**
3. Enter required information:
   - ID Number (10 digits)
   - Full Name
   - Email Address
   - Password
   - Department
   - Course/Program
   - Year Level
4. Click "Register"
5. System validates:
   - ID number format (must be 10 digits)
   - Email format
   - Password strength
   - All required fields
6. If valid:
   - Account created
   - User redirected to login
7. If invalid:
   - Error messages displayed
   - User corrects and resubmits

#### Step 1.3: Login
1. Enter ID Number
2. Enter Password
3. Click "Sign In"
4. System authenticates:
   - Verifies credentials
   - Checks user role
   - Generates JWT token
5. If successful:
   - Token stored in localStorage
   - User redirected to Student Portal
6. If failed:
   - Error message displayed
   - User retries login

---

### PROCEDURE 2: Student - Submit Document Request

#### Step 2.1: Access Request Form
1. Student logs into portal
2. Navigate to Dashboard
3. Click "New Request" button (floating action button or menu item)

#### Step 2.2: Fill Request Form
1. **Select Department**
   - Choose from dropdown (e.g., SCS, SBM, SDPC, SASO, etc.)
   - System loads available documents for selected department

2. **Select Document Type**
   - Choose from department-specific documents
   - If "Other" selected, specify document name in text field

3. **Enter Purpose**
   - Required field
   - Describe reason for request (e.g., "Employment", "Further Studies", "Scholarship")

4. **Specify Quantity**
   - Enter number of copies (1-10)
   - Default: 1

5. **Add Additional Notes** (Optional)
   - Any special instructions or requirements

6. **Upload Supporting Documents** (Optional)
   - Click "Add Supporting Documents"
   - Select files (JPG/PNG/PDF, max 5MB each, up to 3 files)
   - Preview uploaded files
   - Remove files if needed

#### Step 2.3: Submit Request
1. Review all entered information
2. Click "Submit Request" button
3. System validates:
   - All required fields filled
   - File sizes within limits
   - File types valid
4. If valid:
   - Request created with unique code (REQ-YYYY-#####)
   - Status set to "pending"
   - Request saved to database
   - Notifications sent to:
     - Department Admin
     - Faculty (if requires_faculty = true)
   - Success message displayed
   - Request appears in "My Documents" section
5. If invalid:
   - Error messages displayed
   - User corrects and resubmits

#### Step 2.4: Request Confirmation
1. System displays request code
2. Request appears in student's dashboard
3. Student can view request details

---

### PROCEDURE 3: Admin - Review & Process Request

#### Step 3.1: Access Admin Portal
1. Admin logs in with credentials
2. System redirects to Admin Portal Dashboard

#### Step 3.2: View New Requests
1. Navigate to "Requests" section
2. System displays:
   - All requests in admin's department
   - Filtered by status (All, Pending, In Progress, etc.)
   - Request details:
     - Request Code
     - Student Name
     - Document Type
     - Date Submitted
     - Status
     - Priority

#### Step 3.3: Review Request Details
1. Click "View" button on a request
2. System displays full request details:
   - Student Information
   - Document Information
   - Purpose
   - Quantity
   - Supporting Documents (if any)
   - Request History/Timeline
   - Conversation/Comments

#### Step 3.4: Determine Processing Path

**Path A: No Faculty Approval Required**
1. Admin reviews request
2. Admin determines faculty approval not needed
3. Proceed to Step 3.5

**Path B: Faculty Approval Required**
1. Admin reviews request
2. Admin determines faculty approval needed
3. Admin changes status to "pending_faculty"
4. System:
   - Updates request status
   - Sends notifications to:
     - All faculty in department (if not assigned)
     - Specific faculty member (if assigned)
   - Logs status change
5. Proceed to PROCEDURE 4 (Faculty Approval)

#### Step 3.5: Process Request Directly
1. Admin updates request status to "in_progress"
2. Admin may:
   - Add notes/comments
   - Upload documents
   - Update priority
3. Admin prepares document
4. When document ready:
   - Admin updates status to "completed"
   - System:
     - Marks request as completed
     - Records completion timestamp
     - Sends notification to student
5. Request appears in "Completed" section

#### Step 3.6: Assign to Faculty (Optional)
1. Admin clicks "Assign to Faculty" (if available)
2. Select faculty member from dropdown
3. Click "Assign"
4. System:
   - Updates request faculty_id
   - Sends notification to assigned faculty
   - Logs assignment

#### Step 3.7: Add Notes/Comments
1. Admin types message in conversation area
2. Click "Send Note" or "Add Comment"
3. System:
   - Saves comment to database
   - Displays in conversation thread
   - Sends notification to student (optional)

---

### PROCEDURE 4: Faculty - Review & Approve/Decline Request

#### Step 4.1: Access Faculty Portal
1. Faculty logs in with credentials
2. System redirects to Faculty Portal Dashboard

#### Step 4.2: View Pending Requests
1. Navigate to "Requests" section
2. System displays:
   - Requests with status "pending_faculty" in faculty's department
   - Requests assigned to this faculty member
   - Filter options available

#### Step 4.3: Review Request Details
1. Click "View" button on a request
2. System displays:
   - Student Information
   - Document Information
   - Purpose
   - Request History
   - Admin Notes/Comments
   - Supporting Documents

#### Step 4.4: Make Decision

**Option A: Approve Request**
1. Click "Approve" button
2. System displays approval modal
3. Faculty may add approval note (optional)
4. Click "Confirm Approval"
5. System:
   - Updates request status to "approved"
   - Records approval in faculty_approval JSON:
     ```json
     {
       "facultyId": 23,
       "facultyName": "Dr. Maria Santos",
       "approved": true,
       "approvedAt": "2025-01-15T10:30:00Z",
       "note": "Approved for employment purposes"
     }
     ```
   - Sends notifications to:
     - Student
     - Department Admin
   - Logs approval action
6. Request returns to admin for processing

**Option B: Decline Request**
1. Click "Decline" button
2. System displays decline modal
3. Faculty must enter decline reason (required)
4. Click "Confirm Decline"
5. System:
   - Updates request status to "declined"
   - Records decline in faculty_approval JSON:
     ```json
     {
       "facultyId": 23,
       "facultyName": "Dr. Maria Santos",
       "approved": false,
       "declinedAt": "2025-01-15T10:30:00Z",
       "reason": "Insufficient supporting documents"
     }
     ```
   - Sends notifications to:
     - Student
     - Department Admin
   - Logs decline action
7. Request marked as declined, student can view reason

#### Step 4.5: View Request History
1. Faculty can view all requests they've approved/declined
2. Filter by status, date, student name

---

### PROCEDURE 5: Admin - Complete Request Processing

#### Step 5.1: Receive Approved Request
1. Admin receives notification of faculty approval
2. Request appears in "In Progress" or "Approved" section

#### Step 5.2: Process Document
1. Admin reviews approved request
2. Admin prepares document:
   - Generates/prints document
   - Verifies information
   - Applies signatures/stamps if needed
3. Admin updates request:
   - Add processing notes
   - Upload completed document (if applicable)
   - Update status to "in_progress"

#### Step 5.3: Mark as Completed
1. When document ready for pickup/delivery:
2. Admin updates status to "completed"
3. System:
   - Records completion timestamp
   - Sends notification to student
   - Moves request to "Completed" section
4. Student can view completed request

---

### PROCEDURE 6: Student - Track Request Status

#### Step 6.1: View Request Status
1. Student logs into portal
2. Navigate to "My Documents" or "Dashboard"
3. System displays all student's requests with:
   - Request Code
   - Document Type
   - Department
   - Status Badge (color-coded)
   - Date Submitted
   - Last Updated

#### Step 6.2: View Request Details
1. Click on a request or "View" button
2. System displays:
   - Full request information
   - Current status
   - Status timeline/history
   - Faculty approval details (if applicable)
   - Admin notes/comments
   - Conversation thread
   - Supporting documents

#### Step 6.3: Filter & Search
1. Use filters:
   - By Status (All, Pending, In Progress, Completed, Declined)
   - By Department
   - By Date Range
2. Use search to find specific requests

#### Step 6.4: Add Comments/Notes
1. Student can add notes to request
2. Type message in conversation area
3. Click "Send Note"
4. System:
   - Saves comment
   - Sends notification to admin
   - Updates conversation thread

---

### PROCEDURE 7: Notification System

#### Step 7.1: Notification Generation
System automatically generates notifications for:
- **Request Submitted**: Admin receives notification
- **Status Changed**: Student receives notification
- **Faculty Approval Needed**: Faculty receives notification
- **Request Assigned**: Assigned faculty receives notification
- **Request Approved/Declined**: Student and Admin receive notifications
- **Request Completed**: Student receives notification
- **New Comment/Note**: Relevant parties receive notifications

#### Step 7.2: Notification Display
1. Notification bell icon shows unread count
2. Click bell to view notifications dropdown
3. System displays:
   - Notification title
   - Notification message
   - Timestamp
   - Unread indicator
4. Click notification to view related request

#### Step 7.3: Notification Management
1. Click "Mark as Read" on individual notification
2. Click "Mark all as read" to clear all
3. System updates read status in database

---

### PROCEDURE 8: Profile & Settings Management

#### Step 8.1: Access Profile
1. Click "My Profile" in sidebar
2. System displays profile page with:
   - Profile photo
   - Personal Information
   - Academic/Professional Information
   - Document Statistics

#### Step 8.2: Edit Profile
1. Click "Edit Profile" button
2. System enables edit mode
3. Update editable fields:
   - Full Name
   - Email
   - Contact Number
   - Birthdate
   - Address
   - Gender
   - Position (for faculty)
4. Upload/change profile photo (optional)
5. Click "Save Changes"
6. System:
   - Validates changes
   - Updates database
   - Updates localStorage
   - Displays success message

#### Step 8.3: Access Settings
1. Click "Settings" in sidebar
2. System displays settings tabs:
   - Security (Change Password)
   - Notifications (Preferences)

#### Step 8.4: Change Password
1. Navigate to Security tab
2. Enter:
   - Current Password
   - New Password
   - Confirm New Password
3. System validates:
   - Current password correct
   - New password meets requirements
   - Passwords match
4. Click "Save Changes"
5. System:
   - Updates password hash
   - Logs password change
   - Displays success message

#### Step 8.5: Update Notification Preferences
1. Navigate to Notifications tab
2. Toggle preferences:
   - Email Notifications
   - SMS Notifications
3. Click "Save Changes"
4. System updates preferences in database

---

## System Interactions

### Database Operations

#### Request Creation
```sql
INSERT INTO requests (
  request_code, student_id, student_name, student_id_number,
  department_id, document_value, document_label, status,
  priority, quantity, purpose, attachments, requires_faculty
) VALUES (...)
```

#### Status Updates
```sql
UPDATE requests 
SET status = ?, updated_at = NOW()
WHERE id = ?
```

#### Faculty Approval
```sql
UPDATE requests 
SET faculty_approval = JSON_OBJECT(...),
    status = 'approved'
WHERE id = ?
```

#### Notification Creation
```sql
INSERT INTO notifications (
  user_id, role, type, title, message, request_id, read_flag
) VALUES (...)
```

### API Endpoints

#### Student Endpoints
- `POST /api/auth/signup` - Student registration
- `POST /api/auth/login` - User login
- `GET /api/requests` - Get student's requests
- `POST /api/requests` - Create new request
- `GET /api/requests/:id` - Get request details
- `POST /api/conversations/:requestId` - Add comment

#### Admin Endpoints
- `GET /api/requests` - Get all department requests
- `PUT /api/requests/:id` - Update request status
- `PUT /api/requests/:id/assign` - Assign to faculty
- `POST /api/conversations/:requestId` - Add admin note

#### Faculty Endpoints
- `GET /api/requests` - Get pending/assigned requests
- `POST /api/requests/:id/approve` - Approve request
- `POST /api/requests/:id/decline` - Decline request

#### Notification Endpoints
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read

---

## Exception Handling

### Error Scenarios

#### 1. Invalid Request Submission
- **Error**: Missing required fields
- **Action**: Display validation errors, prevent submission
- **User Action**: Fill required fields and resubmit

#### 2. File Upload Failure
- **Error**: File too large or invalid type
- **Action**: Display error message, allow file removal
- **User Action**: Select valid file or remove file

#### 3. Authentication Failure
- **Error**: Invalid credentials
- **Action**: Display error message, clear password field
- **User Action**: Re-enter credentials or reset password

#### 4. Network Error
- **Error**: API request fails
- **Action**: Display error message, allow retry
- **User Action**: Check connection, retry operation

#### 5. Request Already Processed
- **Error**: Attempting to approve/decline already processed request
- **Action**: Display warning, refresh request status
- **User Action**: View updated request status

#### 6. Permission Denied
- **Error**: User trying to access unauthorized resource
- **Action**: Redirect to appropriate portal, display error
- **User Action**: Contact administrator if issue persists

---

## Status Flow Diagram

```
pending
  ↓
pending_faculty (if requires approval)
  ↓
  ├─→ approved → in_progress → completed
  └─→ declined (END)
  
OR

pending
  ↓
in_progress (if no approval needed)
  ↓
completed
```

---

## Priority Levels

- **Normal**: Standard processing time
- **Urgent**: Expedited processing required

---

## Document Types by Department

### School of Computer Studies (SCS)
- Certificate of Good Moral Character
- Transcript of Records
- Certificate of Enrollment
- Certificate of Grades
- Other (specify)

### School of Business Management (SBM)
- Certificate of Good Moral Character
- Transcript of Records
- Certificate of Enrollment
- Other (specify)

### Other Departments
- Department-specific documents
- Custom document types

---

## End of Procedural Design

This document outlines the complete procedural flow of the Student Document Request Tracker system from user registration through request completion. All procedures follow a systematic approach ensuring data integrity, proper authorization, and user experience.




