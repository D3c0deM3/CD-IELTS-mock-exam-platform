const fs = require('fs');
const path = 'client/src/pages/WritingTestDashboard.js';
let code = fs.readFileSync(path, 'utf8');

const mapDataLogic = `
              {currentTask.map_data && currentTask.map_data.maps && (
                <div className="dual-maps-container" style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                  {currentTask.map_data.maps.map((map, i) => (
                    <div key={i} className="map-box" style={{ flex: 1, border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                      <h4 style={{textAlign: 'center', marginBottom: '10px'}}>{map.title}</h4>
                      {map.compass && <p style={{textAlign: 'right', fontWeight: 'bold', margin: '0 0 10px 0'}}>N: {map.compass.N}, W: {map.compass.W}, E: {map.compass.E}, S: {map.compass.S}</p>}
                      <ul style={{ paddingLeft: '20px' }}>
                        {map.features && map.features.map((feature, j) => (
                          <li key={j} style={{marginBottom: '5px'}}><strong>{feature.label}</strong>: {feature.position}</li>
                        ))}
                        {map.layout && map.layout.map((item, j) => (
                          <li key={'l'+j} style={{marginBottom: '5px'}}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
`;

code = code.replace(/\{currentTask\.visual_content && currentTask\.visual_content\.type !== "dual_maps"[\s\S]*?<\/div>\n              \)\}/, match => match + '\n' + mapDataLogic);

fs.writeFileSync(path, code);
console.log('WritingTestDashboard.js patched to support map_data property');
