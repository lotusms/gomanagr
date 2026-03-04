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
  padding: '6px 10px',
  borderBottom: `1px dotted ${BORDER_COLOR}`,
  textAlign: 'right',
  color: TEXT_COLOR,
  fontSize: '14px',
};

export default function ProposalInvoiceDocument({ type, company = {}, client = {}, document: doc = {}, currency = 'USD' }) {
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
    padding: '28px 32px',
    borderTop: `4px solid ${BORDER_COLOR}`,
    borderRight: `4px solid ${BORDER_COLOR}`,
    borderBottom: `4px solid ${BORDER_COLOR}`,
    borderLeft: `4px solid ${BORDER_COLOR}`,
    boxSizing: 'border-box',
    overflow: 'visible',
    backgroundColor: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    color: TEXT_COLOR,
    lineHeight: 1.5,
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    padding: '20px 24px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: `1px solid #e2e8f0`,
    minHeight: '80px',
  };

  const companyColumnStyle = {
    flex: '0 1 auto',
    maxWidth: '320px',
    fontSize: '13px',
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
    maxHeight: '48px',
    maxWidth: '200px',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
    verticalAlign: 'middle',
  };

  const companyNameStyle = {
    fontWeight: 700,
    fontSize: '16px',
    marginBottom: '4px',
    color: TEXT_COLOR,
  };

  const companyAddressStyle = {
    marginBottom: '2px',
    fontSize: '13px',
    color: TEXT_COLOR,
  };

  const titleFrameStyle = {
    margin: '32px 0 28px',
    paddingBottom: '12px',
    borderBottom: `1px solid #e5e7eb`,
  };

  const titleTextStyle = {
    margin: 0,
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: MUTED_COLOR,
  };

  const metaGridStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '24px',
    marginBottom: '24px',
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
    fontSize: '12px',
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
              {addressLines.filter(Boolean).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
          {company.phone && <div style={{ marginBottom: '2px', fontSize: '13px' }}>{company.phone}</div>}
          {company.website && <div style={{ fontSize: '13px' }}>{company.website}</div>}
        </div>
      </header>

      <div style={titleFrameStyle}>
        <h1 style={titleTextStyle}>{title}</h1>
      </div>

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

      <div style={sectionLabelStyle}>Services</div>
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
                {row.description && <div style={{ fontSize: '12px', color: MUTED_COLOR }}>{row.description}</div>}
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
      {discountNum > 0 && (
        <div style={{ textAlign: 'right', marginBottom: '8px' }}>
          <strong>Discount:</strong> {formatMoney(-discountNum, currency)}
        </div>
      )}
      {taxNum > 0 && (
        <div style={{ textAlign: 'right', marginBottom: '8px' }}>
          <strong>Tax:</strong> {formatMoney(taxNum, currency)}
        </div>
      )}
      <div style={{ textAlign: 'right', fontSize: '16px', fontWeight: 700, marginTop: '12px' }}>
        Total: {formatMoney(total, currency)}
      </div>

      {isProposal && doc.scopeSummary && (
        <>
          <div style={{ ...sectionLabelStyle, marginTop: '24px' }}>Scope summary</div>
          <div style={{ whiteSpace: 'pre-wrap', marginTop: '4px' }}>{doc.scopeSummary}</div>
        </>
      )}

      {isProposal && doc.terms && (
        <>
          <div style={{ ...sectionLabelStyle, marginTop: '24px' }}>Terms</div>
          <div style={{ whiteSpace: 'pre-wrap', marginTop: '4px' }}>{doc.terms}</div>
        </>
      )}

      {!isProposal && (doc.paymentMethod || doc.paidDate) && (
        <div style={{ marginTop: '24px', textAlign: 'right', fontSize: '13px', color: MUTED_COLOR }}>
          {doc.paidDate && <div>Payment on {formatDate(doc.paidDate)}{doc.paymentMethod ? ` using ${doc.paymentMethod}` : ''}</div>}
          {doc.amountDue != null && Number(doc.amountDue) === 0 && <div><strong>Amount due: {formatMoney(0, currency)}</strong></div>}
        </div>
      )}
    </div>
  );
}

export { formatMoney, formatDate };
