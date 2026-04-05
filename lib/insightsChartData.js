import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';
import { buildProposalDocumentPayload } from '@/lib/buildDocumentPayload';
import { computeInsightKpis } from '@/lib/insightsKpiAggregates';
import { chartPalette as C } from '@/components/insights/charts/palette';

const OPEN_PROPOSAL_STATUSES = new Set(['draft', 'sent', 'viewed']);

function parseMoney(value) {
  if (value == null || value === '') return 0;
  const n = parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

function invoicePaidAmount(inv) {
  if (!inv) return 0;
  const st = (inv.status || '').toLowerCase();
  if (st === 'paid') return parseMoney(inv.total);
  if (st === 'partially_paid') {
    const total = parseMoney(inv.total);
    const out = parseMoney(inv.outstanding_balance);
    return Math.max(0, total - out);
  }
  return 0;
}

function monthKey(d) {
  if (!d) return null;
  const t = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(t.getTime())) return null;
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
}

function clientDisplayName(c) {
  if (!c) return '—';
  const co = (c.companyName || '').trim();
  if (co) return co;
  const n = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
  if (n) return n;
  return (c.email || '').trim() || '—';
}

function clientIdMap(clients) {
  const m = new Map();
  for (const c of clients) {
    if (c?.id) m.set(c.id, c);
  }
  return m;
}

