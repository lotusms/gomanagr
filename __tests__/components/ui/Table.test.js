import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Table from '@/components/ui/Table';

const defaultColumns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
];

const defaultData = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
];

describe('Table', () => {
  it('renders columns and data without selection', () => {
    render(
      <Table
        columns={defaultColumns}
        data={defaultData}
        getRowKey={(row) => row.id}
        data-testid="table"
      />
    );
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByTestId('table-select-all')).not.toBeInTheDocument();
  });

  it('does not show checkbox column when selectable is false', () => {
    render(
      <Table
        columns={defaultColumns}
        data={defaultData}
        getRowKey={(row) => row.id}
        selectable={false}
        data-testid="table"
      />
    );
    expect(screen.queryByTestId('table-select-all')).not.toBeInTheDocument();
    expect(screen.queryByTestId('table-row-select-1')).not.toBeInTheDocument();
  });

  describe('when selectable', () => {
    it('shows checkbox column with header "Select all" and row checkboxes', () => {
      render(
        <Table
          columns={defaultColumns}
          data={defaultData}
          getRowKey={(row) => row.id}
          selectable
          selectedRowKeys={[]}
          onSelectionChange={() => {}}
          data-testid="table"
        />
      );
      const selectAll = screen.getByTestId('table-select-all');
      expect(selectAll).toBeInTheDocument();
      expect(selectAll).toHaveAttribute('aria-label', 'Select all');
      expect(screen.getByTestId('table-row-select-1')).toBeInTheDocument();
      expect(screen.getByTestId('table-row-select-2')).toBeInTheDocument();
    });

    it('header checkbox selects all rows and onSelectionChange receives all keys', () => {
      const onSelectionChange = jest.fn();
      render(
        <Table
          columns={defaultColumns}
          data={defaultData}
          getRowKey={(row) => row.id}
          selectable
          selectedRowKeys={[]}
          onSelectionChange={onSelectionChange}
          data-testid="table"
        />
      );
      const selectAll = screen.getByTestId('table-select-all');
      fireEvent.click(selectAll);
      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange).toHaveBeenCalledWith(['1', '2']);
    });

    it('header checkbox unchecks all when all rows are selected', () => {
      const onSelectionChange = jest.fn();
      render(
        <Table
          columns={defaultColumns}
          data={defaultData}
          getRowKey={(row) => row.id}
          selectable
          selectedRowKeys={['1', '2']}
          onSelectionChange={onSelectionChange}
          data-testid="table"
        />
      );
      const selectAll = screen.getByTestId('table-select-all');
      fireEvent.click(selectAll);
      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });

    it('row checkbox adds that row to selection', () => {
      const onSelectionChange = jest.fn();
      render(
        <Table
          columns={defaultColumns}
          data={defaultData}
          getRowKey={(row) => row.id}
          selectable
          selectedRowKeys={[]}
          onSelectionChange={onSelectionChange}
          data-testid="table"
        />
      );
      const row1Checkbox = screen.getByTestId('table-row-select-1');
      fireEvent.click(row1Checkbox);
      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange).toHaveBeenCalledWith(['1']);
    });

    it('row checkbox removes that row from selection when already selected', () => {
      const onSelectionChange = jest.fn();
      render(
        <Table
          columns={defaultColumns}
          data={defaultData}
          getRowKey={(row) => row.id}
          selectable
          selectedRowKeys={['1', '2']}
          onSelectionChange={onSelectionChange}
          data-testid="table"
        />
      );
      const row1Checkbox = screen.getByTestId('table-row-select-1');
      fireEvent.click(row1Checkbox);
      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange).toHaveBeenCalledWith(['2']);
    });

    it('reflects selectedRowKeys in row checkbox state', () => {
      render(
        <Table
          columns={defaultColumns}
          data={defaultData}
          getRowKey={(row) => row.id}
          selectable
          selectedRowKeys={['1']}
          onSelectionChange={() => {}}
          data-testid="table"
        />
      );
      expect(screen.getByTestId('table-row-select-1')).toBeChecked();
      expect(screen.getByTestId('table-row-select-2')).not.toBeChecked();
    });

    it('accepts selectedRowKeys as Set', () => {
      render(
        <Table
          columns={defaultColumns}
          data={defaultData}
          getRowKey={(row) => row.id}
          selectable
          selectedRowKeys={new Set(['2'])}
          onSelectionChange={() => {}}
          data-testid="table"
        />
      );
      expect(screen.getByTestId('table-row-select-1')).not.toBeChecked();
      expect(screen.getByTestId('table-row-select-2')).toBeChecked();
    });
  });

  it('renders custom render content in column', () => {
    const columns = [
      { key: 'name', label: 'Name' },
      {
        key: 'action',
        label: 'Action',
        render: (row) => <button type="button">{row.name} action</button>,
      },
    ];
    render(
      <Table
        columns={columns}
        data={defaultData}
        getRowKey={(row) => row.id}
        data-testid="table"
      />
    );
    expect(screen.getByRole('button', { name: 'Alice action' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bob action' })).toBeInTheDocument();
  });

  it('renders compact column with reduced width', () => {
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'actions', label: 'Actions', compact: true },
    ];
    const { container } = render(
      <Table
        columns={columns}
        data={defaultData}
        getRowKey={(row) => row.id}
        data-testid="table"
      />
    );
    const headerCells = container.querySelectorAll('thead th');
    expect(headerCells).toHaveLength(2);
    expect(headerCells[1].className).toMatch(/px-2/);
  });
});
