import { HiPlus, HiTrash } from 'react-icons/hi';
import InputField from '@/components/ui/InputField';
import { getLabelClasses } from '@/components/ui/formControlStyles';

export default function DocumentsFilesSection({
  contracts,
  proposals,
  invoices,
  attachments,
  sharedAssets,
  onContractsChange,
  onProposalsChange,
  onInvoicesChange,
  onAttachmentsChange,
  onSharedAssetsChange,
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className={`${getLabelClasses('light')} mb-2`}>Contracts</label>
        <div className="space-y-2">
          {contracts.map((contract, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <InputField
                id={`contract-${idx}`}
                value={contract}
                onChange={(e) => {
                  const updated = [...contracts];
                  updated[idx] = e.target.value;
                  onContractsChange(updated);
                }}
                variant="light"
              />
              <button
                type="button"
                onClick={() => onContractsChange(contracts.filter((_, i) => i !== idx))}
                className="text-red-600 dark:text-red-400"
              >
                <HiTrash className="w-5 h-5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onContractsChange([...contracts, ''])}
            className="text-sm text-primary-600 dark:text-primary-400"
          >
            <HiPlus className="w-4 h-4 inline mr-1" />
            Add Contract
          </button>
        </div>
      </div>
      
      <div>
        <label className={`${getLabelClasses('light')} mb-2`}>Proposals</label>
        <div className="space-y-2">
          {proposals.map((proposal, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <InputField
                id={`proposal-${idx}`}
                value={proposal}
                onChange={(e) => {
                  const updated = [...proposals];
                  updated[idx] = e.target.value;
                  onProposalsChange(updated);
                }}
                variant="light"
              />
              <button
                type="button"
                onClick={() => onProposalsChange(proposals.filter((_, i) => i !== idx))}
                className="text-red-600 dark:text-red-400"
              >
                <HiTrash className="w-5 h-5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onProposalsChange([...proposals, ''])}
            className="text-sm text-primary-600 dark:text-primary-400"
          >
            <HiPlus className="w-4 h-4 inline mr-1" />
            Add Proposal
          </button>
        </div>
      </div>
      
      <div>
        <label className={`${getLabelClasses('light')} mb-2`}>Invoices</label>
        <div className="space-y-2">
          {invoices.map((invoice, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <InputField
                id={`invoice-${idx}`}
                value={invoice}
                onChange={(e) => {
                  const updated = [...invoices];
                  updated[idx] = e.target.value;
                  onInvoicesChange(updated);
                }}
                variant="light"
              />
              <button
                type="button"
                onClick={() => onInvoicesChange(invoices.filter((_, i) => i !== idx))}
                className="text-red-600 dark:text-red-400"
              >
                <HiTrash className="w-5 h-5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onInvoicesChange([...invoices, ''])}
            className="text-sm text-primary-600 dark:text-primary-400"
          >
            <HiPlus className="w-4 h-4 inline mr-1" />
            Add Invoice
          </button>
        </div>
      </div>
      
      <div>
        <label className={`${getLabelClasses('light')} mb-2`}>Attachments</label>
        <div className="space-y-2">
          {attachments.map((attachment, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <InputField
                id={`attachment-${idx}`}
                value={attachment}
                onChange={(e) => {
                  const updated = [...attachments];
                  updated[idx] = e.target.value;
                  onAttachmentsChange(updated);
                }}
                variant="light"
              />
              <button
                type="button"
                onClick={() => onAttachmentsChange(attachments.filter((_, i) => i !== idx))}
                className="text-red-600 dark:text-red-400"
              >
                <HiTrash className="w-5 h-5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onAttachmentsChange([...attachments, ''])}
            className="text-sm text-primary-600 dark:text-primary-400"
          >
            <HiPlus className="w-4 h-4 inline mr-1" />
            Add Attachment
          </button>
        </div>
      </div>
      
      <div>
        <label className={`${getLabelClasses('light')} mb-2`}>Shared Assets</label>
        <div className="space-y-2">
          {sharedAssets.map((asset, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <InputField
                id={`shared-asset-${idx}`}
                value={asset}
                onChange={(e) => {
                  const updated = [...sharedAssets];
                  updated[idx] = e.target.value;
                  onSharedAssetsChange(updated);
                }}
                variant="light"
              />
              <button
                type="button"
                onClick={() => onSharedAssetsChange(sharedAssets.filter((_, i) => i !== idx))}
                className="text-red-600 dark:text-red-400"
              >
                <HiTrash className="w-5 h-5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onSharedAssetsChange([...sharedAssets, ''])}
            className="text-sm text-primary-600 dark:text-primary-400"
          >
            <HiPlus className="w-4 h-4 inline mr-1" />
            Add Shared Asset
          </button>
        </div>
      </div>
    </div>
  );
}
