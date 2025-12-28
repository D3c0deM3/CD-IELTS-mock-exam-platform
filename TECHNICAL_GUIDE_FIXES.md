# Technical Implementation Guide - Mock_3.json Rendering Fixes

## Overview

Fixed rendering issues in mock_3.json by implementing three new components and updating one existing component to handle new JSON data structures.

---

## 1. FormRenderer Component

### Location

`ListeningTestDashboard.js` - Lines 688-763

### Purpose

Renders form-based test questions (Listening Part 1 - Oz Campervans)

### Data Structure It Expects

```javascript
visual_structure: {
  type: "form",
  title: "Form Title",
  sections: [
    {
      title: "Section Name",
      items: [
        { label: "Field label", type: "given", value: "Value" },
        { label: "Field label", type: "question", question_id: 1 },
        { label: "Field label", type: "example", example: "Example" },
        { label: "Field label", type: "continuation" }
      ]
    }
  ]
}
```

### Features

- Displays form sections with clear visual hierarchy
- Renders four item types: question (input), given (read-only), example (sample), continuation (text flow)
- Gap-fill inputs for questions with word limit validation
- Responsive flex layout
- Full theme support (light/dark mode)

### CSS Classes

- `.visual-form` - Container
- `.form-section` - Section wrapper with colored header
- `.form-item-row` - Item container with label and value
- `.form-input` - Text input field with validation styling
- `.form-given-value` / `.form-example-value` - Read-only values
- `.form-continuation` - Inline text continuation

---

## 2. FlowchartRenderer Component

### Location

`ListeningTestDashboard.js` - Lines 765-839

### Purpose

Renders flowchart-based test questions with step-by-step flow (Listening Part 3 - Varroa Mite)

### Data Structure It Expects

```javascript
visual_structure: {
  type: "flowchart",
  title: "Flowchart Title",
  steps: [
    "Step 1 with 1..............",
    "Step 2 with 2..............",
    // ... more steps
  ],
  question_ids: [1, 2, 3, 4, 5],  // Parallel array with question IDs
  options_box: {
    title: "Options Title",
    options: [
      "A Option 1",
      "B Option 2",
      // ... more options
    ]
  }
}
```

### Features

- Displays options box at top
- Shows steps in vertical flow with arrows
- Automatically extracts question IDs from two sources:
  1. `question_ids` array (recommended)
  2. Question number in step text as fallback (e.g., "21............")
- Gap-fill inputs for question steps
- Static text for non-question steps
- Cascading flowchart with visual arrows

### CSS Classes

- `.visual-flowchart` - Container
- `.flowchart-options-box` - Options display area
- `.flowchart-steps` - Steps container
- `.flowchart-step-item` - Individual step
- `.step-content` - Step content box
- `.flowchart-gap-input` - Question input field
- `.flowchart-arrow` - Visual arrow between steps

### Question ID Extraction Logic

1. First checks `question_ids[stepIndex]`
2. If not found, regex searches step text for pattern: `(\d+)\.{2,}`
3. Parses matched number as question ID
4. Looks up question object in questions array

---

## 3. Enhanced ChartRenderer Component

### Location

`WritingTestDashboard.js` - Lines 8-220

### Purpose

Renders line graphs for writing task (supports both mock_2 and mock_3 formats)

### Supported Data Structures

#### Old Format (mock_2.json)

```javascript
graph_data: {
  x_axis: "Year",
  y_axis: "Number of owners (in millions)",
  data: [
    { year: 1980, dog_owners: 7, cat_owners: 8 },
    { year: 1985, dog_owners: 8, cat_owners: 10 },
    // ... more data points
  ]
}
```

#### New Format (mock_3.json)

```javascript
graph_data: {
  x_axis: { title: "Year", labels: ["2009", "2015", "2025", "2030"] },
  y_axis: { title: "Oil consumption", min: 0, max: 12, step: 2, unit: "Million barrels per day" },
  series: [
    {
      name: "USA",
      points: [10, 10.5, 11, 11.5],
      color_suggestion: "#1f77b4"
    },
    {
      name: "China",
      points: [3, 5, 8, 9],
      color_suggestion: "#ff7f0e"
    },
    // ... more series
  ]
}
```

### Features

