/**
 * Unit tests for ReceiptViewContent
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ReceiptViewContent from '@/components/dashboard/ReceiptViewContent';

describe('ReceiptViewContent', () => {
  it('renders without crashing with minimal props', () => {
    const { container } = render(<ReceiptViewContent document={{}} company={{}} client={{}} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders company name in header when showHeader is true', () => {
    render(
      <ReceiptViewContent
        document={{}}
        company={{ name: 'Acme Inc' }}
        client={{}}
        showHeader
      />
    );
    expect(screen.getByText('Acme Inc')).toBeInTheDocument();
  });

  it('renders Bill to with client name', () => {
    render(
      <ReceiptViewContent
        document={{}}
        company={{}}
        client={{ name: 'Jane Doe' }}
      />
    );
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('renders receipt number when provided', () => {
    render(
      <ReceiptViewContent
        document={{ number: 'REC-001' }}
        company={{}}
        client={{}}
      />
    );
    expect(screen.getByText('REC-001')).toBeInTheDocument();
  });

  it('renders line items section label', () => {
    render(
      <ReceiptViewContent
        document={{ lineItems: [] }}
        company={{}}
        client={{}}
        lineItemsSectionLabel="Services"
      />
    );
    expect(screen.getByText('Services')).toBeInTheDocument();
  });
});
