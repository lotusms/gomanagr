/**
 * Unit test for invoices list redirect: paid/partially_paid invoices should open in receipts (receipts?open=id),
 * others should go to edit page.
 */

describe('Invoices list redirect logic', () => {
  it('redirects paid and partially_paid to receipts?open=id', () => {
    const handleSelectInvoice = (invoiceId, invoices) => {
      const inv = invoices.find((i) => i.id === invoiceId);
      if (inv && (inv.status === 'paid' || inv.status === 'partially_paid')) {
        return `/dashboard/receipts?open=${encodeURIComponent(invoiceId)}`;
      }
      return `/dashboard/invoices/${invoiceId}/edit`;
    };
    const invoices = [
      { id: 'inv-paid', status: 'paid' },
      { id: 'inv-partial', status: 'partially_paid' },
      { id: 'inv-draft', status: 'draft' },
      { id: 'inv-sent', status: 'sent' },
    ];
    expect(handleSelectInvoice('inv-paid', invoices)).toBe('/dashboard/receipts?open=inv-paid');
    expect(handleSelectInvoice('inv-partial', invoices)).toBe('/dashboard/receipts?open=inv-partial');
    expect(handleSelectInvoice('inv-draft', invoices)).toBe('/dashboard/invoices/inv-draft/edit');
    expect(handleSelectInvoice('inv-sent', invoices)).toBe('/dashboard/invoices/inv-sent/edit');
  });
});
