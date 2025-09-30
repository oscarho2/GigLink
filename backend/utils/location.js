// Utility helpers for normalizing location strings consistently across the app

function titleCaseSegment(seg) {
  // Lowercase then uppercase first letters, handling hyphens and apostrophes
  return seg
    .toLowerCase()
    .split(/([\s\-'])/) // keep delimiters
    .map((part, index, arr) => {
      if (/^[\s\-']$/.test(part)) return part; // keep delimiters as is
      const isApostropheSuffix = index > 0 && arr[index - 1] === "'";
      if (isApostropheSuffix) return part; // keep suffix such as "s" lower-case
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('')
    .trim();
}

// Normalize a free-form location string to a consistent "City, Region, Country" style
function normalizeLocation(input) {
  if (!input || typeof input !== 'string') return '';

  // Trim, collapse whitespace, normalize commas
  let s = input
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();

  // Remove trailing comma
  s = s.replace(/,+$/, '').trim();

  if (!s) return '';

  // Split into segments and title-case each
  const parts = s.split(',').map(p => titleCaseSegment(p.trim())).filter(Boolean);

  // Deduplicate adjacent duplicate segments (e.g., "London, London, United Kingdom")
  const deduped = [];
  for (const part of parts) {
    const last = deduped[deduped.length - 1];
    if (!last || last.toLowerCase() !== part.toLowerCase()) deduped.push(part);
  }

  return deduped.join(', ');
}

module.exports = { normalizeLocation };
