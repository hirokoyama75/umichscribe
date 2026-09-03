const fs = require('fs');
const html = fs.readFileSync('leccap_dom.html', 'utf8');

const match = html.match(/<[^>]*class="[^"]*transcript[^"]*"[^>]*>.*?<\/[^>]*>/i);
if (match) {
  console.log("Example transcript element:", match[0].substring(0, 500));
} else {
  console.log("No transcript class found");
}

const match2 = html.match(/<[^>]*class="[^"]*caption[^"]*"[^>]*>.*?<\/[^>]*>/i);
if (match2) {
  console.log("Example caption element:", match2[0].substring(0, 500));
} else {
  console.log("No caption class found");
}
