/**
 * Helpers for dashboard action cards: follow-ups, invoices summary, proposals pipeline, recent activity.
 */

/**
 * @param {string|number} v
 * @returns {number}
 */
export function parseAmount(v) {
  if (v == null || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

/** @returns {string} YYYY-MM-DD for today in local time */
export function todayKey() {
  return new Date().toLocaleDateString('en-CA');
}

/**
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {number} days from today (negative = past)
 */
export function daysFromToday(dateStr) {
  if (!dateStr) return 0;
  const a = new Date(dateStr + 'T12:00:00');
  const b = new Date();
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}

/**
 * Build follow-up items from invoices and proposals.
 * @param {{ invoices: Array, proposals: Array }} data
 * @param {Record<string, string>} clientNameById
 * @param {{ invoiceTermSingular?: string }} options - optional; invoiceTermSingular for industry-specific label (e.g. "Bill", "Receipt")
 * @returns {Array<{ id: string, type: 'invoice'|'proposal', reason: string, dueDate: string, clientId: string, clientName: string, resourceId: string, resourceNumber?: string }>}
 */
export function buildFollowUps(data, clientNameById = {}, options = {}) {
  const invoiceTerm = options.invoiceTermSingular || 'Invoice';
  const items = [];
  const today = todayKey();

  (data.invoices || []).forEach((inv) => {
    const status = (inv.status || '').toLowerCase();
    if (status === 'void' || status === 'paid') return;
    const due = inv.due_date || inv.date_issued;
    if (!due) return;
    const days = daysFromToday(due);
    const clientId = inv.client_id;
    const clientName = clientNameById[clientId] || 'Unknown';
    const reason = days < 0 ? `${invoiceTerm} overdue` : `${invoiceTerm} due`;
    items.push({
      id: `inv-${inv.id}`,
      type: 'invoice',
      reason,
      dueDate: due,
      days,
      clientId,
      clientName,
      resourceId: inv.id,
      resourceNumber: inv.invoice_number,
    });
  });

  (data.proposals || []).forEach((prop) => {
    const status = (prop.status || '').toLowerCase();
    if (!['sent', 'viewed'].includes(status)) return;
    const exp = prop.expiration_date;
    if (exp) {
      const days = daysFromToday(exp);
      if (days < 0) return; // expired, no follow-up
    }
    const clientId = prop.client_id;
    const clientName = clientNameById[clientId] || 'Unknown';
    items.push({
      id: `prop-${prop.id}`,
      type: 'proposal',
      reason: 'Proposal follow-up',
      dueDate: prop.expiration_date || today,
      days: exp ? daysFromToday(exp) : 0,
      clientId,
      clientName,
      resourceId: prop.id,
      resourceNumber: prop.proposal_number,
    });
  });

  items.sort((a, b) => {
    const d1 = a.days;
    const d2 = b.days;
    if (d1 !== d2) return d1 - d2;
    return (a.dueDate || '').localeCompare(b.dueDate || '');
  });

  return items.slice(0, 7);
}

/**
 * @param {{ invoices: Array }} data
 * @returns {{ overdueCount: number, overdueTotal: number, dueIn7DaysCount: number, dueIn14DaysCount: number, dueIn30DaysCount: number }}
 */
export function getInvoicesSummary(data) {
  const invoices = data.invoices || [];
  let overdueCount = 0;
  let overdueTotal = 0;
  let dueIn7DaysCount = 0;
  let dueIn14DaysCount = 0;
  let dueIn30DaysCount = 0;

  invoices.forEach((inv) => {
    const status = (inv.status || '').toLowerCase();
    if (status === 'void' || status === 'paid') return;
    const due = inv.due_date || inv.date_issued;
    if (!due) return;
    const days = daysFromToday(due);
    if (days < 0) {
      overdueCount += 1;
      overdueTotal += parseAmount(inv.total || inv.outstanding_balance || inv.amount);
    } else if (days >= 0 && days <= 7) {
      dueIn7DaysCount += 1;
    } else if (days <= 14) {
      dueIn14DaysCount += 1;
    } else if (days <= 30) {
      dueIn30DaysCount += 1;
    }
  });

  return { overdueCount, overdueTotal, dueIn7DaysCount, dueIn14DaysCount, dueIn30DaysCount };
}

/**
 * @param {{ proposals: Array }} data
 * @returns {{ draft: number, sent: number, viewed: number, accepted: number, rejected: number, expired: number }}
 */
export function getProposalsPipeline(data) {
  const proposals = data.proposals || [];
  const counts = { draft: 0, sent: 0, viewed: 0, accepted: 0, rejected: 0, expired: 0 };
  proposals.forEach((p) => {
    const s = (p.status || 'draft').toLowerCase();
    if (counts.hasOwnProperty(s)) counts[s] += 1;
  });
  return counts;
}

/**
 * @param {{ invoices: Array, proposals: Array }} data
 * @param {Record<string, string>} clientNameById
 * @param {number} limit
 * @param {{ invoiceTermSingular?: string }} options - optional; invoiceTermSingular for industry-specific label
 * @returns {Array<{ id: string, type: 'invoice'|'proposal', description: string, updatedAt: string, clientName?: string, resourceId: string }>}
 */
export function buildRecentlyUpdated(data, clientNameById = {}, limit = 5, options = {}) {
  const invoiceTerm = options.invoiceTermSingular || 'Invoice';
  const entries = [];

  (data.invoices || []).forEach((inv) => {
    const updatedAt = inv.updated_at || inv.created_at;
    if (!updatedAt) return;
    const status = (inv.status || '').toLowerCase();
    const desc = status === 'paid' ? 'marked paid' : 'updated';
    const num = inv.invoice_number || inv.id?.slice(0, 8) || '—';
    entries.push({
      id: `inv-${inv.id}`,
      type: 'invoice',
      description: `${invoiceTerm} ${num} ${desc}`,
      updatedAt,
      clientName: clientNameById[inv.client_id],
      resourceId: inv.id,
    });
  });

  (data.proposals || []).forEach((prop) => {
    const updatedAt = prop.updated_at || prop.created_at;
    if (!updatedAt) return;
    const num = prop.proposal_number || prop.id?.slice(0, 8) || '—';
    const status = (prop.status || '').toLowerCase();
    const verb = status === 'accepted' ? 'accepted' : status === 'created' ? 'created' : 'updated';
    entries.push({
      id: `prop-${prop.id}`,
      type: 'proposal',
      description: `Proposal ${num} ${verb}`,
      updatedAt,
      clientName: clientNameById[prop.client_id],
      resourceId: prop.id,
    });
  });

  entries.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return entries.slice(0, limit);
}
