/**
 * Unit tests for ServiceSelector:
 * - Renders dropdown and Add button
 * - Single mode: selecting a service calls onChange with [id]
 * - Multiple mode: selecting adds to value; chips show with remove
 * - Add button opens drawer with Add Service form; data-testid add-service-from-drawer
 * - onServiceCreated called when new service is created (mock)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ServiceSelector from '@/components/dashboard/ServiceSelector';

jest.mock('@/lib/UserAccountContext', () => ({
  useOptionalUserAccount: () => null,
}));

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

const services = [
  { id: 'svc-1', name: 'Haircut', assignedTeamMemberIds: ['tm1'] },
  { id: 'svc-2', name: 'Consultation', assignedTeamMemberIds: ['tm1', 'tm2'] },
];

const teamMembers = [
  { id: 'tm1', name: 'Alice' },
  { id: 'tm2', name: 'Bob' },
];

describe('ServiceSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders label, dropdown placeholder, and Add button', () => {
    const onChange = jest.fn();
    render(
      <ServiceSelector
        services={services}
        value={[]}
        onChange={onChange}
        onServiceCreated={jest.fn()}
        teamMembers={teamMembers}
        label="Service"
      />
    );

    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    expect(screen.getByTestId('add-service-from-drawer')).toBeInTheDocument();
  });

  it('single mode: dropdown is present and shows placeholder', () => {
    const onChange = jest.fn();
    render(
      <ServiceSelector
        services={services}
        value={[]}
        onChange={onChange}
        onServiceCreated={jest.fn()}
        teamMembers={teamMembers}
        multiple={false}
        dropdownPlaceholder="Select service..."
      />
    );

    expect(document.getElementById('service-select')).toBeInTheDocument();
    expect(screen.getByText('Select service...')).toBeInTheDocument();
  });

  it('multiple mode: shows chips for selected services and remove removes id', () => {
    const onChange = jest.fn();
    render(
      <ServiceSelector
        services={services}
        value={['svc-1']}
        onChange={onChange}
        onServiceCreated={jest.fn()}
        teamMembers={teamMembers}
        multiple
        label="Services offered"
      />
    );

    expect(screen.getByText('Haircut')).toBeInTheDocument();
    const removeBtn = screen.getByLabelText(/remove haircut/i);
    fireEvent.click(removeBtn);
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('Add button opens drawer with Add Service form', async () => {
    render(
      <ServiceSelector
        services={services}
        value={[]}
        onChange={jest.fn()}
        onServiceCreated={jest.fn()}
        teamMembers={teamMembers}
      />
    );

    fireEvent.click(screen.getByTestId('add-service-from-drawer'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /add service/i })).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/service name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('multiple mode: does not show chips for deleted services and prunes value via onChange', () => {
    const onChange = jest.fn();
    const currentServices = [services[0]];
    render(
      <ServiceSelector
        services={currentServices}
        value={['svc-1', 'svc-2', 'deleted-svc-id']}
        onChange={onChange}
        onServiceCreated={jest.fn()}
        teamMembers={teamMembers}
        multiple
        label="Services offered"
      />
    );

    expect(screen.getByText('Haircut')).toBeInTheDocument();
    expect(screen.queryByText('Consultation')).not.toBeInTheDocument();
    expect(screen.queryByText('deleted-svc-id')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(['svc-1']);
  });

  it('uses displayServices when provided (optionsSource is displayServices)', () => {
    const displayServices = [services[0]];
    render(
      <ServiceSelector
        services={services}
        displayServices={displayServices}
        value={[]}
        onChange={jest.fn()}
        onServiceCreated={jest.fn()}
        teamMembers={teamMembers}
      />
    );

    expect(document.getElementById('service-select')).toBeInTheDocument();
    expect(screen.getByTestId('add-service-from-drawer')).toBeInTheDocument();
  });

  it('respects disabled prop', () => {
    render(
      <ServiceSelector
        services={services}
        value={[]}
        onChange={jest.fn()}
        onServiceCreated={jest.fn()}
        teamMembers={teamMembers}
        disabled
      />
    );

    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled();
  });

  it('onServiceCreated and onChange called on submit; new service id added to selection (parent drawer would stay open)', async () => {
    const onChange = jest.fn();
    const onServiceCreated = jest.fn().mockResolvedValue(undefined);

    render(
      <ServiceSelector
        services={services}
        value={[]}
        onChange={onChange}
        onServiceCreated={onServiceCreated}
        teamMembers={teamMembers}
        multiple={false}
      />
    );

    fireEvent.click(screen.getByTestId('add-service-from-drawer'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /add service/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/service name/i), {
      target: { value: 'New Service' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add service/i }));

    await waitFor(() => {
      expect(onServiceCreated).toHaveBeenCalledTimes(1);
      const updatedServices = onServiceCreated.mock.calls[0][0];
      expect(updatedServices).toHaveLength(3); // existing 2 + new one
      const newSvc = updatedServices.find((s) => s.name === 'New Service');
      expect(newSvc).toBeDefined();
      expect(newSvc.id).toBeDefined();
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(Array.isArray(lastCall)).toBe(true);
      expect(lastCall).toHaveLength(1);
    });
    const newSvc = onServiceCreated.mock.calls[0][0].find((s) => s.name === 'New Service');
    expect(onChange).toHaveBeenLastCalledWith([newSvc.id]);
  });
});
