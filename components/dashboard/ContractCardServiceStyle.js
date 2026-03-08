import { HiClipboardList, HiTrash } from 'react-icons/hi';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';
import { useOptionalUserAccount } from '@/lib/UserAccountContext';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';

const STATUS_LABELS = {
  draft: 'Draft',
  active: 'Active',
  inactive: 'Inactive',
  completed: 'Completed',
  abandoned: 'Abandoned',
};

/**
 * Single contract card in the same visual style as the services page.
 * Used only on the dashboard Contracts page.
 */
export default function ContractCardServiceStyle({
  contract,
  onSelect,
  onDelete,
  clientNameByClientId = {},
  accountIndustry = null,
}) {
  const account = useOptionalUserAccount();
  const dateFormat = account?.dateFormat ?? 'MM/DD/YYYY';
  const timezone = account?.timezone ?? 'UTC';
  const industry = accountIndustry ?? account?.industry;
  const contractTermPlural = getTermForIndustry(industry, 'contract');
  const contractTermSingular = getTermSingular(contractTermPlural) || 'Contract';
  const contractTermSingularLower = contractTermSingular.toLowerCase();
  const untitledContractLabel = `Untitled ${contractTermSingularLower}`;

  const clientName = contract.client_id && clientNameByClientId[contract.client_id];
  const statusLabel = contract.status ? (STATUS_LABELS[contract.status] || contract.status) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(contract.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(contract.id);
        }
      }}
      className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-600 transition-all duration-300 flex flex-col cursor-pointer"
    >
      <div className="relative bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-y-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <HiClipboardList className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white line-clamp-2">
                {contract.contract_title || untitledContractLabel}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDelete(contract.id);
              }}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
              title={`Delete ${contractTermSingularLower}`}
            >
              <HiTrash className="size-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
          {clientName && (
            <span className="font-medium text-gray-700 dark:text-gray-300">{clientName}</span>
          )}
          {contract.contract_number && (
            <span>{contract.contract_number}</span>
          )}
          {statusLabel && (
            <span className="font-medium px-2 py-0.5 rounded bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
              {statusLabel}
            </span>
          )}
          {contract.start_date && (
            <time dateTime={contract.start_date}>
              {formatDateFromISO(contract.start_date, dateFormat, timezone)}
            </time>
          )}
          {contract.end_date && (
            <>
              <span>–</span>
              <time dateTime={contract.end_date}>
                {formatDateFromISO(contract.end_date, dateFormat, timezone)}
              </time>
            </>
          )}
        </div>

        {contract.scope_summary ? (
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed whitespace-pre-wrap">
            {contract.scope_summary}
          </p>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">No scope summary</p>
        )}
      </div>
    </div>
  );
}
