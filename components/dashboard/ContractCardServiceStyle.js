import { HiClipboardList } from 'react-icons/hi';
import { formatDateFromISO } from '@/utils/dateTimeFormatters';
import { useOptionalUserAccount } from '@/lib/UserAccountContext';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';
import EntityCard from '@/components/ui/EntityCard';

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
    <EntityCard
      icon={HiClipboardList}
      title={contract.contract_title || untitledContractLabel}
      onSelect={() => onSelect(contract.id)}
      onDelete={() => onDelete(contract.id)}
      deleteTitle={`Delete ${contractTermSingularLower}`}
    >
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
    </EntityCard>
  );
}
