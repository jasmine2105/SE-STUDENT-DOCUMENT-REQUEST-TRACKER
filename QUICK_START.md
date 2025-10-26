# Quick Start Guide

## ✅ Fixed Issues:

1. **Deleted Duplicate Files** ✓
   - Removed duplicate files from root directory
   - Kept organized folder structure (STUDENT/, FACULTY/, ADMIN/)

2. **Fixed Student Login** ✓
   - Login now works properly
   - Role-based authentication fixed
   - Backward compatibility added for users without roles

3. **Fixed Button Functionality** ✓
   - All buttons now work properly
   - Submit New Request button functional
   - Refresh button functional
   - Logout button functional

4. **Fixed Authentication Flow** ✓
   - Must select role before login/signup
   - Proper routing to correct portals based on role
   - No automatic redirects without credentials

## How to Use:

### Step 1: Start the Server
```powershell
npm start
```

### Step 2: Open Browser
Go to: http://localhost:3000

### Step 3: Create Account (Students Only)
1. Click "Login / Sign Up"
2. Select "Student" role
3. Click "Create Account"
4. Fill in the form
5. Accept Terms and Conditions
6. Click "Create Account"

### Step 4: Login
1. Click "Login / Sign Up"
2. Select your role (Student/Faculty/Admin)
3. Enter email and password
4. Click "Login"

### Step 5: Submit Request (Students)
1. Click "Submit New Request" button
2. Fill in document details
3. Click "Submit Request"
4. You'll receive an email confirmation

## Buttons That Work:
- ✅ Submit New Request
- ✅ Refresh
- ✅ Logout
- ✅ View Details
- ✅ Confirm Pickup (when ready)

## File Structure (Cleaned):
```
SOFTENG/
├── STUDENT/
│   ├── student-portal.html    ← Student portal
│   └── student-script.js       ← Student functions
├── FACULTY/
│   └── faculty-portal.html    ← Faculty portal
├── ADMIN/
│   └── admin-script.js        ← Admin functions
├── admin-portal.html          ← Admin portal
├── auth.html                  ← Login/Signup
├── auth-script.js            ← Authentication
├── index.html                ← Homepage
└── styles.css                ← Styling
```

## Troubleshooting:

### If buttons don't work:
1. Open browser console (F12)
2. Check for errors
3. Clear cache and reload

### If can't login:
1. Use `clear-storage.html` to delete old users
2. Create a new account
3. Try logging in again

### If emails don't send:
1. Create `.env` file with Gmail credentials
2. See `.env.example` for reference

## Colors Used (USJR Theme):
- Green: #0d7d4e (Primary)
- Yellow/Orange: #ffb300 (Secondary)

---

**Everything is now working! Try it out!** 🎉




