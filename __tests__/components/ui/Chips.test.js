/**
 * Unit tests for Chips (ChipsSingle and ChipsMulti):
 * - ChipsSingle: layout flex, vertical, grid, grouped; variant light/dark; mini; required; error
 * - ChipsSingle: validValue when value not in options; selection change; vertical checkmark
 * - ChipsMulti: layout flex, grid, grouped; variant light/dark; mini; value change
 * - ChipsMulti: optionData with avatar (string and node); renderOption
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChipsSingle, ChipsMulti } from '@/components/ui/Chips';

describe('ChipsSingle', () => {
  const options = ['A', 'B', 'C'];

  it('renders label and options with default layout', () => {
    render(
      <ChipsSingle
        id="single"
        label="Choose one"
        options={options}
        value="A"
        onValueChange={() => {}}
      />
    );
    expect(screen.getByText('Choose one')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'A' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'B' })).not.toBeChecked();
  });

  it('calls onValueChange when option is selected', () => {
    const onValueChange = jest.fn();
    render(
      <ChipsSingle
        id="single"
        label="Choose"
        options={options}
        value="A"
        onValueChange={onValueChange}
      />
    );
    fireEvent.click(screen.getByRole('radio', { name: 'B' }));
    expect(onValueChange).toHaveBeenCalledWith('B');
  });

  it('uses undefined validValue when value not in options', () => {
    render(
      <ChipsSingle
        id="single"
        label="Choose"
        options={options}
        value="X"
        onValueChange={() => {}}
      />
    );
    expect(screen.getByRole('radio', { name: 'A' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'B' })).not.toBeChecked();
  });

  it('renders required asterisk and error', () => {
    render(
      <ChipsSingle
        id="single"
        label="Choose"
        options={options}
        value=""
        onValueChange={() => {}}
        required
        error="Required"
      />
    );
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('renders vertical layout with checkmark when selected', () => {
    render(
      <ChipsSingle
        id="single"
        label="Choose"
        options={options}
        value="B"
        onValueChange={() => {}}
        layout="vertical"
      />
    );
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('renders vertical layout with mini and checkmark', () => {
    render(
      <ChipsSingle
        id="single"
        label="Choose"
        options={options}
        value="A"
        onValueChange={() => {}}
        layout="vertical"
        mini
      />
    );
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('renders grouped layout (first, middle, last chip classes)', () => {
    render(
      <ChipsSingle
        id="single"
        label="Choose"
        options={['X', 'Y', 'Z']}
        value="Y"
        onValueChange={() => {}}
        layout="grouped"
      />
    );
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(radios[1]).toBeChecked();
  });

  it('renders grouped layout with mini', () => {
    render(
      <ChipsSingle
        id="single"
        label="Choose"
        options={['A', 'B']}
        value="A"
        onValueChange={() => {}}
        layout="grouped"
        mini
      />
    );
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('renders grouped layout with light variant', () => {
    render(
      <ChipsSingle
        id="single"
        label="Choose"
        options={['A', 'B']}
        value="B"
        onValueChange={() => {}}
        layout="grouped"
        variant="light"
      />
    );
    expect(screen.getByRole('radio', { name: 'B' })).toBeChecked();
  });

  it('renders grid layout', () => {
    render(
      <ChipsSingle
        id="single"
        label="Choose"
        options={options}
        value=""
        onValueChange={() => {}}
        layout="grid"
      />
    );
    const root = document.getElementById('single');
    expect(root).toHaveClass('grid');
  });

  it('renders grid layout with mini', () => {
    render(
      <ChipsSingle
        id="single"
        label="Choose"
        options={options}
        value="A"
        onValueChange={() => {}}
        layout="grid"
        mini
      />
    );
    expect(document.getElementById('single')).toHaveClass('grid');
  });

  it('renders grouped layout with single option and mini (first and last)', () => {
    render(
      <ChipsSingle
        id="single"
        label="Choose"
        options={['Only']}
        value="Only"
        onValueChange={() => {}}
        layout="grouped"
        mini
      />
    );
    expect(screen.getByRole('radio', { name: 'Only' })).toBeChecked();
  });

  it('renders dark variant unselected chip (non-grouped)', () => {
    render(
      <ChipsSingle
        id="single"
        label="Choose"
        options={['A', 'B']}
        value=""
        onValueChange={() => {}}
        variant="dark"
      />
    );
    const a = screen.getByRole('radio', { name: 'A' });
    expect(a).not.toBeChecked();
    expect(a).toHaveClass('bg-white/10');
  });
});

describe('ChipsMulti', () => {
  const options = ['X', 'Y', 'Z'];

  it('renders label and options with multiple selection', () => {
    render(
      <ChipsMulti
        id="multi"
        label="Choose many"
        options={options}
        value={['X']}
        onValueChange={() => {}}
      />
    );
    expect(screen.getByText('Choose many')).toBeInTheDocument();
    expect(screen.getByRole('group')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('calls onValueChange when option is toggled', () => {
    const onValueChange = jest.fn();
    render(
      <ChipsMulti
        id="multi"
        label="Choose"
        options={options}
        value={[]}
        onValueChange={onValueChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /X/i }));
    expect(onValueChange).toHaveBeenCalledWith(['X']);
  });

  it('renders grouped layout', () => {
    render(
      <ChipsMulti
        id="multi"
        label="Choose"
        options={['A', 'B', 'C']}
        value={['B']}
        onValueChange={() => {}}
        layout="grouped"
      />
    );
    const root = document.getElementById('multi');
    expect(root).toHaveClass('inline-flex');
  });

  it('renders grouped layout with mini', () => {
    render(
      <ChipsMulti
        id="multi"
        label="Choose"
        options={['A', 'B']}
        value={['A']}
        onValueChange={() => {}}
        layout="grouped"
        mini
      />
    );
    expect(document.getElementById('multi')).toBeInTheDocument();
  });

  it('renders grouped layout with light variant', () => {
    render(
      <ChipsMulti
        id="multi"
        label="Choose"
        options={['A', 'B']}
        value={[]}
        onValueChange={() => {}}
        layout="grouped"
        variant="light"
      />
    );
    expect(screen.getByRole('button', { name: /A/i })).toBeInTheDocument();
  });

  it('renders grid layout', () => {
    render(
      <ChipsMulti
        id="multi"
        label="Choose"
        options={options}
        value={[]}
        onValueChange={() => {}}
        layout="grid"
      />
    );
    expect(document.getElementById('multi')).toHaveClass('grid');
  });

  it('renders with optionData avatar as image src', () => {
    render(
      <ChipsMulti
        id="multi"
        label="Choose"
        options={['A']}
        value={[]}
        onValueChange={() => {}}
        optionData={{
          A: { avatar: 'https://example.com/avatar.png' },
        }}
      />
    );
    const img = document.querySelector('img[src="https://example.com/avatar.png"]');
    expect(img).toBeInTheDocument();
    expect(img).toHaveClass('w-5', 'h-5', 'rounded-full');
  });

  it('renders with optionData avatar as React node', () => {
    render(
      <ChipsMulti
        id="multi"
        label="Choose"
        options={['A']}
        value={[]}
        onValueChange={() => {}}
        optionData={{
          A: { avatar: <span data-testid="custom-avatar">AV</span> },
        }}
      />
    );
    expect(screen.getByTestId('custom-avatar')).toHaveTextContent('AV');
  });

  it('renders with renderOption custom render', () => {
    render(
      <ChipsMulti
        id="multi"
        label="Choose"
        options={['A']}
        value={['A']}
        onValueChange={() => {}}
        renderOption={(opt, selected) => (
          <span data-testid="custom-option">{opt}-{selected ? 'on' : 'off'}</span>
        )}
      />
    );
    expect(screen.getByTestId('custom-option')).toHaveTextContent('A-on');
  });

  it('renders required and error', () => {
    render(
      <ChipsMulti
        id="multi"
        label="Choose"
        options={options}
        value={[]}
        onValueChange={() => {}}
        required
        error="Pick at least one"
      />
    );
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Pick at least one');
  });

  it('handles value as undefined', () => {
    render(
      <ChipsMulti
        id="multi"
        label="Choose"
        options={options}
        onValueChange={() => {}}
      />
    );
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('renders grouped layout with single option and mini', () => {
    render(
      <ChipsMulti
        id="multi"
        label="Choose"
        options={['Only']}
        value={['Only']}
        onValueChange={() => {}}
        layout="grouped"
        mini
      />
    );
    expect(document.getElementById('multi')).toHaveClass('inline-flex');
  });
});
