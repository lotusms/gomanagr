/**
 * Renders ProposalInvoiceDocument to a full HTML string for email or print.
 * Uses React server rendering. Call from API routes or getServerSideProps.
 *
 * @param {Object} opts - { type, company, client, document, currency }
 * @returns {string} Full HTML document string
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ProposalInvoiceDocument from '@/components/documents/ProposalInvoiceDocument';

export function renderDocumentToHtml(opts) {
  const { type = 'proposal', company = {}, client = {}, document: doc = {}, currency = 'USD' } = opts;
  const element = React.createElement(ProposalInvoiceDocument, {
    type,
    company,
    client,
    document: doc,
    currency,
  });
  const body = renderToStaticMarkup(element);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${type === 'proposal' ? 'Proposal' : 'Invoice'}${doc.number ? ` ${doc.number}` : ''}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">
${body}
</body>
</html>`;
}
