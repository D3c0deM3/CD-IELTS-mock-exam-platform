const fs = require('fs');
const file = '/home/shokhrukh/Desktop/Projects/CD_mock/client/src/pages/WritingTestDashboard.js';
let data = fs.readFileSync(file, 'utf8');

const regex = /<div className="graph-column">[\s\S]*?<\/div>\s*\{\/\*\s*RIGHT COLUMN/m;
const replacement = `<div className="graph-column">
            <div className="essay-topic-wrapper">
              <h2 className="topic-title">
                {currentTask.title || \`Task \${currentTask.task_number || ''}\`}
              </h2>
              
              {currentTask.instructions && (
                <p className="instruction-text" style={{ whiteSpace: 'pre-wrap', marginBottom: '15px' }}>
                  {currentTask.instructions}
                </p>
              )}

              {currentTask.prompt && (
                <div className="topic-text" style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '20px', padding: '15px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  {currentTask.prompt}
                </div>
              )}

              {currentTask.type === "graph_description" && currentTask.graph_data && (
                <div className="graph-wrapper">
                  <ChartRenderer key={theme} graphData={currentTask.graph_data} />
                </div>
              )}

              {currentTask.visual_content && currentTask.visual_content.type === "dual_maps" && (
                <div className="maps-wrapper" style={{ display: 'flex', gap: '20px', marginTop: '20px', flexDirection: 'column' }}>
                  {currentTask.visual_content.maps.map((mapData, idx) => (
                    <div key={idx} className="map-container" style={{ border: '1px solid var(--border-color)', padding: '15px', borderRadius: '8px' }}>
                       <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>{mapData.title}</h3>
                       <ul style={{ listStyleType: 'disc', paddingLeft: '20px' }}>
                         {mapData.layout && mapData.layout.map((item, idxx) => (
                           <li key={idxx} style={{ marginBottom: '5px' }}>{item}</li>
                         ))}
                       </ul>
                    </div>
                  ))}
                </div>
              )}

              {currentTask.questions && currentTask.questions.length > 0 && (
                <div className="topic-questions" style={{ marginTop: '20px' }}>
                  {currentTask.questions.map((q, idx) => (
                    <p key={idx} className="topic-question-item" style={{ marginBottom: '8px' }}>
                      {idx + 1}. {q}
                    </p>
                  ))}
                </div>
              )}

              <div className="task-meta" style={{ marginTop: '30px', display: 'flex', gap: '15px', color: 'var(--text-secondary)' }}>
                {(currentTask.word_limit || currentTask.requirements) && (
                  <span className="word-limit">
                    {currentTask.word_limit || currentTask.requirements}
                  </span>
                )}
                {(currentTask.time_limit || currentTask.time_recommended) && (
                  <span className="time-limit">
                    {currentTask.time_limit || currentTask.time_recommended}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN`;

if (data.match(regex)) {
  fs.writeFileSync(file, data.replace(regex, replacement));
  console.log('patched writing');
} else {
  console.log('not matched writing');
}
