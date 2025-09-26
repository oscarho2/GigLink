// Utility text formatters

/**
 * Format a location string with sensible capitalization.
 * - Title-cases normal words
 * - Forces common acronyms (e.g., UK, USA, US, UAE, EU, NYC) to uppercase
 * - Preserves punctuation and hyphenation
 *
 * @param {string} value
 * @returns {string}
 */
export function formatLocationString(value) {
  if (typeof value !== 'string') return value;
  const str = value.trim();
  if (!str) return str;

  const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
  const CA_PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];
  const AU_STATES = ['NSW','VIC','QLD','SA','WA','TAS','ACT','NT'];
  const COMMON = ['UK', 'GB', 'USA', 'US', 'UAE', 'EU', 'NYC'];
  const ACRONYMS = new Set([...COMMON, ...US_STATES, ...CA_PROVINCES, ...AU_STATES]);

  const toTitle = (word) => {
    if (!word) return word;
    const upper = word.toUpperCase();
    if (ACRONYMS.has(upper)) return upper;
    // Preserve internal punctuation by title-casing alpha sequences split by hyphens
    return word
      .split('-')
      .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
      .join('-');
  };

  // Split by spaces but keep commas and other punctuation as-is
  return str
    .split(/(\s+)/) // keep whitespace tokens
    .map((token) => {
      // Skip pure whitespace
      if (/^\s+$/.test(token)) return token;
      // For tokens that include commas or slashes, title each alpha chunk
      return token
        .split(/([,/])/)
        .map((sub) => {
          if (sub === ',' || sub === '/') return sub;
          // Further split by apostrophes to handle cases like St. John's
          return sub
            .split("'")
            .map((s) => toTitle(s))
            .join("'");
        })
        .join('');
    })
    .join('');
}
