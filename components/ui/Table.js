/**
 * Reusable data table with configurable columns.
 * @param {Array<{ key: string, label: string, align?: 'left' | 'center' | 'right', render?: (row: any) => React.ReactNode }>} columns
 * @param {Array<any>} data - Row data
 * @param {(row: any) => string} getRowKey - Key for each row (e.g. (row) => row.id)
 * @param {string} [ariaLabel] - Accessible label for the table
 * @param {string} [className] - Additional table class names
 * @param {string} [data-testid] - Test id for the table element
 */
export default function Table({
  columns,
  data,
  getRowKey,
  ariaLabel,
  className = '',
  'data-testid': dataTestId,
  ...props
}) {
  const tableClass = ['w-full min-w-[500px]', className].filter(Boolean).join(' ');
  const getAlignClass = (align) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

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
          {columns.map((col) => (
            <th
              key={col.key}
              className={`px-4 py-3 text-sm font-semibold text-white ${getAlignClass(col.align)}`}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr
            key={getRowKey(row)}
            className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
          >
            {columns.map((col, colIndex) => {
              const alignClass = getAlignClass(col.align);
              const content =
                typeof col.render === 'function'
                  ? col.render(row)
                  : (row[col.key] != null && row[col.key] !== '' ? row[col.key] : '—');
              const isCustomRender = typeof col.render === 'function';
              const textClass =
                isCustomRender
                  ? ''
                  : colIndex === 0
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-300';
              const cellClass = ['px-4 py-3 text-sm', alignClass, textClass].filter(Boolean).join(' ');

              return (
                <td key={col.key} className={cellClass}>
                  {content}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
