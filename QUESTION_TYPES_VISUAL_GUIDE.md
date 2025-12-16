# 📐 Question Types Visual Guide

## IELTS Question Type Structures

### Type 1: GAP FILL (Short Answer)

#### What It Is

Students fill in missing words in sentences or complete tables with short text answers.

#### Visual Structure

```
┌─────────────────────────────────────────────────┐
│ Q1  [Word Limit Badge]                          │
├─────────────────────────────────────────────────┤
│ Write ONE WORD AND/OR A NUMBER                  │
│                                                  │
│ "The garage has 1__________"                    │
│ ┌─────────────────────────┐                     │
│ │ [    Type here...    ]  │                     │
│ └─────────────────────────┘                     │
└─────────────────────────────────────────────────┘
```

#### Key Features

- Question number badge (red)
- Word limit guidance badge
- Text prompt with blank line
- Text input field
- Max length: 50 characters

#### Rendered HTML

```jsx
<div className="question-gap-fill">
  <div className="question-header">
    <span className="question-number">Q1</span>
    <span className="word-limit-badge">ONE WORD AND/OR A NUMBER</span>
  </div>
  <div className="question-content">
    <p className="gap-fill-prompt">The garage has 1__________</p>
    <input
      type="text"
      className="answer-input gap-fill-input"
      placeholder="Type your answer..."
    />
  </div>
</div>
```

#### CSS Classes

- `.question-gap-fill` - Main container
- `.question-number` - Red question number
- `.word-limit-badge` - Red/light badge
- `.gap-fill-prompt` - Question text
- `.gap-fill-input` - Text input field

#### Styling Details

| Property     | Value                           |
| ------------ | ------------------------------- |
| Background   | #ffffff (light), #2d2d2d (dark) |
| Border       | 1px solid #e0e0e0 (light)       |
| Padding      | 20px                            |
| Radius       | 8px                             |
| Input Height | 40px                            |
| Input Border | 2px solid on focus              |
| Focus Color  | #dc2626 (red)                   |

---

### Type 2: MULTIPLE CHOICE (Single Answer)

#### What It Is

Students select one correct answer from three options (A, B, or C).

#### Visual Structure

```
┌──────────────────────────────────────────────────────┐
│ Q11  [Multiple Choice Badge]                         │
├──────────────────────────────────────────────────────┤
│ How did the company begin?                           │
│                                                       │
│ ○ A  A young carpenter started selling his work     │
│ ○ B  A young woodcutter decided to change his job   │
│ ○ C  A young furniture salesman decided to switch   │
│      to manufacturing.                               │
│                                                       │
│ (Selected option shows: ◉ B with red border/bg)     │
└──────────────────────────────────────────────────────┘
```

#### Key Features

- Question number badge (red)
- Question type badge (blue) - "Multiple Choice"
- Question text
- Three radio button options
- Option letters (A, B, C) in red
- Option text follows letter
- Selected state: red border + light red background

#### Rendered HTML

```jsx
<div className="question-multiple-choice">
  <div className="question-header">
    <span className="question-number">Q11</span>
    <span className="question-type-badge">Multiple Choice</span>
  </div>
  <div className="question-content">
    <p className="multiple-choice-question">How did the company begin?</p>
    <div className="options-container">
      {/* For each option: */}
      <label className="option-label selected">
        <input type="radio" name="question-11" value="A" checked />
        <span className="option-letter">A</span>
        <span className="option-text">
          A young carpenter started selling his work
        </span>
      </label>
      {/* B and C options follow same pattern */}
    </div>
  </div>
</div>
```

#### CSS Classes

- `.question-multiple-choice` - Main container
- `.question-number` - Red question number
- `.question-type-badge` - Blue type badge
- `.multiple-choice-question` - Question text
- `.options-container` - Flex container for options
- `.option-label` - Individual option wrapper
- `.option-letter` - A, B, C letter
- `.option-text` - Option content
- `.option-label.selected` - Selected state

#### Styling Details

| Property        | Value                              |
| --------------- | ---------------------------------- |
| Option Height   | ~50px (with padding)               |
| Option Border   | 2px solid #e5e7eb                  |
| Option Hover    | Border #dc2626, bg #fef2f2         |
| Option Selected | Border #dc2626, bg #fee2e2, shadow |
| Letter Color    | #dc2626 (red)                      |
| Text Color      | #0f1419 (dark)                     |
| Hover Shadow    | 0 4px 12px rgba(220, 38, 38, 0.1)  |

