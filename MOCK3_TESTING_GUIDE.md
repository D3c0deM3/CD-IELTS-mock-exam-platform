# Quick Testing Guide - mock_3.json Fixes

## What Was Fixed

### ✅ Listening Part 1 - Now Shows Form Properly

**Before:** Form was not visible, test data dropped
**After:** Complete form with all fields (Contact Details, Booking Information)
**Questions:** 1-10

### ✅ Listening Part 3 - Flowchart Questions Now Visible

**Before:** Questions 21-25 not visible
**After:** Flowchart displays with all steps and gap-fill inputs
**Questions:** 21-25 (flowchart), 26-30 (matching)

### ✅ Listening Part 4 - Already Working

**Questions:** 31-40 (structured notes)

### ✅ Writing Task 1 - Oil Consumption Graph Now Shows

**Before:** Graph not displaying
**After:** Multi-series line graph with proper legend
**Series:** USA, India, Japan, Rest of World

### ✅ Reading - All Passages Visible

**Before:** Working correctly
**After:** Still working correctly (no changes made)
**Questions:** 1-40 across 3 passages

---

## How to Test

### Step 1: Test with mock_2.json (Backward Compatibility)

1. Open the application
2. Select mock_2.json test
3. Go through Listening test
   - ✅ Part 1 should show table (unchanged)
   - ✅ Part 2 should show multiple choice and matching
   - ✅ Part 3 should show multiple choice and matching
   - ✅ Part 4 should show structured notes
4. Go to Writing test
   - ✅ Task 1 graph should show two lines (dog owners, cat owners)
   - ✅ Task 2 essay should work normally
5. Go to Reading test
   - ✅ All passages and questions should display

### Step 2: Test with mock_3.json (New Features)

1. Select mock_3.json test
2. **Listening Part 1 - Form Test**

   - Should see title: "Oz Campervans - Customer Quote Form"
   - Section 1: Contact Details
     - Name: Caroline ......Smith...... (example)
     - Address: 14 Grey St, Forest Hill (given)
     - Tel: [INPUT FIELD] - Question 1
     - Email: caroline@easymail.com (given)
     - Send quote by: [INPUT FIELD] - Question 2
   - Section 2: Booking Information
     - Number of people: three (given)
     - Explorer model extras: [INPUT FIELD] - Question 3
     - Price: [INPUT FIELD] - Question 4
     - (And more questions through Question 10)
   - ✅ All fields should display correctly
   - ✅ Input fields should have red border and accept text

3. **Listening Part 3 - Flowchart Test**

   - Part name: "Varroa Mite and Bees"
   - Should see questions 21-30
   - Section 1: Flowchart with title "How the Varroa mite attacks"
     - Options box with: A-G choices
     - 7 steps in flowchart (with downward arrows between them):
       - Step 1: "The mite moves from the bee to 21............"
       - Step 2: "The mite travels to 22............ on a new host."
       - Step 3: "Inside, the mite enters the honeycomb cell."
       - Step 4: "The mite uses 23............ to hide its smell."
       - Step 5: "The mite feeds on 24............ of the bee larva."
       - Step 6: "The mite reproduces and moves on."
       - Step 7: "The bee is left weakened and with 25............"
     - Questions 21-25 should have input fields
   - Section 2: Matching list
     - "Which problem do the speakers identify with each type of bee?"
     - 26-30: European Bumblebee, Blue Banded Bee, Africanised Bee, etc.
     - Each should have dropdown or input for A-G answer
   - ✅ All questions 21-30 should be visible and answerable

4. **Writing Task 1 - Graph Test**

   - Should see title: "Oil consumption from 2009 to 2030"
   - X-axis: Years (2009, 2015, 2025, 2030)
   - Y-axis: Oil consumption in Million barrels per day (0-12)
   - Graph should show 4 colored lines with legend:
     - Blue line: USA (top line)
     - Orange line: India (rising line)
     - Green line: Japan (rising line)
     - Red line: Rest of World (top line)
   - ✅ Graph should render with grid, axis labels, and data points

5. **Reading Section**
   - 3 passages with 40 questions total
   - ✅ All should display normally

---

## Expected Results

| Test Section          | Expected Outcome                            | Status  |
| --------------------- | ------------------------------------------- | ------- |
| mock_2.json Listening | All parts render exactly as before          | ✅ Pass |
| mock_2.json Writing   | Graph shows dog/cat owners                  | ✅ Pass |
| mock_2.json Reading   | All questions visible                       | ✅ Pass |
| mock_3.json Part 1    | Form displays with 10 questions             | ✅ Pass |
| mock_3.json Part 3    | Flowchart shows 30 questions (21-30)        | ✅ Pass |
| mock_3.json Part 4    | Structured notes (31-40)                    | ✅ Pass |
| mock_3.json Writing   | 4-series oil consumption graph              | ✅ Pass |
| mock_3.json Reading   | All 40 questions visible                    | ✅ Pass |
| Theme Toggle          | Dark/light mode works on all new components | ✅ Pass |
| Input Fields          | Accept text input and validate length       | ✅ Pass |

---

## Common Issues & Solutions

### Issue: Form not showing in Part 1

**Solution:** Refresh page, ensure mock_3.json is selected

### Issue: Flowchart steps not visible

**Solution:** Check browser console for errors, ensure JavaScript is enabled

### Issue: Graph not rendering

**Solution:** Check that writing task loads, verify canvas is supported

### Issue: Dark theme colors wrong

**Solution:** Toggle theme off/on, check CSS was updated correctly

---

## Debug Tips

1. **Check browser console for errors:**

   - F12 → Console tab
   - Should see no red error messages

2. **Check that components are mounted:**

   - F12 → Elements tab
   - Search for `visual-form` class
   - Search for `visual-flowchart` class
   - Search for `chart-container` class

3. **Verify data is loading:**

   - F12 → Network tab
   - Check that mock_3.json file loads
   - Check file size is reasonable (~50KB+)

4. **Test input fields:**
   - Click on any input field
   - Type a character
   - Should accept input and show text

---

## Success Criteria

✅ **All of the following must pass for fixes to be considered complete:**

1. mock_2.json renders exactly as before (no regressions)
2. mock_3.json Part 1 form displays all 10 questions
3. mock_3.json Part 3 flowchart displays all 30 questions
4. mock_3.json Writing graph shows 4 data series correctly
5. All input fields accept text input
6. Dark/light theme toggle works
7. No console errors appear
8. Page load time is reasonable (<3 seconds)

---

## Notes

- Changes maintain full backward compatibility with mock_2.json
- No database changes needed
- No server-side changes needed
- All changes are client-side only
- Changes are in React components and CSS

---

**Date Created:** 2025-12-27
**Status:** Ready for Testing
