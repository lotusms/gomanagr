/**
 * Returns payment history for a single invoice (one row per payment).
 * POST body: { userId, organizationId?, invoiceId }
 * Used by InvoicePaymentSummary to show timeline of payments.
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const { userId, organizationId, invoiceId } = req.body || {};
  if (!userId || !invoiceId) {
    return res.status(400).json({ error: 'Missing userId or invoiceId' });
  }

  try {
    // Verify user can access this invoice (same rules as get-invoices).
    let invQuery = supabaseAdmin
      .from('client_invoices')
      .select('id')
      .eq('id', invoiceId)
      .limit(1);
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
      invQuery = invQuery.eq('organization_id', organizationId);
    } else {
      invQuery = invQuery.eq('user_id', userId).is('organization_id', null);
    }
    const { data: inv, error: invError } = await invQuery.maybeSingle();
    if (invError || !inv) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const { data: payments, error } = await supabaseAdmin
      .from('invoice_payments')
      .select('id, invoice_id, amount_cents, currency, paid_at')
      .eq('invoice_id', invoiceId)
      .order('paid_at', { ascending: true });

    if (error) {
      console.error('[get-invoice-payments]', error);
      return res.status(500).json({ error: 'Failed to load payments' });
    }

    return res.status(200).json({ payments: payments || [] });
  } catch (err) {
    console.error('[get-invoice-payments]', err);
    return res.status(500).json({ error: 'Failed to load payments' });
  }
}