#### Interactive States

| State    | Visual                           |
| -------- | -------------------------------- |
| Normal   | Light border, light bg           |
| Hover    | Red border, light red bg         |
| Selected | Red border, light red bg, shadow |
| Focus    | Outline on radio button          |

---

### Type 3: MATCHING (Selection from List)

#### What It Is

Students match items from one column to options in another using a dropdown.

#### Visual Structure

```
┌──────────────────────────────────────────────────────┐
│ Q21  [Matching Badge]                                │
├──────────────────────────────────────────────────────┤
│ Philip May                                           │
│ Choose from letters A-G                             │
│                                                       │
│ ┌────────────────────────────────┐                  │
│ │ -- Select an option --       ▼ │                  │
│ └────────────────────────────────┘                  │
│                                                       │
│ ┌────────────────────────────────┐                  │
│ │ ✓ Answer: A                    │                  │
│ │   (Green box, when selected)    │                  │
│ └────────────────────────────────┘                  │
└──────────────────────────────────────────────────────┘
```

#### Key Features

- Question number badge (red)
- Question type badge (blue) - "Matching"
- Item to match (e.g., "Philip May")
- Instruction text (italicized, gray)
- Dropdown select element
- Options as "A IT", "B absenteeism", etc.
- Answer preview box (green) when selected

#### Rendered HTML

```jsx
<div className="question-matching">
  <div className="question-header">
    <span className="question-number">Q21</span>
    <span className="question-type-badge">Matching</span>
  </div>
  <div className="question-content">
    <p className="matching-question">Philip May</p>
    <p className="matching-instruction">Choose from letters A-G</p>
    <select className="answer-select matching-select">
      <option value="">-- Select an option --</option>
      <option value="A">A IT</option>
      <option value="B">B absenteeism</option>
      {/* ... more options */}
    </select>
    {/* Answer preview shows when selected: */}
    <div className="answer-preview">
      Answer: <strong>A</strong>
    </div>
  </div>
</div>
```

#### CSS Classes

- `.question-matching` - Main container
- `.question-number` - Red question number
- `.question-type-badge` - Blue type badge
- `.matching-question` - Item to match text
- `.matching-instruction` - Instruction (italic, gray)
- `.answer-select` / `.matching-select` - Dropdown element
- `.answer-preview` - Green answer preview box

#### Styling Details

| Property            | Value                     |
| ------------------- | ------------------------- |
| Dropdown Height     | 40px                      |
| Dropdown Border     | 2px solid #d1d5db         |
| Dropdown Focus      | Border #dc2626, shadow    |
| Preview BG          | #ecfdf5 (light green)     |
| Preview Border-Left | 4px solid #10b981 (green) |
| Preview Text        | #065f46 (dark green)      |
| Instruction Color   | #6b7280 (gray)            |
| Instruction Style   | italic                    |

#### Interactive States

| State    | Visual                                   |
| -------- | ---------------------------------------- |
| Closed   | Dropdown shows placeholder               |
| Open     | Dropdown expands with options            |
| Selected | Option highlighted, preview shows answer |
| Focus    | Red border, shadow on dropdown           |

---

## Comparison Table

| Feature        | Gap Fill    | Multiple Choice | Matching  |
| -------------- | ----------- | --------------- | --------- |
| Input Type     | Text        | Radio Button    | Dropdown  |
| Options        | N/A         | 3 (A, B, C)     | 7-8 (A-G) |
| Display        | Input field | Radio buttons   | Dropdown  |
| Answer Type    | String      | Letter          | Letter    |
| Word Limit     | Yes         | No              | No        |
| Type Badge     | No          | Yes             | Yes       |
| Answer Preview | No          | No              | Yes       |
| Max Length     | 50          | N/A             | N/A       |

---

## Dark Theme Variants

### Light Theme (Default)

```
Background: #ffffff
Text: #0f1419
Accent: #dc2626
Border: #e0e0e0
```

### Dark Theme

```
Background: #2d2d2d
Text: #f1f3f4
Accent: #ff5252
Border: #404040
```

