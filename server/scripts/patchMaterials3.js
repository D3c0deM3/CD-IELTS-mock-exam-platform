const fs = require('fs');
const file = '/home/shokhrukh/Desktop/Projects/CD_mock/server/routes/materials.js';
let data = fs.readFileSync(file, 'utf8');

const regex = /const content = JSON\.parse\(rows\[0\]\.content_json\);(\r?\n)\s*res\.json\(\{ content \}\);/;

if (data.match(regex)) {
  fs.writeFileSync(file, data.replace(regex, `let content = JSON.parse(rows[0].content_json);

      // Auto-normalize db formats to client expectations
      if (content && content.sections) {
        const normalizedSections = [];
        
        // 1. Listening
        const listeningSections = content.sections.filter(s => s.type === 'listening');
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
        const readingSections = content.sections.filter(s => s.type === 'reading');
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
        const writingSections = content.sections.filter(s => s.type === 'writing');
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
          'summary_completion': 'gap_fill',
          'form_completion': 'gap_fill',
          'table_completion': 'gap_fill',
          'map_labelling': 'matching',
          'diagram_labeling': 'matching',
          'matching_features': 'matching',
          'matching_information': 'matching',
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
            if (obj.type === 'matching' && obj.options && (!obj.statement && !obj.prompt) && obj.question) {
               obj.statement = obj.question;
            }
            if (obj.type === 'gap_fill' && !obj.prompt && obj.question) {
               obj.prompt = obj.question;
            }
            Object.keys(obj).forEach(k => normalizeQuestions(obj[k]));
          }
        };

        normalizeQuestions(normalizedSections);
        content.sections = normalizedSections;
      }

      res.json({ content });`));
  console.log('patched');
} else {
  console.log('not matched');
}
