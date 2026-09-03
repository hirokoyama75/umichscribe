import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ExtractionResult, FormattingOptions } from './types';
import { formatTime } from './formatting';

async function fetchImageBytes(url: string): Promise<ArrayBuffer | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    return await resp.arrayBuffer();
  } catch (e) {
    console.warn("Could not fetch slide image for PDF:", url, e);
    return null;
  }
}

// Parallel worker pool to download images with high concurrency
async function fetchAllImagesParallel(
  urls: (string | undefined)[],
  concurrency = 8,
  onBatchProgress?: (completed: number, total: number) => void
): Promise<(ArrayBuffer | null)[]> {
  const results: (ArrayBuffer | null)[] = new Array(urls.length).fill(null);
  let currentIndex = 0;
  let completed = 0;

  async function worker() {
    while (currentIndex < urls.length) {
      const idx = currentIndex++;
      const url = urls[idx];
      if (url) {
        results[idx] = await fetchImageBytes(url);
      }
      completed++;
      if (onBatchProgress) onBatchProgress(completed, urls.length);
    }
  }

  const poolSize = Math.max(1, Math.min(concurrency, urls.length));
  const workers = Array.from({ length: poolSize }, () => worker());
  await Promise.all(workers);
  return results;
}

// Helper to wrap text lines to fit a max point width
function wrapText(text: string, maxPoints: number, font: any, fontSize: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth <= maxPoints) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function generatePdf(
  result: ExtractionResult,
  options: FormattingOptions,
  onProgress?: (current: number, total: number, phase?: 'fetching' | 'compiling') => void
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // A4 Page dimensions: 595.28 x 841.89 points
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 42; // ~15mm
  const contentWidth = pageWidth - margin * 2; // ~511 points

  // Pre-sort markers and segments
  const markers = [...result.markers].sort((a, b) => a.start - b.start);
  const segments = [...result.segments].sort((a, b) => a.start - b.start);

  const docTitle = result.courseName
    ? `${result.courseName} - ${result.lectureTitle || 'Lecture'}`
    : result.lectureTitle || 'Lecture Transcript';

  if (options.mode === 'transcript' || markers.length === 0) {
    // Linear continuous transcript mode
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;

    // Title
    page.drawText(docTitle, {
      x: margin,
      y: currentY - 18,
      size: 18,
      font: fontBold,
      color: rgb(0 / 255, 39 / 255, 76 / 255) // Deep Navy
    });
    currentY -= 36;

    // Subtitle
    const meta = `Date: ${result.recordingDate || 'N/A'}  |  Cues: ${segments.length}`;
    page.drawText(meta, {
      x: margin,
      y: currentY,
      size: 10,
      font: fontRegular,
      color: rgb(100 / 255, 116 / 255, 139 / 255)
    });
    currentY -= 16;

    // Divider
    page.drawLine({
      start: { x: margin, y: currentY },
      end: { x: margin + contentWidth, y: currentY },
      thickness: 1,
      color: rgb(226 / 255, 232 / 255, 240 / 255)
    });
    currentY -= 20;

    for (const seg of segments) {
      const timePrefix = options.includeTimestamps ? `[${formatTime(seg.start)}] ` : '';
      const fullText = `${timePrefix}${seg.text}`;
      const lines = wrapText(fullText, contentWidth, fontRegular, 10);

      for (const line of lines) {
        if (currentY < margin + 20) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin;
        }
        page.drawText(line, {
          x: margin,
          y: currentY,
          size: 10,
          font: fontRegular,
          color: rgb(30 / 255, 41 / 255, 59 / 255)
        });
        currentY -= 14;
      }
      currentY -= 4;
    }
  } else {
    // AI Context Mode: Pre-fetch all images concurrently with worker pool
    const totalSlides = markers.length;
    const imageUrls = markers.map(m => m.imageUrl);

    const fetchedImages = await fetchAllImagesParallel(imageUrls, 8, (completed, total) => {
      if (onProgress) onProgress(completed, total, 'fetching');
    });

    for (let i = 0; i < markers.length; i++) {
      const marker = markers[i];
      const nextMarker = markers[i + 1];
      const slideNum = i + 1;

      if (onProgress) {
        onProgress(slideNum, totalSlides, 'compiling');
      }

      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let currentY = pageHeight - margin;

      // First Page Title Header
      if (i === 0) {
        page.drawText(docTitle, {
          x: margin,
          y: currentY - 16,
          size: 16,
          font: fontBold,
          color: rgb(0 / 255, 39 / 255, 76 / 255)
        });
        currentY -= 28;

        const meta = `Date: ${result.recordingDate || 'N/A'}  |  Slides: ${markers.length}  |  Cues: ${segments.length}`;
        page.drawText(meta, {
          x: margin,
          y: currentY,
          size: 9.5,
          font: fontRegular,
          color: rgb(100 / 255, 116 / 255, 139 / 255)
        });
        currentY -= 14;

        page.drawLine({
          start: { x: margin, y: currentY },
          end: { x: margin + contentWidth, y: currentY },
          thickness: 0.75,
          color: rgb(226 / 255, 232 / 255, 240 / 255)
        });
        currentY -= 18;
      }

      // Slide Title & Timestamp Badge
      const headerTitle = `${marker.title || `Slide ${slideNum}`} [${formatTime(marker.start)}]`;
      page.drawText(headerTitle, {
        x: margin,
        y: currentY,
        size: 13,
        font: fontBold,
        color: rgb(0 / 255, 39 / 255, 76 / 255)
      });
      currentY -= 18;

      // Embed Pre-Fetched Slide Image
      const imgBytes = fetchedImages[i];
      if (imgBytes) {
        try {
          const img = await pdfDoc.embedJpg(imgBytes);
          const imgWidth = contentWidth;
          const imgHeight = (contentWidth * 3) / 4; // ~383 points

          page.drawImage(img, {
            x: margin,
            y: currentY - imgHeight,
            width: imgWidth,
            height: imgHeight
          });
          currentY -= (imgHeight + 16);
        } catch (err) {
          console.warn("pdf-lib embed image error:", err);
        }
      }

      // Collect speech cues belonging to this slide
      const slideSegments = segments.filter(s => {
        if (nextMarker) {
          return s.start >= marker.start && s.start < nextMarker.start;
        }
        return s.start >= marker.start;
      });

      // Render Cues
      if (slideSegments.length > 0) {
        for (const seg of slideSegments) {
          const timePrefix = options.includeTimestamps ? `[${formatTime(seg.start)}] ` : '';
          const fullText = `${timePrefix}${seg.text}`;
          const lines = wrapText(fullText, contentWidth, fontRegular, 9.5);

          for (const line of lines) {
            if (currentY < margin + 15) {
              page = pdfDoc.addPage([pageWidth, pageHeight]);
              currentY = pageHeight - margin;
            }
            page.drawText(line, {
              x: margin,
              y: currentY,
              size: 9.5,
              font: fontRegular,
              color: rgb(30 / 255, 41 / 255, 59 / 255)
            });
            currentY -= 13;
          }
          currentY -= 3;
        }
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
