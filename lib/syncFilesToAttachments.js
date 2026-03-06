/**
 * Ensures that file URLs from contracts, proposals, invoices, or emails are mirrored
 * as client_attachments so they appear in the Attachments section and can be edited.
 * Creates attachment rows with status draft and minimal/blank fields when missing.
 *
 * @param {object} supabaseAdmin - Supabase client (service role)
 * @param {object} opts
 * @param {string} opts.clientId
 * @param {string} opts.userId
 * @param {string|null} opts.organizationId
 * @param {string[]|{url: string, name?: string}[]} opts.fileUrls - URLs or { url, name } objects
 * @param {string|null} [opts.linkedContractId]
 * @param {string|null} [opts.linkedProposalId]
 * @param {string|null} [opts.linkedInvoiceId]
 * @param {string|null} [opts.linkedEmailId]
 * @param {string|null} [opts.linkedProjectId]
 */
async function ensureAttachmentsFromFiles(supabaseAdmin, opts) {
  const {
    clientId,
    userId,
    organizationId,
    fileUrls,
    linkedContractId = null,
    linkedProposalId = null,
    linkedInvoiceId = null,
    linkedEmailId = null,
    linkedProjectId = null,
  } = opts;

  if (!clientId || !userId || !fileUrls || fileUrls.length === 0) return;

  const linkKey =
    linkedContractId ? 'linked_contract_id' :
    linkedProposalId ? 'linked_proposal_id' :
    linkedInvoiceId ? 'linked_invoice_id' :
    linkedEmailId ? 'linked_email_id' :
    linkedProjectId ? 'linked_project_id' : null;
  const linkId = linkedContractId || linkedProposalId || linkedInvoiceId || linkedEmailId || linkedProjectId;
  if (!linkKey || !linkId) return;

  function fileNameFromUrl(url) {
    try {
      const s = String(url).trim();
      if (s.startsWith('http')) {
        const path = new URL(s).pathname;
        const segment = path.split('/').filter(Boolean).pop() || '';
        return decodeURIComponent(segment) || 'file';
      }
      return s || 'file';
    } catch {
      return 'file';
    }
  }

  const items = fileUrls.map((u) => {
    if (typeof u === 'object' && u && u.url) {
      return { url: String(u.url).trim(), fileName: u.name ? String(u.name).trim() : fileNameFromUrl(u.url) };
    }
    const url = String(u).trim();
    return { url, fileName: fileNameFromUrl(url) };
  }).filter((i) => i.url);

  for (const { url, fileName } of items) {
    const { data: existing } = await supabaseAdmin
      .from('client_attachments')
      .select('id')
      .eq('client_id', clientId)
      .eq('file_url', url)
      .eq(linkKey, linkId)
      .limit(1)
      .maybeSingle();

    if (existing) continue;

    const fileType = (fileName.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'other';
    const row = {
      client_id: clientId,
      user_id: userId,
      organization_id: organizationId || null,
      file_name: fileName || 'file',
      file_type: fileType === 'pdf' ? 'pdf' : fileType === 'doc' || fileType === 'docx' ? 'document' : fileType || 'other',
      description: '',
      upload_date: null,
      related_item: null,
      version: 'draft',
      file_url: url,
      [linkKey]: linkId,
    };

    await supabaseAdmin.from('client_attachments').insert(row);
  }
}

module.exports = { ensureAttachmentsFromFiles };
