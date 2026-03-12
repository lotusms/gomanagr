import { useRef, useState, useEffect } from 'react';
import * as Label from '@radix-ui/react-label';
import { HiPhotograph, HiX } from 'react-icons/hi';
import { FORM_CONTROL_LIGHT_LABEL } from './formControlStyles';
import { resizeAndCompressImage } from './fileInputResize';

const ACCEPT = 'image/png,image/jpeg,image/jpg';
const DEFAULT_MAX_WIDTH = 400;
const DEFAULT_MAX_HEIGHT = 400;
const DEFAULT_MAX_SIZE_BYTES = 250 * 1024; // 250KB

/**
 * Image file input with resize/compression. Accepts only PNG and JPEG.
 * @param {string} id
 * @param {string} [label]
 * @param {string} [value] - Preview URL (data URL or object URL)
 * @param {(file: File | null) => void} onChange
 * @param {number} [maxWidth]
 * @param {number} [maxHeight]
 * @param {number} [maxSizeBytes]
 * @param {boolean} [disabled]
 * @param {string} [className]
 */
export default function FileInput({
  id,
  label = 'Image',
  value,
  onChange,
  maxWidth = DEFAULT_MAX_WIDTH,
  maxHeight = DEFAULT_MAX_HEIGHT,
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
  disabled = false,
  className = '',
}) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(value || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setPreview(value || '');
    if (!value && inputRef.current) inputRef.current.value = '';
  }, [value]);

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      onChange(null);
      setPreview('');
      setError('');
      return;
    }
    const t = file.type?.toLowerCase();
    if (t !== 'image/png' && t !== 'image/jpeg' && t !== 'image/jpg') {
      setError('Only PNG and JPEG images are allowed.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const resized = await resizeAndCompressImage(file, maxWidth, maxHeight, maxSizeBytes);
      onChange(resized);
      const url = URL.createObjectURL(resized);
      setPreview(url);
    } catch (err) {
      setError(err?.message || 'Failed to process image');
      onChange(null);
      setPreview('');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    setPreview('');
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={className}>
      {label && (
        <Label.Root htmlFor={id} className={FORM_CONTROL_LIGHT_LABEL}>
          {label}
        </Label.Root>
      )}
      <div className="flex items-start gap-4">
        <label
          htmlFor={id}
          className={`flex flex-col items-center justify-center w-28 h-28 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 cursor-pointer hover:bg-gray-100 hover:border-gray-400 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {preview ? (
            <img src={preview} alt="" className="w-full h-full object-cover object-top rounded-lg" />
          ) : loading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
          ) : (
            <>
              <HiPhotograph className="w-10 h-10 mb-1" />
              <span className="text-xs">PNG/JPEG</span>
            </>
          )}
        </label>
        <div className="flex-1 min-w-0">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={ACCEPT}
            onChange={handleChange}
            disabled={disabled || loading}
            className="sr-only"
          />
          {preview && (
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-600"
            >
              <HiX className="w-4 h-4" />
              Remove
            </button>
          )}
          {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
