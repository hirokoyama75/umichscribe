const fs = require('fs');
const html = fs.readFileSync('leccap_dom.html', 'utf8');

const match = html.match(/<[^>]*class="[^"]*thumbnail[^"]*"[^>]*>.*?<\/[^>]*>/i);
if (match) {
  console.log("Example thumbnail element:", match[0]);
}

// Or let's use a simple regex to grab the whole block of one thumbnail
const blockRegex = /<li[^>]*class="[^"]*thumbnail[^"]*"[^>]*>.*?<\/li>/is;
const liMatch = html.match(blockRegex);
if (liMatch) {
  console.log(liMatch[0]);
} else {
  // Maybe it's a div
  const divMatch = html.match(/<div[^>]*class="[^"]*thumbnail[^"]*"[^>]*>.*?<\/div>/is);
  if (divMatch) console.log(divMatch[0]);
}
