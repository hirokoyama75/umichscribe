const fs = require('fs');
const html = fs.readFileSync('leccap_dom.html', 'utf8');

const classMatches = html.match(/class="([^"]+)"/g);
if (classMatches) {
  const uniqueClasses = [...new Set(classMatches.map(c => c.substring(7, c.length - 1)))];
  
  // filter out obvious UI components
  const filtered = uniqueClasses.filter(c => !c.includes('slider') && !c.includes('button'));
  console.log(filtered.join('\n'));
}
