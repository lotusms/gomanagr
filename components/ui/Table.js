/**
 * Reusable data table with configurable columns.
 * @param {Array<{ key: string, label: string, align?: 'left' | 'center' | 'right', compact?: boolean, widthClass?: string, render?: (row: any) => React.ReactNode }>} columns
 * @param {Array<any>} data - Row data
 * @param {(row: any) => string} getRowKey - Key for each row (e.g. (row) => row.id)
 * @param {boolean} [selectable] - When true, adds a checkbox column to select rows
 * @param {Array<string>|Set<string>} [selectedRowKeys] - Keys of selected rows (when selectable)
 * @param {(selectedKeys: string[]) => void} [onSelectionChange] - Called when selection changes (when selectable)
 * @param {string} [ariaLabel] - Accessible label for the table
 * @param {string} [className] - Additional table class names
 * @param {string} [data-testid] - Test id for the table element
 * @param {(row: any) => void} [onRowClick] - When provided, rows are clickable and this is called with the row data
 */
export default function Table({
  columns,
  data,
  getRowKey,
  selectable = false,
  selectedRowKeys = [],
  onSelectionChange,
  onRowClick,
  ariaLabel,
  className = '',
  'data-testid': dataTestId,
  ...props
}) {
  const tableClass = ['w-full min-w-[500px] table-fixed', className].filter(Boolean).join(' ');
  const getAlignClass = (align) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  const selectedSet = new Set(Array.isArray(selectedRowKeys) ? selectedRowKeys : [...selectedRowKeys]);
  const allKeys = data.map((row) => getRowKey(row));
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedSet.has(k));
  const someSelected = allKeys.some((k) => selectedSet.has(k));

  const handleSelectAll = () => {
    if (typeof onSelectionChange !== 'function') return;
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange([...allKeys]);
    }
  };

  const handleRowSelect = (rowKey) => {
    if (typeof onSelectionChange !== 'function') return;
    const next = new Set(selectedSet);
    if (next.has(rowKey)) {
      next.delete(rowKey);
    } else {
      next.add(rowKey);
    }
    onSelectionChange([...next]);
  };

  const displayColumns = selectable
    ? [{ key: '__select', label: '', compact: true }, ...columns]
    : columns;

  return (
    <table
      className={tableClass}
      role="table"
      aria-label={ariaLabel}
      data-testid={dataTestId}
      {...props}
    >
      <thead>
        <tr className="border-b border-gray-200 dark:border-gray-700 bg-secondary-500">
          {displayColumns.map((col) => {
            const isSelectCol = col.key === '__select';
            const compactClass = col.compact ? 'w-0 px-2 py-3' : 'px-4 py-3';
            const widthClass = col.widthClass ?? '';
            return (
              <th
                key={col.key}
                className={`text-sm font-semibold text-white ${getAlignClass(col.align ?? 'left')} ${compactClass} ${widthClass}`}
              >
                {isSelectCol ? (
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={handleSelectAll}
                      aria-label="Select all"
                      data-testid="table-select-all"
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </label>
                ) : (
                  col.label
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => {
          const rowKey = getRowKey(row);
          const rowSelected = selectedSet.has(rowKey);
          const rowProps = onRowClick
            ? {
                role: 'button',
                tabIndex: 0,
                onClick: () => onRowClick(row),
                onKeyDown: (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick(row);
                  }
                },
                className: 'border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer',
              }
            : { className: 'border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30' };

          return (
            <tr key={rowKey} {...rowProps}>
              {displayColumns.map((col, colIndex) => {
                const isSelectCol = col.key === '__select';
                const alignClass = getAlignClass(col.align ?? 'left');
                const content = isSelectCol
                  ? (
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rowSelected}
                        onChange={() => handleRowSelect(rowKey)}
                        aria-label={`Select row ${rowKey}`}
                        data-testid={`table-row-select-${rowKey}`}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </label>
                  )
                  : typeof col.render === 'function'
                    ? col.render(row)
                    : (row[col.key] != null && row[col.key] !== '' ? row[col.key] : '—');
                const isCustomRender = isSelectCol || typeof col.render === 'function';
                const textClass =
                  isCustomRender
                    ? ''
                    : colIndex === (selectable ? 1 : 0)
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-300';
                const compactClass = col.compact ? 'w-0 px-2 py-3' : 'px-4 py-3';
                const widthClass = col.widthClass ?? '';
                const cellClass = ['text-sm', alignClass, textClass, compactClass, widthClass].filter(Boolean).join(' ');

                return (
                  <td key={col.key} className={cellClass}>
                    {content}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
