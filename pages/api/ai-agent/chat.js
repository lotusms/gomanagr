const { createClient } = require('@supabase/supabase-js');

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const OPENAI_RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const WEB_MODEL = process.env.OPENAI_WEB_MODEL || 'gpt-4.1';
const OPEN_METEO_GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';
const OPEN_METEO_FORECAST = 'https://api.open-meteo.com/v1/forecast';

let supabaseAdmin;

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseAdmin;
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, 4000),
    }))
    .slice(-16);
}

function extractRequestedCount(text) {
  if (!text) return null;
  const match = String(text).match(/\b(\d{1,4})\b/);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function wantsAllResults(text) {
  if (!text) return false;
  return /\b(all|everything|every|full|complete|entire)\b/i.test(text);
}

function resolveResultLimit(text, defaults = { min: 5, normal: 20, max: 200 }) {
  if (wantsAllResults(text)) return defaults.max;
  const explicit = extractRequestedCount(text);
  if (explicit != null) return Math.max(defaults.min, Math.min(defaults.max, explicit));
  return defaults.normal;
}

function getNowContextText() {
  const now = new Date();
  return (
    '\n\nLive current datetime context (always use for time/date questions):' +
    `\n- ISO: ${now.toISOString()}` +
    `\n- UTC: ${now.toUTCString()}` +
    `\n- Local: ${now.toString()}`
  );
}

function toResponsesInput(messages) {
  return messages.map((m) => ({
    role: m.role,
    content: [{ type: 'input_text', text: m.content }],
  }));
}

function extractResponsesOutputText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === 'string' && part.text.trim()) return part.text.trim();
      if (typeof part?.output_text === 'string' && part.output_text.trim()) return part.output_text.trim();
    }
  }
  return '';
}

async function requestOpenAIWithWebSearch({ apiKey, systemPrompt, safeMessages }) {
  try {
    const response = await fetch(OPENAI_RESPONSES_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: WEB_MODEL,
        tools: [{ type: 'web_search_preview' }],
        temperature: 0.4,
        input: toResponsesInput([systemPrompt, ...safeMessages]),
      }),
    });

    if (!response.ok) return null;
    const payload = await response.json();
    const text = extractResponsesOutputText(payload);
    return text || null;
  } catch (_) {
    return null;
  }
}

function isWeatherIntent(text) {
  if (!text) return false;
  return /(weather|forecast|temperature|temp|rain|humidity|wind|hot|cold|snow|storm|sunny|cloudy|climate)/i.test(text);
}

function isBusinessIntent(text) {
  if (!text) return false;
  return /(invoice|invoices|billing|proposal|proposals|project|projects|task|tasks|client|clients|schedule|appointment|appointments|team|staff|receipt|receipts|contract|contracts|gomanagr|organization|org\b|workflow|kpi|operations)/i.test(text);
}

