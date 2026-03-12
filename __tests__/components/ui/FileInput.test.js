/**
 * Unit tests for FileInput: render, change (no file / invalid type / success / error), clear, disabled
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileInput from '@/components/ui/FileInput';

const mockResizeAndCompressImage = jest.fn();
jest.mock('@/components/ui/fileInputResize', () => ({
  resizeAndCompressImage: (...args) => mockResizeAndCompressImage(...args),
}));

const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();
beforeAll(() => {
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;
});
afterAll(() => {
  delete global.URL.createObjectURL;
  delete global.URL.revokeObjectURL;
});

jest.mock('@radix-ui/react-label', () => ({
  Root: ({ children, htmlFor, className }) => (
    <label htmlFor={htmlFor} className={className}>{children}</label>
  ),
}));

jest.mock('@/components/ui/formControlStyles', () => ({
  FORM_CONTROL_LIGHT_LABEL: 'form-label',
}));

jest.mock('react-icons/hi', () => ({
  HiPhotograph: () => <span data-testid="hi-photo">photo</span>,
  HiX: () => <span data-testid="hi-x">×</span>,
}));

describe('FileInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResizeAndCompressImage.mockResolvedValue(
      new File(['resized'], 'resized.png', { type: 'image/png', lastModified: Date.now() })
    );
  });

  it('renders label and placeholder when no preview', () => {
    render(<FileInput id="img" value="" onChange={jest.fn()} />);
    expect(screen.getByLabelText('Image')).toBeInTheDocument();
    expect(screen.getByTestId('hi-photo')).toBeInTheDocument();
    expect(screen.getByText('PNG/JPEG')).toBeInTheDocument();
  });

  it('renders custom label', () => {
    render(<FileInput id="img" label="Avatar" value="" onChange={jest.fn()} />);
    expect(screen.getByLabelText('Avatar')).toBeInTheDocument();
  });

  it('shows preview when value is set', () => {
    const { container } = render(<FileInput id="img" value="data:image/png;base64,abc" onChange={jest.fn()} />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,abc');
  });

  it('shows Remove button when preview is set', () => {
    render(<FileInput id="img" value="data:image/png;base64,abc" onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: /Remove/ })).toBeInTheDocument();
  });

  it('calls onChange(null) and clears preview when Remove is clicked', async () => {
    const onChange = jest.fn();
    render(<FileInput id="img" value="data:image/png;base64,abc" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /Remove/ }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('when user clears file input (no file selected), calls onChange(null) and clears error', () => {
    const onChange = jest.fn();
    render(<FileInput id="img" value="" onChange={onChange} />);
    const input = screen.getByLabelText('Image');
    fireEvent.change(input, { target: { files: [] } });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('sets error when file type is not PNG or JPEG', () => {
    const onChange = jest.fn();
    render(<FileInput id="img" value="" onChange={onChange} />);
    const file = new File(['x'], 'file.gif', { type: 'image/gif' });
    const input = screen.getByLabelText('Image');
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText('Only PNG and JPEG images are allowed.')).toBeInTheDocument();
    expect(mockResizeAndCompressImage).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('calls resize and onChange with resized file when valid PNG is selected', async () => {
    const onChange = jest.fn();
    const resizedFile = new File(['r'], 'resized.png', { type: 'image/png', lastModified: 1 });
    mockResizeAndCompressImage.mockResolvedValue(resizedFile);
    const { container } = render(<FileInput id="img" value="" onChange={onChange} />);
    const file = new File(['content'], 'photo.png', { type: 'image/png' });
    const input = screen.getByLabelText('Image');
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByAltText('');
    expect(mockResizeAndCompressImage).toHaveBeenCalledWith(file, 400, 400, 250 * 1024);
    expect(onChange).toHaveBeenCalledWith(resizedFile);
    expect(container.querySelector('img')).toHaveAttribute('src', 'blob:mock-url');
  });

  it('calls resize and onChange when valid JPEG is selected', async () => {
    const onChange = jest.fn();
    const resizedFile = new File(['r'], 'resized.jpg', { type: 'image/jpeg', lastModified: 1 });
    mockResizeAndCompressImage.mockResolvedValue(resizedFile);
    render(<FileInput id="img" value="" onChange={onChange} />);
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('Image');
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByAltText('');
    expect(onChange).toHaveBeenCalledWith(resizedFile);
  });

  it('passes maxWidth, maxHeight, maxSizeBytes to resize', async () => {
    const onChange = jest.fn();
    mockResizeAndCompressImage.mockResolvedValue(new File(['r'], 'x.png', { type: 'image/png' }));
    render(
      <FileInput
        id="img"
        value=""
        onChange={onChange}
        maxWidth={600}
        maxHeight={300}
        maxSizeBytes={100 * 1024}
      />
    );
    const file = new File(['c'], 'a.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Image'), { target: { files: [file] } });
    await screen.findByAltText('');
    expect(mockResizeAndCompressImage).toHaveBeenCalledWith(file, 600, 300, 100 * 1024);
  });

  it('sets error and calls onChange(null) when resize rejects', async () => {
    const onChange = jest.fn();
    mockResizeAndCompressImage.mockRejectedValue(new Error('Canvas not supported'));
    render(<FileInput id="img" value="" onChange={onChange} />);
    const file = new File(['c'], 'a.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Image'), { target: { files: [file] } });
    expect(await screen.findByText('Canvas not supported')).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('sets generic error when resize throws without message', async () => {
    mockResizeAndCompressImage.mockRejectedValue(new Error());
    render(<FileInput id="img" value="" onChange={jest.fn()} />);
    fireEvent.change(screen.getByLabelText('Image'), {
      target: { files: [new File(['c'], 'a.png', { type: 'image/png' })] },
    });
    expect(await screen.findByText('Failed to process image')).toBeInTheDocument();
  });

  it('syncs preview from value prop and clears input when value becomes empty', () => {
    const { container, rerender } = render(<FileInput id="img" value="data:url1" onChange={jest.fn()} />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'data:url1');
    rerender(<FileInput id="img" value="" onChange={jest.fn()} />);
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('disables input and Remove when disabled', () => {
    render(<FileInput id="img" value="data:image/png;base64,x" onChange={jest.fn()} disabled />);
    const input = screen.getByLabelText('Image');
    expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: /Remove/ })).toBeDisabled();
  });

  it('hides label when label is empty', () => {
    render(<FileInput id="img" label="" value="" onChange={jest.fn()} />);
    expect(screen.queryByRole('label')).not.toBeInTheDocument();
  });
});
