/**
 * Unit tests for ClientProposalForm:
 * - Renders with required mocks; submit create path
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientProposalForm from '@/components/clients/add-client/ClientProposalForm';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), pathname: '/', query: {}, asPath: '/' }),
}));
jest.mock('@/components/ui', () => {
  const React = require('react');
  return {
    useToast: () => ({ success: jest.fn(), error: jest.fn() }),
    FormStepContent: ({ children }) => React.createElement(React.Fragment, null, children),
    FormStepSection: ({ children }) => React.createElement(React.Fragment, null, children),
    FormStepNav: ({ steps, currentStep, onStepChange, ariaLabel }) =>
      React.createElement(
        'nav',
        { 'aria-label': ariaLabel },
        (steps || []).map((s, i) =>
          React.createElement(
            'button',
            { key: i, type: 'button', onClick: () => onStepChange && onStepChange(i + 1) },
            (s && s.label) || i + 1
          )
        )
      ),
    FormStepFooter: (props) => {
      const { onSubmitClick, onCancel, submitLabel, saving, secondarySubmitLabel, onSecondarySubmitClick } = props;
      const buttons = [
        React.createElement('button', { key: 'cancel', type: 'button', onClick: onCancel }, 'Cancel'),
        React.createElement('button', { key: 'submit', type: 'button', onClick: onSubmitClick, disabled: saving }, saving ? 'Saving...' : submitLabel),
      ];
      if (secondarySubmitLabel && onSecondarySubmitClick) {
        buttons.push(React.createElement('button', { key: 'secondary', type: 'button', onClick: onSecondarySubmitClick, disabled: saving }, secondarySubmitLabel));
      }
      return React.createElement(React.Fragment, null, buttons);
    },
    DocumentFormHeader: (props) => {
      const { titleLabel, titleValue, onTitleChange } = props;
      return React.createElement('div', null, [
        React.createElement('label', { key: 'l', htmlFor: 'proposal-title' }, titleLabel),
        React.createElement('input', {
          key: 'i',
          id: 'proposal-title',
          value: titleValue || '',
          onChange: onTitleChange || (() => {}),
          'data-testid': 'proposal-title',
        }),
      ]);
    },
    ItemizedLineItems: () => React.createElement('div', { 'data-testid': 'line-items' }),
  };
});

jest.mock('@/services/userService', () => ({
  getOrgServices: () => Promise.resolve([]),
  updateOrgServices: () => Promise.resolve(),
  getUserAccount: () => Promise.resolve({ services: [], teamMembers: [] }),
  updateServices: () => Promise.resolve(),
}));

jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (_, key) => key,
  getTermSingular: (term) => (term === 'proposal' ? 'Proposal' : term === 'client' ? 'Client' : term === 'contract' ? 'Contract' : term),
}));

function mockFetch() {
  return jest.fn((url) => {
    const u = typeof url === 'string' ? url : '';
    if (u.includes('get-next-document-id')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ suggestedId: 'PROP-2026-001' }) });
    }
    if (u.includes('get-org-clients')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ clients: [] }) });
    }
    if (u.includes('get-client-contracts')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ contracts: [] }) });
    }
    if (u.includes('create-client-proposal')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'new-proposal' }) });
    }
    if (u.includes('update-client-proposal')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }
    return Promise.reject(new Error('Unexpected fetch: ' + u));
  });
}

describe('ClientProposalForm', () => {
  const defaultProps = {
    clientId: 'client-1',
    userId: 'user-1',
    organizationId: 'org-1',
    defaultCurrency: 'USD',
    onSuccess: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch();
  });

  it('renders proposal title and Save proposal button when no proposalId', async () => {
    render(<ClientProposalForm {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByLabelText(/proposal title/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /save proposal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
  });

  it('calls create-client-proposal and onSuccess when form is submitted with title', async () => {
    render(<ClientProposalForm {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByLabelText(/proposal title/i)).toBeInTheDocument();
    });
    await userEvent.type(screen.getByLabelText(/proposal title/i), 'Q1 Proposal');
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const createCall = Array.from(global.fetch.mock.calls).find((c) => String(c[0]).includes('create-client-proposal'));
    expect(createCall).toBeDefined();
    const body = JSON.parse(createCall[1].body);
    expect(body.clientId).toBe('client-1');
    expect(body.proposal_title).toBe('Q1 Proposal');
  });

  it('renders Save proposal button when proposalId provided', async () => {
    render(
      <ClientProposalForm
        {...defaultProps}
        proposalId="prop-1"
        initial={{ proposal_title: 'Existing' }}
      />
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save proposal/i })).toBeInTheDocument();
    });
  });

  it('shows error and does not submit when proposal title is empty', async () => {
    render(<ClientProposalForm {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByLabelText(/proposal title/i)).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
    const createCalls = global.fetch.mock.calls.filter((c) => String(c[0]).includes('create-client-proposal'));
    expect(createCalls.length).toBe(0);
  });

  it('calls update-client-proposal when proposalId provided and submit succeeds', async () => {
    render(
      <ClientProposalForm
        {...defaultProps}
        proposalId="prop-99"
        initial={{ proposal_title: 'Existing Proposal' }}
      />
    );
    await waitFor(() => {
      expect(screen.getByLabelText(/proposal title/i)).toHaveValue('Existing Proposal');
    });
    await userEvent.click(screen.getByRole('button', { name: /save proposal/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const updateCall = Array.from(global.fetch.mock.calls).find((c) => String(c[0]).includes('update-client-proposal'));
    expect(updateCall).toBeDefined();
    const body = JSON.parse(updateCall[1].body);
    expect(body.proposalId).toBe('prop-99');
    expect(body.proposal_title).toBe('Existing Proposal');
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalled());
  });

  it('shows error when update-client-proposal returns not ok', async () => {
    const mockFetchImpl = jest.fn((url) => {
      const u = typeof url === 'string' ? url : '';
      if (u.includes('update-client-proposal')) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Update failed' }) });
      }
      return mockFetch()(url);
    });
    global.fetch = mockFetchImpl;
    render(
      <ClientProposalForm
        {...defaultProps}
        proposalId="prop-1"
        initial={{ proposal_title: 'Existing' }}
      />
    );
    await waitFor(() => {
      expect(screen.getByLabelText(/proposal title/i)).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.submit(document.querySelector('form'));
    });
    await waitFor(() => {
      expect(screen.getByText(/Update failed/)).toBeInTheDocument();
    });
  });

  it('calls onHasChangesChange when form is edited', async () => {
    const onHasChangesChange = jest.fn();
    render(<ClientProposalForm {...defaultProps} onHasChangesChange={onHasChangesChange} />);
    await waitFor(() => {
      expect(screen.getByLabelText(/proposal title/i)).toBeInTheDocument();
    });
    await userEvent.type(screen.getByLabelText(/proposal title/i), 'X');
    await waitFor(() => {
      expect(onHasChangesChange).toHaveBeenCalledWith(true);
    });
  });
});
