const fs = require('fs');
const file = '/home/shokhrukh/Desktop/Projects/CD_mock/server/routes/materials.js';
let data = fs.readFileSync(file, 'utf8');

const regex = /const normalizeQuestions = \(obj\) => \{[\s\S]*?normalizeQuestions\(normalizedSections\);/m;
const replacement = `const normalizeQuestions = (obj) => {
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
            
            // Special fix for visual structures that encapsulate question group level types
            if (obj.visual_structure && obj.visual_structure.question_groups) {
               obj.visual_structure.question_groups.forEach(group => {
                   if (group.type && typeMap[group.type]) {
                       group.type = typeMap[group.type];
                   }
               });
            }
            if (obj.visual_structure && obj.visual_structure.type && typeMap[obj.visual_structure.type]) {
                obj.visual_structure.type = typeMap[obj.visual_structure.type];
            }
            
            Object.keys(obj).forEach(k => {
               // Don't recurse into infinite loops or unnecessary properties if not needed, but here it's simple JSON
               normalizeQuestions(obj[k]);
            });
          }
        };

        normalizeQuestions(normalizedSections);`;

if (data.match(regex)) {
  fs.writeFileSync(file, data.replace(regex, replacement));
  console.log('patched materials normalizer with visual structure types');
} else {
  console.log('regex mismatch');
}
