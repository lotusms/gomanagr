import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

/**
 * Paginator Component
 * A reusable pagination component for displaying and navigating through paginated data.
 * 
 * @param {Object} props
 * @param {number} props.currentPage - Current active page (1-indexed)
 * @param {number} props.totalItems - Total number of items to paginate
 * @param {number} props.itemsPerPage - Number of items per page
 * @param {Function} props.onPageChange - Callback when page changes (receives new page number)
 * @param {Function} props.onItemsPerPageChange - Callback when items per page changes (receives new items per page number)
 * @param {Array<number>} props.itemsPerPageOptions - Options for items per page selector (default: [6, 12, 24, 48, 96])
 * @param {boolean} props.showItemsPerPage - Whether to show items per page selector (default: true)
 * @param {number} props.maxVisiblePages - Maximum number of page buttons to show (default: 5)
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showInfo - Whether to show "Showing X-Y of Z" info (default: true)
 * @param {boolean} props.showFirstLast - Whether to show first/last page buttons (default: false)
 */
export default function Paginator({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [6, 12, 24, 48, 96],
  showItemsPerPage = true,
  maxVisiblePages = 5,
  className = '',
  showInfo = true,
  showFirstLast = false,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));

  const getVisiblePages = () => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, safeCurrentPage - half);
    let end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start < maxVisiblePages - 1) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const visiblePages = getVisiblePages();
  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(safeCurrentPage * itemsPerPage, totalItems);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== safeCurrentPage && onPageChange) {
      onPageChange(newPage);
    }
  };

  const handlePrevious = () => {
    handlePageChange(safeCurrentPage - 1);
  };

  const handleNext = () => {
    handlePageChange(safeCurrentPage + 1);
  };

  const handleFirst = () => {
    handlePageChange(1);
  };

  const handleLast = () => {
    handlePageChange(totalPages);
  };

  const handleItemsPerPageChange = (e) => {
    const newItemsPerPage = parseInt(e.target.value, 10);
    if (onItemsPerPageChange && newItemsPerPage !== itemsPerPage) {
      onItemsPerPageChange(newItemsPerPage);
    }
  };

  if (totalPages <= 1 && !showItemsPerPage) {
    return null;
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Items per page selector - Left side */}
        {showItemsPerPage && onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <label htmlFor="items-per-page" className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
              Items per page:
            </label>
          <select
            id="items-per-page"
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors cursor-pointer"
            aria-label="Items per page"
          >
            {itemsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Pagination controls - Right side */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First page button */}
          {showFirstLast && (
            <button
              type="button"
              onClick={handleFirst}
              disabled={safeCurrentPage === 1}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-700 transition-colors"
              aria-label="First page"
            >
              First
            </button>
          )}

          {/* Previous button */}
          <button
            type="button"
            onClick={handlePrevious}
            disabled={safeCurrentPage === 1}
            className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-700 transition-colors"
            aria-label="Previous page"
          >
            <HiChevronLeft className="w-5 h-5" />
          </button>

          {/* Page number buttons */}
          {visiblePages.map((page) => {
            const isActive = page === safeCurrentPage;
            return (
              <button
                key={page}
                type="button"
                onClick={() => handlePageChange(page)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                  isActive
                    ? 'bg-primary-600 text-white border-2 border-primary-600 hover:bg-primary-700 hover:border-primary-700'
                    : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
                aria-label={`Page ${page}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {page}
              </button>
            );
          })}

          {/* Next button */}
          <button
            type="button"
            onClick={handleNext}
            disabled={safeCurrentPage === totalPages}
            className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-700 transition-colors"
            aria-label="Next page"
          >
            <HiChevronRight className="w-5 h-5" />
          </button>

          {/* Last page button */}
          {showFirstLast && (
            <button
              type="button"
              onClick={handleLast}
              disabled={safeCurrentPage === totalPages}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-700 transition-colors"
              aria-label="Last page"
            >
              Last
            </button>
          )}
        </div>
      )}
    </div>
  );
}
