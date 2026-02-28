import CardDeleteButton from './CardDeleteButton';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function clipText(text, maxLen) {
  if (!text || typeof text !== 'string') return '';
  return text.length <= (maxLen || 80) ? text : text.slice(0, maxLen || 80) + '…';
}

const RESOURCE_TYPE_LABELS = {
  client_website: 'Client website',
  google_drive_folder: 'Google Drive',
  dropbox_folder: 'Dropbox',
  booking_link: 'Booking link',
  social_media_profile: 'Social media',
  hosting_dashboard: 'Hosting dashboard',
  crm_portal: 'CRM portal',
  payment_portal: 'Payment portal',
  document_signing_link: 'Doc signing',
  other: 'Other',
};

export default function OnlineResourceLogCards({ resources, onSelect, onDelete, borderClass }) {
  const baseClass = 'relative w-full text-left group rounded-xl border border-gray-100 dark:border-gray-600/80 border-l-4 bg-gray-50/80 dark:bg-gray-800/40 shadow-sm transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:shadow-md hover:-translate-y-0.5 cursor-pointer pl-4 pr-11 py-3 min-h-[56px]';
  const cardClass = borderClass ? baseClass + ' ' + borderClass : baseClass;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {resources.map((r) => (
        <div
          key={r.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(r.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(r.id);
            }
          }}
          className={cardClass}
        >
          <div className="absolute top-1 right-1 flex items-center">
            <CardDeleteButton
              onDelete={() => onDelete(r.id)}
              title="Delete resource"
              className="opacity-60 group-hover:opacity-100"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            {r.resource_type && (
              <span className="font-medium px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200">
                {RESOURCE_TYPE_LABELS[r.resource_type] || r.resource_type}
              </span>
            )}
            {(r.date_added || r.created_at) && (
              <time dateTime={r.date_added || r.created_at}>{formatDate(r.date_added || r.created_at)}</time>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate pr-8">{r.resource_name || 'Unnamed resource'}</p>
          {r.url && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 truncate pr-8" title={r.url}>
              {clipText(r.url, 50)}
            </p>
          )}
          {r.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">{clipText(r.description, 100)}</p>
          )}
        </div>
      ))}
    </div>
  );
}
