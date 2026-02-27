/**
 * Unit tests for the client [id] redirect page: /dashboard/clients/[id]
 * - Redirects id "new" to /dashboard/clients/new
 * - Redirects client id to /dashboard/clients/[id]/edit
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ClientIdRedirect from '@/pages/dashboard/clients/[id]';

const mockReplace = jest.fn();
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

const useRouter = require('next/router').useRouter;

describe('Client [id] redirect page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /dashboard/clients/new when id is new', () => {
    useRouter.mockReturnValue({
      replace: mockReplace,
      query: { id: 'new' },
    });

    render(<ClientIdRedirect />);

    expect(screen.getByText(/redirecting/i)).toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith('/dashboard/clients/new');
  });

  it('redirects to /dashboard/clients/[id]/edit when id is a client id', () => {
    useRouter.mockReturnValue({
      replace: mockReplace,
      query: { id: 'client-123' },
    });

    render(<ClientIdRedirect />);

    expect(mockReplace).toHaveBeenCalledWith('/dashboard/clients/client-123/edit');
  });
});
