/**
 * Build the document payload expected by ProposalInvoiceDocument from API proposal/invoice row.
 */

/**
 * Build company object for ProposalInvoiceDocument from user account (and optional org).
 * When org is provided, uses org name, logo, address_line_1/2, city, state, postal_code, country, phone, website.
 * Otherwise uses account (companyName, companyLogo, profile/organizationAddress, etc.).
 * @param {Object|null} account - useOptionalUserAccount() result
 * @param {{ name?: string, logo_url?: string, address_line_1?: string, address_line_2?: string, city?: string, state?: string, postal_code?: string, country?: string, phone?: string, website?: string }|null} [org] - optional organization
 * @returns {{ name: string, logoUrl?: string, addressLines?: string[], phone?: string, website?: string }}
 */
export function buildCompanyForDocument(account, org = null) {
  const name = (org?.name || account?.companyName || 'Company').trim() || 'Company';
  const logoUrl = (org?.logo_url || account?.companyLogo || '').trim() || undefined;

  let addressLines;
  if (org?.address_line_1?.trim()) {
    addressLines = [org.address_line_1.trim()];
    if (org.address_line_2?.trim()) addressLines.push(org.address_line_2.trim());
    const cityStateZip = [org.city, org.state, org.postal_code].filter(Boolean).map((s) => String(s).trim()).join(', ');
    if (cityStateZip) addressLines.push(cityStateZip);
    if (org.country?.trim()) addressLines.push(org.country.trim());
  } else {
    addressLines = Array.isArray(account?.companyAddressLines)
      ? account.companyAddressLines.filter(Boolean)
      : account?.companyAddress
        ? [String(account.companyAddress).trim()].filter(Boolean)
        : undefined;
    if (!addressLines?.length && account?.organizationAddress?.trim()) {
      addressLines = [account.organizationAddress.trim()];
      if (account.organizationAddress2?.trim()) addressLines.push(account.organizationAddress2.trim());
    }
  }

  const phone = (org?.phone && String(org.phone).trim())
    || (account?.companyPhone && String(account.companyPhone).trim())
    || (account?.organizationPhone && String(account.organizationPhone).trim())
    || undefined;
  const website = (org?.website && String(org.website).trim())
    || (account?.companyWebsite && String(account.companyWebsite).trim())
    || undefined;
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
    tax: unformatNum(p?.tax),
    discount: unformatNum(p?.discount),
    total: subtotal - unformatNum(p?.discount) + unformatNum(p?.tax),
    amountDue: subtotal - unformatNum(p?.discount) + unformatNum(p?.tax),
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
    scopeSummary: inv?.scope_summary ?? '',
    terms: inv?.terms ?? '',
  };
}
