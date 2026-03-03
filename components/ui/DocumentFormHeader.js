/**
 * Reusable ever-present header for document forms (proposals, invoices, etc.).
 * Shows: title, optional client dropdown, document ID, status.
 * Use at the top of multi-step forms to keep identity visible.
 *
 * @param {string} sectionLabel - e.g. "Proposal", "Invoice"
 * @param {string} idPrefix - Prefix for input ids (e.g. "proposal", "invoice")
 * @param {string} titleLabel - Label for title field
 * @param {string} titleValue - Title value
 * @param {string} [titlePlaceholder] - Title placeholder
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
 */
import InputField from '@/components/ui/InputField';
import Dropdown from '@/components/ui/Dropdown';

export default function DocumentFormHeader({
  sectionLabel,
  idPrefix = 'doc',
  titleLabel,
  titleValue,
  titlePlaceholder,
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
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InputField
          id={`${idPrefix}-title`}
          label={titleLabel}
          value={titleValue}
          onChange={onTitleChange}
          variant="light"
          placeholder={titlePlaceholder}
        />
        {showClientDropdown && (
          <div className="flex flex-col gap-1">
            <label htmlFor={`${idPrefix}-client`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client
            </label>
            <Dropdown
              id={`${idPrefix}-client`}
              name={`${idPrefix}-client`}
              value={selectedClientId}
              onChange={(e) => onClientChange?.(e)}
              options={clientOptions}
              placeholder={clientsLoading ? 'Loading…' : 'Select client'}
              searchable={clientOptions.length > 10}
            />
          </div>
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
      </div>
    </div>
  );
}