function looksLikeLocationOnly(text) {
  if (!text) return false;
  const cleaned = String(text).trim();
  if (!cleaned || cleaned.length < 2 || cleaned.length > 80) return false;
  // Accept city/state-like text, reject obvious questions/sentences.
  if (/[?]/.test(cleaned)) return false;
  if (/\b(weather|forecast|temperature|rain|humidity|wind)\b/i.test(cleaned)) return false;
  return /^[a-zA-Z\s,.'-]+$/.test(cleaned);
}

function recentWeatherConversation(messages) {
  const recent = (messages || []).slice(-6);
  return recent.some((m) => m?.role === 'user' && isWeatherIntent(m?.content));
}

function extractLocation(text) {
  if (!text) return null;
  const inMatch = text.match(/\b(?:in|for|at)\s+([a-zA-Z][a-zA-Z\s,.'-]{1,60})$/i);
  if (inMatch?.[1]) return inMatch[1].trim();
  if (looksLikeLocationOnly(text)) return String(text).trim();
  return null;
}

function extractLocationFromRecentMessages(messages) {
  const recentUserMessages = (messages || []).filter((m) => m?.role === 'user').slice(-8).reverse();
  for (const msg of recentUserMessages) {
    const candidate = extractLocation(msg?.content || '');
    if (candidate) return candidate;
  }
  return null;
}

function firstNonEmptyLocationCandidate(candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = String(candidate).trim().replace(/\s+/g, ' ');
    if (normalized.length >= 2 && normalized.length <= 120) return normalized;
  }
  return null;
}

async function getOrganizationLocationHint(userId, organizationId) {
  if (!userId || !organizationId) return null;
  const client = getSupabaseAdmin();
  if (!client) return null;

  try {
    const { data: membership } = await client
      .from('org_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .limit(1)
      .single();
    if (!membership) return null;

    const { data: org } = await client
      .from('organizations')
      .select('company_locations, city, state, country, locations')
      .eq('id', organizationId)
      .limit(1)
      .maybeSingle();
    if (!org) return null;

    const companyLocations = org.company_locations
      ? String(org.company_locations).split(/[;|]/).map((v) => v.trim()).filter(Boolean)
      : [];
    const structuredCityState = [org.city, org.state, org.country].filter(Boolean).join(', ');
    const firstStructuredLocation = Array.isArray(org.locations) && org.locations.length > 0
      ? [org.locations[0]?.city, org.locations[0]?.state, org.locations[0]?.country]
          .filter(Boolean)
          .join(', ')
      : '';

    return firstNonEmptyLocationCandidate([
      structuredCityState,
      firstStructuredLocation,
      companyLocations[0],
    ]);
  } catch (_) {
    return null;
  }
}

function isInvoiceIntent(text) {
  if (!text) return false;
  return /(invoice|invoices|billing|bill|due date|due dates|past due|overdue|outstanding|accounts receivable|a\/r)/i.test(text);
}

function asksForDueDates(text) {
  if (!text) return false;
  return /(due date|due dates|which are due|what.*due|list.*due|show.*due|past due|overdue|outstanding)/i.test(text);
}

function toNumberLike(value) {
  if (value == null) return null;
  const n = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function formatCurrency(value) {
  const n = toNumberLike(value);
  if (n == null) return null;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function getInvoiceInsights(userId, organizationId, userPrompt = '') {
  if (!userId || !organizationId) return null;
  const client = getSupabaseAdmin();
  if (!client) return null;

  const { data: membership, error: membershipError } = await client
    .from('org_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .limit(1)
    .single();
  if (membershipError || !membership) return null;

  const { data, error } = await client
    .from('client_invoices')
    .select('id, invoice_number, status, due_date, total, amount, outstanding_balance, created_at')
    .eq('organization_id', organizationId)
    .order('due_date', { ascending: true, nullsFirst: false });
  if (error) return null;

  const invoices = Array.isArray(data) ? data : [];
  const unpaidStatuses = new Set(['sent', 'overdue', 'partially_paid', 'draft']);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueInvoices = invoices
    .filter((inv) => inv?.due_date && unpaidStatuses.has(String(inv?.status || '').toLowerCase()))
    .map((inv) => {
      const due = new Date(`${inv.due_date}T00:00:00`);
      const balance =
        toNumberLike(inv?.outstanding_balance) ??
        toNumberLike(inv?.total) ??
        toNumberLike(inv?.amount) ??
        0;
      return {
        ...inv,
        _dueDate: due,
        _balance: balance,
      };
    })
    .filter((inv) => !Number.isNaN(inv._dueDate.getTime()));

  const overdue = dueInvoices.filter((inv) => inv._dueDate < today);
  const dueSoon = dueInvoices.filter((inv) => inv._dueDate >= today);

  const dueListLimit = resolveResultLimit(userPrompt, { min: 10, normal: 30, max: 500 });

  return {
    totalInvoices: invoices.length,
    dueInvoices: dueInvoices.length,
    overdueInvoices: overdue.length,
    dueSoonInvoices: dueSoon.length,
    dueList: dueInvoices.slice(0, dueListLimit).map((inv) => ({
      invoice_number: inv.invoice_number || inv.id,
      status: inv.status || 'unknown',
      due_date: inv.due_date,
      balance: formatCurrency(inv._balance) || '$0.00',
    })),
  };
}

async function getWeatherContextForLocation(locationName) {
  if (!locationName) return null;

  const geocodeUrl = new URL(OPEN_METEO_GEOCODE);
  geocodeUrl.searchParams.set('name', locationName);
  geocodeUrl.searchParams.set('count', '1');
  geocodeUrl.searchParams.set('language', 'en');
  geocodeUrl.searchParams.set('format', 'json');

  const geoRes = await fetch(geocodeUrl.toString(), { headers: { Accept: 'application/json' } });
  if (!geoRes.ok) return null;
  const geoJson = await geoRes.json();
  const first = geoJson?.results?.[0];
  if (!first?.latitude || !first?.longitude) return null;

  const forecastUrl = new URL(OPEN_METEO_FORECAST);
  forecastUrl.searchParams.set('latitude', String(first.latitude));
  forecastUrl.searchParams.set('longitude', String(first.longitude));
  forecastUrl.searchParams.set('current', 'temperature_2m,relative_humidity_2m,wind_speed_10m,is_day');
  forecastUrl.searchParams.set('hourly', 'precipitation_probability');
  forecastUrl.searchParams.set('forecast_hours', '6');
  forecastUrl.searchParams.set('temperature_unit', 'fahrenheit');
  forecastUrl.searchParams.set('timezone', 'auto');

  const weatherRes = await fetch(forecastUrl.toString(), { headers: { Accept: 'application/json' } });
  if (!weatherRes.ok) return null;
  const weatherJson = await weatherRes.json();

  const current = weatherJson?.current;
  if (!current) return null;

  const precipNow = Array.isArray(weatherJson?.hourly?.precipitation_probability)
    ? weatherJson.hourly.precipitation_probability[0]
    : null;

  const city = [first.name, first.admin1, first.country].filter(Boolean).join(', ');
  return {
    city,
    temperatureF: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    windMph: current.wind_speed_10m,
    isDay: current.is_day === 1,
    precipProbability: precipNow,
    observedAt: current.time,
  };
}

async function getTableCountSafe(client, table, organizationId) {
  try {
    const { count, error } = await client
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);
    if (error) return null;
    return typeof count === 'number' ? count : null;
  } catch (_) {
    return null;
  }
}

async function getRecentRowsSafe(
  client,
  table,
  organizationId,
  columns = 'id, created_at',
  orderColumn = 'created_at',
  limit = 10
) {
  try {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .eq('organization_id', organizationId)
      .order(orderColumn, { ascending: false })
      .limit(limit);
    if (error) return [];
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function compactRows(rows, preferredFields) {
  return rows.map((row) => {
    const clean = {};
    preferredFields.forEach((field) => {
      if (row?.[field] !== undefined && row?.[field] !== null && row?.[field] !== '') {
        clean[field] = row[field];
      }
    });
    if (!clean.id && row?.id) clean.id = row.id;
    if (!clean.created_at && row?.created_at) clean.created_at = row.created_at;
    return clean;
  });
}

async function getSupabaseBusinessContext(userId, organizationId, userPrompt = '') {
  if (!userId || !organizationId) return '';
  const client = getSupabaseAdmin();
  if (!client) return '';

  try {
    const { data: membership, error: membershipError } = await client
      .from('org_members')
      .select('organization_id, role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .limit(1)
      .single();
    if (membershipError || !membership) return '';

    const recentRowsLimit = resolveResultLimit(userPrompt, { min: 5, normal: 15, max: 60 });

    const [
      orgRow,
      counts,
      recentInvoices,
      recentProjects,
      recentTasks,
      recentProposals,
      recentMessages,
      recentCalls,
      recentMeetings,
    ] = await Promise.all([
      client.from('organizations').select('id, name, industry').eq('id', organizationId).limit(1).maybeSingle(),
      Promise.all([
        getTableCountSafe(client, 'user_profiles', organizationId),
        getTableCountSafe(client, 'client_invoices', organizationId),
        getTableCountSafe(client, 'client_projects', organizationId),
        getTableCountSafe(client, 'client_proposals', organizationId),
        getTableCountSafe(client, 'tasks', organizationId),
        getTableCountSafe(client, 'client_messages', organizationId),
        getTableCountSafe(client, 'client_calls', organizationId),
        getTableCountSafe(client, 'client_meeting_notes', organizationId),
      ]),
      getRecentRowsSafe(
        client,
        'client_invoices',
        organizationId,
        'id, created_at, invoice_number, status, total, amount, amount_due, due_date',
        'created_at',
        recentRowsLimit
      ),
      getRecentRowsSafe(client, 'client_projects', organizationId, 'id, created_at, title, status, priority, due_date', 'created_at', recentRowsLimit),
      getRecentRowsSafe(client, 'tasks', organizationId, 'id, created_at, title, status, priority, due_at', 'created_at', recentRowsLimit),
      getRecentRowsSafe(client, 'client_proposals', organizationId, 'id, created_at, proposal_number, status, total, due_date', 'created_at', recentRowsLimit),
      getRecentRowsSafe(client, 'client_messages', organizationId, 'id, created_at, subject', 'created_at', recentRowsLimit),
      getRecentRowsSafe(client, 'client_calls', organizationId, 'id, created_at, subject, title', 'created_at', recentRowsLimit),
      getRecentRowsSafe(client, 'client_meeting_notes', organizationId, 'id, created_at, subject, title', 'created_at', recentRowsLimit),
    ]);

    const [teamCount, invoiceCount, projectCount, proposalCount, taskCount, messageCount, callCount, meetingCount] = counts;

    const summary = {
      organization: {
        id: organizationId,
        name: orgRow?.data?.name || null,
        industry: orgRow?.data?.industry || null,
      },
      membership: {
        role: membership.role || null,
      },
      counts: {
        teamMembers: teamCount,
        invoices: invoiceCount,
        projects: projectCount,
        proposals: proposalCount,
        tasks: taskCount,
        clientMessages: messageCount,
        clientCalls: callCount,
        meetingNotes: meetingCount,
      },
      recents: {
        invoices: compactRows(recentInvoices, ['id', 'created_at', 'invoice_number', 'status', 'total', 'amount', 'amount_due', 'due_date']),
        projects: compactRows(recentProjects, ['id', 'created_at', 'title', 'status', 'priority', 'due_date']),
        tasks: compactRows(recentTasks, ['id', 'created_at', 'title', 'status', 'priority', 'due_at']),
        proposals: compactRows(recentProposals, ['id', 'created_at', 'proposal_number', 'status', 'total', 'due_date']),
        clientMessages: compactRows(recentMessages, ['id', 'created_at', 'subject']),
        clientCalls: compactRows(recentCalls, ['id', 'created_at', 'subject', 'title']),
        meetingNotes: compactRows(recentMeetings, ['id', 'created_at', 'subject', 'title']),
      },
    };

    return `\n\nLive GoManagr context from Supabase (organization-scoped, use this data when relevant):\n${JSON.stringify(summary)}`;
  } catch (_) {
    return '';
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY on server.' });
  }

  try {
    const { messages, userId, organizationId } = req.body || {};
    const safeMessages = sanitizeMessages(messages);

    if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'A user message is required.' });
    }

    const lastUserMessage = safeMessages[safeMessages.length - 1]?.content || '';

    if (isInvoiceIntent(lastUserMessage) && asksForDueDates(lastUserMessage)) {
      const invoiceInsights = await getInvoiceInsights(userId, organizationId, lastUserMessage);
      if (!invoiceInsights) {
        return res.status(200).json({
          message: 'I could not load live invoice data for your organization right now. Please confirm your organization access and try again.',
        });
      }

      if (!invoiceInsights.dueInvoices) {
        return res.status(200).json({
          message: `I checked your live invoice data: ${invoiceInsights.totalInvoices} invoices total, and none currently have unpaid due dates.`,
        });
      }

      const listLines = invoiceInsights.dueList
        .map((inv) => `- ${inv.invoice_number}: due ${inv.due_date} (${inv.status}), balance ${inv.balance}`)
        .join('\n');

      return res.status(200).json({
        message:
          `From your live invoice data, ${invoiceInsights.dueInvoices} invoices have unpaid due dates (${invoiceInsights.overdueInvoices} overdue, ${invoiceInsights.dueSoonInvoices} upcoming).\n\n` +
          `Due invoice list:\n${listLines}`,
      });
    }

    const isBusinessQuery = isBusinessIntent(lastUserMessage);
    const isWeatherQuery = isWeatherIntent(lastUserMessage);
    const isGeneralQuery = !isBusinessQuery && !isWeatherQuery;

    const [supabaseContextText, weatherContextTextPromise] = await Promise.all([
      isBusinessQuery
        ? getSupabaseBusinessContext(userId, organizationId, lastUserMessage)
        : Promise.resolve(''),
      (async () => {
        let weatherContextTextInner = '';
        const shouldAttemptWeatherLookup =
          isWeatherIntent(lastUserMessage) ||
          (looksLikeLocationOnly(lastUserMessage) && recentWeatherConversation(safeMessages));

        if (shouldAttemptWeatherLookup) {
          const locationName =
            extractLocation(lastUserMessage) ||
            extractLocationFromRecentMessages(safeMessages) ||
            await getOrganizationLocationHint(userId, organizationId);
          if (locationName) {
            try {
              const weather = await getWeatherContextForLocation(locationName);
              if (weather) {
                weatherContextTextInner = `\n\nLive weather context (use this data in your answer):\n- Location: ${weather.city}\n- Temperature: ${weather.temperatureF}°F\n- Humidity: ${weather.humidity}%\n- Wind: ${weather.windMph} mph\n- Daytime: ${weather.isDay ? 'yes' : 'no'}\n- Precipitation probability (next hour): ${weather.precipProbability ?? 'n/a'}%\n- Observed at: ${weather.observedAt}`;
              } else {
                weatherContextTextInner = '\n\nUser asked about weather, but live weather lookup failed. Ask for a clearer location (city and state/country).';
              }
            } catch (_) {
              weatherContextTextInner = '\n\nUser asked about weather, but live weather lookup failed. Ask for a clearer location (city and state/country).';
            }
          } else {
            weatherContextTextInner = '\n\nUser asked about weather without clear location. Ask for city and state/country before answering.';
          }
        }
        return weatherContextTextInner;
      })(),
    ]);
    const weatherContextText = weatherContextTextPromise;

    const generalSystemInstruction =
      'You are Hermes, a smart and versatile AI assistant. Answer normal questions directly and confidently like ChatGPT. Keep answers clear and concise.';
    const businessSystemInstruction =
      'You are Hermes, a smart and versatile AI assistant inside GoManagr. You can answer general knowledge questions and business/operations questions. For GoManagr or organization-specific questions, use provided live business context when available. For weather questions, use weather context when available. If a question depends on real-time events (like latest sports results) and no live event data is provided, be explicit about uncertainty and ask for the exact date/timeframe to avoid guessing. Keep responses concise, practical, and clear.';

    const systemPrompt = {
      role: 'system',
      content:
        (isGeneralQuery ? generalSystemInstruction : businessSystemInstruction) +
        getNowContextText() +
        supabaseContextText +
        weatherContextText,
    };

    const shouldTryWebSearch = isGeneralQuery;
    let content = null;

    if (shouldTryWebSearch) {
      content = await requestOpenAIWithWebSearch({
        apiKey,
        systemPrompt,
        safeMessages,
      });
    }

    if (!content) {
      const response = await fetch(OPENAI_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.4,
          messages: [systemPrompt, ...safeMessages],
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.text();
        return res.status(502).json({
          error: 'OpenAI request failed.',
          details: errorPayload?.slice(0, 500),
        });
      }

      const data = await response.json();
      content = data?.choices?.[0]?.message?.content?.trim();
    }

    if (!content) {
      return res.status(502).json({ error: 'No content returned by model.' });
    }

    return res.status(200).json({ message: content });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process AI request.', details: error?.message || 'Unknown error' });
  }
}
