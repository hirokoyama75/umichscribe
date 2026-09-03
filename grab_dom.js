const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const wsUrl = 'ws://127.0.0.1:65332/devtools/browser/5ca75bf4-4770-40b2-a82d-fc196c0ac897';
    const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
    const pages = await browser.pages();
    for (const page of pages) {
      const url = page.url();
      if (url.includes('leccap.engin')) {
        console.log("Found LeeCap tab:", url);
        
        // Save the DOM
        const html = await page.content();
        const fs = require('fs');
        fs.writeFileSync('leccap_dom.html', html);
        console.log("Saved DOM to leccap_dom.html");
      }
    }
    await browser.disconnect();
  } catch (e) {
    console.error(e);
  }
})();
