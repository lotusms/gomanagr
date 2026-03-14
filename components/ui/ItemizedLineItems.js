/**
 * Reusable itemized line items table (Wave-style).
 * Used for Proposals and Invoices. Columns: Service/Item, Description, Quantity, Price, Amount; Add item, delete row.
 *
 * When services and onServiceCreated are provided, the first column is a searchable service dropdown
 * with an "Add" button to create new services (persisted to org/user services). Otherwise it's a plain text input.
 *
 * @param {Array<{ id: string, item_name: string, description: string, quantity: number|string, unit_price: string }>} props.items
 * @param {Function} props.onChange - (items) => void
 * @param {string} props.currency - e.g. 'USD'
 * @param {string} [props.itemLabel] - Column header for item name (default 'Service', or industry term when industry provided)
 * @param {string} [props.industry] - Industry for service term (e.g. Healthcare → "Procedures")
 * @param {string} [props.addLabel] - Button label (default 'Add item')
 * @param {string} [props.className]
 * @param {Array<{ id: string, name: string }>} [props.services] - Org/user services for dropdown (when provided with onServiceCreated)
 * @param {Function} [props.onServiceCreated] - (updatedServices: Array) => Promise<void> — persist new service so it appears everywhere
 * @param {Array} [props.teamMembers] - For Add Service form when creating from line items
 * @param {number|string} [props.tax] - Tax/VAT amount (displayed or editable under subtotal)
 * @param {number|string} [props.discount] - Discount amount (displayed or editable under subtotal)
 * @param {Function} [props.onTaxChange] - (value: string) => void — when provided, tax is an editable currency field
 * @param {Function} [props.onDiscountChange] - (value: string) => void — when provided, discount is an editable currency field
 * @param {string} [props.discountType] - 'amount' (default) = discount in $; 'percent' = discount as % of subtotal
 * @param {Function} [props.onDiscountTypeChange] - (value: 'amount' | 'percent') => void
 * @param {string} [props.taxLabel] - Label for tax row (default 'Tax/VAT')
 * @param {string} [props.discountLabel] - Label for discount row (default 'Discount')
 * @param {string} [props.totalLabel] - Label for total row (default 'Total')
 */
import { useCallback } from 'react';
import InputField from '@/components/ui/InputField';
import NumberField from '@/components/ui/NumberField';
import CurrencyInput from '@/components/ui/CurrencyInput';
import ServiceCombobox from '@/components/dashboard/ServiceCombobox';
import { PrimaryButton } from '@/components/ui/buttons';
import { formatCurrency, unformatCurrency } from '@/utils/formatCurrency';
import { HiPlus, HiTrash } from 'react-icons/hi';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';

function computeAmount(quantity, unitPrice) {
  const q = parseFloat(quantity);
  const p = parseFloat(unformatCurrency(unitPrice) || 0);
  if (Number.isNaN(q) || Number.isNaN(p)) return '';
  return (q * p).toFixed(2);
}

