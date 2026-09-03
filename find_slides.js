const fs = require('fs');
const html = fs.readFileSync('leccap_dom.html', 'utf8');

// Find all matches of class names containing 'slide'
const classMatches = html.match(/class="[^"]*slide[^"]*"/ig);
if (classMatches) {
  const uniqueClasses = [...new Set(classMatches)];
  console.log("Classes with 'slide':", uniqueClasses);
}

// See if we can find a slide element
const match = html.match(/<[^>]*class="[^"]*slide[^"]*"[^>]*>.*?<\/[^>]*>/i);
if (match) {
  console.log("Example slide element:", match[0].substring(0, 300));
}
