import CardDeleteButton from './CardDeleteButton';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function clipText(text, maxLen) {
  if (!text || typeof text !== 'string') return '';
  return text.length <= (maxLen || 80) ? text : text.slice(0, maxLen || 80) + '…';
}

const CATEGORY_LABELS = {
  id_documents: 'ID documents',
  logos_brand_assets: 'Logos / brand',
  photos: 'Photos',
  screenshots: 'Screenshots',
  intake_forms: 'Intake forms',
  signed_paperwork: 'Signed paperwork',
  receipts: 'Receipts',
  reference_docs: 'Reference docs',
};

export default function AttachmentLogCards({ attachments, onSelect, onDelete, borderClass }) {
  const baseClass = 'relative w-full text-left group rounded-xl border border-gray-100 dark:border-gray-600/80 border-l-4 bg-gray-50/80 dark:bg-gray-800/40 shadow-sm transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:shadow-md hover:-translate-y-0.5 cursor-pointer pl-4 pr-11 py-3 min-h-[56px]';
  const cardClass = borderClass ? baseClass + ' ' + borderClass : baseClass;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {attachments.map((a) => (
        <div
          key={a.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(a.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(a.id);
            }
          }}
          className={cardClass}
        >
          <div className="absolute top-1 right-1 flex items-center">
            <CardDeleteButton
              onDelete={() => onDelete(a.id)}
              title="Delete attachment"
              className="opacity-60 group-hover:opacity-100"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            {a.file_type && <span>{a.file_type}</span>}
            {a.category && (
              <span className="font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                {CATEGORY_LABELS[a.category] || a.category}
              </span>
            )}
            {(a.upload_date || a.created_at) && (
              <time dateTime={a.upload_date || a.created_at}>{formatDate(a.upload_date || a.created_at)}</time>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate pr-8">{a.file_name || 'Unnamed file'}</p>
          {a.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">{clipText(a.description, 100)}</p>
          )}
          {a.related_item && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Related: {clipText(a.related_item, 40)}</p>
          )}
        </div>
      ))}
    </div>
  );
}
