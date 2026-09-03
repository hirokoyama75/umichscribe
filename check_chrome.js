const http = require('http');

http.get('http://localhost:65332/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const targets = JSON.parse(data);
      const leccap = targets.find(t => t.url && t.url.includes('leccap.engin'));
      if (leccap) {
        console.log("Found LeeCap tab:", leccap.url);
        console.log("WebSocket URL:", leccap.webSocketDebuggerUrl);
      } else {
        console.log("No LeeCap tab found in targets.");
      }
    } catch (e) {
      console.error(e);
    }
  });
}).on('error', err => {
  console.error("Error connecting to Chrome:", err.message);
});
