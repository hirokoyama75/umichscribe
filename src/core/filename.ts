export function sanitizeFilename(name: string): string {
  // Replace invalid characters for Windows, macOS, Linux
  let sanitized = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '-');
  
  // Normalizing repeated whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Exclude reasonable length
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100).trim();
  }
  
  // Avoid Windows reserved filenames (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  if (reserved.test(sanitized)) {
    sanitized = `file-${sanitized}`;
  }

  return sanitized || 'lecture-transcript';
}

export function generateFilename(
  title: string | undefined, 
  courseName: string | undefined,
  date: string | undefined, 
  mode: 'transcript' | 'ai_context',
  ext: 'md' | 'txt'
): string {
  const parts = [];
  
  if (courseName) {
    parts.push(sanitizeFilename(courseName));
  } else if (title) {
    parts.push(sanitizeFilename(title));
  }
  
  if (date) {
    parts.push(sanitizeFilename(date));
  }
  
  parts.push(mode === 'ai_context' ? 'AI Context' : 'Transcript');
  
  let base = parts.join(' - ');
  
  if (parts.length === 1 && !title && !date) {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    base = `lecture-transcript-${now.getFullYear()}-${mm}-${dd}-${hh}${min}`;
  }

  return `${base}.${ext}`;
}