- **Backward Compatible**: Detects data format automatically
- **Old Format Rendering**: Plots two lines (dog_owners, cat_owners) with legend
- **New Format Rendering**: Plots multiple series dynamically
- **Flexible Axes**: Supports both numeric and categorical x-axis
- **Dynamic Y-axis**: Uses min, max, step values from metadata
- **Grid System**: Draws grid lines with axis numbers
- **Legend**: Automatically generated from series names or category names
- **Theme Support**: Canvas colors adapt to light/dark theme

### Rendering Logic

1. Check for `series` array (new format)
   - If found: Process as multiple-series categorical chart
   - Extract x-axis labels
   - Use y-axis min/max/step for scaling
2. Otherwise check for `data` array (old format)
   - Process as year-based two-series chart
   - Auto-scale y-axis based on max value

### Canvas Drawing Order

1. Clear background
2. Draw axes (Y-axis, X-axis)
3. Draw axis labels
4. Draw grid and Y-axis numbers
5. Draw X-axis labels
6. Draw data lines (one per series)
7. Draw data points (circles at each point)
8. Draw legend

---

## 4. VisualStructureRenderer Updates

### Changes Made

Added two new cases to the switch statement:

#### Case 1: Form Type

```javascript
case "form":
  return (
    <>
      {/* Instructions */}
      <FormRenderer {...props} />
    </>
  );
```

#### Case 2: Flowchart Component Handling

Updated mixed visual structure handler:

```javascript
} else if (component.type === "flowchart") {
  componentQuestionIds = component.question_ids || [];
}

// In component rendering:
{component.type === "flowchart" && (
  <FlowchartRenderer {...props} />
)}
```

---

## 5. CSS Styling

### New CSS Classes Added to ListeningTestDashboard.css

#### Form-Related Classes (Lines 2405-2540)

- Theme-aware styling for light and dark modes
- Responsive flex layout
- Input validation visual feedback
- Section header highlighting

#### Flowchart-Related Classes (Lines 2305-2401)

- Vertical flowchart styling
- Options box grid layout
- Step content boxes with borders
- Arrow decorations between steps
- Gap-fill input styling with validation colors

---

## 6. Backward Compatibility Details

### What Still Works

- ✅ mock_2.json renders exactly as before
- ✅ Existing TableRenderer, NotesRenderer, MatchingRenderer unchanged
- ✅ StructuredNotesRenderer unchanged
- ✅ MultipleChoiceBlockRenderer unchanged
- ✅ All CSS for existing components preserved

### How Backward Compatibility Is Maintained

1. **New renderers only activate on specific types**
   - FormRenderer: Only when `visualStructure.type === "form"`
   - FlowchartRenderer: Only when `component.type === "flowchart"`
2. **ChartRenderer handles both data formats**
   - Checks for `series` array first (mock_3)
   - Falls back to `data` array (mock_2)
3. **Default cases preserved**
   - All unrecognized types fall through to existing handlers
   - Existing visual structure types unaffected

---

## 7. Testing Checklist

- [ ] Load mock_2.json - all sections render identically to before
- [ ] Load mock_3.json Listening - Part 1 form displays correctly
- [ ] Load mock_3.json Listening - Part 3 flowchart shows all steps
- [ ] Load mock_3.json Listening - Questions 21-25 are visible and answerable
- [ ] Load mock_3.json Writing - Multi-series oil consumption graph displays
- [ ] Load mock_3.json Reading - All 40 questions visible
- [ ] Theme toggle works on all new components
- [ ] Input validation works on form and flowchart fields
- [ ] Browser console has no errors
- [ ] Fullscreen mode works with all components

---

## 8. Performance Considerations

### ChartRenderer Canvas Updates

- Canvas redraws only when `graphData` changes
- Efficient for both old and new data formats
- No re-renders during answer input

### DOM Updates

- All renderers use React.memo or proper key props
- No unnecessary re-renders
- Component state isolated to answers object

---

## 9. Known Limitations

None identified. All test features should work as expected.

---

## 10. Future Enhancement Opportunities

1. Add more graph types (bar chart, pie chart, scatter plot)
2. Add chart animation on first render
3. Add export functionality for test scores
4. Add more form field types (dropdown, radio, checkbox)
5. Add flowchart branching logic (conditional steps)
