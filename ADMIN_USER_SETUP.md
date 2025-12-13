# Setting Up Admin User - Quick Guide

## Overview

You have provided credentials that need to be promoted to admin status:

- **Phone**: +998915817711
- **Password**: Decdod3Me

## Setup Instructions

### Option 1: Using the API Endpoint (Recommended)

Make a POST request to promote this user to admin:

```bash
curl -X POST http://localhost:4000/api/users/make-admin \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+998915817711"}'
```

**Response (Success):**

```json
{
  "message": "User with phone number +998915817711 is now an admin",
  "phone_number": "+998915817711"
}
```

### Option 2: Using Postman

1. Open Postman
2. Create new POST request
3. URL: `http://localhost:4000/api/users/make-admin`
4. Body (JSON):
   ```json
   {
     "phone_number": "+998915817711"
   }
   ```
5. Send

### Option 3: Direct Database (If API unavailable)

If needed, you can update the database directly:

```sql
UPDATE users SET role = 'admin' WHERE phone_number = '+998915817711';
```

## How Login Redirect Works

Once the user is set as admin, the login flow is:

```
1. User logs in with credentials
2. Login endpoint returns user.role = 'admin'
3. Frontend checks: if (user.role === 'admin')
4. Redirect to /admin/dashboard
5. If role === 'student', redirect to /dashboard
```

## Login as Admin

After setting the user as admin:

1. Go to Login page
2. Enter:
   - **Phone**: +998915817711
   - **Password**: Decdod3Me
3. Click **Sign In**
4. You'll be automatically redirected to `/admin/dashboard` ✅

## Verify Admin Status

After promoting, you can verify by:

1. Logging in with those credentials
2. You should see the Admin Dashboard
3. You'll have access to:
   - Test management
   - Session management
   - Participant registration
   - Real-time monitoring
   - Score management

## Notes

✅ **The login redirect is already implemented** - No frontend changes needed
✅ **Just need to promote the user to admin role** - Use one of the options above
✅ **Works with existing authentication system** - Role checking is in Login.js

## Troubleshooting

| Issue                         | Solution                                           |
| ----------------------------- | -------------------------------------------------- |
| "User not found" error        | Check the exact phone number format: +998915817711 |
| Still redirects to /dashboard | Clear browser cache, log out and log back in       |
| API endpoint not working      | Make sure server is running on port 4000           |

## What's Already Done

✅ Login component checks user role
✅ Redirects to /admin/dashboard if role === 'admin'
✅ Redirects to /dashboard if role === 'student'
✅ API endpoint created to promote users to admin
✅ No additional frontend changes needed

Just promote the user and you're ready! 🚀
