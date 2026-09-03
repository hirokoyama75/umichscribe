const fs = require('fs');
const html = fs.readFileSync('leccap_dom.html', 'utf8');
const { JSDOM } = require('jsdom');
const dom = new JSDOM(html);
const document = dom.window.document;

const markers = [];
const slideElements = document.querySelectorAll('.slide, .chapter-marker, .thumbnail');
slideElements.forEach(el => {
   const timeAttr = el.getAttribute('data-time');
   let start;
   
   if (timeAttr) {
     start = parseFloat(timeAttr);
   } else if (el.classList.contains('thumbnail')) {
     const label = el.getAttribute('aria-label');
     if (label && label.startsWith('Thumbnail at')) {
       let min = 0, sec = 0, hr = 0;
       const hrMatch = label.match(/(\d+)\s*hour/);
       const minMatch = label.match(/(\d+)\s*minute/);
       const secMatch = label.match(/(\d+)\s*second/);
       if (hrMatch) hr = parseInt(hrMatch[1]);
       if (minMatch) min = parseInt(minMatch[1]);
       if (secMatch) sec = parseInt(secMatch[1]);
       start = hr * 3600 + min * 60 + sec;
     } else if (label && label.trim() === 'Thumbnail at') {
       start = 0; 
     }
   }
   
   if (start === undefined) return;
   
   const title = el.querySelector('.title, .slide-title')?.textContent?.trim();
   const text = el.querySelector('.slide-text')?.textContent?.trim();
   
   markers.push({
     start,
     type: (el.classList.contains('slide') || el.classList.contains('thumbnail')) ? 'slide' : 'chapter',
     title: title || `Slide`,
     text
   });
});

console.log("Extracted markers:", markers.slice(0, 5));