**All question types have complete dark theme coverage** ✅

---

## Theme Color Reference

### Light Theme

| Element      | Color      | Hex                    |
| ------------ | ---------- | ---------------------- |
| Background   | White      | #ffffff                |
| Container BG | White      | #ffffff                |
| Text         | Dark       | #0f1419                |
| Accent       | Red        | #dc2626                |
| Border       | Light Gray | #e0e0e0                |
| Hover BG     | Light Red  | #fef2f2                |
| Selected BG  | Light Red  | #fee2e2                |
| Focus Shadow | Red        | rgba(220, 38, 38, 0.1) |
| Instruction  | Gray       | #6b7280                |
| Preview BG   | Green      | #ecfdf5                |
| Preview Text | Dark Green | #065f46                |

### Dark Theme

| Element      | Color       | Hex                     |
| ------------ | ----------- | ----------------------- |
| Background   | Dark        | #121212                 |
| Container BG | Dark Gray   | #2d2d2d                 |
| Text         | Light       | #f1f3f4                 |
| Accent       | Orange Red  | #ff5252                 |
| Border       | Gray        | #404040                 |
| Hover BG     | Dark Red    | #3f3f3f                 |
| Selected BG  | Dark Red    | #5c2d2d                 |
| Focus Shadow | Orange Red  | rgba(255, 82, 82, 0.15) |
| Instruction  | Light Gray  | #a0aec0                 |
| Preview BG   | Dark Green  | #064e3b                 |
| Preview Text | Light Green | #d1fae5                 |

---

## Accessibility Features

### Gap Fill

✅ Proper `<input>` element  
✅ Placeholder text  
✅ Keyboard accessible  
✅ Clear focus state  
✅ Label association

### Multiple Choice

✅ Proper `<input type="radio">` elements  
✅ Associated `<label>` elements  
✅ Keyboard navigation (arrow keys)  
✅ Clear focus and selected states  
✅ Color + visual indicators

### Matching

✅ Proper `<select>` element  
✅ Semantic `<option>` elements  
✅ Keyboard accessible  
✅ Clear focus state  
✅ Answer preview for confirmation

---

## Responsive Behavior

All question types:

- ✅ Adapt to screen size
- ✅ Maintain readability on mobile
- ✅ Touch-friendly on tablets
- ✅ Desktop optimized
- ✅ Flexible layouts using flexbox

---

## Component Hierarchy

```
<ListeningTestDashboard>
  ├── <header className="test-header">
  ├── <div className="test-container">
  │   ├── <div className="test-instructions">
  │   ├── <div className="questions-section">
  │   │   ├── renderQuestion(gap_fill)
  │   │   │   └── <div className="question-gap-fill">
  │   │   │       ├── <div className="question-header">
  │   │   │       └── <div className="question-content">
  │   │   ├── renderQuestion(multiple_choice)
  │   │   │   └── <div className="question-multiple-choice">
  │   │   │       ├── <div className="question-header">
  │   │   │       └── <div className="question-content">
  │   │   │           └── <div className="options-container">
  │   │   │               └── <label className="option-label">
  │   │   └── renderQuestion(matching)
  │   │       └── <div className="question-matching">
  │   │           ├── <div className="question-header">
  │   │           └── <div className="question-content">
  │   │               ├── <select className="matching-select">
  │   │               └── <div className="answer-preview">
  │   ├── <div className="navigation-buttons">
  │   └── <div className="test-bottom-nav">
  └── </ListeningTestDashboard>
```

---

## CSS Organization

```css
/* Question Types (Lines 540-810) */

1. Gap Fill Styles (Lines 545-615)
   - .question-gap-fill
   - .gap-fill-prompt
   - .gap-fill-input
   - .word-limit-badge
   - Dark theme variants

2. Multiple Choice Styles (Lines 620-745)
   - .question-multiple-choice
   - .multiple-choice-question
   - .options-container
   - .option-label
   - .option-letter
   - .option-text
   - Dark theme variants

3. Matching Styles (Lines 750-810)
   - .question-matching
   - .matching-question
   - .matching-instruction
   - .answer-select
   - .matching-select
   - .answer-preview
   - Dark theme variants
```

---

**All Question Types Ready for Production** ✅
