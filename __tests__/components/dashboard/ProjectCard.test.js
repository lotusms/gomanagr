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

  it('renders expanded edit form with all fields', () => {
    render(
      <ProjectCard
        project={defaultProject}
        index={0}
        onUpdate={() => {}}
        onRemove={() => {}}
        onToggleExpand={() => {}}
        expanded
        variant="active"
        currency="USD"
      />
    );
    expect(screen.getByLabelText(/Project Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notes\/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project Estimate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project Invoices/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project Name/i)).toHaveValue('Website Redesign');
    expect(screen.getByLabelText(/Project ID/i)).toHaveValue('proj-1');
  });

  it('calls onUpdate when editing Project ID in expanded mode', async () => {
    const onUpdate = jest.fn();
    render(
      <ProjectCard
        project={defaultProject}
        index={0}
        onUpdate={onUpdate}
        onRemove={() => {}}
        onToggleExpand={() => {}}
        expanded
        variant="active"
      />
    );
    const idInput = screen.getByLabelText(/Project ID/i);
    await userEvent.clear(idInput);
    await userEvent.type(idInput, 'proj-2');
    expect(onUpdate).toHaveBeenCalledWith(0, expect.objectContaining({ id: 'proj-2' }));
  });

  it('calls onUpdate when editing a field in expanded mode', async () => {
    const onUpdate = jest.fn();
    render(
      <ProjectCard
        project={defaultProject}
        index={2}
        onUpdate={onUpdate}
        onRemove={() => {}}
        onToggleExpand={() => {}}
        expanded
        variant="active"
        currency="USD"
      />
    );
    const nameInput = screen.getByLabelText(/Project Name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'New Name');
    expect(onUpdate).toHaveBeenCalled();
    const lastCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
    expect(lastCall[0]).toBe(2);
    expect(lastCall[1]).toMatchObject({ name: 'New Name' });
  });

  it('calls onUpdate when editing notes, estimate, address, and invoices in expanded mode', async () => {
    const onUpdate = jest.fn();
    render(
      <ProjectCard
        project={defaultProject}
        index={0}
        onUpdate={onUpdate}
        onRemove={() => {}}
        onToggleExpand={() => {}}
        expanded
        variant="completed"
        currency="USD"
      />
    );
    const notesInput = screen.getByLabelText(/Notes\/Description/i);
    await userEvent.type(notesInput, 'Scope notes');
    expect(onUpdate).toHaveBeenCalledWith(0, expect.objectContaining({ notes: 'Scope notes' }));

    const estimateInput = screen.getByLabelText(/Project Estimate/i);
    await userEvent.clear(estimateInput);
    await userEvent.type(estimateInput, '10000');
    expect(onUpdate).toHaveBeenCalledWith(0, expect.objectContaining({ estimate: expect.anything() }));

    const addressInput = screen.getByLabelText(/Project Address/i);
    await userEvent.type(addressInput, '456 Oak Ave');
    expect(onUpdate).toHaveBeenCalledWith(0, expect.objectContaining({ address: '456 Oak Ave' }));

    const invoicesInput = screen.getByLabelText(/Project Invoices/i);
    await userEvent.type(invoicesInput, 'INV-1, INV-2');
    expect(onUpdate).toHaveBeenCalledWith(0, expect.objectContaining({ invoices: 'INV-1, INV-2' }));
  });

  it('Edit button resets local state from project and toggles expand', async () => {
    const onToggleExpand = jest.fn();
    render(
      <ProjectCard
        project={{ ...defaultProject, name: 'Original' }}
        index={0}
        onUpdate={() => {}}
        onRemove={() => {}}
        onToggleExpand={onToggleExpand}
        expanded={false}
      />
    );
    await userEvent.click(screen.getByTitle('Edit project'));
    expect(onToggleExpand).toHaveBeenCalled();
  });

  it('shows Collapse title when expanded', () => {
    render(
      <ProjectCard
        project={defaultProject}
        index={0}
        onUpdate={() => {}}
        onRemove={() => {}}
        onToggleExpand={() => {}}
        expanded
      />
    );
    expect(screen.getByTitle('Collapse')).toBeInTheDocument();
  });

  it('readOnly with clientName shows client name in content', () => {
    render(
      <ProjectCard
        project={defaultProject}
        index={0}
        onUpdate={() => {}}
        onRemove={() => {}}
        onToggleExpand={() => {}}
        readOnly
        clientName="Acme Inc"
      />
    );
    expect(screen.getByText('Acme Inc')).toBeInTheDocument();
  });

  it('readOnly with no details and no clientName shows No details', () => {
    render(
      <ProjectCard
        project={defaultProject}
        index={0}
        onUpdate={() => {}}
        onRemove={() => {}}
        onToggleExpand={() => {}}
        readOnly
      />
    );
    expect(screen.getByText('No details')).toBeInTheDocument();
  });
});
