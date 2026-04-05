import { buildProposalDocumentPayload } from '@/lib/buildDocumentPayload';

function parseMoney(value) {
  if (value == null || value === '') return 0;
  const n = parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

/** Proposal statuses that still count as open pipeline (not won/lost). */
const OPEN_PROPOSAL_STATUSES = new Set(['draft', 'sent', 'viewed']);

/** Local calendar month key YYYY-MM */
function monthKeyFromDate(d) {
  if (!d) return null;
  const t = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(t.getTime())) return null;
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
}

function thisMonthKey() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

function lastMonthKey() {
  const n = new Date();
  n.setMonth(n.getMonth() - 1);
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @param {{ clients: object[], invoices: object[], proposals: object[] }} input
 * @returns {{
 *   pipelineTotal: number,
 *   clientCount: number,
 *   momPercent: number | null,
 *   momLabel: string,
 *   healthScore: number | null,
 *   healthLabel: string,
 * }}
 */
export function computeInsightKpis({ clients = [], invoices = [], proposals = [] }) {
  const clientCount = Array.isArray(clients) ? clients.length : 0;

  let pipelineTotal = 0;
  for (const p of proposals) {
    if (!p || !OPEN_PROPOSAL_STATUSES.has(p.status)) continue;
    try {
      const doc = buildProposalDocumentPayload(p);
      pipelineTotal += typeof doc.total === 'number' && !Number.isNaN(doc.total) ? doc.total : 0;
    } catch (_) {
      /* skip malformed */
    }
  }

  const tm = thisMonthKey();
  const lm = lastMonthKey();

  function invoicePaidAmount(inv) {
    const st = (inv.status || '').toLowerCase();
    if (st === 'paid') return parseMoney(inv.total);
    if (st === 'partially_paid') {
      const total = parseMoney(inv.total);
      const out = parseMoney(inv.outstanding_balance);
      return Math.max(0, total - out);
    }
    return 0;
  }

  function invoiceRevenueDate(inv) {
    const raw = inv.paid_date || inv.date_sent || inv.date_issued || inv.created_at;
    return raw ? new Date(raw) : null;
  }

  let thisMonthPaid = 0;
  let lastMonthPaid = 0;
  for (const inv of invoices) {
    if (!inv || inv.status === 'void') continue;
    const amt = invoicePaidAmount(inv);
    if (amt <= 0) continue;
    const d = invoiceRevenueDate(inv);
    const mk = monthKeyFromDate(d);
    if (!mk) continue;
    if (mk === tm) thisMonthPaid += amt;
    else if (mk === lm) lastMonthPaid += amt;
  }

  let momPercent = null;
  let momLabel = 'vs last month (paid)';
  if (lastMonthPaid > 0) {
    momPercent = ((thisMonthPaid - lastMonthPaid) / lastMonthPaid) * 100;
  } else if (thisMonthPaid > 0) {
    momPercent = 100;
    momLabel = 'vs last month (paid)';
  } else {
    momLabel = 'vs last month (paid)';
  }

  const now = new Date();
  let issued90 = 0;
  let paid90 = 0;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 90);
  for (const inv of invoices) {
    if (!inv || inv.status === 'void') continue;
    const issueD = inv.date_issued || inv.created_at;
    if (!issueD) continue;
    const id = new Date(issueD);
    if (Number.isNaN(id.getTime()) || id < cutoff) continue;
    const total = parseMoney(inv.total);
    issued90 += total;
    paid90 += invoicePaidAmount(inv);
  }

  let healthScore = null;
  let healthLabel = 'Paid vs issued (90d)';
  if (issued90 > 0) {
    healthScore = Math.min(100, Math.max(0, Math.round((paid90 / issued90) * 100)));
  } else {
    healthLabel = 'No recent invoices';
  }

  return {
    pipelineTotal,
    clientCount,
    momPercent,
    momLabel,
    thisMonthPaid,
    lastMonthPaid,
    healthScore,
    healthLabel,
  };
}

export function formatCurrencyCompact(amount, currency = 'USD') {
  if (amount == null || Number.isNaN(amount)) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      notation: amount >= 1_000_000 ? 'compact' : 'standard',
      maximumFractionDigits: amount >= 1_000_000 ? 1 : 0,
    }).format(amount);
  } catch (_) {
    return `$${Math.round(amount).toLocaleString()}`;
  }
}

export function formatMomPercent(momPercent) {
  if (momPercent == null || Number.isNaN(momPercent)) return '—';
  const rounded = Math.round(momPercent * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}%`;
}
