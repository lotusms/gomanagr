/**
 * Unit tests for ProjectLogCards:
 * - Renders a card per project with status, start_date, end_date, project_name, scope_summary/description
 * - STATUS_LABELS and fallback; Untitled {term}; optional scope/description; clipText
 * - borderClass, projectTermSingular, onSelect (click + Enter/Space), onDelete
 * - Account fallbacks for dateFormat, timezone
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectLogCards from '@/components/clients/add-client/ProjectLogCards';

const mockUseOptionalUserAccount = jest.fn(() => ({ dateFormat: 'MM/DD/YYYY', timezone: 'UTC' }));
jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => mockUseOptionalUserAccount(),
}));

jest.mock('@/utils/dateTimeFormatters', () => ({
  formatDateFromISO: (iso, dateFormat, timezone) => (iso ? '01/15/2026' : ''),
}));

describe('ProjectLogCards', () => {
  const projects = [
    {
      id: 'proj1',
      status: 'active',
      start_date: '2026-01-15',
      end_date: '2026-06-30',
      project_name: 'Website redesign',
      scope_summary: 'Design and build new marketing site.',
    },
    {
      id: 'proj2',
      status: 'draft',
      start_date: null,
      end_date: null,
      project_name: null,
      description: 'Backup description.',
    },
  ];

  it('renders a card per project with status, dates, name, and scope', () => {
    render(<ProjectLogCards projects={projects} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getAllByText('01/15/2026').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Website redesign')).toBeInTheDocument();
    expect(screen.getByText(/Design and build new marketing site/)).toBeInTheDocument();
    expect(screen.getByText(/Backup description/)).toBeInTheDocument();
  });

  it('shows start and end date with dash when both present', () => {
    render(<ProjectLogCards projects={[projects[0]]} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getAllByText('01/15/2026').length).toBe(2);
    expect(screen.getByText('–')).toBeInTheDocument();
    const times = document.querySelectorAll('time');
    expect(times.length).toBe(2);
    expect(times[0]).toHaveAttribute('datetime', '2026-01-15');
    expect(times[1]).toHaveAttribute('datetime', '2026-06-30');
  });

  it('shows Untitled project when project_name is missing and term is default', () => {
    render(<ProjectLogCards projects={[projects[1]]} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Untitled project')).toBeInTheDocument();
  });

  it('uses projectTermSingular for untitled label', () => {
    render(
      <ProjectLogCards
        projects={[{ id: 'x', project_name: null, status: null, start_date: null, end_date: null }]}
        projectTermSingular="Engagement"
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByText('Untitled engagement')).toBeInTheDocument();
  });

  it('shows status from STATUS_LABELS or raw value for unknown status', () => {
    const customStatus = [
      { id: 'c1', status: 'custom', project_name: 'P', start_date: null, end_date: null },
    ];
    render(<ProjectLogCards projects={customStatus} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('custom')).toBeInTheDocument();
  });

  it('uses scope_summary when present, else description', () => {
    const withBoth = [
      { id: 'b1', status: 'active', project_name: 'P', scope_summary: 'Scope here', description: 'Desc here', start_date: null, end_date: null },
    ];
    render(<ProjectLogCards projects={withBoth} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Scope here')).toBeInTheDocument();
  });

  it('clips long scope/description and adds ellipsis', () => {
    const longScope = [
      {
        id: 'l1',
        status: 'active',
        project_name: 'Long',
        scope_summary: 'Line one\nLine two\nLine three\nLine four',
        start_date: null,
        end_date: null,
      },
    ];
    render(<ProjectLogCards projects={longScope} onSelect={() => {}} onDelete={() => {}} />);
    const p = screen.getByText((content, el) => el?.tagName === 'P' && content.includes('Line one') && content.includes('…'));
    expect(p).toBeInTheDocument();
  });

  it('omits scope paragraph when scope_summary and description are both falsy', () => {
    const noScope = [
      { id: 'n1', status: 'active', project_name: 'No scope', start_date: null, end_date: null },
    ];
    render(<ProjectLogCards projects={noScope} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('No scope')).toBeInTheDocument();
    const paras = screen.getByText('No scope').closest('[role="button"]').querySelectorAll('p');
    expect(paras.length).toBe(1);
  });

  it('calls onSelect with project id when card is clicked', async () => {
    const onSelect = jest.fn();
    render(<ProjectLogCards projects={projects} onSelect={onSelect} onDelete={() => {}} />);
    await userEvent.click(screen.getByText('Website redesign').closest('[role="button"]'));
    expect(onSelect).toHaveBeenCalledWith('proj1');
  });

  it('calls onSelect when card receives Enter key', () => {
    const onSelect = jest.fn();
    render(<ProjectLogCards projects={projects} onSelect={onSelect} onDelete={() => {}} />);
    const card = screen.getByText('Website redesign').closest('[role="button"]');
    fireEvent.keyDown(card, { key: 'Enter', preventDefault: jest.fn() });
    expect(onSelect).toHaveBeenCalledWith('proj1');
  });

  it('calls onSelect when card receives Space key', () => {
    const onSelect = jest.fn();
    render(<ProjectLogCards projects={projects} onSelect={onSelect} onDelete={() => {}} />);
    const card = screen.getByText('Website redesign').closest('[role="button"]');
    fireEvent.keyDown(card, { key: ' ', preventDefault: jest.fn() });
    expect(onSelect).toHaveBeenCalledWith('proj1');
  });

  it('calls onDelete with project id when delete button is clicked', async () => {
    const onDelete = jest.fn();
    render(<ProjectLogCards projects={projects} onSelect={() => {}} onDelete={onDelete} />);
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete project' });
    await userEvent.click(deleteButtons[1]);
    expect(onDelete).toHaveBeenCalledWith('proj2');
  });

  it('applies borderClass when provided', () => {
    const { container } = render(
      <ProjectLogCards
        projects={[projects[0]]}
        borderClass="border-l-purple-500"
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );
    const card = container.querySelector('.border-l-purple-500');
    expect(card).toBeInTheDocument();
  });

  it('renders empty grid when projects is empty', () => {
    const { container } = render(<ProjectLogCards projects={[]} onSelect={() => {}} onDelete={() => {}} />);
    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
    expect(grid.children.length).toBe(0);
  });

  it('uses fallback dateFormat and timezone when account is null', () => {
    mockUseOptionalUserAccount.mockReturnValueOnce(null);
    const singleProject = [{ id: 'p1', status: 'active', start_date: '2026-02-01', end_date: null, project_name: 'Test' }];
    render(<ProjectLogCards projects={singleProject} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('01/15/2026')).toBeInTheDocument();
  });
});