export default function ItemizedLineItems({
  items = [],
  onChange,
  currency = 'USD',
  itemLabel: itemLabelProp,
  addLabel = 'Add item',
  className = '',
  services,
  onServiceCreated,
  teamMembers = [],
  industry = null,
  tax = 0,
  discount = 0,
  onTaxChange,
  onDiscountChange,
  discountType = 'amount',
  onDiscountTypeChange,
  taxLabel = 'Tax/VAT',
  discountLabel = 'Discount',
  totalLabel = 'Total',
}) {
  const serviceTermSingular = industry ? (getTermSingular(getTermForIndustry(industry, 'services')) || 'Service') : null;
  const itemLabel = itemLabelProp ?? serviceTermSingular ?? 'Service';
  const useServiceDropdown = services != null && typeof onServiceCreated === 'function';
  const updateItem = useCallback(
    (index, field, value) => {
      const next = items.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.amount = computeAmount(
            field === 'quantity' ? value : item.quantity,
            field === 'unit_price' ? value : item.unit_price
          );
        }
        return updated;
      });
      onChange(next);
    },
    [items, onChange]
  );

  const addRow = useCallback(() => {
    const newItem = {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      item_name: '',
      description: '',
      quantity: 1,
      unit_price: '',
      amount: '',
    };
    onChange([...items, newItem]);
  }, [items, onChange]);

  const removeRow = useCallback(
    (index) => {
      onChange(items.filter((_, i) => i !== index));
    },
    [items, onChange]
  );

  const subtotal = items.reduce((sum, item) => {
    const a = parseFloat(item.amount);
    return sum + (Number.isNaN(a) ? 0 : a);
  }, 0);

  const taxNum = typeof tax === 'number' ? tax : (parseFloat(unformatCurrency(String(tax ?? ''))) || 0);
  const discountAmount =
    discountType === 'percent'
      ? subtotal * ((parseFloat(String(discount ?? '').replace(/[^\d.-]/g, '')) || 0) / 100)
      : (typeof discount === 'number' ? discount : (parseFloat(unformatCurrency(String(discount ?? ''))) || 0));
  const total = subtotal - discountAmount + taxNum;

  return (
    <div className={className}>
      <div className="-mx-4 sm:mx-0 mt-4 sm:mt-0">
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-collapse text-sm xl:table-fixed">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60">
                <th
                  scope="col"
                  className="py-3.5 pl-4 pr-3 text-left font-medium text-gray-700 dark:text-gray-300 w-full max-w-0 sm:pl-3 xl:max-w-none xl:w-[calc((100%-18.5rem)/2)]"
                >
                  {itemLabel}
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3.5 text-left font-medium text-gray-700 dark:text-gray-300 xl:table-cell xl:w-[calc((100%-18.5rem)/2)]"
                >
                  Description
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3.5 text-center font-medium text-gray-700 dark:text-gray-300 xl:table-cell xl:w-[6rem] xl:shrink-0 w-[3rem] sm:w-20"
                >
                  Qty
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3.5 text-left font-medium text-gray-700 dark:text-gray-300 xl:table-cell xl:w-[6.5rem] xl:shrink-0 w-[6.5rem] sm:w-28"
                >
                  Price
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3.5 text-center font-medium text-gray-700 dark:text-gray-300 xl:table-cell xl:w-[4.5rem] xl:shrink-0 w-[4.5rem] sm:w-24"
                >
                  Amount
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-3 xl:w-12 xl:shrink-0">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:bg-gray-800/40 dark:divide-gray-700">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No items yet. Click &quot;{addLabel}&quot; to add a line.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20"
                  >
                    <td className="w-full max-w-0 py-3 pl-4 pr-3 font-medium text-gray-900 min-w-[9rem] dark:text-white sm:w-auto sm:max-w-none sm:pl-3">
                      {useServiceDropdown ? (
                        <ServiceCombobox
                          id={`line-${index}-service`}
                          services={services}
                          value={item.item_name || ''}
                          onChange={(name) => updateItem(index, 'item_name', name)}
                          onServiceCreated={onServiceCreated}
                          teamMembers={teamMembers}
                          industry={industry}
                          className="!mb-0"
                          addButtonLabel="Add"
                        />
                      ) : (
                        <InputField
                          id={`line-${index}-name`}
                          value={item.item_name || ''}
                          onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                          variant="light"
                          placeholder="Name"
                          className="!mb-0"
                        />
                      )}
                      <dl className="font-normal xl:hidden">
                        <dt className="sr-only">Description</dt>
                        <dd className="mt-1 truncate text-gray-600 dark:text-gray-400">
                          <InputField
                            id={`line-${index}-desc`}
                            value={item.description || ''}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            variant="light"
                            placeholder="Description"
                            className="!mb-0"
                          />
                        </dd>
                        <dt className="sr-only">Quantity, Price, Amount</dt>
                        <dd className="mt-0.5 text-gray-500 dark:text-gray-400 tabular-nums">
                          <div className="flex items-center gap-1">
                            <NumberField
                              id={`line-${index}-qty`}
                              value={item.quantity === '' || item.quantity == null ? '' : Number(item.quantity)}
                              onChange={(e) => {
                                const v = e.target.value;
                                updateItem(index, 'quantity', v === '' ? '' : parseFloat(v) || 0);
                              }}
                              inputProps={{ onFocus: (e) => e.target.select() }}
                              min={0}
                              step={0.01}
                              variant="light"
                              placeholder="0"
                              className="!mb-0 w-full max-w-[3rem]"
                              inputClassName="text-center"
                            /> x 
                            <CurrencyInput
                              id={`line-${index}-price`}
                              value={item.unit_price || ''}
                              onChange={(e) => updateItem(index, 'unit_price', e.target.value ?? '')}
                              currency={currency}
                              variant="light"
                              placeholder="0.00"
                              className="!mb-0 w-full"
                              selectOnFocus
                              inputProps={{ style: { textAlign: 'right' } }}
                            /> = 
                            <div className="text-center">
                              {item.amount != null && item.amount !== '' ? formatCurrency(item.amount, currency) : '—'}
                            </div>
                          
                          </div>
                        </dd>
                      </dl>
                    </td>
                    <td className="hidden px-3 py-3 align-top min-w-0 xl:table-cell">
                      <InputField
                        id={`line-${index}-desc`}
                        value={item.description || ''}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        variant="light"
                        placeholder="Description"
                        className="!mb-0"
                      />
                    </td>
                    <td className="hidden px-3 py-3 align-middle w-[4.5rem] sm:w-20 xl:table-cell xl:w-[6rem] xl:shrink-0">
                      <div className="flex justify-center">
                        <NumberField
                          id={`line-${index}-qty`}
                          value={item.quantity === '' || item.quantity == null ? '' : Number(item.quantity)}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateItem(index, 'quantity', v === '' ? '' : parseFloat(v) || 0);
                          }}
                          inputProps={{ onFocus: (e) => e.target.select() }}
                          min={0}
                          step={0.01}
                          variant="light"
                          placeholder="0"
                          className="!mb-0 w-full max-w-[8rem]"
                          inputClassName="text-center"
                        />
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 align-middle min-w-[9rem] xl:table-cell xl:w-[9rem] xl:min-w-0 xl:shrink-0">
                      <div className="flex justify-end">
                        <CurrencyInput
                          id={`line-${index}-price`}
                          value={item.unit_price || ''}
                          onChange={(e) => updateItem(index, 'unit_price', e.target.value ?? '')}
                          currency={currency}
                          variant="light"
                          placeholder="0.00"
                          className="!mb-0 w-full"
                          selectOnFocus
                          inputProps={{ style: { textAlign: 'right' } }}
                        />
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 align-middle min-w-[9rem] font-medium text-gray-700 dark:text-gray-300 tabular-nums xl:table-cell xl:w-[4.5rem] xl:min-w-0 xl:shrink-0">
                      <div className="text-center">
                        {item.amount != null && item.amount !== ''
                          ? formatCurrency(item.amount, currency)
                          : '—'}
                      </div>
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right sm:pr-3 xl:w-12 xl:shrink-0">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Remove item"
                      >
                        <HiTrash className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <PrimaryButton type="button" onClick={addRow} className="gap-2">
          <HiPlus className="w-5 h-5" />
          {addLabel}
        </PrimaryButton>
        {items.length > 0 && (
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-4 text-right tabular-nums">
            <div className="font-medium">Subtotal: {formatCurrency(subtotal.toFixed(2), currency)}</div>
            <div className="flex flex-col items-end gap-1">
              {onDiscountTypeChange && (
                <div className="flex items-center justify-end gap-2">
                  <span className="min-w-[4rem]">Discount type:</span>
                  <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-0.5">
                    <button
                    type="button"
                    onClick={() => onDiscountTypeChange('amount')}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      discountType === 'amount'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    $
                  </button>
                  <button
                    type="button"
                    onClick={() => onDiscountTypeChange('percent')}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      discountType === 'percent'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    %
                  </button>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-end gap-2">
                <span className="min-w-[4rem]">{discountLabel}:</span>
                {discountType === 'percent' ? (
                  <NumberField
                    id="line-items-discount"
                    value={
                      discount != null && discount !== ''
                        ? (() => {
                            const n = parseFloat(String(discount).replace(/[^\d.-]/g, ''));
                            return !Number.isNaN(n) && n > 100 ? '100' : discount;
                          })()
                        : (discount ?? '')
                    }
                    onChange={(e) => {
                      const raw = e.target.value ?? '';
                      const n = parseFloat(raw.replace(/[^\d.-]/g, ''));
                      if (raw !== '' && !Number.isNaN(n) && n > 100) {
                        onDiscountChange?.('100');
                      } else {
                        onDiscountChange?.(raw);
                      }
                    }}
                    placeholder="0"
                    className="!mb-0 w-20"
                    variant="light"
                    min={0}
                    max={100}
                    step={0.01}
                    inputClassName="text-right"
                  />
                ) : (
                  <CurrencyInput
                    id="line-items-discount"
                    value={discount ?? ''}
                    onChange={(e) => onDiscountChange?.(e.target.value ?? '')}
                    currency={currency}
                    variant="light"
                    placeholder="0.00"
                    className="!mb-0 w-28"
                    inputProps={{ style: { textAlign: 'right' } }}
                  />
                )}
                {/* {discountType === 'percent' && <span className="text-gray-500">%</span>} */}
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className="min-w-[4rem]">{taxLabel}:</span>
                <CurrencyInput
                  id="line-items-tax"
                  value={tax ?? ''}
                  onChange={(e) => onTaxChange?.(e.target.value ?? '')}
                  currency={currency}
                  variant="light"
                  placeholder="0.00"
                  className="!mb-0 w-28"
                  inputProps={{ style: { textAlign: 'right' } }}
                />
              </div>
            </div>
            
            <div className="font-semibold pt-1 border-t border-gray-200 dark:border-gray-600 mt-1 text-lg">
              {totalLabel}: {formatCurrency(total.toFixed(2), currency)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
