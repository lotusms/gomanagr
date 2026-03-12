/**
 * Unit tests for AddProjectForm
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AddProjectForm from '@/components/clients/add-client/AddProjectForm';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), pathname: '/', query: {}, asPath: '/' }),
}));
jest.mock('@/components/ui', () => ({
  useCancelWithConfirm: (onCancel) => ({ handleCancel: onCancel, discardDialog: null }),
}));

describe('AddProjectForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders project name, id, notes, estimate, address, invoices and action buttons', () => {
    render(<AddProjectForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    expect(screen.getByLabelText(/Project Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notes\/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project Estimate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project Invoices/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Project/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('shows validation error when project name is empty on submit', () => {
    const { container } = render(<AddProjectForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    fireEvent.submit(container.querySelector('form'));
    expect(screen.getByText(/Project name is required/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with trimmed project data when valid', async () => {
    mockOnSubmit.mockResolvedValue(undefined);
    const { container } = render(<AddProjectForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    fireEvent.change(screen.getByLabelText(/Project Name/i), { target: { value: '  Website Redesign  ' } });
    fireEvent.change(screen.getByLabelText(/Project ID/i), { target: { value: 'proj-1' } });
    fireEvent.change(screen.getByLabelText(/Notes\/Description/i), { target: { value: 'Notes here' } });
    fireEvent.submit(container.querySelector('form'));
    await expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Website Redesign',
        id: 'proj-1',
        notes: 'Notes here',
      })
    );
  });

  it('populates form when initialProject is provided', () => {
    render(
      <AddProjectForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialProject={{
          id: 'p1',
          name: 'Existing Project',
          notes: 'Some notes',
          estimate: '5000',
          address: '123 Main St',
          invoices: 'inv-1, inv-2',
        }}
      />
    );
    expect(screen.getByDisplayValue('Existing Project')).toBeInTheDocument();
    expect(screen.getByDisplayValue('p1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Some notes')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument();
    expect(screen.getByDisplayValue('inv-1, inv-2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Project/i })).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', () => {
    render(<AddProjectForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables buttons and shows Saving when loading', () => {
    render(<AddProjectForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} loading />);
    expect(screen.getByRole('button', { name: /Saving/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('shows submit error when onSubmit throws', async () => {
    mockOnSubmit.mockRejectedValue(new Error('Save failed'));
    const orig = console.error;
    console.error = () => {};
    const { container } = render(<AddProjectForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    fireEvent.change(screen.getByLabelText(/Project Name/i), { target: { value: 'Proj' } });
    fireEvent.submit(container.querySelector('form'));
    expect(await screen.findByText(/Save failed|Failed to save project/i)).toBeInTheDocument();
    console.error = orig;
  });

  it('clears name error when user types in project name', () => {
    const { container } = render(<AddProjectForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    fireEvent.submit(container.querySelector('form'));
    expect(screen.getByText(/Project name is required/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Project Name/i), { target: { value: 'X' } });
    expect(screen.queryByText(/Project name is required/i)).not.toBeInTheDocument();
  });
});
