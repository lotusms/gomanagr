/**
 * Reusable ever-present header for document forms (proposals, invoices, etc.).
 * Shows: title, optional client dropdown, document ID, status, and optional extra blocks
 * (e.g. "Use Proposal" for invoices). Use at the top of multi-step forms to keep identity visible.
 *
 * Column logic:
 * - Standalone proposal: title full width, then other fields (Client, Doc ID, Status) in one row
 *   with 3 cols at lg+, 2 at md, 1 at <md.
 * - Standalone invoice (has Use Proposal): title full width, then other fields (Client, Doc ID,
 *   Status, Use Proposal) in one row with 4 cols at lg+, 3 at md, 1 at <md.
 * - Client section (proposal or invoice, client implied): title is in the same row as document ID
 *   and status; one grid with 3 cols at lg+, 2 at md, 1 at <md.
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
 * @param {string} [clientLabel] - Label for client dropdown (e.g. "Client", "Account")
 * @param {string} [clientPlaceholder] - Placeholder for client dropdown (e.g. "Select client")
 * @param {Array<{value: string, label: string}>} [clientOptions] - Client dropdown options
 * @param {boolean} [clientsLoading] - Client options loading state
 * @param {boolean} [showUseProposalDropdown] - Whether to show "Use Proposal" dropdown (e.g. invoice from proposal)
 * @param {string} [useProposalLabel] - Label for the proposal dropdown (e.g. "Use Proposal", "Use Quote")
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
  clientLabel = 'Client',
  clientPlaceholder = 'Select client',
  selectedClientId = '',
  onClientChange,
  clientOptions = [],
  clientsLoading = false,
  showUseProposalDropdown = false,
  useProposalLabel = 'Use Proposal',
  useProposalValue = '',
  onUseProposalChange,
  useProposalOptions = [],
  useProposalLoading = false,
  useProposalPlaceholder = 'No — fill manually',
}) {
  const showFullWidthTitle = showClientDropdown || showUseProposalDropdown;
  // 3-field row: 1 col < md, 2 at md, 3 at lg+
  const gridColsThree = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  // 4-field row (invoice with Client + Doc ID + Status + Use Proposal): 1 col < md, 3 at md, 4 at lg+
  const gridColsFour = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
  const titleField = (
    <InputField
      id={`${idPrefix}-title`}
      label={titleLabel}
      value={titleValue}
      onChange={onTitleChange}
      variant="light"
      placeholder={titlePlaceholder}
      required={titleRequired}
    />
  );

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-4 space-y-4">
      {showFullWidthTitle ? (
        <>
          <div className="grid grid-cols-1 gap-4">
            {titleField}
          </div>
          <div className={`grid ${showClientDropdown && showUseProposalDropdown ? gridColsFour : gridColsThree} gap-4`}>
            {showClientDropdown && (
              <Dropdown
                id={`${idPrefix}-client`}
                name={`${idPrefix}-client`}
                label={clientLabel}
                value={selectedClientId}
                onChange={(e) => onClientChange?.(e)}
                options={clientOptions}
                placeholder={clientsLoading ? 'Loading…' : clientPlaceholder}
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
                label={useProposalLabel}
                value={useProposalValue}
                onChange={(e) => onUseProposalChange?.(e)}
                options={useProposalOptions}
                placeholder={useProposalLoading ? 'Loading…' : useProposalPlaceholder}
                searchable={useProposalOptions.length > 5}
              />
            )}
          </div>
        </>
      ) : (
        <div className={`grid ${gridColsThree} gap-4`}>
          {titleField}
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
      )}
    </div>
  );
}
