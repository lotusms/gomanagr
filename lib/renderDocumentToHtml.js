/**
 * Renders ProposalInvoiceDocument to a full HTML string for email or print.
 * Uses React server rendering. Call from API routes or getServerSideProps.
 *
 * @param {Object} opts - { type, company, client, document, currency, payUrl?, amountPaid? }
 *   type: 'proposal' | 'invoice' | 'receipt'
 *   amountPaid: for type 'receipt', the amount paid (shown with remaining balance)
 * @returns {string} Full HTML document string
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ProposalInvoiceDocument from '@/components/documents/ProposalInvoiceDocument';

export function renderDocumentToHtml(opts) {
  const { type = 'proposal', company = {}, client = {}, document: doc = {}, currency = 'USD', payUrl, amountPaid } = opts;
  const element = React.createElement(ProposalInvoiceDocument, {
    type,
    company,
    client,
    document: doc,
    currency,
    payUrl,
    ...(type === 'receipt' && amountPaid != null && { amountPaid }),
  });
  const body = renderToStaticMarkup(element);
  const pageTitle = type === 'proposal' ? 'Proposal' : type === 'receipt' ? 'Receipt' : 'Invoice';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${pageTitle}${doc.number ? ` ${doc.number}` : ''}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">
${body}
</body>
</html>`;
}
