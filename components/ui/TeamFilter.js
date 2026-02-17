import { useState, useMemo } from 'react';
import { ChipsMulti } from './Chips';
import { SecondaryButton } from './buttons';
import { HiFilter, HiChevronDown } from 'react-icons/hi';

/**
 * Reusable Team Filter Component
 * 
 * @param {Object} props
 * @param {Array} props.teamMembers - Array of team member objects to extract filter options from
 * @param {Object} props.filters - Current filter state { roles: [], services: [], genders: [], personalityTraits: [] }
 * @param {Function} props.onFiltersChange - Callback when filters change
 * @param {string} props.className - Additional CSS classes
 */
export default function TeamFilter({
  teamMembers = [],
  filters = {
    roles: [],
    services: [],
    genders: [],
    personalityTraits: [],
  },
  onFiltersChange,
  className = '',
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract unique values for each filter type
  const filterOptions = useMemo(() => {
    const roles = [...new Set(teamMembers.map(m => m.role).filter(Boolean))].sort();
    const services = [...new Set(teamMembers.flatMap(m => m.services || []).filter(Boolean))].sort();
    const genders = [...new Set(teamMembers.map(m => m.gender).filter(Boolean))].sort();
    const personalityTraits = [...new Set(teamMembers.flatMap(m => m.personalityTraits || []).filter(Boolean))].sort();

    return { roles, services, genders, personalityTraits };
  }, [teamMembers]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return (
      (filters.roles?.length || 0) +
      (filters.services?.length || 0) +
      (filters.genders?.length || 0) +
      (filters.personalityTraits?.length || 0)
    );
  }, [filters]);

  const handleFilterChange = (filterType, value) => {
    onFiltersChange({
      ...filters,
      [filterType]: value,
    });
  };

  const handleClearAll = () => {
    onFiltersChange({
      roles: [],
      services: [],
      genders: [],
      personalityTraits: [],
    });
  };

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
      {/* Filter Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <HiFilter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <span className="font-semibold text-gray-900 dark:text-white">Filters</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 bg-primary-600 text-white text-xs font-medium rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <SecondaryButton
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              className="text-xs px-2 py-1 h-auto"
            >
              Clear all
            </SecondaryButton>
          )}
          <HiChevronDown
            className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Filter Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-6">
          {/* Role/Position Filter */}
          {filterOptions.roles.length > 0 && (
            <ChipsMulti
              id="filter-roles"
              label="Role/Position"
              options={filterOptions.roles}
              value={filters.roles || []}
              onValueChange={(value) => handleFilterChange('roles', value)}
              variant="light"
              layout="flex"
              className=""
            />
          )}

          {/* Service Offered Filter */}
          {filterOptions.services.length > 0 && (
            <ChipsMulti
              id="filter-services"
              label="Service Offered"
              options={filterOptions.services}
              value={filters.services || []}
              onValueChange={(value) => handleFilterChange('services', value)}
              variant="light"
              layout="flex"
              className=""
            />
          )}

          {/* Gender Filter */}
          {filterOptions.genders.length > 0 && (
            <ChipsMulti
              id="filter-genders"
              label="Gender"
              options={filterOptions.genders}
              value={filters.genders || []}
              onValueChange={(value) => handleFilterChange('genders', value)}
              variant="light"
              layout="flex"
              className=""
            />
          )}

          {/* Personality Trait Filter */}
          {filterOptions.personalityTraits.length > 0 && (
            <ChipsMulti
              id="filter-personality-traits"
              label="Personality Trait"
              options={filterOptions.personalityTraits}
              value={filters.personalityTraits || []}
              onValueChange={(value) => handleFilterChange('personalityTraits', value)}
              variant="light"
              layout="flex"
              className=""
            />
          )}

          {filterOptions.roles.length === 0 &&
            filterOptions.services.length === 0 &&
            filterOptions.genders.length === 0 &&
            filterOptions.personalityTraits.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No filter options available
              </p>
            )}
        </div>
      )}
    </div>
  );
}
