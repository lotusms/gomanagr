/**
 * Shared document view for Proposals and Invoices.
 * Renders a print/email-ready layout with company branding, client block, line items, and totals.
 * Use for: browser print (React), email body (render to static HTML via renderDocumentToHtml).
 *
 * Props:
 * - type: 'proposal' | 'invoice'
 * - company: { name, logoUrl?, addressLines?: string[], phone?, website? }
 * - client: { name, email?, contactName?, addressLines?: string[], address?: string }
 * - document: see shape below
 * - currency: string (e.g. 'USD')
 *
 * Document shape (proposal): title, number, dateCreated?, dateSent?, expirationDate?, lineItems[], scopeSummary?, terms?, subtotal, tax, discount, total
 * Document shape (invoice): title, number, dateIssued?, dueDate?, lineItems[], subtotal, tax, discount, total, amountDue?, paymentMethod?, paidDate?
 */

const BORDER_COLOR = '#1e3a5f';
const ACCENT_COLOR = '#2563eb';
const TEXT_COLOR = '#111827';
const MUTED_COLOR = '#6b7280';

function formatMoney(value, currency = 'USD') {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''));
  if (Number.isNaN(n)) return '—';
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  return `${sym}${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const cellStyle = {
  padding: '4px 8px',
  borderBottom: `1px dotted ${BORDER_COLOR}`,
  textAlign: 'right',
  color: TEXT_COLOR,
  fontSize: '10pt',
};

export default function ProposalInvoiceDocument({ type, company = {}, client = {}, document: doc = {}, currency = 'USD', lineItemsSectionLabel = 'Services' }) {
  const isProposal = type === 'proposal';
  const title = isProposal ? 'Proposal' : 'Invoice';
  const lineItems = Array.isArray(doc.lineItems) ? doc.lineItems : [];
  const subtotal = Number(doc.subtotal) || 0;
  const taxNum = Number(doc.tax) || 0;
  const discountNum = Number(doc.discount) || 0;
  const total = Number(doc.total) ?? (subtotal - discountNum + taxNum);
  const addressLines = Array.isArray(company.addressLines) ? company.addressLines : (company.address ? [company.address] : []);
  const clientAddressLines = Array.isArray(client.addressLines) ? client.addressLines.filter(Boolean) : [];
  const clientAddressSingle = clientAddressLines.length === 0 && client.address ? client.address : null;

  const wrapperStyle = {
    width: '8.5in',
    minHeight: '11in',
    margin: 0,
    padding: '0.35in 0.4in',
    borderTop: `3px solid ${BORDER_COLOR}`,
    borderRight: `3px solid ${BORDER_COLOR}`,
    borderBottom: `3px solid ${BORDER_COLOR}`,
    borderLeft: `3px solid ${BORDER_COLOR}`,
    boxSizing: 'border-box',
    overflow: 'visible',
    backgroundColor: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '11pt',
    color: TEXT_COLOR,
    lineHeight: 1.4,
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '14px',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    border: `1px solid #e2e8f0`,
    minHeight: '56px',
  };

  const companyColumnStyle = {
    flex: '0 1 auto',
    maxWidth: '280px',
    fontSize: '11pt',
    color: TEXT_COLOR,
    lineHeight: 1.5,
  };

  const companyLabelStyle = {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: MUTED_COLOR,
    marginBottom: '6px',
  };

  const logoWrapperStyle = {
    display: 'block',
    marginBottom: '8px',
    minHeight: '32px',
  };

  const logoImgStyle = {
    display: 'block',
    maxHeight: '36px',
    maxWidth: '160px',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
    verticalAlign: 'middle',
  };

  const companyNameStyle = {
    fontWeight: 700,
    fontSize: '12pt',
    marginBottom: '2px',
    color: TEXT_COLOR,
  };

  const companyAddressStyle = {
    marginBottom: '1px',
    fontSize: '10pt',
    color: TEXT_COLOR,
  };

  const headerTitleStyle = {
    margin: 0,
    fontSize: '13pt',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: BORDER_COLOR,
    textAlign: 'right',
    flexShrink: 0,
  };

  const metaGridStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px',
    marginBottom: '16px',
  };

  const billToStyle = {
    flex: '1 1 50%',
  };

  const metaStyle = {
    flex: '1 1 50%',
    textAlign: 'right',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '8px',
  };

  const sectionLabelStyle = {
    fontWeight: 700,
    fontSize: '10pt',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: TEXT_COLOR,
    marginBottom: '4px',
  };

  return (
    <div style={wrapperStyle}>
      <header style={headerStyle}>
        <div style={companyColumnStyle}>
          {company.logoUrl && (
            <div style={logoWrapperStyle}>
              <img
                src={company.logoUrl}
                alt=""
                style={logoImgStyle}
              />
            </div>
          )}
          <div style={companyNameStyle}>{company.name || 'Company'}</div>
          {addressLines.filter(Boolean).length > 0 && (
            <div style={companyAddressStyle}>
              {addressLines.filter(Boolean).join(', ')}
            </div>
          )}
          {company.phone && <div style={{ marginBottom: '1px', fontSize: '10pt' }}>{company.phone}</div>}
          {company.website && <div style={{ fontSize: '10pt' }}>{company.website}</div>}
        </div>
        <h1 style={headerTitleStyle}>{title}</h1>
      </header>

      <div style={metaGridStyle}>
        <div style={billToStyle}>
          <div style={sectionLabelStyle}>Bill to</div>
          <div style={{ fontWeight: 600 }}>{client.name || '—'}</div>
          {clientAddressLines.length > 0 && (
            <div style={{ marginTop: '2px', marginBottom: '2px' }}>
              {clientAddressLines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
          {clientAddressSingle && (
            <div style={{ marginTop: '2px', marginBottom: '2px' }}>{clientAddressSingle}</div>
          )}
          {client.contactName && client.contactName !== client.name && <div>{client.contactName}</div>}
          {client.email && <div>{client.email}</div>}
        </div>
        <div style={metaStyle}>
          <div style={{ marginBottom: '4px' }}>
            <strong>{isProposal ? 'Proposal number:' : 'Invoice number:'}</strong> {doc.number || '—'}
          </div>
          {isProposal && (
            <>
              {doc.dateCreated && (
                <div style={{ marginBottom: '2px' }}><strong>Date created:</strong> {formatDate(doc.dateCreated)}</div>
              )}
              {doc.dateSent && (
                <div style={{ marginBottom: '2px' }}><strong>Date sent:</strong> {formatDate(doc.dateSent)}</div>
              )}
              {doc.expirationDate && (
                <div style={{ marginBottom: '2px' }}><strong>Expiration:</strong> {formatDate(doc.expirationDate)}</div>
              )}
            </>
          )}
          {!isProposal && (
            <>
              {doc.dateIssued && (
                <div style={{ marginBottom: '2px' }}><strong>Invoice date:</strong> {formatDate(doc.dateIssued)}</div>
              )}
              {doc.dueDate && (
                <div style={{ marginBottom: '2px' }}><strong>Payment due:</strong> {formatDate(doc.dueDate)}</div>
              )}
            </>
          )}
          <div style={{ marginTop: '8px' }}>
            <strong>Amount due ({currency}):</strong> {formatMoney(doc.amountDue ?? total, currency)}
          </div>
        </div>
      </div>

      <div style={sectionLabelStyle}>{lineItemsSectionLabel}</div>
      <div style={{ borderBottom: `1px dotted ${BORDER_COLOR}`, marginBottom: '8px' }} />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...cellStyle, textAlign: 'left', width: '40%' }}>Item</th>
            <th style={{ ...cellStyle, width: '15%' }}>Quantity</th>
            <th style={{ ...cellStyle, width: '22%' }}>Price</th>
            <th style={{ ...cellStyle, width: '23%' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((row, i) => (
            <tr key={i}>
              <td style={{ ...cellStyle, textAlign: 'left' }}>
                <div>{row.item_name || '—'}</div>
                {row.description && <div style={{ fontSize: '9pt', color: MUTED_COLOR }}>{row.description}</div>}
              </td>
              <td style={cellStyle}>{row.quantity != null ? row.quantity : '—'}</td>
              <td style={cellStyle}>{formatMoney(row.unit_price, currency)}</td>
              <td style={cellStyle}>{formatMoney(row.amount, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderBottom: `1px dotted ${BORDER_COLOR}`, margin: '12px 0' }} />

      <div style={{ textAlign: 'right', marginBottom: '8px' }}>
        <strong>Subtotal:</strong> {formatMoney(subtotal, currency)}
      </div>
      <div style={{ textAlign: 'right', marginBottom: '8px' }}>
        <strong>Discount:</strong> {formatMoney(-discountNum, currency)}
      </div>
      <div style={{ textAlign: 'right', marginBottom: '8px' }}>
        <strong>Tax/VAT:</strong> {formatMoney(taxNum, currency)}
      </div>
      <div style={{ textAlign: 'right', fontSize: '12pt', fontWeight: 700, marginTop: '10px' }}>
        Total: {formatMoney(total, currency)}
      </div>

      {doc.scopeSummary && (
        <>
          <div style={{ ...sectionLabelStyle, marginTop: '24px' }}>Scope summary</div>
          <div style={{ whiteSpace: 'pre-wrap', marginTop: '4px' }}>{doc.scopeSummary}</div>
        </>
      )}

      {doc.terms && (
        <>
          <div style={{ ...sectionLabelStyle, marginTop: '24px' }}>Terms</div>
          <div style={{ whiteSpace: 'pre-wrap', marginTop: '4px' }}>{doc.terms}</div>
        </>
      )}

      {!isProposal && (doc.paymentMethod || doc.paidDate) && (
        <div style={{ marginTop: '16px', textAlign: 'right', fontSize: '10pt', color: MUTED_COLOR }}>
          {doc.paidDate && <div>Payment on {formatDate(doc.paidDate)}{doc.paymentMethod ? ` using ${doc.paymentMethod}` : ''}</div>}
          {doc.amountDue != null && Number(doc.amountDue) === 0 && <div><strong>Amount due: {formatMoney(0, currency)}</strong></div>}
        </div>
      )}
    </div>
  );
}

export { formatMoney, formatDate };
