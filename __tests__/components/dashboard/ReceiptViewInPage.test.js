/**
 * Unit tests for ReceiptViewInPage
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ReceiptViewInPage from '@/components/dashboard/ReceiptViewInPage';

describe('ReceiptViewInPage', () => {
  it('renders without crashing with minimal props', () => {
    const { container } = render(<ReceiptViewInPage document={{}} client={{}} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders Bill to with client name', () => {
    render(<ReceiptViewInPage document={{}} client={{ name: 'John Smith' }} />);
    expect(screen.getByText('Bill to')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('renders Receipt number', () => {
    render(
      <ReceiptViewInPage
        document={{ number: 'INV-100' }}
        client={{}}
      />
    );
    expect(screen.getByText('INV-100')).toBeInTheDocument();
  });

  it('renders line items table with section label', () => {
    render(
      <ReceiptViewInPage
        document={{ lineItems: [{ item_name: 'Consulting', quantity: 1, unit_price: '100', amount: '100' }] }}
        client={{}}
        lineItemsSectionLabel="Services"
      />
    );
    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByText('Consulting')).toBeInTheDocument();
  });
});
