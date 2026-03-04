/**
 * Reusable ever-present header for document forms (proposals, invoices, etc.).
 * Shows: title, optional client dropdown, document ID, status, and optional extra blocks
 * (e.g. "Use Proposal" for invoices). Use at the top of multi-step forms to keep identity visible.
 *
 * @param {string} sectionLabel - e.g. "Proposal", "Invoice"
 * @param {string} idPrefix - Prefix for input ids (e.g. "proposal", "invoice")
 * @param {string} titleLabel - Label for title field
 * @param {string} titleValue - Title value
 * @param {string} [titlePlaceholder] - Title placeholder
 * @param {boolean} [titleRequired] - Whether the title field is required
 * @param {Function} onTitleChange - (e) => void
 * @param {string} documentIdLabel - e.g. "Proposal ID", "Invoice ID"
 * @param {string} documentIdValue - Document ID value
 * @param {string} [documentIdPlaceholder] - Placeholder for document ID
 * @param {Function} onDocumentIdChange - (e) => void
 * @param {string} statusLabel - e.g. "Status"
 * @param {string} statusValue - Status value
 * @param {Array<{value: string, label: string}>} statusOptions - Options for status dropdown
 * @param {Function} onStatusChange - (e) => void
 * @param {string} [statusPlaceholder] - Status placeholder
 * @param {boolean} [showClientDropdown] - Whether to show client selector
 * @param {string} [selectedClientId] - Selected client id
 * @param {Function} [onClientChange] - (e) => void
 * @param {Array<{value: string, label: string}>} [clientOptions] - Client dropdown options
 * @param {boolean} [clientsLoading] - Client options loading state
 * @param {boolean} [showUseProposalDropdown] - Whether to show "Use Proposal" dropdown (e.g. invoice from proposal)
 * @param {string} [useProposalValue] - Selected proposal id
 * @param {Function} [onUseProposalChange] - (e) => void
 * @param {Array<{value: string, label: string}>} [useProposalOptions] - Proposal options (per-client or all)
 * @param {boolean} [useProposalLoading] - Proposal options loading state
 * @param {string} [useProposalPlaceholder] - Placeholder when no proposal selected
 */
import InputField from '@/components/ui/InputField';
import Dropdown from '@/components/ui/Dropdown';

export default function DocumentFormHeader({
  sectionLabel,
  idPrefix = 'doc',
  titleLabel,
  titleValue,
  titlePlaceholder,
  titleRequired = false,
  onTitleChange,
  documentIdLabel,
  documentIdValue,
  documentIdPlaceholder,
  onDocumentIdChange,
  statusLabel,
  statusValue,
  statusOptions = [],
  onStatusChange,
  statusPlaceholder,
  showClientDropdown = false,
  selectedClientId = '',
  onClientChange,
  clientOptions = [],
  clientsLoading = false,
  showUseProposalDropdown = false,
  useProposalValue = '',
  onUseProposalChange,
  useProposalOptions = [],
  useProposalLoading = false,
  useProposalPlaceholder = 'No — fill manually',
}) {
  const gridCols =
    showClientDropdown && showUseProposalDropdown
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-4 space-y-4">
      <div className={`grid ${gridCols} gap-4`}>
        <InputField
          id={`${idPrefix}-title`}
          label={titleLabel}
          value={titleValue}
          onChange={onTitleChange}
          variant="light"
          placeholder={titlePlaceholder}
          required={titleRequired}
        />
        {showClientDropdown && (
          <Dropdown
            id={`${idPrefix}-client`}
            name={`${idPrefix}-client`}
            label="Client"
            value={selectedClientId}
            onChange={(e) => onClientChange?.(e)}
            options={clientOptions}
            placeholder={clientsLoading ? 'Loading…' : 'Select client'}
            searchable={clientOptions.length > 10}
          />
        )}
        <InputField
          id={`${idPrefix}-number`}
          label={documentIdLabel}
          value={documentIdValue}
          onChange={onDocumentIdChange}
          variant="light"
          placeholder={documentIdPlaceholder}
        />
        <Dropdown
          id={`${idPrefix}-status`}
          name={`${idPrefix}-status`}
          label={statusLabel}
          value={statusValue}
          onChange={(e) => onStatusChange(e)}
          options={statusOptions}
          placeholder={statusPlaceholder}
          searchable={false}
        />
        {showUseProposalDropdown && (
          <Dropdown
            id={`${idPrefix}-use-proposal`}
            name={`${idPrefix}-use-proposal`}
            label="Use Proposal"
            value={useProposalValue}
            onChange={(e) => onUseProposalChange?.(e)}
            options={useProposalOptions}
            placeholder={useProposalLoading ? 'Loading…' : useProposalPlaceholder}
            searchable={useProposalOptions.length > 5}
          />
        )}
      </div>
    </div>
  );
}
