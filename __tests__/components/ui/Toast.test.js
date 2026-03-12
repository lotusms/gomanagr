/**
 * Unit tests for Toast: useToast error, ToastProvider context, add/remove toasts, types, RadixToast
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from '@/components/ui/Toast';

jest.mock('react-icons/hi', () => ({
  HiX: () => <span data-testid="toast-close">×</span>,
  HiCheckCircle: () => <span data-testid="icon-success">✓</span>,
  HiXCircle: () => <span data-testid="icon-error">✕</span>,
  HiExclamationCircle: () => <span data-testid="icon-warning">!</span>,
  HiInformationCircle: () => <span data-testid="icon-info">i</span>,
}));

jest.mock('@radix-ui/react-toast', () => {
  const React = require('react');
  const MockViewport = React.forwardRef(({ children, ...props }, ref) => (
    <div ref={ref} data-testid="toast-viewport" {...props}>{children}</div>
  ));
  const MockRoot = ({ open, onOpenChange, children, ...props }) =>
    open ? (
      <div data-testid="toast-root" {...props}>
        {children}
        <button type="button" data-testid="radix-close" onClick={() => onOpenChange(false)}>close</button>
      </div>
    ) : null;
  const MockDescription = ({ asChild, children }) =>
    asChild && React.isValidElement(children) ? children : <p>{children}</p>;
  const MockClose = ({ children, onClick }) => (
    <button type="button" data-testid="toast-dismiss" onClick={onClick}>{children}</button>
  );
  return {
    Provider: ({ children, duration, label }) => (
      <div data-testid="toast-provider" data-duration={duration} data-label={label}>{children}</div>
    ),
    Viewport: MockViewport,
    Root: MockRoot,
    Description: MockDescription,
    Close: MockClose,
  };
});

describe('useToast', () => {
  it('throws when used outside ToastProvider', () => {
    const Consumer = () => {
      useToast();
      return null;
    };
    expect(() => render(<Consumer />)).toThrow('useToast must be used within ToastProvider');
  });
});

describe('ToastProvider', () => {
  it('renders children', () => {
    render(
      <ToastProvider>
        <span data-testid="child">Child</span>
      </ToastProvider>
    );
    expect(screen.getByTestId('child')).toHaveTextContent('Child');
  });

  it('exposes success, error, warning, info, removeToast via context', () => {
    const spy = { add: null, remove: null };
    const Consumer = () => {
      const toast = useToast();
      spy.add = toast.success;
      spy.remove = toast.removeToast;
      return <button data-testid="trigger" onClick={() => toast.success('Done')}>Show</button>;
    };
    render(
      <ToastProvider>
        <Consumer />
      </ToastProvider>
    );
    expect(typeof spy.add).toBe('function');
    expect(typeof spy.remove).toBe('function');
    fireEvent.click(screen.getByTestId('trigger'));
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('adds toast with success type when success() is called', () => {
    const Consumer = () => {
      const toast = useToast();
      return <button onClick={() => toast.success('Saved')}>Save</button>;
    };
    render(
      <ToastProvider>
        <Consumer />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Save'));
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByTestId('icon-success')).toBeInTheDocument();
  });

  it('adds toast with error type when error() is called', () => {
    const Consumer = () => {
      const toast = useToast();
      return <button onClick={() => toast.error('Failed')}>Fail</button>;
    };
    render(
      <ToastProvider>
        <Consumer />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Fail'));
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByTestId('icon-error')).toBeInTheDocument();
  });

  it('adds toast with warning type when warning() is called', () => {
    const Consumer = () => {
      const toast = useToast();
      return <button onClick={() => toast.warning('Careful')}>Warn</button>;
    };
    render(
      <ToastProvider>
        <Consumer />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Warn'));
    expect(screen.getByText('Careful')).toBeInTheDocument();
    expect(screen.getByTestId('icon-warning')).toBeInTheDocument();
  });

  it('adds toast with info type when info() is called', () => {
    const Consumer = () => {
      const toast = useToast();
      return <button onClick={() => toast.info('Note')}>Info</button>;
    };
    render(
      <ToastProvider>
        <Consumer />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Info'));
    expect(screen.getByText('Note')).toBeInTheDocument();
    expect(screen.getByTestId('icon-info')).toBeInTheDocument();
  });

  it('addToast returns id and uses default duration when invalid', () => {
    const ids = [];
    const Consumer = () => {
      const toast = useToast();
      return (
        <>
          <button onClick={() => { ids.push(toast.success('A', -1)); }}>A</button>
          <button onClick={() => { ids.push(toast.info('B', 0)); }}>B</button>
        </>
      );
    };
    render(
      <ToastProvider>
        <Consumer />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('A'));
    fireEvent.click(screen.getByText('B'));
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBeGreaterThan(0);
    expect(ids[1]).toBe(ids[0] + 1);
  });

  it('removeToast removes the toast', () => {
    let toastId;
    const Consumer = () => {
      const toast = useToast();
      return (
        <>
          <button onClick={() => { toastId = toast.success('Bye'); }}>Add</button>
          <button data-testid="remove" onClick={() => toast.removeToast(toastId)}>Remove</button>
        </>
      );
    };
    render(
      <ToastProvider>
        <Consumer />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByText('Bye')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('remove'));
    expect(screen.queryByText('Bye')).not.toBeInTheDocument();
  });

  it('dismissing toast via close button calls removeToast after delay', () => {
    jest.useFakeTimers();
    let toastApi;
    const Consumer = () => {
      toastApi = useToast();
      return <button onClick={() => toastApi.success('Dismiss me')}>Add</button>;
    };
    render(
      <ToastProvider>
        <Consumer />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByText('Dismiss me')).toBeInTheDocument();
    const dismissBtn = screen.getByTestId('toast-dismiss');
    fireEvent.click(dismissBtn);
    act(() => { jest.advanceTimersByTime(250); });
    expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it('uses custom duration when passed to success', () => {
    const Consumer = () => {
      const toast = useToast();
      return <button onClick={() => toast.success('Quick', 1000)}>Add</button>;
    };
    render(
      <ToastProvider>
        <Consumer />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByText('Quick')).toBeInTheDocument();
  });

  it('auto-dismisses toast after duration and calls removeToast', () => {
    jest.useFakeTimers();
    const Consumer = () => {
      const toast = useToast();
      return <button onClick={() => toast.success('Auto close', 100)}>Add</button>;
    };
    render(
      <ToastProvider>
        <Consumer />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByText('Auto close')).toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(99); });
    expect(screen.getByText('Auto close')).toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(1); });
    act(() => { jest.advanceTimersByTime(250); });
    expect(screen.queryByText('Auto close')).not.toBeInTheDocument();
    jest.useRealTimers();
  });
});
