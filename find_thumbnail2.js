const fs = require('fs');
const html = fs.readFileSync('leccap_dom.html', 'utf8');

const regex = /<div[^>]*class="[^"]*thumbnail[^"]*"[^>]*>.*?<\/div>\s*<\/div>/isg;
const matches = [...html.matchAll(regex)];

if (matches.length > 0) {
  for (let i=0; i<Math.min(3, matches.length); i++) {
     console.log(`--- Match ${i} ---`);
     console.log(matches[i][0]);
  }
}
