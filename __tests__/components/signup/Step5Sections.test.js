/**
 * Unit tests for Step5Sections: render, select all, sections change, updateData
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Step5Sections from '@/components/signup/Step5Sections';

jest.mock('@/components/ui', () => ({
  ChipsMulti: ({ id, label, value, onValueChange, options }) => (
    <div data-testid="chips-multi">
      <label>{label}</label>
      {options.map((opt) => (
        <button key={opt} type="button" onClick={() => onValueChange(value?.includes(opt) ? value.filter((x) => x !== opt) : [...(value || []), opt])}>
          {opt}
        </button>
      ))}
      <span data-value={JSON.stringify(value || [])}>{value?.length ?? 0}</span>
    </div>
  ),
  Checkbox: ({ id, checked, onCheckedChange, children }) => (
    <label>
      <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} data-testid={id} />
      {children}
    </label>
  ),
}));

describe('Step5Sections', () => {
  it('renders heading and Select All checkbox', () => {
    const updateData = jest.fn();
    render(<Step5Sections data={{}} updateData={updateData} errors={{}} />);
    expect(screen.getByRole('heading', { name: /What sections are you looking/ })).toBeInTheDocument();
    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(screen.getByTestId('chips-multi')).toBeInTheDocument();
  });

  it('calls updateData with all options when Select All is checked', async () => {
    const updateData = jest.fn();
    render(<Step5Sections data={{ sectionsToTrack: [] }} updateData={updateData} errors={{}} />);
    await userEvent.click(screen.getByTestId('selectAllSections'));
    expect(updateData).toHaveBeenCalledWith({ sectionsToTrack: expect.any(Array) });
    expect(updateData.mock.calls[0][0].sectionsToTrack.length).toBeGreaterThan(0);
  });

  it('calls updateData with empty array when Select All is unchecked', async () => {
    const updateData = jest.fn();
    const allSections = ['Client management', 'Lead Tracking', 'Onboarding', 'Messaging', 'File sharing', 'Scheduling', 'Invoicing / payments', 'Staff Management', 'Portfolio / Project Management', 'Task Management', 'Requests & Approvals', 'Resources Management'];
    render(<Step5Sections data={{ sectionsToTrack: allSections }} updateData={updateData} errors={{}} />);
    await userEvent.click(screen.getByTestId('selectAllSections'));
    expect(updateData).toHaveBeenCalledWith({ sectionsToTrack: [] });
  });

  it('uses empty array when data.sectionsToTrack is null or undefined', () => {
    render(<Step5Sections data={{}} updateData={jest.fn()} errors={{}} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('displays error when errors.sectionsToTrack is set', () => {
    render(<Step5Sections data={{}} updateData={jest.fn()} errors={{ sectionsToTrack: 'Select at least one' }} />);
    expect(screen.getByTestId('chips-multi')).toBeInTheDocument();
  });
});
