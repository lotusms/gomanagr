/**
 * Server-side document ID helpers (same logic as utils/documentIds.js for use in API routes).
 * Format: [Organization3DigitPrefix]-[Prefix]-[YYYYMMDD]-[SEQUENCE]
 */

const DOC_ID_REGEX = /^([A-Z]{3})-([A-Z]{3,4})-(\d{8})-(\d+)$/;

function formatDocumentId(orgPrefix, docPrefix, date, sequence) {
  const org = String(orgPrefix || '').trim().toUpperCase().slice(0, 3).padEnd(3, 'X');
  const prefix = String(docPrefix || '').trim().toUpperCase();
  const dateStr = String(date || '').replace(/-/g, '').slice(0, 8);
  const seq = Math.max(0, parseInt(sequence, 10) || 0);
  const seqStr = String(seq).padStart(3, '0');
  return `${org}-${prefix}-${dateStr}-${seqStr}`;
}

function parseDocumentId(id) {
  if (!id || typeof id !== 'string') return null;
  const trimmed = id.trim();
  const match = trimmed.match(DOC_ID_REGEX);
  if (!match) return null;
  return {
    orgPrefix: match[1],
    docPrefix: match[2],
    date: match[3],
    sequence: parseInt(match[4], 10),
  };
}

module.exports = { formatDocumentId, parseDocumentId };
