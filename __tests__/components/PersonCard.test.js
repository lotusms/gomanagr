import React from 'react';
import { render, screen } from '@testing-library/react';
import PersonCard from '@/components/dashboard/PersonCard';
import { sortTeamMembersPinned } from '@/lib/teamMemberSort';

describe('PersonCard', () => {
  it('renders name and subtitle', () => {
    render(
      <PersonCard name="Jane Doe" subtitle="Developer" />
    );
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  it('renders with click handler as button role', () => {
    const onClick = jest.fn();
    render(
      <PersonCard name="Alice" subtitle="Admin" onClick={onClick} />
    );
    const card = screen.getByRole('button');
    expect(card).toBeInTheDocument();
    card.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows Super Admin badge when isSuperAdmin is true', () => {
    render(
      <PersonCard name="Owner" subtitle="Super Admin" isSuperAdmin={true} />
    );
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByLabelText('Super Admin')).toBeInTheDocument();
  });

  it('shows Admin badge when isAdmin is true and isSuperAdmin is false', () => {
    render(
      <PersonCard name="Admin User" subtitle="Admin" isAdmin={true} isSuperAdmin={false} />
    );
    expect(screen.getByLabelText('Admin')).toBeInTheDocument();
  });

  it('does not show Admin badge when isAdmin is false', () => {
    render(
      <PersonCard name="Member" subtitle="Member" isAdmin={false} />
    );
    expect(screen.queryByLabelText('Admin')).not.toBeInTheDocument();
  });

  it('shows invite button when onInvite is provided', () => {
    const onInvite = jest.fn();
    render(
      <PersonCard name="New Member" subtitle="Member" onInvite={onInvite} />
    );
    const inviteBtn = screen.getByRole('button', { name: /invite to join/i });
    expect(inviteBtn).toBeInTheDocument();
    inviteBtn.click();
    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it('shows deactivate button when onRemove is provided', () => {
    const onRemove = jest.fn();
    render(
      <PersonCard name="Someone" subtitle="Role" onRemove={onRemove} />
    );
    const deactivateBtn = screen.getByRole('button', { name: /deactivate/i });
    expect(deactivateBtn).toBeInTheDocument();
    deactivateBtn.click();
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('renders initials when no image and not client', () => {
    render(
      <PersonCard name="Jane Doe" subtitle="Role" />
    );
    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});

describe('sortTeamMembersPinned (team member pin order)', () => {
  it('sorts so super admin is first, then admins, then the rest of the members', () => {
    const members = [
      { id: '1', name: 'Zara Member', isOwner: false, isAdmin: false },
      { id: '2', name: 'Alice Admin', isOwner: false, isAdmin: true },
      { id: '3', name: 'Super Owner', isOwner: true, isAdmin: true },
      { id: '4', name: 'Bob Admin', isOwner: false, isAdmin: true },
      { id: '5', name: 'Anna Member', isOwner: false, isAdmin: false },
    ];
    const sorted = sortTeamMembersPinned(members);
    const names = sorted.map((m) => m.name);
    expect(names[0]).toBe('Super Owner');
    expect(names[1]).toBe('Alice Admin');
    expect(names[2]).toBe('Bob Admin');
    expect(names[3]).toBe('Anna Member');
    expect(names[4]).toBe('Zara Member');
  });

  it('sorts within super admins by name', () => {
    const members = [
      { id: '1', name: 'Second Super', isOwner: true, isAdmin: true },
      { id: '2', name: 'First Super', isOwner: true, isAdmin: true },
    ];
    const sorted = sortTeamMembersPinned(members);
    expect(sorted.map((m) => m.name)).toEqual(['First Super', 'Second Super']);
  });

  it('sorts within admins by name', () => {
    const members = [
      { id: '1', name: 'Zoe Admin', isOwner: false, isAdmin: true },
      { id: '2', name: 'Alice Admin', isOwner: false, isAdmin: true },
    ];
    const sorted = sortTeamMembersPinned(members);
    expect(sorted.map((m) => m.name)).toEqual(['Alice Admin', 'Zoe Admin']);
  });

  it('sorts within members by name', () => {
    const members = [
      { id: '1', name: 'Zara', isOwner: false, isAdmin: false },
      { id: '2', name: 'Anna', isOwner: false, isAdmin: false },
    ];
    const sorted = sortTeamMembersPinned(members);
    expect(sorted.map((m) => m.name)).toEqual(['Anna', 'Zara']);
  });

  it('does not mutate the input array', () => {
    const members = [
      { id: '1', name: 'B', isOwner: false, isAdmin: true },
      { id: '2', name: 'A', isOwner: true, isAdmin: true },
    ];
    const copy = members.map((m) => ({ ...m }));
    sortTeamMembersPinned(members);
    expect(members).toEqual(copy);
  });
});
