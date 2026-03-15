/**
 * Unit tests for SearchableMultiselect:
 * - Renders trigger with label, placeholder, required, error
 * - Opens/closes on trigger click; closes on Escape and click outside
 * - Search filters options; clear search button
 * - Toggle option selects/deselects and calls onChange
 * - Trigger label: 0, 1, 2, or 3+ selected
 * - Empty states: no options vs no results for search
 * - Disabled prevents open
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchableMultiselect from '@/components/ui/SearchableMultiselect';

describe('SearchableMultiselect', () => {
  const defaultOptions = [
    { value: 'a', label: 'Apple' },
    { value: 'b', label: 'Banana' },
    { value: 'c', label: 'Cherry' },
  ];

  it('renders trigger with placeholder when nothing selected', () => {
    render(
      <SearchableMultiselect
        id="test-multi"
        options={defaultOptions}
        value={[]}
        onChange={() => {}}
        placeholder="Select..."
      />
    );
    expect(screen.getByRole('button', { name: /select\.\.\./i })).toBeInTheDocument();
  });

  it('renders label and required asterisk when provided', () => {
    render(
      <SearchableMultiselect
        id="test-multi"
        label="Tags"
        required
        options={defaultOptions}
        value={[]}
        onChange={() => {}}
      />
    );
    expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders error message when error prop is set', () => {
    render(
      <SearchableMultiselect
        id="test-multi"
        options={defaultOptions}
        value={[]}
        onChange={() => {}}
        error="Please select at least one"
      />
    );
    expect(screen.getByText('Please select at least one')).toBeInTheDocument();
  });

  it('opens dropdown on trigger click and shows options', () => {
    render(
      <SearchableMultiselect
        id="test-multi"
        options={defaultOptions}
        value={[]}
        onChange={() => {}}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /select\.\.\./i }));
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.getByText('Cherry')).toBeInTheDocument();
  });

  it('closes dropdown on Escape', () => {
    render(
      <SearchableMultiselect
        id="test-multi"
        options={defaultOptions}
        value={[]}
        onChange={() => {}}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /select\.\.\./i }));
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  it('closes dropdown and clears search on click outside', () => {
    render(
      <div>
        <SearchableMultiselect
          id="test-multi"
          options={defaultOptions}
          value={[]}
          onChange={() => {}}
        />
        <button type="button">Outside</button>
      </div>
    );
    fireEvent.click(screen.getByRole('button', { name: /select\.\.\./i }));
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'app' } });
    expect(searchInput.value).toBe('app');
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  it('filters options by search query', () => {
    render(
      <SearchableMultiselect
        id="test-multi"
        options={defaultOptions}
        value={[]}
        onChange={() => {}}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /select\.\.\./i }));
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'ban' } });
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.queryByText('Apple')).not.toBeInTheDocument();
    expect(screen.queryByText('Cherry')).not.toBeInTheDocument();
  });

  it('clears search when clear button is clicked', () => {
    render(
      <SearchableMultiselect
        id="test-multi"
        options={defaultOptions}
        value={[]}
        onChange={() => {}}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /select\.\.\./i }));
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'app' } });
    fireEvent.click(screen.getByLabelText('Clear search'));
    expect(searchInput.value).toBe('');
  });

  it('calls onChange when option is selected', () => {
    const onChange = jest.fn();
    render(
      <SearchableMultiselect
        id="test-multi"
        options={defaultOptions}
        value={[]}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /select\.\.\./i }));
    fireEvent.click(screen.getByText('Apple'));
    expect(onChange).toHaveBeenCalledWith(['a']);
  });

  it('calls onChange when option is deselected', () => {
    const onChange = jest.fn();
    render(
      <SearchableMultiselect
        id="test-multi"
        options={defaultOptions}
        value={['a']}
        onChange={onChange}
      />
    );
    // Trigger shows "Apple"; open it then click the list option (second button with Apple)
    const trigger = document.getElementById('test-multi');
    fireEvent.click(trigger);
    const optionButtons = screen.getAllByRole('button', { name: /apple/i });
    fireEvent.click(optionButtons[1]); // list item, not trigger
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('shows single selected label in trigger', () => {
    render(
      <SearchableMultiselect
        id="test-multi"
        options={defaultOptions}
        value={['a']}
        onChange={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /apple/i })).toBeInTheDocument();
  });

  it('shows two selected labels joined by "and" in trigger', () => {
    render(
      <SearchableMultiselect
        id="test-multi"
        options={defaultOptions}
        value={['a', 'b']}
        onChange={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /apple and banana/i })).toBeInTheDocument();
  });

  it('shows "X and N others" when more than two selected', () => {
    render(
      <SearchableMultiselect
        id="test-multi"
        options={defaultOptions}
        value={['a', 'b', 'c']}
        onChange={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /apple and 2 others/i })).toBeInTheDocument();
  });

  it('shows "No options available" when options array is empty and dropdown open', () => {
    render(
      <SearchableMultiselect
        id="test-multi"
        options={[]}
        value={[]}
        onChange={() => {}}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /select\.\.\./i }));
    expect(screen.getByText('No options available')).toBeInTheDocument();
  });

  it('shows "No options found" when search has no matches', () => {
    render(
      <SearchableMultiselect
        id="test-multi"
        options={defaultOptions}
        value={[]}
        onChange={() => {}}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /select\.\.\./i }));
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'xyz' } });
    expect(screen.getByText('No options found')).toBeInTheDocument();
  });

  it('does not open when disabled', () => {
    render(
      <SearchableMultiselect
        id="test-multi"
        options={defaultOptions}
        value={[]}
        onChange={() => {}}
        disabled
      />
    );
    const trigger = screen.getByRole('button', { name: /select\.\.\./i });
    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  it('uses option value as label when label is missing', () => {
    render(
      <SearchableMultiselect
        id="test-multi"
        options={[{ value: 'x' }]}
        value={[]}
        onChange={() => {}}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /select\.\.\./i }));
    expect(screen.getByText('x')).toBeInTheDocument();
  });

  it('handles value as non-array without crashing (treats as empty selection)', () => {
    render(
      <SearchableMultiselect
        id="test-multi"
        options={defaultOptions}
        value="a"
        onChange={() => {}}
        placeholder="Select..."
      />
    );
    expect(screen.getByRole('button', { name: /select\.\.\./i })).toBeInTheDocument();
  });

  it('opens dropdown upward when little space below (covers openUpward positioning)', () => {
    const origGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    const origInnerHeight = window.innerHeight;
    Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
      return { top: 600, bottom: 650, left: 10, width: 200 };
    };
    Object.defineProperty(window, 'innerHeight', { value: 700, configurable: true });

    render(
      <SearchableMultiselect
        id="test-multi"
        options={defaultOptions}
        value={[]}
        onChange={() => {}}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /select\.\.\./i }));
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();

    Element.prototype.getBoundingClientRect = origGetBoundingClientRect;
    Object.defineProperty(window, 'innerHeight', { value: origInnerHeight, configurable: true });
  });
});
