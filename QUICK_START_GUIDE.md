# Admin Dashboard - Quick Start Guide

## 🎯 Quick Overview

A comprehensive admin panel for managing IELTS mock test sessions with real-time participant monitoring and test control.

## 🚀 How to Access

1. **Login as Admin**: Use admin account to log in
2. **Navigate**: Go to `/admin/dashboard`
3. **Start Managing**: Create tests, sessions, and register participants

## 📋 Quick Workflow

```
1. Create Test
2. Create Test Session
3. Register Participants (get ID codes)
4. Share ID codes with participants
5. Monitor real-time check-ins
6. Click "Start All Tests"
7. Set Listening/Speaking Scores
```

## 🎮 Main Features At a Glance

| Feature               | Location     | What It Does                                  |
| --------------------- | ------------ | --------------------------------------------- |
| Create Test           | Tests Tab    | Add new IELTS tests                           |
| Create Session        | Sessions Tab | Schedule test with date/time/location         |
| Register Participants | Monitor Tab  | Bulk add participants, auto-generate ID codes |
| Set Scores            | Monitor Tab  | Assign listening & speaking scores            |
| Monitor               | Monitor Tab  | Real-time dashboard with statistics           |
| Start Tests           | Monitor Tab  | Begin tests for all checked-in participants   |

## 🔐 Participant ID Codes

**What**: Unique codes generated when registering participants
**Format**: `P{session_id}{number}` (e.g., P12001, P12002)
**How to Use**: Share with participants for check-in at start screen
**Value**: Only way to identify test-takers and track progress

## 📊 Dashboard Statistics

Watch 4 key metrics in real-time:

1. **Total Participants** - All registered
2. **Entered Start Screen** - Checked in with ID code
3. **Test Started** - Tests have begun
4. **Pending Scores** - Waiting for listening/speaking scores

## 🔴 Participant Status Indicators

| Status     | Color  | Meaning                            |
| ---------- | ------ | ---------------------------------- |
| ⚪ Pending | Gray   | Hasn't checked in yet              |
| 🟠 Entered | Orange | Checked in, waiting for test start |
| 🟢 Started | Green  | Test has begun                     |

## ⚡ Quick Actions

### Create a Test

1. Go to **Tests** tab
2. Click **+ Create Test**
3. Enter name and description
4. Save

### Create a Session

1. Go to **Sessions** tab
2. Click **+ Create Session**
3. Select test, set date/time/location
4. Save

### Register Participants

1. Select a session
2. Go to **Monitor Session** tab
3. Click **+ Register Participants**
4. Paste names (one per line)
5. Auto ID codes generated!

### Start Tests

1. Participants check in with ID codes
2. Watch dashboard for "Entered" count
3. Click **▶️ Start All Tests**
4. All tests begin instantly

### Set Scores

1. Find participant in table
2. Click **Set Scores**
3. Enter listening (0-9) and speaking (0-9)
4. Save

## 📱 Multi-Device Support

- ✅ Works on desktop (full features)
- ✅ Works on tablet (responsive)
- ✅ Works on mobile (optimized layout)

## 🎨 Theme Support

- **Light Theme**: Default (white/blue)
- **Dark Theme**: Eye-friendly (dark/light blue)
- **Toggle**: Click theme toggle in navbar

## 🔄 Real-Time Updates

- Dashboard auto-refreshes every 3 seconds
- No manual refresh needed
- See check-ins as they happen

## 📝 Important Notes

✅ **Do:**

- Register participants in advance
- Share ID codes before session
- Monitor dashboard during session
- Set scores before test completion

❌ **Don't:**

- Start test before participants check in
- Start test without scores set (unless not required)
- Close dashboard during active session

## 🆘 Troubleshooting

| Issue                        | Solution                            |
| ---------------------------- | ----------------------------------- |
| Can't access admin dashboard | Check if logged in as admin         |
| ID codes not showing         | Check participants are registered   |
| Dashboard not updating       | Refresh page or wait 3 seconds      |
| Can't start tests            | Ensure participants have checked in |

## 📞 Key Information

**Admin Dashboard Route**: `/admin/dashboard`
**Participant Check-in**: StartScreen (using ID codes)
**ID Code Format**: P{session_id}{number}
**Score Range**: 0-9 for both listening and speaking

## 🎯 Best Practices

1. **Create in Advance** - Set up tests/sessions before participants arrive
2. **Clear Communication** - Make sure participants know their ID codes
3. **Monitor Actively** - Keep dashboard open during session
4. **Verify Check-ins** - Ensure all participants have checked in before starting
5. **Record Scores** - Set listening/speaking scores promptly

## 📊 Session Lifecycle

```
SCHEDULED → ONGOING → IN PROGRESS → COMPLETED
           ↓            ↓
      (Participants   (Tests running)
       registering)
                      ↓
                  (Set scores)
                      ↓
                   (Done)
```

## 🔒 Security Features

- ✅ Admin-only access
- ✅ JWT authentication
- ✅ Input validation
- ✅ Score validation (0-9 range)
- ✅ Unique ID codes

## ✨ Pro Tips

1. **Bulk Register**: Paste 10+ names at once - IDs auto-generated
2. **Auto Refresh**: Leave dashboard open for real-time updates
3. **Status Dots**: Quick visual check - green = started, orange = entered
4. **Score Validation**: System prevents invalid scores (not 0-9)
5. **Session Select**: Click any session card to switch monitoring

## 🎓 Learning Resources

See detailed guides:

- `ADMIN_DASHBOARD_GUIDE.md` - Complete feature documentation
- `ADMIN_IMPLEMENTATION_SUMMARY.md` - Technical details
- `IMPLEMENTATION_CHECKLIST.md` - What's implemented

---

**Ready to manage tests? Go to `/admin/dashboard` now!** 🚀
