/**
 * Unit tests for ProjectCardServiceStyle
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectCardServiceStyle from '@/components/dashboard/ProjectCardServiceStyle';

jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => null,
}));

jest.mock('@/utils/dateTimeFormatters', () => ({
  formatDateFromISO: (d) => (d ? new Date(d).toLocaleDateString() : '—'),
}));

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (_, key) => key,
  getTermSingular: (t) => (t === 'project' ? 'Project' : t),
}));

describe('ProjectCardServiceStyle', () => {
  const project = {
    id: 'proj-1',
    project_name: 'My Project',
    status: 'active',
    start_date: '2026-02-01',
  };

  it('renders project name', () => {
    render(
      <ProjectCardServiceStyle project={project} onSelect={() => {}} onDelete={() => {}} />
    );
    expect(screen.getByText('My Project')).toBeInTheDocument();
  });

  it('renders Untitled project when project_name is empty', () => {
    render(
      <ProjectCardServiceStyle
        project={{ ...project, project_name: '' }}
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByText(/Untitled project/)).toBeInTheDocument();
  });

  it('calls onSelect when card is clicked', async () => {
    const onSelect = jest.fn();
    render(
      <ProjectCardServiceStyle project={project} onSelect={onSelect} onDelete={() => {}} />
    );
    fireEvent.click(screen.getByText('My Project').closest('[role="button"]'));
    expect(onSelect).toHaveBeenCalledWith('proj-1');
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = jest.fn();
    render(
      <ProjectCardServiceStyle project={project} onSelect={() => {}} onDelete={onDelete} />
    );
    const deleteBtn = screen.getByTitle(/Delete project/i);
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith('proj-1');
  });
});
