/**
 * Unit tests for ProjectCard
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectCard from '@/components/dashboard/ProjectCard';

jest.mock('next/link', () => {
  return function MockLink({ children, href }) {
    return <a href={href}>{children}</a>;
  };
});

describe('ProjectCard', () => {
  const defaultProject = { name: 'Website Redesign', id: 'proj-1', notes: '', estimate: '', address: '', invoices: '' };

  it('renders project name and ID', () => {
    render(
      <ProjectCard
        project={defaultProject}
        index={0}
        onUpdate={() => {}}
        onRemove={() => {}}
        onToggleExpand={() => {}}
      />
    );
    expect(screen.getByText('Website Redesign')).toBeInTheDocument();
    expect(screen.getByText('ID: proj-1')).toBeInTheDocument();
  });

  it('renders Untitled Project when name is empty', () => {
    render(
      <ProjectCard
        project={{ ...defaultProject, name: '' }}
        index={0}
        onUpdate={() => {}}
        onRemove={() => {}}
        onToggleExpand={() => {}}
      />
    );
    expect(screen.getByText('Untitled Project')).toBeInTheDocument();
  });

  it('calls onToggleExpand when Edit is clicked', async () => {
    const onToggleExpand = jest.fn();
    render(
      <ProjectCard
        project={defaultProject}
        index={0}
        onUpdate={() => {}}
        onRemove={() => {}}
        onToggleExpand={onToggleExpand}
      />
    );
    await userEvent.click(screen.getByTitle('Edit project'));
    expect(onToggleExpand).toHaveBeenCalled();
  });

  it('calls onRemove when Remove is clicked', async () => {
    const onRemove = jest.fn();
    render(
      <ProjectCard
        project={defaultProject}
        index={0}
        onUpdate={() => {}}
        onRemove={onRemove}
        onToggleExpand={() => {}}
      />
    );
    await userEvent.click(screen.getByTitle('Remove project'));
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it('shows View client link when readOnly and clientId', () => {
    render(
      <ProjectCard
        project={defaultProject}
        index={0}
        onUpdate={() => {}}
        onRemove={() => {}}
        readOnly
        clientId="client-1"
        clientTermSingularLower="client"
      />
    );
    const link = screen.getByRole('link', { name: /View client/i });
    expect(link).toHaveAttribute('href', '/dashboard/clients/client-1/edit');
  });

  it('shows notes, estimate, address when set', () => {
    render(
      <ProjectCard
        project={{
          ...defaultProject,
          notes: 'Some notes',
          estimate: '5000',
          address: '123 Main St',
          invoices: 'INV-1',
        }}
        index={0}
        onUpdate={() => {}}
        onRemove={() => {}}
        onToggleExpand={() => {}}
        currency="USD"
      />
    );
    expect(screen.getByText('Some notes')).toBeInTheDocument();
    expect(screen.getByText(/Estimate:/)).toBeInTheDocument();
    expect(screen.getByText(/\$5,000\.00/)).toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('INV-1')).toBeInTheDocument();
  });

  it('shows No details yet when collapsed and no details', () => {
    render(
      <ProjectCard
        project={defaultProject}
        index={0}
        onUpdate={() => {}}
        onRemove={() => {}}
        onToggleExpand={() => {}}
      />
    );
    expect(screen.getByText(/No details yet/)).toBeInTheDocument();
  });
});
