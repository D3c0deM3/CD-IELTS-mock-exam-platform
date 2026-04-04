const fs = require('fs');
const path = 'server/routes/materials.js';
let code = fs.readFileSync(path, 'utf8');

// The replacement logic:
const newLogic = `
            // Special fix for visual structures that encapsulate question group level types
            if (obj.visual_structure) {
               const vs = obj.visual_structure;
               if (vs.question_groups) {
                   vs.question_groups.forEach(group => {
                       if (group.type && typeMap[group.type]) {
                           group.type = typeMap[group.type];
                       }
                   });
               }
               
               // Let's normalize the new extraction structure to the legacy frontend structure
               // The frontend supports: "structured_notes", "form", "mixed"
               
               if (vs.type === 'note_completion' || vs.type === 'summary_completion' || vs.type === 'table_completion' || vs.layout === 'form' || vs.layout === 'structured_notes') {
                   // Convert to structured_notes
                   vs.type = 'structured_notes';
                   
                   if (!vs.sections || vs.sections.length === 0) {
                       if (vs.items && vs.items.length > 0) {
                           // Try to parse items and extract question IDs if it's just strings
                           const convertedItems = vs.items.map(itemStr => {
                               if (typeof itemStr === 'string') {
                                   const match = itemStr.match(/(\\d+)\\s*(?:\\.{2,}|…+|_{2,})/);
                                   const qId = match ? parseInt(match[1]) : null;
                                   return {
                                       type: qId ? "question" : "text",
                                       question_id: qId,
                                       content: itemStr
                                   };
                               }
                               return itemStr;
                           });
                           
                           vs.sections = [{
                               title: "",
                               items: convertedItems
                           }];
                       }
                   }
               }
               
               if (vs.type && typeMap[vs.type]) {
                   // If there's a different mapping
                   vs.type = typeMap[vs.type];
               }
            }
`;

code = code.replace(/\/\/ Special fix for visual structures that encapsulate question group level types[\s\S]*?obj\.visual_structure\.type = typeMap\[obj\.visual_structure\.type\];\n            \}/m, newLogic.trim());

fs.writeFileSync(path, code);
console.log('materials.js patched successfully');
