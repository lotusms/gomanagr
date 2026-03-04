/**
 * Build the document payload expected by ProposalInvoiceDocument from API proposal/invoice row.
 */

/**
 * Build company object for ProposalInvoiceDocument from user account (and optional org).
 * Use for view/print dialogs. Account can have companyName, companyLogo, and from profile JSONB:
 * companyAddressLines (string[]), companyAddress (string), companyPhone, companyWebsite.
 * @param {Object|null} account - useOptionalUserAccount() result
 * @param {{ name?: string, logo_url?: string }|null} [org] - optional organization
 * @returns {{ name: string, logoUrl?: string, addressLines?: string[], phone?: string, website?: string }}
 */
export function buildCompanyForDocument(account, org = null) {
  const name = (org?.name || account?.companyName || 'Company').trim() || 'Company';
  const logoUrl = (org?.logo_url || account?.companyLogo || '').trim() || undefined;
  const addressLines = Array.isArray(account?.companyAddressLines)
    ? account.companyAddressLines.filter(Boolean)
    : account?.companyAddress
      ? [String(account.companyAddress).trim()].filter(Boolean)
      : undefined;
  const phone = (account?.companyPhone && String(account.companyPhone).trim()) || undefined;
  const website = (account?.companyWebsite && String(account.companyWebsite).trim()) || undefined;
  return {
    name,
    ...(logoUrl && { logoUrl }),
    ...(addressLines?.length > 0 && { addressLines }),
    ...(phone && { phone }),
    ...(website && { website }),
  };
}

function unformatNum(v) {
  if (v == null || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

export function buildProposalDocumentPayload(p) {
  const lineItems = Array.isArray(p?.line_items) ? p.line_items : [];
  let subtotal = 0;
  for (const row of lineItems) {
    const amt =
      row.amount != null
        ? unformatNum(row.amount)
        : unformatNum(row.quantity) * unformatNum(row.unit_price);
    subtotal += amt;
  }
  return {
    title: (p?.proposal_title || 'Proposal').trim(),
    number: (p?.proposal_number || '').trim(),
    dateCreated: p?.date_created || null,
    dateSent: p?.date_sent || null,
    expirationDate: p?.expiration_date || null,
    lineItems: lineItems.map((r) => ({
      item_name: r.item_name ?? '',
      description: r.description ?? '',
      quantity: r.quantity ?? '',
      unit_price: r.unit_price ?? '',
      amount:
        r.amount != null
          ? String(r.amount)
          : (unformatNum(r.quantity) * unformatNum(r.unit_price)).toFixed(2),
    })),
    scopeSummary: p?.scope_summary ?? '',
    terms: p?.terms ?? '',
    subtotal,
    tax: 0,
    discount: 0,
    total: subtotal,
    amountDue: subtotal,
  };
}

export function buildInvoiceDocumentPayload(inv) {
  const lineItems = Array.isArray(inv?.line_items) ? inv.line_items : [];
  let subtotal = 0;
  for (const row of lineItems) {
    const amt =
      row.amount != null
        ? unformatNum(row.amount)
        : unformatNum(row.quantity) * unformatNum(row.unit_price);
    subtotal += amt;
  }
  const taxNum = unformatNum(inv?.tax);
  const discountNum = unformatNum(inv?.discount);
  const total = inv?.total != null ? unformatNum(inv.total) : subtotal - discountNum + taxNum;
  return {
    title: (inv?.invoice_title || 'Invoice').trim(),
    number: (inv?.invoice_number || '').trim(),
    dateIssued: inv?.date_issued || null,
    dueDate: inv?.due_date || null,
    lineItems: lineItems.map((r) => ({
      item_name: r.item_name ?? '',
      description: r.description ?? '',
      quantity: r.quantity ?? '',
      unit_price: r.unit_price ?? '',
      amount:
        r.amount != null
          ? String(r.amount)
          : (unformatNum(r.quantity) * unformatNum(r.unit_price)).toFixed(2),
    })),
    subtotal,
    tax: taxNum,
    discount: discountNum,
    total,
    amountDue: inv?.outstanding_balance != null ? unformatNum(inv.outstanding_balance) : total,
    paymentMethod: inv?.payment_method ?? '',
    paidDate: inv?.paid_date || null,
  };
}
