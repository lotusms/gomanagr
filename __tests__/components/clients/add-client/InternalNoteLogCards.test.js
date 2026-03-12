/**
 * Unit tests for InternalNoteLogCards:
 * - Renders a card per note with content (clipText), tag, created-by, pinned
 * - clipText behavior via content: empty, single/multi-line, clipped with ellipsis
 * - borderClass, onSelect (click + Enter/Space), onDelete
 * - TAG_LABELS and fallback; "Created by you" vs team member label
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InternalNoteLogCards from '@/components/clients/add-client/InternalNoteLogCards';

const mockGetTermSingular = jest.fn((t) => (t === 'teamMember' ? 'Team member' : t));
jest.mock('@/components/clients/clientProfileConstants', () => ({
  getTermForIndustry: (_, key) => key,
  getTermSingular: (t) => mockGetTermSingular(t),
}));

describe('InternalNoteLogCards', () => {
  const notes = [
    {
      id: 'n1',
      content: 'First line.\nSecond line.\nThird line.',
      user_id: 'user-1',
      tag: 'reminder',
      is_pinned: false,
    },
    {
      id: 'n2',
      content: 'Single line note.',
      user_id: 'user-2',
      tag: null,
      is_pinned: true,
    },
  ];

  it('renders a card per note with content', () => {
    render(<InternalNoteLogCards notes={notes} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText(/First line./)).toBeInTheDocument();
    expect(screen.getByText(/Second line./)).toBeInTheDocument();
    expect(screen.getByText(/Third line./)).toBeInTheDocument();
    expect(screen.getByText('Single line note.')).toBeInTheDocument();
  });

  it('clips content to 3 lines and adds ellipsis when longer', () => {
    const longNote = [
      {
        id: 'long',
        content: 'Line one\nLine two\nLine three\nLine four',
        user_id: 'u1',
        tag: null,
        is_pinned: false,
      },
    ];
    render(<InternalNoteLogCards notes={longNote} onSelect={() => {}} onDelete={() => {}} />);
    const p = screen.getByText((content, el) => el?.tagName === 'P' && content.includes('Line one') && content.includes('…'));
    expect(p).toBeInTheDocument();
    expect(p.textContent).toMatch(/Line one[\s\S]*Line three[\s\S]*…/);
  });

  it('shows tag label from TAG_LABELS when note has tag', () => {
    render(<InternalNoteLogCards notes={notes} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Reminder')).toBeInTheDocument();
  });

  it('shows Pinned icon when note is pinned', () => {
    render(<InternalNoteLogCards notes={notes} onSelect={() => {}} onDelete={() => {}} />);
    const pinned = screen.getByTitle('Pinned');
    expect(pinned).toBeInTheDocument();
  });

  it('shows "Created by you" when currentUserId matches note user_id', () => {
    render(
      <InternalNoteLogCards
        notes={notes}
        currentUserId="user-1"
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.getByText('Created by you')).toBeInTheDocument();
    expect(screen.getByText(/Created by team member/)).toBeInTheDocument();
  });

  it('shows team member label when currentUserId is missing or does not match', () => {
    render(<InternalNoteLogCards notes={notes} onSelect={() => {}} onDelete={() => {}} />);
    const createdBy = screen.getAllByText(/Created by team member/);
    expect(createdBy.length).toBe(2);
  });

  it('uses fallback "team member" when getTermSingular returns falsy', () => {
    mockGetTermSingular.mockReturnValueOnce(null);
    render(<InternalNoteLogCards notes={[notes[0]]} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText(/Created by team member/)).toBeInTheDocument();
  });

  it('calls onSelect with note id when card is clicked', async () => {
    const onSelect = jest.fn();
    render(<InternalNoteLogCards notes={notes} onSelect={onSelect} onDelete={() => {}} />);
    await userEvent.click(screen.getByText('Single line note.').closest('[role="button"]'));
    expect(onSelect).toHaveBeenCalledWith('n2');
  });

  it('calls onSelect when card receives Enter key', () => {
    const onSelect = jest.fn();
    render(<InternalNoteLogCards notes={notes} onSelect={onSelect} onDelete={() => {}} />);
    const card = screen.getByText(/First line./).closest('[role="button"]');
    fireEvent.keyDown(card, { key: 'Enter', preventDefault: jest.fn() });
    expect(onSelect).toHaveBeenCalledWith('n1');
  });

  it('calls onSelect when card receives Space key', () => {
    const onSelect = jest.fn();
    render(<InternalNoteLogCards notes={notes} onSelect={onSelect} onDelete={() => {}} />);
    const card = screen.getByText(/First line./).closest('[role="button"]');
    fireEvent.keyDown(card, { key: ' ', preventDefault: jest.fn() });
    expect(onSelect).toHaveBeenCalledWith('n1');
  });

  it('calls onDelete with note id when delete button is clicked', async () => {
    const onDelete = jest.fn();
    render(<InternalNoteLogCards notes={notes} onSelect={() => {}} onDelete={onDelete} />);
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete internal note' });
    await userEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith('n1');
  });

  it('applies borderClass when provided', () => {
    const { container } = render(
      <InternalNoteLogCards
        notes={[notes[0]]}
        borderClass="border-l-amber-500"
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );
    const card = container.querySelector('.border-l-amber-500');
    expect(card).toBeInTheDocument();
  });

  it('renders empty grid when notes is empty', () => {
    const { container } = render(<InternalNoteLogCards notes={[]} onSelect={() => {}} onDelete={() => {}} />);
    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
    expect(grid.children.length).toBe(0);
  });

  it('shows unknown tag as raw tag value when not in TAG_LABELS', () => {
    const customTag = [
      { id: 'c1', content: 'Note', user_id: 'u1', tag: 'customTag', is_pinned: false },
    ];
    render(<InternalNoteLogCards notes={customTag} onSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('customTag')).toBeInTheDocument();
  });

  it('handles note with empty content (clipText returns empty string)', () => {
    const emptyContent = [
      { id: 'e1', content: '', user_id: 'u1', tag: null, is_pinned: false },
    ];
    render(<InternalNoteLogCards notes={emptyContent} onSelect={() => {}} onDelete={() => {}} />);
    const card = screen.getByText('Created by team member').closest('[role="button"]');
    expect(card).toBeInTheDocument();
    expect(card.querySelector('p')).toHaveTextContent('');
  });
});
