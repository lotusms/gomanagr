import Dropdown from '@/components/ui/Dropdown';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { EmptyState } from '@/components/ui';
import { getLabelClasses } from '@/components/ui/formControlStyles';
import { HiDocumentText } from 'react-icons/hi';
import { PAYMENT_TERMS, PRICING_TIERS, CURRENCIES } from '../clientProfileConstants';

export default function FinancialInformationSection({
  paymentTerms,
  pricingTier,
  defaultCurrency,
  activeRetainersBalance,
  paymentHistory,
  onPaymentTermsChange,
  onPricingTierChange,
  onDefaultCurrencyChange,
  onActiveRetainersBalanceChange,
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Dropdown
          id="paymentTerms"
          label="Payment Terms"
          value={paymentTerms || undefined}
          onChange={onPaymentTermsChange}
          options={PAYMENT_TERMS.map((term) => ({ value: term, label: term }))}
          placeholder="Select payment terms..."
          variant="light"
        />
        <Dropdown
          id="pricingTier"
          label="Pricing Tier"
          value={pricingTier}
          onChange={onPricingTierChange}
          options={PRICING_TIERS}
          variant="light"
        />
        <Dropdown
          id="defaultCurrency"
          label="Default Currency"
          value={defaultCurrency}
          onChange={onDefaultCurrencyChange}
          options={CURRENCIES}
          variant="light"
        />
        <CurrencyInput
          id="activeRetainersBalance"
          label="Active Retainers Balance"
          value={activeRetainersBalance}
          onChange={onActiveRetainersBalanceChange}
          currency={defaultCurrency || 'USD'}
          placeholder="0.00"
          variant="light"
        />
      </div>
      <div>
        <label className={getLabelClasses('light')}>
          Payment History
        </label>
        {paymentHistory.length === 0 ? (
          <EmptyState
            type="custom"
            title="No payments yet"
            description="Payment history will appear here once payments are recorded."
            icon={HiDocumentText}
            className="mt-2"
          />
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Payment Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Project Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Receipt #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Payment Type
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paymentHistory.map((payment, index) => {
                  const paymentDate = payment.paymentDate ? new Date(payment.paymentDate) : null;
                  const isPastDue = payment.status === 'past due';
                  const isPaid = payment.status === 'paid';
                  const isPastDate = paymentDate && paymentDate < new Date();
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {paymentDate ? (
                          <span className={isPastDate ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-900 dark:text-gray-100'}>
                            {paymentDate.toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {isPastDue ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            Past Due
                          </span>
                        ) : isPaid ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            {payment.status || 'Pending'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {payment.projectName || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {payment.invoiceNumber || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {payment.receiptNumber || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {payment.paymentType || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
