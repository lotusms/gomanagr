/**
 * Document ID format: [Organization3DigitPrefix]-[Prefix]-[YYYYMMDD]-[SEQUENCE]
 * Example: STA-PROP-20260303-002
 *
 * Sequence is unique per (org prefix + document prefix + date). Different orgs or
 * different document types may reuse the same sequence number.
 */

/** Document type prefixes for IDs (3–4 chars, uppercase) */
export const DOCUMENT_ID_PREFIX = {
  PROP: 'PROP',   // Proposals
  QUO: 'QUO',     // Quotes (use proposals; kept for reference)
  INV: 'INV',     // Invoices
  SAL: 'SAL',     // Sales receipts
  CON: 'CON',     // Contracts
  PROJ: 'PROJ',   // Projects
  SERV: 'SERV',   // Services
  CLI: 'CLI',     // Clients
  APP: 'APP',     // Appointments
};

/** Regex for our structured ID: ORG-PREFIX-YYYYMMDD-NNN (sequence min 1 digit, typically 3) */
const DOC_ID_REGEX = /^([A-Z]{3})-([A-Z]{3,4})-(\d{8})-(\d+)$/;

/**
 * Format a document ID from parts.
 * @param {string} orgPrefix - 3-letter org prefix (e.g. 'STA', 'LOT')
 * @param {string} docPrefix - Document type prefix (e.g. 'PROP', 'INV')
 * @param {string} date - YYYYMMDD or YYYY-MM-DD
 * @param {number} sequence - Integer (will be zero-padded to 3 digits)
 * @returns {string} e.g. 'STA-PROP-20260303-002'
 */
export function formatDocumentId(orgPrefix, docPrefix, date, sequence) {
  const org = String(orgPrefix || '').trim().toUpperCase().slice(0, 3).padEnd(3, 'X');
  const prefix = String(docPrefix || '').trim().toUpperCase();
  const dateStr = String(date || '').replace(/-/g, '').slice(0, 8);
  const seq = Math.max(0, parseInt(sequence, 10) || 0);
  const seqStr = String(seq).padStart(3, '0');
  return `${org}-${prefix}-${dateStr}-${seqStr}`;
}

/**
 * Parse a document ID string into parts.
 * @param {string} id - e.g. 'STA-PROP-20260303-002'
 * @returns {{ orgPrefix: string, docPrefix: string, date: string, sequence: number } | null} Parsed parts or null if not our format
 */
export function parseDocumentId(id) {
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

/**
 * Check if a string looks like our structured document ID.
 * @param {string} id
 * @returns {boolean}
 */
export function isStructuredDocumentId(id) {
  return parseDocumentId(id) !== null;
}
