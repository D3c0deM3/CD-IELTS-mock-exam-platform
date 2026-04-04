const fs = require('fs');
const path = 'client/src/pages/WritingTestDashboard.js';
let code = fs.readFileSync(path, 'utf8');

const visualLogic = `
              {currentTask.visual_content && currentTask.visual_content.type === "dual_maps" && (
                <div className="dual-maps-container" style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                  {currentTask.visual_content.maps.map((map, i) => (
                    <div key={i} className="map-box" style={{ flex: 1, border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                      <h4 style={{textAlign: 'center', marginBottom: '10px'}}>{map.title}</h4>
                      {map.compass && <p style={{textAlign: 'right', fontWeight: 'bold', margin: '0 0 10px 0'}}>{map.compass}</p>}
                      <ul style={{ paddingLeft: '20px' }}>
                        {map.layout && map.layout.map((item, j) => (
                          <li key={j} style={{marginBottom: '5px'}}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              {currentTask.visual_content && currentTask.visual_content.type !== "dual_maps" && (
                <div className="generic-visual-content" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', border: '1px solid #ddd' }}>
                   <pre style={{whiteSpace: 'pre-wrap', fontFamily: 'inherit'}}>{JSON.stringify(currentTask.visual_content, null, 2)}</pre>
                </div>
              )}
`;

code = code.replace(/\{currentTask\.type === "graph_description" && currentTask\.graph_data && \([\s\S]*?<\/div>[\s\S]*?\)\}/, match => match + '\n' + visualLogic);

fs.writeFileSync(path, code);
console.log('WritingTestDashboard.js patched with visual visuals support');
