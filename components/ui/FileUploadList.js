import { useRef, useState } from 'react';
import * as Label from '@radix-ui/react-label';
import { HiUpload, HiTrash, HiDocument } from 'react-icons/hi';
import { FaFilePdf, FaFileWord, FaFileExcel, FaFileImage } from 'react-icons/fa';
import { IconButton } from '@/components/ui/buttons';
import { getLabelClasses } from '@/components/ui/formControlStyles';

/** File extension → display label (uppercase) and icon category for list items */
const FILE_TYPE_MAP = {
  pdf: { label: 'PDF', category: 'pdf' },
  doc: { label: 'DOC', category: 'doc' },
  docx: { label: 'DOCX', category: 'doc' },
  xls: { label: 'XLS', category: 'sheet' },
  xlsx: { label: 'XLSX', category: 'sheet' },
  png: { label: 'PNG', category: 'image' },
  jpg: { label: 'JPG', category: 'image' },
  jpeg: { label: 'JPEG', category: 'image' },
  gif: { label: 'GIF', category: 'image' },
  webp: { label: 'WEBP', category: 'image' },
  svg: { label: 'SVG', category: 'image' },
  txt: { label: 'TXT', category: 'doc' },
  csv: { label: 'CSV', category: 'sheet' },
};
const FILE_ICONS = {
  pdf: FaFilePdf,
  doc: FaFileWord,
  sheet: FaFileExcel,
  image: FaFileImage,
  default: HiDocument,
};
/** Icon box and badge colors per category */
const FILE_TYPE_STYLES = {
  pdf: { icon: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400', badge: 'bg-red-200/80 dark:bg-red-800/50 text-red-800 dark:text-red-200' },
  doc: { icon: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', badge: 'bg-blue-200/80 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200' },
  sheet: { icon: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-200/80 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200' },
  image: { icon: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400', badge: 'bg-purple-200/80 dark:bg-purple-800/50 text-purple-800 dark:text-purple-200' },
  default: { icon: 'bg-gray-100 dark:bg-gray-700/80 text-gray-500 dark:text-gray-400', badge: 'bg-gray-200/80 dark:bg-gray-600/80 text-gray-700 dark:text-gray-300' },
};
function getFileType(item) {
  let name = '';
  try {
    if (item.startsWith('http')) name = new URL(item).pathname.split('/').pop() || '';
    else name = String(item);
  } catch {
    name = String(item);
  }
  const ext = name.split('.').pop()?.toLowerCase()?.replace(/[^a-z0-9]/g, '') || '';
  const mapped = FILE_TYPE_MAP[ext];
  const label = mapped ? mapped.label : ext ? ext.toUpperCase() : 'FILE';
  const category = mapped ? mapped.category : 'default';
  return { label, category, extension: ext };
}

/**
 * Reusable file upload area with drag-and-drop and a list of attached items.
 * Use for email attachments, documents tab, etc.
 *
 * @param {string} id - Input id for the hidden file input
 * @param {string} [label] - Label text
 * @param {string[]} value - List of attachment identifiers (URLs or names)
 * @param {(value: string[]) => void} onChange - Called when the list changes
 * @param {(file: File) => Promise<string>} [onUpload] - If provided, called when user adds a file; should upload and return URL/identifier to add to value. If not provided, file.name is added.
 * @param {string} [accept] - Accept attribute for file input (e.g. any type or image types)
 * @param {boolean} [multiple=true] - Allow multiple files
 * @param {string} [placeholder] - Placeholder text in drop zone
 * @param {string} [className] - Wrapper class
 */
export default function FileUploadList({
  id,
  label,
  value = [],
  onChange,
  onUpload,
  accept = '*/*',
  multiple = true,
  placeholder = 'Drag files here or click to browse',
  className = '',
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  /** Display-only: strip upload prefix (timestamp-random-) so user sees original filename. Value/DB unchanged. */
  const displayNameForItem = (item) => {
    try {
      let segment = item;
      if (item.startsWith('http')) segment = new URL(item).pathname.split('/').pop() || item;
      else segment = String(item);
      const match = segment.match(/^\d+-[a-z0-9]+-(.+)$/);
      return match ? match[1] : segment;
    } catch {
      return item;
    }
  };

  // For dedupe: get comparable name (URLs from our upload API use "timestamp-random-originalname")
  const getComparableName = (item) => {
    try {
      if (item.startsWith('http')) {
        const segment = new URL(item).pathname.split('/').pop() || '';
        const match = segment.match(/^\d+-[a-z0-9]+-(.+)$/);
        return match ? match[1] : segment;
      }
      return item;
    } catch {
      return item;
    }
  };

  const normalizeFileName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

  const handleFiles = async (files) => {
    if (!files?.length) return;
    const fileList = Array.from(files);
    const existingNormalized = new Set(
      value.map((item) => normalizeFileName(getComparableName(item)).toLowerCase())
    );
    const toAdd = fileList.filter(
      (f) => !existingNormalized.has(normalizeFileName(f.name).toLowerCase())
    );
    if (toAdd.length === 0) {
      setUploadError('File(s) already added');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setUploadError('');
    if (onUpload) {
      setUploading(true);
      try {
        const urls = await Promise.all(toAdd.map((file) => onUpload(file)));
        onChange([...value, ...urls.filter(Boolean)]);
      } catch (err) {
        setUploadError(err?.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    } else {
      const names = toAdd.map((f) => f.name);
      onChange([...value, ...names]);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleInputChange = (e) => {
    handleFiles(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    handleFiles(e.dataTransfer?.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleRemove = (index) => {
    setUploadError('');
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className={className}>
      {label && (
        <Label.Root className={`${getLabelClasses('light')} mb-2 block`}>
          {label}
        </Label.Root>
      )}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0 lg:flex-[1]">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleInputChange}
            disabled={uploading}
            className="sr-only"
            aria-label={label || 'Upload files'}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            disabled={uploading}
            className={`
              w-full min-h-[120px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors
              ${dragOver
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
              ${uploading ? 'opacity-60 cursor-wait' : 'cursor-pointer'}
            `}
          >
            {uploading ? (
              <span className="text-sm text-gray-500 dark:text-gray-400">Uploading…</span>
            ) : (
              <>
                <HiUpload className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400 text-center px-4">
                  {placeholder}
                </span>
              </>
            )}
          </button>
          {uploadError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{uploadError}</p>
          )}
        </div>
        <div className="flex-1 min-w-0 lg:flex-[3]">
          {value.length === 0 ? (
            <div className="min-h-[120px] rounded-xl border border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center">
              <span className="text-sm text-gray-400 dark:text-gray-500">No files attached</span>
            </div>
          ) : (
            <ul className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
              {value.map((item, index) => {
                const { label: typeLabel, category } = getFileType(item);
                const Icon = FILE_ICONS[category] || FILE_ICONS.default;
                const styles = FILE_TYPE_STYLES[category] || FILE_TYPE_STYLES.default;
                return (
                  <li
                    key={`${item}-${index}`}
                    className="flex flex-col w-[140px] h-[100px] min-w-0 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/60 p-2 group"
                  >
                    <div className="flex flex-col items-center justify-between gap-1 mb-1 h-full min-w-0 w-full">
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className={`flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0 ${styles.icon}`} aria-hidden>
                          <Icon className="w-4 h-4" />
                        </span>
                        <IconButton
                          type="button"
                          variant="danger"
                          onClick={() => handleRemove(index)}
                          className="!p-1 flex-shrink-0 opacity-70 group-hover:opacity-100"
                          aria-label="Remove file"
                        >
                          <HiTrash className="w-4 h-4" />
                        </IconButton>
                      </div>
                      <div className="min-w-0 w-full overflow-hidden mt-0.5 flex-shrink-0">
                        <span
                          className="block text-xs text-gray-900 dark:text-white break-words"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                          title={item}
                        >
                          {displayNameForItem(item)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
