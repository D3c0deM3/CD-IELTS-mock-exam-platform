# Answer Checker - Visual Guide (New Compact Layout)

## Modal Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Participant Details - Ahmed Ali                                     │
│ ID Code: P001                                                       │
├──────────────────────────┬──────────────────────────────────────────┤
│ Scores                   │ Answers  ← YOU ARE HERE                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Listening: 35/40  |  Reading: 38/40                           │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ [All] [✓ Correct] [✗ Incorrect] [Listening] [Reading]             │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────┐  │
│ │ Q │ Sec │ Your Answer      │ Correct         │ Status       │  │
│ ├──┼─────┼──────────────────┼─────────────────┼──────────────┤  │
│ │ 1│ L   │ Freezer          │ Freezer         │ ✓            │  │
│ ├──┼─────┼──────────────────┼─────────────────┼──────────────┤  │
│ │ 2│ L   │ Bikes            │ Bikes           │ ✓            │  │
│ ├──┼─────┼──────────────────┼─────────────────┼──────────────┤  │
│ │ 3│ L   │ 1000             │ 1200            │ ✗            │  │
│ ├──┼─────┼──────────────────┼─────────────────┼──────────────┤  │
│ │ 4│ L   │ DELAWARE         │ DELAWARR        │ ✗            │  │
│ ├──┼─────┼──────────────────┼─────────────────┼──────────────┤  │
│ │ 5│ L   │ —                │ Garden          │ ✗            │  │
│ ├──┼─────┼──────────────────┼─────────────────┼──────────────┤  │
│ │ 6│ L   │ Study            │ Study           │ ✓            │  │
│ ├──┼─────┼──────────────────┼─────────────────┼──────────────┤  │
│ │ 7│ L   │ Woodland         │ Woodland        │ ✓            │  │
│ ├──┼─────┼──────────────────┼─────────────────┼──────────────┤  │
│ │ 8│ L   │ 15               │ 15              │ ✓            │  │
│ │  │     │                  │ ... (scrolls)   │              │  │
│ └──┴─────┴──────────────────┴─────────────────┴──────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Visual Styling Details

### Color Coding

- **Green Row**: Background `rgba(16, 185, 129, 0.03)` - Correct answers
- **Red Row**: Background `rgba(239, 68, 68, 0.03)` - Incorrect answers
- **Gray Row**: Default background - For contrast while scanning

### Column Breakdown

| Column      | Width    | Content                   | Example             |
| ----------- | -------- | ------------------------- | ------------------- |
| Q           | 35px     | Question number (1-40)    | 1, 2, 3...          |
| Sec         | 60px     | Section type (L/R)        | L, R                |
| Your Answer | Flexible | Student's response        | Freezer, true, etc. |
| Correct     | Flexible | Correct answer (if wrong) | Bikes, false, etc.  |
| Status      | 50px     | Visual indicator          | ✓ or ✗              |

### Status Icons

**Correct (Green)** ✓

```
┌─────────┐
│  ✓      │  Green circle with checkmark
│         │  Color: #10b981
└─────────┘
```

**Incorrect (Red)** ✗

```
┌─────────┐
│  ✗      │  Red circle with X
│         │  Color: #ef4444
└─────────┘
```

## Interaction Examples

### Filter: Show Only Incorrect

```
[All] [✓ Correct] [✗ Incorrect] [Listening] [Reading]
                   ↑ CLICKED

Result:
│ 3│ L   │ 1000             │ 1200            │ ✗            │
│ 4│ L   │ DELAWARE         │ DELAWARR        │ ✗            │
│ 5│ L   │ —                │ Garden          │ ✗            │

Stats Update: Listening: 35/40 (only shows 3 incorrect in this section)
```

### Filter: Listening Only

```
[All] [✓ Correct] [✗ Incorrect] [Listening] [Reading]
                                 ↑ CLICKED

Result: Shows all 40 listening questions (both correct and incorrect)
Stats Update: Shows full 40/40 for listening
```

### Filter: Listening + Incorrect

```
[All] [✓ Correct] [✗ Incorrect] [Listening] [Reading]
                  ↑              ↑ BOTH ACTIVE

Result: Shows only incorrect listening answers
Example: Questions 3, 4, 5 only (5 total incorrect)
Stats: Listening: 5 incorrect out of 40
```

## Responsive Behavior

### On Larger Screens (1000px+)

- Full table with all columns visible
- Answers wrap naturally in cells
- Optimal scanning experience

### On Smaller Screens (tablets)

- Columns may shrink slightly
- Text truncates with ellipsis
- Still readable on hover

## Scrolling Areas

### Sticky Header

- Table header stays at top while scrolling answers
- Easy to reference column names while looking at data

### Main Scroll Area

- Max-height: 500px
- Contains ~15-20 rows visible at once
- Scroll through all 80 answers
- Custom scrollbar styling

## Information Hierarchy

1. **Most Important**: Status icon (✓/✗) - Color coded
2. **Important**: Your answer vs Correct answer - Different backgrounds
3. **Context**: Question number and section type - Smaller, right-aligned
4. **Meta**: Stats and filters - Above the table

## Performance Features

- ✓ Only correct answer shown when wrong (less clutter)
- ✓ Sticky header prevents losing context
- ✓ One row = one answer (clear structure)
- ✓ Compact design = more answers visible
- ✓ Grid layout = perfect alignment
- ✓ Color coding = instant visual feedback

## Accessibility

- ✓ Column headers clearly labeled
- ✓ Status icons with color and symbols
- ✓ Good contrast ratios
- ✓ Semantic HTML structure
- ✓ Keyboard navigable filters

## Example Scenarios

### Scenario 1: Spot Check Wrong Answers

1. Click "✗ Incorrect" filter
2. Scroll through red-highlighted rows
3. See only 8 incorrect answers out of 80
4. Quickly identify problem questions

### Scenario 2: Check Specific Section

1. Click "Reading" filter
2. Shows only reading section (Q41-Q80)
3. Stats update to reading: 38/40
4. Can then click "✗ Incorrect" to see the 2 wrong ones

### Scenario 3: Full Review

1. Click "All" filter (default)
2. Header: "Listening: 35/40 | Reading: 38/40"
3. Scroll through all 80 rows
4. Green rows = correct, Red rows = incorrect
5. Takes ~2-3 minutes to review all answers

---

**Layout Style:** Compact Table Format
**Grid Columns:** 5 (Q | Sec | Your | Correct | Status)
**Max Height:** 500px (scrollable)
**Optimization:** ~60% more compact than previous design
