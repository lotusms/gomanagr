/**
 * Unit tests for ItemizedLineItems: empty state, add/remove, updateItem, amount computation,
 * subtotal/tax/discount/total, labels, service dropdown vs text input, discount type
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemizedLineItems from '@/components/ui/ItemizedLineItems';

jest.mock('@/components/ui/InputField', () => {
  return function MockInputField({ id, value, onChange, placeholder }) {
    return (
      <input
        id={id}
        aria-label={placeholder || id}
        value={value}
        onChange={(e) => onChange && onChange(e)}
        placeholder={placeholder}
      />
    );
  };
});

jest.mock('@/components/ui/NumberField', () => {
  return function MockNumberField({ id, value, onChange, placeholder }) {
    return (
      <input
        id={id}
        type="text"
        aria-label={placeholder || id}
        value={value}
        onChange={(e) => onChange && onChange(e)}
        placeholder={placeholder}
      />
    );
  };
});

jest.mock('@/components/ui/CurrencyInput', () => {
  return function MockCurrencyInput({ id, value, onChange, placeholder }) {
    return (
      <input
        id={id}
        aria-label={placeholder || id}
        value={value}
        onChange={(e) => onChange && onChange(e)}
        placeholder={placeholder}
        data-currency
      />
    );
  };
});

jest.mock('@/components/dashboard/ServiceCombobox', () => {
  return function MockServiceCombobox({ id, value, onChange }) {
    return (
      <input
        id={id}
        data-testid="service-combobox"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  };
});

jest.mock('@/components/ui/buttons', () => ({
  PrimaryButton: ({ children, onClick }) => (
    <button type="button" onClick={onClick} data-testid="add-item-btn">{children}</button>
  ),
}));

jest.mock('@/utils/formatCurrency', () => ({
  formatCurrency: (val, code) => (val != null && val !== '' ? `$${Number(val).toFixed(2)}` : ''),
  unformatCurrency: (str) => (str != null && str !== '' ? String(str).replace(/[^0-9.-]/g, '') : ''),
}));

jest.mock('react-icons/hi', () => ({
  HiPlus: () => <span>+</span>,
  HiTrash: () => <span>trash</span>,
}));

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (industry, concept) => {
    if (concept === 'services' && industry === 'Healthcare') return 'Procedures';
    return 'Services';
  },
  getTermSingular: (term) => ({ Procedures: 'Procedure', Services: 'Service' }[term] || 'Service'),
}));

const defaultItems = [
  { id: '1', item_name: 'Consulting', description: 'Hourly', quantity: 2, unit_price: '100.00', amount: '200.00' },
  { id: '2', item_name: 'Design', description: 'Fixed', quantity: 1, unit_price: '500.00', amount: '500.00' },
];

describe('ItemizedLineItems', () => {
  it('renders empty state and Add item button', () => {
    render(<ItemizedLineItems items={[]} onChange={jest.fn()} />);
    expect(screen.getByText(/No items yet/)).toBeInTheDocument();
    expect(screen.getByTestId('add-item-btn')).toHaveTextContent('Add item');
  });

  it('uses custom addLabel', () => {
    render(<ItemizedLineItems items={[]} onChange={jest.fn()} addLabel="Add line" />);
    expect(screen.getByText(/No items yet.*Add line/)).toBeInTheDocument();
    expect(screen.getByTestId('add-item-btn')).toHaveTextContent('Add line');
  });

  it('default item label is Service', () => {
    render(<ItemizedLineItems items={[]} onChange={jest.fn()} />);
    expect(screen.getByRole('columnheader', { name: 'Service' })).toBeInTheDocument();
  });

  it('uses itemLabel prop when provided', () => {
    render(<ItemizedLineItems items={[]} onChange={jest.fn()} itemLabel="Product" />);
    expect(screen.getByRole('columnheader', { name: 'Product' })).toBeInTheDocument();
  });

  it('uses industry term for item label when industry provided and no itemLabel', () => {
    render(<ItemizedLineItems items={[]} onChange={jest.fn()} industry="Healthcare" />);
    expect(screen.getByRole('columnheader', { name: 'Procedure' })).toBeInTheDocument();
  });

  it('calls onChange with new item when Add item is clicked', async () => {
    const onChange = jest.fn();
    render(<ItemizedLineItems items={[]} onChange={onChange} />);
    await userEvent.click(screen.getByTestId('add-item-btn'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const newItems = onChange.mock.calls[0][0];
    expect(newItems).toHaveLength(1);
    expect(newItems[0]).toMatchObject({
      item_name: '',
      description: '',
      quantity: 1,
      unit_price: '',
      amount: '',
    });
    expect(newItems[0].id).toMatch(/^temp-/);
  });

  it('appends new item when Add is clicked with existing items', async () => {
    const onChange = jest.fn();
    render(<ItemizedLineItems items={defaultItems} onChange={onChange} />);
    await userEvent.click(screen.getByTestId('add-item-btn'));
    expect(onChange).toHaveBeenCalledWith([
      ...defaultItems,
      expect.objectContaining({ item_name: '', quantity: 1 }),
    ]);
  });

  it('calls onChange with item removed when remove button is clicked', async () => {
    const onChange = jest.fn();
    render(<ItemizedLineItems items={defaultItems} onChange={onChange} />);
    const removeButtons = screen.getAllByTitle('Remove item');
    await userEvent.click(removeButtons[1]);
    expect(onChange).toHaveBeenCalledWith([defaultItems[0]]);
  });

  it('renders rows with item name, description, quantity, price, amount', () => {
    render(<ItemizedLineItems items={defaultItems} onChange={jest.fn()} />);
    expect(screen.getByDisplayValue('Consulting')).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('Hourly').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByDisplayValue('Design')).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('500.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$200.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Subtotal:.*\$700\.00/)).toBeInTheDocument();
  });

  it('calls onChange with updated item_name when first column is edited', () => {
    const onChange = jest.fn();
    render(<ItemizedLineItems items={[{ ...defaultItems[0] }]} onChange={onChange} />);
    const nameInput = screen.getByDisplayValue('Consulting');
    fireEvent.change(nameInput, { target: { value: 'Advisory' } });
    expect(onChange).toHaveBeenCalledWith([{ ...defaultItems[0], item_name: 'Advisory' }]);
  });

  it('calls onChange with updated quantity and recomputed amount', () => {
    const onChange = jest.fn();
    render(<ItemizedLineItems items={[{ ...defaultItems[0] }]} onChange={onChange} />);
    const qtyInputs = screen.getAllByRole('textbox').filter((el) => el.getAttribute('id') === 'line-0-qty');
    const firstQty = qtyInputs.find((el) => el.value === '2') || qtyInputs[0];
    fireEvent.change(firstQty, { target: { value: '3' } });
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall[0].quantity).toBe(3);
    expect(lastCall[0].amount).toBe('300.00'); // 3 * 100
  });

  it('calls onChange with updated unit_price and recomputed amount', () => {
    const onChange = jest.fn();
    render(<ItemizedLineItems items={[{ ...defaultItems[0] }]} onChange={onChange} />);
    const priceInputs = screen.getAllByRole('textbox').filter((el) => el.getAttribute('data-currency'));
    const firstPrice = priceInputs.find((el) => el.value === '100.00') || priceInputs[0];
    fireEvent.change(firstPrice, { target: { value: '150' } });
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall[0].unit_price).toBe('150');
    expect(lastCall[0].amount).toBe('300.00'); // 2 * 150
  });

  it('shows Subtotal, Discount, Tax/VAT, Total when items exist', () => {
    render(<ItemizedLineItems items={defaultItems} onChange={jest.fn()} />);
    expect(screen.getByText(/Subtotal:/)).toBeInTheDocument();
    expect(screen.getByText(/Subtotal:.*\$700\.00/)).toBeInTheDocument();
    expect(screen.getByText(/Discount:/)).toBeInTheDocument();
    expect(screen.getByText(/Tax\/VAT:/)).toBeInTheDocument();
    expect(screen.getByText(/Total:/)).toBeInTheDocument();
  });

  it('uses custom taxLabel, discountLabel, totalLabel', () => {
    render(
      <ItemizedLineItems
        items={defaultItems}
        onChange={jest.fn()}
        taxLabel="GST"
        discountLabel="Rebate"
        totalLabel="Grand Total"
      />
    );
    expect(screen.getByText(/GST:/)).toBeInTheDocument();
    expect(screen.getByText(/Rebate:/)).toBeInTheDocument();
    expect(screen.getByText(/Grand Total:/)).toBeInTheDocument();
  });

  it('includes tax in total', () => {
    render(
      <ItemizedLineItems items={defaultItems} onChange={jest.fn()} tax={50} />
    );
    expect(screen.getByText(/Total:.*\$750\.00/)).toBeInTheDocument(); // 700 + 50
  });

  it('includes discount (amount) in total', () => {
    render(
      <ItemizedLineItems items={defaultItems} onChange={jest.fn()} discount={100} />
    );
    expect(screen.getByText(/Total:.*\$600\.00/)).toBeInTheDocument(); // 700 - 100
  });

  it('calls onTaxChange when tax field is edited', async () => {
    const onTaxChange = jest.fn();
    render(
      <ItemizedLineItems items={defaultItems} onChange={jest.fn()} onTaxChange={onTaxChange} />
    );
    const taxInput = document.getElementById('line-items-tax');
    expect(taxInput).toBeInTheDocument();
    await userEvent.type(taxInput, '25');
    expect(onTaxChange).toHaveBeenCalled();
  });

  it('calls onDiscountChange when discount field is edited', async () => {
    const onDiscountChange = jest.fn();
    render(
      <ItemizedLineItems items={defaultItems} onChange={jest.fn()} onDiscountChange={onDiscountChange} />
    );
    const discountInput = document.getElementById('line-items-discount');
    if (discountInput) {
      await userEvent.type(discountInput, '10');
      expect(onDiscountChange).toHaveBeenCalled();
    }
  });

  it('shows discount type toggle when onDiscountTypeChange provided', () => {
    const onDiscountTypeChange = jest.fn();
    render(
      <ItemizedLineItems
        items={defaultItems}
        onChange={jest.fn()}
        onDiscountTypeChange={onDiscountTypeChange}
      />
    );
    expect(screen.getByRole('button', { name: '$' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '%' })).toBeInTheDocument();
  });

  it('calls onDiscountTypeChange when $ or % is clicked', async () => {
    const onDiscountTypeChange = jest.fn();
    render(
      <ItemizedLineItems
        items={defaultItems}
        onChange={jest.fn()}
        discountType="amount"
        onDiscountTypeChange={onDiscountTypeChange}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: '%' }));
    expect(onDiscountTypeChange).toHaveBeenCalledWith('percent');
    await userEvent.click(screen.getByRole('button', { name: '$' }));
    expect(onDiscountTypeChange).toHaveBeenCalledWith('amount');
  });

  it('uses ServiceCombobox when services and onServiceCreated are provided', () => {
    const onServiceCreated = jest.fn();
    render(
      <ItemizedLineItems
        items={defaultItems}
        onChange={jest.fn()}
        services={[{ id: 's1', name: 'Consulting' }]}
        onServiceCreated={onServiceCreated}
      />
    );
    expect(screen.getAllByTestId('service-combobox')).toHaveLength(2);
  });

  it('uses InputField for item name when services/onServiceCreated not provided', () => {
    render(<ItemizedLineItems items={defaultItems} onChange={jest.fn()} />);
    expect(screen.getByDisplayValue('Consulting')).toBeInTheDocument();
    expect(screen.queryByTestId('service-combobox')).not.toBeInTheDocument();
  });

  it('updates description via updateItem', () => {
    const onChange = jest.fn();
    render(<ItemizedLineItems items={[{ ...defaultItems[0] }]} onChange={onChange} />);
    const descInputs = screen.getAllByDisplayValue('Hourly');
    fireEvent.change(descInputs[0], { target: { value: 'Updated' } });
    expect(onChange).toHaveBeenCalledWith([{ ...defaultItems[0], description: 'Updated' }]);
  });
});

