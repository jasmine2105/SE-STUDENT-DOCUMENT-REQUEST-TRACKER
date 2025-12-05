# Database Setup Instructions

## Issues Found in Your Schema:

1. ❌ **Table Name Mismatch**: Your schema creates `documents` table, but the application expects `department_documents`
2. ❌ **Document Values Mismatch**: Your schema uses values like `'SCS_TOR'`, but the frontend expects values like `'Transcript of Records'`
3. ✅ **Departments table**: Correct
4. ✅ **Users table**: Correct (but missing `contact_number` field)
5. ✅ **Requests table**: Correct
6. ✅ **Notifications table**: Correct

## How to Fix:

### Step 1: Check Your .env File

Make sure your `.env` file in the root directory has:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password_here
DB_NAME=recoletos_tracker
```

**Important**: Replace `your_actual_mysql_password_here` with your actual MySQL root password!

### Step 2: Run the Complete Setup Script

1. Open MySQL Workbench or command line
2. Run the entire `database/COMPLETE-SETUP.sql` file
3. This will:
   - Create the `department_documents` table (not `documents`)
   - Insert departments
   - Insert document types with correct values matching the frontend

### Step 3: Verify Setup

After running the script, verify:

```sql
USE recoletos_tracker;
SELECT COUNT(*) FROM department_documents; -- Should show document count
SELECT * FROM department_documents LIMIT 5; -- Should show document types
```

### Step 4: Restart Your Server

```bash
npm start
node server.js
```

### Step 5: Test

1. Open student portal
2. Change departments - should be **instant** (no waiting)
3. Submit a request - should work and appear on dashboard

## What Was Wrong:

- **Your schema**: Created `documents` table with values like `'SCS_TOR'`
- **Application expects**: `department_documents` table with values like `'Transcript of Records'`
- **Result**: API queries failed because table didn't exist, causing timeouts

## After Fix:

- ✅ API will work (no more timeouts)
- ✅ Document types will load from database
- ✅ Requests will save to database
- ✅ Dashboard will show submitted requests

