import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TeamFilter from '@/components/ui/TeamFilter';

jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/dashboard/team', push: jest.fn(), replace: jest.fn() }),
}));

const defaultFilters = {
  roles: [],
  services: [],
  genders: [],
  personalityTraits: [],
};

describe('TeamFilter', () => {
  it('renders filter header with Filters label', () => {
    render(
      <TeamFilter teamMembers={[]} filters={defaultFilters} onFiltersChange={() => {}} />
    );
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('does not show active filter count when no filters are selected', () => {
    render(
      <TeamFilter teamMembers={[]} filters={defaultFilters} onFiltersChange={() => {}} />
    );
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('shows active filter count badge when filters are selected', () => {
    render(
      <TeamFilter
        teamMembers={[{ role: 'Developer' }]}
        filters={{ ...defaultFilters, roles: ['Developer'] }}
        onFiltersChange={() => {}}
      />
    );
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows total active filter count across all filter types', () => {
    render(
      <TeamFilter
        teamMembers={[{ role: 'A', gender: 'Female' }]}
        filters={{
          ...defaultFilters,
          roles: ['A'],
          genders: ['Female'],
        }}
        onFiltersChange={() => {}}
      />
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('expands to show filter options when header is clicked', () => {
    const teamMembers = [
      { id: '1', role: 'Developer', services: ['Consulting'], gender: 'Male', personalityTraits: ['Detail-oriented'] },
    ];
    render(
      <TeamFilter teamMembers={teamMembers} filters={defaultFilters} onFiltersChange={() => {}} />
    );
    expect(screen.queryByLabelText('Role/Position')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Filters'));

    expect(screen.getByText('Role/Position')).toBeInTheDocument();
    expect(screen.getByText('Service Offered')).toBeInTheDocument();
    expect(screen.getByText('Gender')).toBeInTheDocument();
    expect(screen.getByText('Personality Trait')).toBeInTheDocument();
  });

  it('shows no filter options available when team has no filterable data', () => {
    render(
      <TeamFilter teamMembers={[]} filters={defaultFilters} onFiltersChange={() => {}} />
    );
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByText('No filter options available')).toBeInTheDocument();
  });

  it('derives role options from team members', () => {
    const teamMembers = [
      { id: '1', role: 'Developer' },
      { id: '2', role: 'Designer' },
      { id: '3', role: 'Developer' },
    ];
    render(
      <TeamFilter teamMembers={teamMembers} filters={defaultFilters} onFiltersChange={() => {}} />
    );
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByRole('button', { name: 'Designer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Developer' })).toBeInTheDocument();
  });

  it('derives services from team members (flatMapped)', () => {
    const teamMembers = [
      { id: '1', services: ['Consulting', 'Support'] },
      { id: '2', services: ['Support'] },
    ];
    render(
      <TeamFilter teamMembers={teamMembers} filters={defaultFilters} onFiltersChange={() => {}} />
    );
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByRole('button', { name: 'Consulting' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Support' }).length).toBeGreaterThanOrEqual(1);
  });

  it('calls onFiltersChange with updated roles when a role chip is clicked', () => {
    const onFiltersChange = jest.fn();
    const teamMembers = [{ id: '1', role: 'Developer' }];
    render(
      <TeamFilter
        teamMembers={teamMembers}
        filters={defaultFilters}
        onFiltersChange={onFiltersChange}
      />
    );
    fireEvent.click(screen.getByText('Filters'));
    fireEvent.click(screen.getByRole('button', { name: 'Developer' }));

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        roles: ['Developer'],
        services: [],
        genders: [],
        personalityTraits: [],
      })
    );
  });

  it('calls onFiltersChange with all empty arrays when Clear all is clicked', () => {
    const onFiltersChange = jest.fn();
    render(
      <TeamFilter
        teamMembers={[{ role: 'Developer' }]}
        filters={{ ...defaultFilters, roles: ['Developer'] }}
        onFiltersChange={onFiltersChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }));

    expect(onFiltersChange).toHaveBeenCalledWith({
      roles: [],
      services: [],
      genders: [],
      personalityTraits: [],
    });
  });

  it('does not show Clear all when no filters are active', () => {
    render(
      <TeamFilter teamMembers={[{ role: 'Developer' }]} filters={defaultFilters} onFiltersChange={() => {}} />
    );
    expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument();
  });

  it('applies custom className to container', () => {
    const { container } = render(
      <TeamFilter
        teamMembers={[]}
        filters={defaultFilters}
        onFiltersChange={() => {}}
        className="custom-class"
      />
    );
    const wrapper = container.firstChild;
    expect(wrapper.className).toMatch(/custom-class/);
  });
});
