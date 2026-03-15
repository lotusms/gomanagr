/**
 * Unit tests for DangerButton: render, onClick, href (router.push), disabled, asChild
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DangerButton from '@/components/ui/buttons/DangerButton';

const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@radix-ui/react-slot', () => {
  const React = require('react');
  return {
    Slot: ({ children, onClick, disabled, className, ...props }) =>
      React.createElement(
        'div',
        { role: 'button', className, 'data-disabled': disabled, onClick, ...props },
        children
      ),
  };
});

describe('DangerButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children and applies button classes', () => {
    render(<DangerButton>Delete</DangerButton>);
    const btn = screen.getByRole('button', { name: /delete/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('type', 'button');
    expect(btn).toHaveClass('bg-red-600');
  });

  it('calls onClick when clicked and no href', () => {
    const onClick = jest.fn();
    render(<DangerButton onClick={onClick}>Click me</DangerButton>);
    fireEvent.click(screen.getByRole('button', { name: /click me/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('navigates via router.push when href is set', async () => {
    render(<DangerButton href="/danger-zone">Go</DangerButton>);
    const btn = screen.getByRole('button', { name: /go/i });
    await userEvent.click(btn);
    expect(mockPush).toHaveBeenCalledWith('/danger-zone');
  });

  it('does not call onClick or router.push when disabled', async () => {
    const onClick = jest.fn();
    render(
      <DangerButton onClick={onClick} href="/x" disabled>
        Disabled
      </DangerButton>
    );
    const btn = screen.getByRole('button', { name: /disabled/i });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('renders as Slot when asChild is true', () => {
    render(
      <DangerButton asChild>
        <span data-testid="child">Child content</span>
      </DangerButton>
    );
    const child = screen.getByTestId('child');
    expect(child).toBeInTheDocument();
    expect(child.parentElement).toHaveAttribute('role', 'button');
  });

  it('forwards type and custom className', () => {
    render(
      <DangerButton type="submit" className="custom-class">
        Submit
      </DangerButton>
    );
    const btn = screen.getByRole('button', { name: /submit/i });
    expect(btn).toHaveAttribute('type', 'submit');
    expect(btn).toHaveClass('custom-class');
  });
});
