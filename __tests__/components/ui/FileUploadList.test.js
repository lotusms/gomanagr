/**
 * Unit tests for FileUploadList:
 * - Renders label, drop zone, and file list
 * - Shows "No files attached" when value is empty
 * - Renders list items with display name (timestamp-random- prefix stripped for UI; value/DB unchanged) and remove button
 * - onChange called when removing an item
 * - Without onUpload: adding files calls onChange with new names (no duplicate names added)
 * - With onUpload: adding files calls onUpload per file and onChange with returned URLs
 * - Duplicate file (same name as existing) shows "File(s) already added" and does not add
 * - Duplicate detection works for URLs with our API format (timestamp-random-originalname)
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileUploadList from '@/components/ui/FileUploadList';

function triggerFileInput(input, files) {
  const fileList = { length: files.length, item: (i) => files[i] || null, ...files };
  Object.defineProperty(input, 'files', { value: fileList, configurable: true });
  fireEvent.change(input);
}

describe('FileUploadList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('render', () => {
    it('renders label and placeholder when provided', () => {
      const onChange = jest.fn();
      render(
        <FileUploadList
          id="files"
          label="Attachments"
          value={[]}
          onChange={onChange}
          placeholder="Drag or click"
        />
      );
      expect(screen.getByText('Attachments')).toBeInTheDocument();
      expect(screen.getByText('Drag or click')).toBeInTheDocument();
      expect(screen.getByText('No files attached')).toBeInTheDocument();
    });

    it('renders file list with display names and remove buttons', () => {
      const onChange = jest.fn();
      const value = ['report.pdf', 'https://storage.example/path/123-abc-doc.pdf'];
      render(<FileUploadList id="files" value={value} onChange={onChange} />);

      expect(screen.getByText('report.pdf')).toBeInTheDocument();
      // UI strips upload prefix (timestamp-random-) so user sees original name only
      expect(screen.getByText('doc.pdf')).toBeInTheDocument();
      const removeButtons = screen.getAllByRole('button', { name: /remove file/i });
      expect(removeButtons).toHaveLength(2);
    });

    it('uses full URL segment when not in timestamp-random-name format', () => {
      const onChange = jest.fn();
      render(
        <FileUploadList
          id="files"
          value={['https://example.com/legacy-file.pdf']}
          onChange={onChange}
        />
      );
      expect(screen.getByText('legacy-file.pdf')).toBeInTheDocument();
    });

    it('strips timestamp-random- prefix in UI but onChange receives full value', async () => {
      const onChange = jest.fn();
      const fullUrl = 'https://bucket.example/path/1730123456789-xyz789-contract.docx';
      render(<FileUploadList id="files" value={[fullUrl]} onChange={onChange} />);

      expect(screen.getByText('contract.docx')).toBeInTheDocument();
      const removeBtn = screen.getByRole('button', { name: /remove file/i });
      await userEvent.click(removeBtn);
      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  describe('remove', () => {
    it('calls onChange without the removed item when remove is clicked', async () => {
      const onChange = jest.fn();
      render(
        <FileUploadList id="files" value={['a.pdf', 'b.pdf']} onChange={onChange} />
      );

      const removeButtons = screen.getAllByRole('button', { name: /remove file/i });
      await act(async () => {
        await userEvent.click(removeButtons[0]);
      });

      expect(onChange).toHaveBeenCalledWith(['b.pdf']);
    });
  });

  describe('add without onUpload', () => {
    it('calls onChange with existing plus new file names when files selected', async () => {
      const onChange = jest.fn();
      render(
        <FileUploadList id="files" value={['existing.pdf']} onChange={onChange} />
      );

      const input = document.getElementById('files');
      expect(input).toBeInTheDocument();

      const file = new File(['content'], 'new.pdf', { type: 'application/pdf' });
      await act(async () => {
        triggerFileInput(input, [file]);
      });

      expect(onChange).toHaveBeenCalledWith(['existing.pdf', 'new.pdf']);
    });

    it('does not add duplicate by name and shows error when same name selected', async () => {
      const onChange = jest.fn();
      render(
        <FileUploadList id="files" value={['report.pdf']} onChange={onChange} />
      );

      const input = document.getElementById('files');
      const file = new File(['x'], 'report.pdf', { type: 'application/pdf' });
      await act(async () => {
        triggerFileInput(input, [file]);
      });

      await waitFor(() => {
        expect(screen.getByText(/File\(s\) already added/)).toBeInTheDocument();
      });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('add with onUpload', () => {
    it('calls onUpload for each new file and onChange with returned URLs', async () => {
      const onChange = jest.fn();
      const onUpload = jest.fn().mockResolvedValue('https://storage.example/u1/c1/doc.pdf');
      render(
        <FileUploadList
          id="files"
          value={[]}
          onChange={onChange}
          onUpload={onUpload}
        />
      );

      const input = document.getElementById('files');
      const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
      await act(async () => {
        triggerFileInput(input, [file]);
      });

      await waitFor(() => {
        expect(onUpload).toHaveBeenCalledWith(file);
      });
      expect(onChange).toHaveBeenCalledWith(['https://storage.example/u1/c1/doc.pdf']);
    });

    it('treats URL with our API filename format as same file for dedupe', async () => {
      const onChange = jest.fn();
      const onUpload = jest.fn().mockResolvedValue('https://x.com/obj/1234567890-abcdefghi-report.pdf');
      render(
        <FileUploadList
          id="files"
          value={['https://x.com/obj/1234567890-abcdefghi-report.pdf']}
          onChange={onChange}
          onUpload={onUpload}
        />
      );

      const input = document.getElementById('files');
      const file = new File(['x'], 'report.pdf', { type: 'application/pdf' });
      await act(async () => {
        triggerFileInput(input, [file]);
      });

      await waitFor(() => {
        expect(screen.getByText(/File\(s\) already added/)).toBeInTheDocument();
      });
      expect(onUpload).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('shows upload error when onUpload rejects', async () => {
      const onChange = jest.fn();
      const onUpload = jest.fn().mockRejectedValue(new Error('Network error'));
      render(
        <FileUploadList id="files" value={[]} onChange={onChange} onUpload={onUpload} />
      );

      const input = document.getElementById('files');
      const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
      await act(async () => {
        triggerFileInput(input, [file]);
      });

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('drag and drop', () => {
    it('adds files on drop when without onUpload', async () => {
      const onChange = jest.fn();
      render(<FileUploadList id="files" value={[]} onChange={onChange} />);

      const dropZone = screen.getByRole('button', { name: /drag files here or click to browse/i });
      const file = new File(['x'], 'dropped.pdf', { type: 'application/pdf' });
      const dataTransfer = {
        files: [file],
        types: ['Files'],
      };

      await act(async () => {
        const dropEv = new Event('drop', { bubbles: true });
        Object.defineProperty(dropEv, 'dataTransfer', { value: dataTransfer, configurable: true });
        dropEv.preventDefault = jest.fn();
        dropEv.stopPropagation = jest.fn();
        dropZone.dispatchEvent(dropEv);
      });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(['dropped.pdf']);
      });
    });
  });
});
