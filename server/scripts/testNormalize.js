const fs = require('fs');
const pool = require('../db.js');

async function test() {
  const [rows] = await pool.query('SELECT content_json FROM test_material_sets WHERE id = 4');
  let data = JSON.parse(rows[0].content_json);

  // Normalization logic
  const normalizedSections = [];
  
  // 1. Listening
  const listeningSections = data.sections.filter(s => s.type === 'listening');
  if (listeningSections.length > 0) {
    const combinedParts = [];
    listeningSections.forEach(ls => {
      if (ls.parts) {
        ls.parts.forEach(p => combinedParts.push(p));
      }
    });
    normalizedSections.push({
      type: 'listening',
      title: 'Listening',
      section_number: 1,
      total_questions: combinedParts.reduce((sum, p) => sum + (p.questions ? p.questions.length : 0), 0),
      parts: combinedParts
    });
  }

  // 2. Reading
  const readingSections = data.sections.filter(s => s.type === 'reading');
  if (readingSections.length > 0) {
    const combinedPassages = [];
    readingSections.forEach(rs => {
      if (rs.passages) {
        rs.passages.forEach(p => combinedPassages.push(p));
      }
    });
    normalizedSections.push({
        type: 'reading',
        title: 'Reading',
        section_number: 2,
        total_questions: combinedPassages.reduce((sum, p) => sum + (p.questions ? p.questions.length : 0), 0),
        passages: combinedPassages
    });
  }
  
  // 3. Writing
  const writingSections = data.sections.filter(s => s.type === 'writing');
  if (writingSections.length > 0) {
    const combinedTasks = [];
    writingSections.forEach(ws => {
      if (ws.tasks) {
        ws.tasks.forEach(t => combinedTasks.push(t));
      } else if (ws.parts) {
        ws.parts.forEach(t => combinedTasks.push(t));
      }
    });
    normalizedSections.push({
        type: 'writing',
        title: 'Writing',
        section_number: 3,
        tasks: combinedTasks
    });
  }

  // Recursive type normalization
  const typeMap = {
    'true_false_not_given': 'true_false_ng',
    'yes_no_not_given': 'yes_no_ng',
    'note_completion': 'gap_fill',
    'sentence_completion': 'gap_fill',
    'map_labelling': 'matching',
    'matching_features': 'matching',
    'matching_headings': 'paragraph_matching',
    'multiple_choice_single': 'multiple_choice'
  };

  const normalizeQuestions = (obj) => {
    if (Array.isArray(obj)) {
      obj.forEach(item => normalizeQuestions(item));
    } else if (obj !== null && typeof obj === 'object') {
      if (obj.type && typeMap[obj.type]) {
        obj.type = typeMap[obj.type];
      }
      Object.keys(obj).forEach(k => normalizeQuestions(obj[k]));
    }
  };

  normalizeQuestions(normalizedSections);
  
  console.log(JSON.stringify(normalizedSections, null, 2).substring(0, 1000));
}
test().then(() => process.exit(0)).catch(console.error);
