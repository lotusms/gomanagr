import { HiPlus, HiTrash, HiDocumentText, HiClipboardList, HiReceiptTax, HiPaperClip, HiShare } from 'react-icons/hi';
import { PrimaryButton, IconButton } from '@/components/ui/buttons';

const DOC_TYPES = [
  {
    key: 'contracts',
    label: 'Contracts',
    description: 'Contract names, reference numbers, or links',
    icon: HiDocumentText,
    borderClass: 'border-l-primary-500 dark:border-l-primary-400',
    badgeClass: 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200',
  },
  {
    key: 'proposals',
    label: 'Proposals',
    description: 'Proposals or quotes sent to this client',
    icon: HiClipboardList,
    borderClass: 'border-l-emerald-500 dark:border-l-emerald-400',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  },
  {
    key: 'invoices',
    label: 'Invoices',
    description: 'Invoice references or payment records',
    icon: HiReceiptTax,
    borderClass: 'border-l-violet-500 dark:border-l-violet-400',
    badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  },
  {
    key: 'attachments',
    label: 'Attachments',
    description: 'Other files or documents linked to this client',
    icon: HiPaperClip,
    borderClass: 'border-l-amber-500 dark:border-l-amber-400',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  },
  {
    key: 'sharedAssets',
    label: 'Shared assets',
    description: 'Shared drives, folders, or resources',
    icon: HiShare,
    borderClass: 'border-l-cyan-500 dark:border-l-cyan-400',
    badgeClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
  },
];

function DocumentBlock({ type, items, onAdd, onEdit, onRemove }) {
  const Icon = type.icon;
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl shadow-sm ${type.badgeClass}`}>
              <Icon className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-medium text-gray-900 dark:text-white tracking-tight">{type.label}</h3>
              {type.description && (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{type.description}</p>
              )}
            </div>
          </div>
        </div>
        <PrimaryButton
          type="button"
          onClick={onAdd}
          className="flex-shrink-0 gap-2"
        >
          <HiPlus className="w-5 h-5" />
          Add
        </PrimaryButton>
      </div>
      <div className="space-y-2.5">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-600 py-6 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">No entries yet</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={idx}
              className={`group relative rounded-xl border border-gray-100 dark:border-gray-600/80 border-l-4 bg-gray-50/80 dark:bg-gray-800/40 shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 ${type.borderClass} pl-4 pr-11 py-2.5 min-h-[44px] flex items-center`}
            >
              <input
                type="text"
                id={`${type.key}-${idx}`}
                value={item}
                onChange={(e) => onEdit(idx, e.target.value)}
                placeholder="Name, reference, or link..."
                className="w-full text-sm bg-transparent border-0 py-0 px-0 focus:ring-0 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white"
                aria-label={`${type.label} entry ${idx + 1}`}
              />
              <IconButton
                variant="danger"
                onClick={() => onRemove(idx)}
                className="absolute top-1/2 right-3 -translate-y-1/2 !p-1.5 !bg-transparent !border-transparent hover:!bg-red-50 dark:hover:!bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                title="Remove entry"
                aria-label="Remove entry"
              >
                <HiTrash className="w-4 h-4" />
              </IconButton>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

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
  const blocks = [
    {
      type: DOC_TYPES[0],
      items: contracts,
      onAdd: () => onContractsChange([...contracts, '']),
      onEdit: (idx, v) => {
        const u = [...contracts];
        u[idx] = v;
        onContractsChange(u);
      },
      onRemove: (idx) => onContractsChange(contracts.filter((_, i) => i !== idx)),
    },
    {
      type: DOC_TYPES[1],
      items: proposals,
      onAdd: () => onProposalsChange([...proposals, '']),
      onEdit: (idx, v) => {
        const u = [...proposals];
        u[idx] = v;
        onProposalsChange(u);
      },
      onRemove: (idx) => onProposalsChange(proposals.filter((_, i) => i !== idx)),
    },
    {
      type: DOC_TYPES[2],
      items: invoices,
      onAdd: () => onInvoicesChange([...invoices, '']),
      onEdit: (idx, v) => {
        const u = [...invoices];
        u[idx] = v;
        onInvoicesChange(u);
      },
      onRemove: (idx) => onInvoicesChange(invoices.filter((_, i) => i !== idx)),
    },
    {
      type: DOC_TYPES[3],
      items: attachments,
      onAdd: () => onAttachmentsChange([...attachments, '']),
      onEdit: (idx, v) => {
        const u = [...attachments];
        u[idx] = v;
        onAttachmentsChange(u);
      },
      onRemove: (idx) => onAttachmentsChange(attachments.filter((_, i) => i !== idx)),
    },
    {
      type: DOC_TYPES[4],
      items: sharedAssets,
      onAdd: () => onSharedAssetsChange([...sharedAssets, '']),
      onEdit: (idx, v) => {
        const u = [...sharedAssets];
        u[idx] = v;
        onSharedAssetsChange(u);
      },
      onRemove: (idx) => onSharedAssetsChange(sharedAssets.filter((_, i) => i !== idx)),
    },
  ];

  return (
    <div className="space-y-8">
      <p className="text-sm text-gray-500 dark:text-gray-400 tracking-wide max-w-2xl">
        Track contracts, proposals, invoices, and other documents for this client. Add names, reference numbers, or links so you can find them quickly.
      </p>

      <div className="space-y-6">
        {blocks.map((block) => (
          <div
            key={block.type.key}
            className="rounded-2xl border border-gray-100 dark:border-gray-700/80 bg-white dark:bg-gray-800/40 p-6 shadow-sm ring-1 ring-gray-100/50 dark:ring-gray-700/30"
          >
            <DocumentBlock
              type={block.type}
              items={block.items}
              onAdd={block.onAdd}
              onEdit={block.onEdit}
              onRemove={block.onRemove}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
