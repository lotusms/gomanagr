/**
 * Unit tests for SettingsMenu: sections list, active state, hiddenSections, sectionLabelOverrides, onSectionChange
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsMenu from '@/components/settings/SettingsMenu';

jest.mock('react-icons/hi', () => ({
  HiCog: () => <span data-testid="icon-cog" />,
  HiOfficeBuilding: () => <span data-testid="icon-office" />,
  HiUserGroup: () => <span data-testid="icon-usergroup" />,
  HiColorSwatch: () => <span data-testid="icon-theme" />,
  HiShieldCheck: () => <span data-testid="icon-security" />,
  HiCode: () => <span data-testid="icon-code" />,
  HiCreditCard: () => <span data-testid="icon-credit" />,
}));

describe('SettingsMenu', () => {
  it('renders all section buttons by default', () => {
    const onSectionChange = jest.fn();
    render(<SettingsMenu activeSection="general" onSectionChange={onSectionChange} />);
    expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Organization' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Team Access' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Theme' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Security' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'API' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Billing' })).toBeInTheDocument();
  });

  it('calls onSectionChange when a section button is clicked', async () => {
    const onSectionChange = jest.fn();
    render(<SettingsMenu activeSection="general" onSectionChange={onSectionChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Theme' }));
    expect(onSectionChange).toHaveBeenCalledWith('theme');
  });

  it('hides sections listed in hiddenSections', () => {
    render(
      <SettingsMenu
        activeSection="general"
        onSectionChange={jest.fn()}
        hiddenSections={['billing', 'api']}
      />
    );
    expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Billing' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'API' })).not.toBeInTheDocument();
  });

  it('uses sectionLabelOverrides when provided', () => {
    render(
      <SettingsMenu
        activeSection="general"
        onSectionChange={jest.fn()}
        sectionLabelOverrides={{ general: 'Account' }}
      />
    );
    expect(screen.getByRole('button', { name: 'Account' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'General' })).not.toBeInTheDocument();
  });

  it('applies active styling to activeSection', () => {
    render(<SettingsMenu activeSection="theme" onSectionChange={jest.fn()} />);
    const themeBtn = screen.getByRole('button', { name: 'Theme' });
    expect(themeBtn.className).toMatch(/bg-primary/);
  });
});
