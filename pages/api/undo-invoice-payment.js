/**
 * Resets or corrects an invoice's payment state.
 * POST body: { invoiceId, userId, organizationId?, balanceDue? }
 *
 * - If balanceDue is provided (0 <= balanceDue <= total): sets outstanding_balance to that value,
 *   status to 'partially_paid' or 'paid', and paid_date to today. Use this when a real payment
 *   was made and you need to reflect the correct balance (e.g. after a full undo).
 *
 * - If balanceDue is not provided: full undo — sets outstanding_balance = total, status = 'sent',
 *   paid_date = null. Only allowed when invoice is currently paid or partially_paid.
 */

const { createClient } = require('@supabase/supabase-js');

let supabaseAdmin;
try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } else {
    supabaseAdmin = null;
  }
} catch (e) {
  supabaseAdmin = null;
}

function parseNum(v) {
  if (v == null || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!supabaseAdmin) return res.status(503).json({ error: 'Service unavailable' });

  const { invoiceId, userId, organizationId, balanceDue: balanceDueRaw } = req.body || {};
  if (!invoiceId || !userId) {
    return res.status(400).json({ error: 'Missing invoiceId or userId' });
  }
  const balanceDueProvided = balanceDueRaw !== undefined && balanceDueRaw !== null && String(balanceDueRaw).trim() !== '';
  const balanceDueNum = balanceDueProvided ? parseNum(balanceDueRaw) : null;

  try {
    if (organizationId) {
      const { data: membership } = await supabaseAdmin
        .from('org_members')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .limit(1)
        .single();
      if (!membership) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    let query = supabaseAdmin
      .from('client_invoices')
      .select('id, total, status, outstanding_balance')
      .eq('id', invoiceId)
      .limit(1);
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    } else {
      query = query.eq('user_id', userId).is('organization_id', null);
    }
    const { data: invoice, error } = await query.maybeSingle();

    if (error || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    const total = parseNum(invoice.total);
    const status = (invoice.status || '').toLowerCase();

    if (balanceDueProvided && balanceDueNum !== null) {
      // Set correct balance due (e.g. after full undo, to reflect a real payment)
      if (balanceDueNum < 0) {
        return res.status(400).json({ error: 'Balance due cannot be negative' });
      }
      if (balanceDueNum > total) {
        return res.status(400).json({ error: 'Balance due cannot exceed invoice total' });
      }
      const newStatus = balanceDueNum <= 0 ? 'paid' : 'partially_paid';
      const today = new Date().toISOString().slice(0, 10);
      const { error: updateError } = await supabaseAdmin
        .from('client_invoices')
        .update({
          outstanding_balance: String(balanceDueNum.toFixed(2)),
          status: newStatus,
          paid_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);
      if (updateError) {
        console.error('[undo-invoice-payment] Update failed:', invoiceId, updateError);
        return res.status(500).json({ error: 'Failed to update invoice' });
      }
      return res.status(200).json({ ok: true });
    }

    // Full undo: reset to fully unpaid (only when currently paid or partially_paid)
    if (status !== 'paid' && status !== 'partially_paid') {
      return res.status(400).json({ error: 'Invoice is not marked as paid or partially paid; nothing to undo. To set the correct balance, use the "Correct balance due" option.' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('client_invoices')
      .update({
        outstanding_balance: String(total.toFixed(2)),
        status: 'sent',
        paid_date: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('[undo-invoice-payment] Update failed:', invoiceId, updateError);
      return res.status(500).json({ error: 'Failed to reset invoice' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[undo-invoice-payment]', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