function score0to100(n) {
  if (n == null || Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * @param {{ clients?: object[], invoices?: object[], proposals?: object[], industry?: string }} input
 */
export function buildInsightsChartBundle({ clients = [], invoices = [], proposals = [], industry: industryRaw = '' }) {
  const industry = typeof industryRaw === 'string' ? industryRaw.trim() : '';
  const kpis = computeInsightKpis({ clients, invoices, proposals });

  const tClient = getTermForIndustry(industry, 'client');
  const tInvoice = getTermForIndustry(industry, 'invoice');
  const tProposal = getTermForIndustry(industry, 'proposal');
  const tServices = getTermForIndustry(industry, 'services');
  const tTeam = getTermForIndustry(industry, 'team');
  const tClientSingular = getTermSingular(tClient);

  const clientsArr = Array.isArray(clients) ? clients : [];
  const invoicesArr = Array.isArray(invoices) ? invoices.filter((i) => i && (i.status || '').toLowerCase() !== 'void') : [];
  const proposalsArr = Array.isArray(proposals) ? proposals : [];

  const cidMap = clientIdMap(clientsArr);

  /** --- Revenue mix: collected vs outstanding vs pipeline --- */
  let collected = 0;
  let outstanding = 0;
  for (const inv of invoicesArr) {
    collected += invoicePaidAmount(inv);
    const st = (inv.status || '').toLowerCase();
    if (st !== 'paid' && st !== 'void') {
      outstanding += parseMoney(inv.outstanding_balance);
    }
  }
  let pipelineVal = 0;
  for (const p of proposalsArr) {
    if (!p || !OPEN_PROPOSAL_STATUSES.has(p.status)) continue;
    try {
      const doc = buildProposalDocumentPayload(p);
      pipelineVal += typeof doc.total === 'number' && !Number.isNaN(doc.total) ? doc.total : 0;
    } catch (_) {
      /* skip */
    }
  }
  let draftInvoiceSum = 0;
  for (const inv of invoicesArr) {
    if ((inv.status || '').toLowerCase() === 'draft') draftInvoiceSum += parseMoney(inv.total);
  }
  const otherSlice = Math.max(0, draftInvoiceSum);
  const pieSlices = [
    { name: 'Collected', value: Math.max(collected, 0), fill: C.a },
    { name: 'Outstanding', value: Math.max(outstanding, 0), fill: C.b },
    { name: tProposal, value: Math.max(pipelineVal, 0), fill: C.c },
    { name: 'Other', value: otherSlice, fill: C.d },
  ];
  const pieSum = pieSlices.reduce((s, x) => s + x.value, 0);
  const pieData =
    pieSum <= 0
      ? [{ name: `No ${tInvoice} data`, value: 1, fill: C.a }]
      : pieSlices.filter((s) => s.value > 0).length > 0
        ? pieSlices.filter((s) => s.value > 0)
        : [{ name: tInvoice, value: 1, fill: C.a }];

  /** --- Radar: 5 dimensions, current vs prior 90d window --- */
  const now = new Date();
  const ms90 = 90 * 24 * 60 * 60 * 1000;
  const curStart = new Date(now.getTime() - ms90);
  const prevStart = new Date(now.getTime() - 2 * ms90);
  const prevEnd = curStart;

  function windowPaidTotal(start, end) {
    let sum = 0;
    for (const inv of invoicesArr) {
      const st = (inv.status || '').toLowerCase();
      if (st === 'void') continue;
      const amt = invoicePaidAmount(inv);
      if (amt <= 0) continue;
      const raw = inv.paid_date || inv.date_sent || inv.date_issued || inv.created_at;
      if (!raw) continue;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime()) || d < start || d >= end) continue;
      sum += amt;
    }
    return sum;
  }

  function windowIssuedTotal(start, end) {
    let sum = 0;
    for (const inv of invoicesArr) {
      const raw = inv.date_issued || inv.created_at;
      if (!raw) continue;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime()) || d < start || d >= end) continue;
      sum += parseMoney(inv.total);
    }
    return sum;
  }

  const paidCur = windowPaidTotal(curStart, now);
  const paidPrev = windowPaidTotal(prevStart, prevEnd);
  const issuedCur = windowIssuedTotal(curStart, now);
  const issuedPrev = windowIssuedTotal(prevStart, prevEnd);

  const collectionRatio = (paid, iss) => (iss > 0 ? Math.min(100, (paid / iss) * 100) : paid > 0 ? 100 : 0);
  const A1 = score0to100(Math.min(100, clientsArr.length * 4));
  const B1 = score0to100(Math.max(0, A1 * 0.92));
  const A2 = score0to100(kpis.healthScore != null ? kpis.healthScore : collectionRatio(paidCur, issuedCur));
  const B2 = score0to100(collectionRatio(paidPrev, issuedPrev));
  const pipeNorm = (p, col) => {
    const x = p + col;
    return x > 0 ? Math.min(100, (p / x) * 100) : 0;
  };
  const A3 = score0to100(pipeNorm(pipelineVal, paidCur || 1));
  const B3 = score0to100(pipeNorm(pipelineVal * 0.85, paidPrev || 1));
  const mom = kpis.momPercent;
  const A4 = score0to100(50 + (mom == null || Number.isNaN(mom) ? 0 : mom) / 2);
  const B4 = score0to100(50);
  const invPerClient = clientsArr.length > 0 ? invoicesArr.length / clientsArr.length : 0;
  const A5 = score0to100(Math.min(100, invPerClient * 15));
  const B5 = score0to100(Math.min(100, invPerClient * 13.5));

  const radarData = [
    { subject: tClient, A: A1, B: B1, fullMark: 100 },
    { subject: tInvoice, A: A2, B: B2, fullMark: 100 },
    { subject: tProposal, A: A3, B: B3, fullMark: 100 },
    { subject: 'Momentum', A: A4, B: B4, fullMark: 100 },
    { subject: tServices, A: A5, B: B5, fullMark: 100 },
  ];

  /** --- Proposal funnel (monotonic stages for display) --- */
  const st = (p) => (p?.status || '').toLowerCase();
  const totalP = proposalsArr.length;
  const notDraft = proposalsArr.filter((p) => st(p) !== 'draft').length;
  const openPipe = proposalsArr.filter((p) => OPEN_PROPOSAL_STATUSES.has(st(p))).length;
  const won = proposalsArr.filter((p) => st(p) === 'won').length;
  let fv = [Math.max(totalP, 0), Math.max(notDraft, 0), Math.max(openPipe, 0), Math.max(won, 0)];
  for (let i = 1; i < fv.length; i += 1) fv[i] = Math.min(fv[i - 1], fv[i]);
  fv = fv.map((x) => Math.max(1, x));
  const funnelData = [
    { name: `All ${tProposal}`, value: fv[0], fill: C.a },
    { name: 'Submitted', value: fv[1], fill: C.b },
    { name: 'Open pipeline', value: fv[2], fill: C.g },
    { name: 'Won', value: fv[3], fill: C.d },
  ];

  /** --- Radial KPIs --- */
  const radialData = [
    { name: 'Collection', value: kpis.healthScore != null ? kpis.healthScore : 0, fill: C.a },
    { name: 'Pipeline', value: score0to100(pipeNorm(pipelineVal, paidCur || 1)), fill: C.b },
    { name: `${tClientSingular} base`, value: A1, fill: C.d },
  ];

  /** --- Treemap: paid by client --- */
  const paidByClient = new Map();
  for (const inv of invoicesArr) {
    const cid = inv.client_id;
    if (!cid) continue;
    const amt = invoicePaidAmount(inv);
    if (amt <= 0) continue;
    paidByClient.set(cid, (paidByClient.get(cid) || 0) + amt);
  }
  const treemapLeaves = [...paidByClient.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id, size], i) => ({
      name: clientDisplayName(cidMap.get(id)) || `(${tClientSingular})`,
      size: Math.max(1, Math.round(size)),
      fill: [C.a, C.b, C.c, C.d, C.e, C.f][i % 6],
    }));
  const treemapNodes =
    treemapLeaves.length > 0
      ? treemapLeaves
      : [{ name: `No ${tInvoice} data`, size: 100, fill: C.a }];

  /** --- Scatter: invoice total vs days to pay --- */
  const scatterData = [];
  for (const inv of invoicesArr) {
    const stl = (inv.status || '').toLowerCase();
    if (stl !== 'paid' && stl !== 'partially_paid') continue;
    const total = parseMoney(inv.total);
    if (total <= 0) continue;
    const issued = inv.date_issued || inv.created_at;
    const paidD = inv.paid_date;
    if (!issued || !paidD) continue;
    const i1 = new Date(issued);
    const i2 = new Date(paidD);
    if (Number.isNaN(i1.getTime()) || Number.isNaN(i2.getTime())) continue;
    const days = Math.max(0, (i2 - i1) / (24 * 60 * 60 * 1000));
    scatterData.push({
      x: Math.round(days),
      y: Math.round(total),
      z: Math.round(parseMoney(inv.outstanding_balance) + total),
    });
  }
  if (scatterData.length === 0) {
    scatterData.push({ x: 0, y: 0, z: 1 });
  }

  /** --- Sunburst: revenue by top clients --- */
  const sunburstChildren = [...paidByClient.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, v], i) => ({
      name: clientDisplayName(cidMap.get(id)) || '—',
      value: Math.max(1, Math.round(v)),
      fill: [C.a, C.b, C.c, C.d, C.e, C.f, C.g, C.b][i % 8],
    }));
  const sunburstLeaves =
    sunburstChildren.length > 0 ? sunburstChildren : [{ name: '—', value: 1, fill: C.a }];
  /** Recharts SunburstChart uses `data[dataKey]` on the root for its angle scale; without this, the chart renders empty. */
  const sunburstRootValue = sunburstLeaves.reduce((sum, c) => sum + (Number(c.value) || 0), 0);
  const sunburstData = {
    name: tClient,
    value: Math.max(1, sunburstRootValue),
    children: sunburstLeaves,
  };

  /** --- Stacked: last 6 months — paid in month / partial / outstanding on invoices issued that month --- */
  const monthKeys = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(monthKey(d));
  }
  const stacked = monthKeys.map((mk) => {
    const label = new Date(`${mk}-01`).toLocaleString(undefined, { month: 'short' });
    let a = 0;
    let b = 0;
    let c = 0;
    for (const inv of invoicesArr) {
      const stl = (inv.status || '').toLowerCase();
      if (stl === 'void') continue;
      const paidRaw = inv.paid_date;
      if (paidRaw && monthKey(new Date(paidRaw)) === mk) {
        if (stl === 'paid') a += invoicePaidAmount(inv);
        else if (stl === 'partially_paid') b += invoicePaidAmount(inv);
      }
      const issueRaw = inv.date_issued || inv.created_at;
      if (issueRaw && monthKey(new Date(issueRaw)) === mk && stl !== 'paid') {
        c += parseMoney(inv.outstanding_balance);
      }
    }
    return { m: label, a: Math.round(a), b: Math.round(b), c: Math.round(c) };
  });

  /** --- Revenue vs goal: last 4 quarters paid --- */
  function quarterPaid(year, q) {
    const startM = (q - 1) * 3;
    let sum = 0;
    for (const inv of invoicesArr) {
      const stl = (inv.status || '').toLowerCase();
      if (stl === 'void') continue;
      const amt = invoicePaidAmount(inv);
      if (amt <= 0) continue;
      const raw = inv.paid_date || inv.date_sent || inv.date_issued;
      if (!raw) continue;
      const d = new Date(raw);
      if (d.getFullYear() !== year || Math.floor(d.getMonth() / 3) !== q - 1) continue;
      sum += amt;
    }
    return sum;
  }
  const y = now.getFullYear();
  const qn = Math.floor(now.getMonth() / 3);
  const quarters = [];
  for (let i = 3; i >= 0; i -= 1) {
    let qi = qn - i;
    let yy = y;
    while (qi < 0) {
      qi += 4;
      yy -= 1;
    }
    const rev = quarterPaid(yy, qi + 1);
    quarters.push({ yy, q: qi + 1, rev });
  }
  const composed = quarters.map((q, idx) => {
    const prevRev = idx > 0 ? quarters[idx - 1].rev : q.rev;
    const goal = Math.max(Math.round(prevRev * 1.05), Math.round(q.rev * 0.9));
    return { q: `Q${q.q} ${String(q.yy).slice(2)}`, rev: Math.round(q.rev), goal };
  });

  /** --- Category leaderboard: line items --- */
  const lineTotals = new Map();
  for (const inv of invoicesArr) {
    const items = Array.isArray(inv.line_items) ? inv.line_items : [];
    for (const row of items) {
      const name = (row.item_name || row.description || tServices).trim() || tServices;
      const key = name.length > 48 ? `${name.slice(0, 45)}…` : name;
      const amt =
        row.amount != null
          ? parseMoney(row.amount)
          : parseMoney(row.quantity) * parseMoney(row.unit_price);
      lineTotals.set(key, (lineTotals.get(key) || 0) + amt);
    }
  }
  const lineEntries = [...lineTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxLine = Math.max(...lineEntries.map(([, v]) => v), 1);
  const horizontalRank =
    lineEntries.length > 0
      ? lineEntries.map(([name, v]) => ({ name, v: Math.round((v / maxLine) * 100) }))
      : [{ name: tServices, v: 0 }];

  /** --- Activity matrix: weekday x week-of-month invoice activity --- */
  const matrixRows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const matrixCols = ['W1', 'W2', 'W3', 'W4'];
  const matrixData = matrixRows.map(() => matrixCols.map(() => 0));
  for (const inv of invoicesArr) {
    const raw = inv.paid_date || inv.date_issued || inv.created_at;
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    const row = dow - 1;
    const dom = d.getDate();
    const col = Math.min(3, Math.floor((dom - 1) / 7));
    matrixData[row][col] += 1;
  }

  const sparkData = stacked.map((row, i) => ({ i, v: row.a + row.b + row.c }));

  const goalProgress = {
    bars: [
      { label: `${tInvoice} collection`, value: kpis.healthScore != null ? kpis.healthScore : 0, colorClass: 'bg-gradient-to-r from-primary-500 to-cyan-400' },
      { label: `${tProposal} pipeline`, value: score0to100(pipeNorm(pipelineVal, paidCur || 1)), colorClass: 'bg-gradient-to-r from-emerald-500 to-teal-400' },
      { label: `${tClient} coverage`, value: A1, colorClass: 'bg-gradient-to-r from-amber-500 to-orange-400' },
    ],
  };

  const circularTargets = {
    rings: [
      { value: kpis.healthScore != null ? kpis.healthScore : 0, label: 'Paid %', sub: '90d', stroke: '#0ea5e9' },
      { value: score0to100(pipeNorm(pipelineVal, paidCur || 1)), label: tProposal, sub: 'open', stroke: '#8b5cf6' },
      { value: A1, label: tClient, sub: 'workspace', stroke: '#10b981' },
    ],
  };

  const chartCopy = {
    revenueMixTitle: `${tInvoice} Mix`,
    revenueMixSubtitle: `Collected, outstanding, ${tProposal.toLowerCase()} pipeline, and other workspace amounts`,
    teamRadarTitle: `${tTeam} Radar`,
    teamRadarSubtitle: `Current vs Prior 90 Days — ${tClient}, ${tInvoice}, ${tProposal}, Momentum, and ${tServices}`,
    funnelTitle: `${tProposal} Funnel`,
    funnelSubtitle: 'Stages from all Proposals through Won',
    radialTitle: 'Workspace KPIs',
    radialSubtitle: `Collection health, ${tProposal} pipeline, and ${tClient} Coverage`,
    treemapTitle: `${tInvoice} by ${tClientSingular}`,
    treemapSubtitle: 'Collected Amount by Client (Top Segments)',
    scatterTitle: `${tInvoice} Pace`,
    scatterSubtitle: 'Days to pay vs amount (paid invoices)',
    sunburstTitle: `${tClient} Share`,
    sunburstSubtitle: 'Collected Revenue by Client',
    stackedTitle: `${tInvoice} by Month`,
    stackedSubtitle: 'Paid in Full, Partial Payments, and Outstanding on Invoices Issued in Each Month',
    revenueGoalTitle: `${tInvoice} vs Goal`,
    revenueGoalSubtitle: 'Quarterly Collected vs Rolling Goal',
    categoryTitle: `${tServices} Mix`,
    categorySubtitle: 'Top Line Items by Share of Amount',
    matrixTitle: `${tInvoice} Activity`,
    matrixSubtitle: 'Counts by Weekday and Week of Month (Paid or Issued)',
    goalProgressTitle: 'Goal Progress',
    goalProgressSubtitle: `Collection, ${tProposal}, and ${tClient} Coverage`,
    circularTitle: 'Targets',
    circularSubtitle: `${tInvoice}, ${tProposal}, and ${tClient}`,
    sparkTitle: 'Paid Trend',
    sparkSubtitle: 'Last Six Months of Collected Amount',
  };

  const stackLegend = { a: 'Paid in full', b: 'Partially paid', c: 'Outstanding' };
  const revenueGoalLegend = { bar: 'Collected', line: 'Goal' };

  return {
    terms: {
      client: tClient,
      invoice: tInvoice,
      proposal: tProposal,
      services: tServices,
      team: tTeam,
    },
    kpis,
    pieData,
    radarData,
    radarSeriesA: 'Current 90d',
    radarSeriesB: 'Prior 90d',
    funnelData,
    radialData,
    treemapNodes,
    scatterData,
    sunburstData,
    stacked,
    composed,
    horizontalRank,
    matrixRows,
    matrixCols,
    matrixData,
    sparkData,
    goalProgress,
    circularTargets,
    chartCopy,
    stackLegend,
    revenueGoalLegend,
  };
}
