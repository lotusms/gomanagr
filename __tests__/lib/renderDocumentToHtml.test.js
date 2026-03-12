/**
 * Unit tests for lib/renderDocumentToHtml.js
 */

const mockRenderToStaticMarkup = jest.fn(() => '<div>Document</div>');

jest.mock('react-dom/server', () => ({
  renderToStaticMarkup: (el) => mockRenderToStaticMarkup(el),
}));

jest.mock('@/components/documents/ProposalInvoiceDocument', () => {
  return function MockProposalInvoiceDocument(props) {
    return null;
  };
});

const React = require('react');

describe('renderDocumentToHtml', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRenderToStaticMarkup.mockReturnValue('<div>Document</div>');
  });

  it('returns a full HTML document string with doctype and body', () => {
    const { renderDocumentToHtml } = require('@/lib/renderDocumentToHtml');
    const result = renderDocumentToHtml({ type: 'invoice', document: {} });
    expect(result).toMatch(/^<!DOCTYPE html>/i);
    expect(result).toContain('<html');
    expect(result).toContain('</html>');
    expect(result).toContain('<body');
    expect(result).toContain('</body>');
    expect(result).toContain('<div>Document</div>');
  });

  it('uses default type proposal and currency USD when not provided', () => {
    const { renderDocumentToHtml } = require('@/lib/renderDocumentToHtml');
    renderDocumentToHtml({});
    expect(mockRenderToStaticMarkup).toHaveBeenCalled();
    const element = mockRenderToStaticMarkup.mock.calls[0][0];
    expect(element.props.type).toBe('proposal');
    expect(element.props.currency).toBe('USD');
  });

  it('sets title to Invoice when type is invoice', () => {
    const { renderDocumentToHtml } = require('@/lib/renderDocumentToHtml');
    const result = renderDocumentToHtml({ type: 'invoice', document: {} });
    expect(result).toContain('<title>Invoice</title>');
  });

  it('appends document number to title when document.number is provided', () => {
    const { renderDocumentToHtml } = require('@/lib/renderDocumentToHtml');
    const result = renderDocumentToHtml({ type: 'invoice', document: { number: 'INV-001' } });
    expect(result).toContain('<title>Invoice INV-001</title>');
  });
});
