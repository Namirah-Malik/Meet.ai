// Pagination constants
export const ITEMS_PER_PAGE = 4;

// Filter types
export const FILTER_TYPES = {
  SEARCH: 'search',
  PAGE: 'page',
} as const;

// Default filter values
export const DEFAULT_FILTERS = {
  search: '',
  page: 1,
} as const;

// Sort options
export const SORT_OPTIONS = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'A - Z', value: 'name-asc' },
  { label: 'Z - A', value: 'name-desc' },
] as const;

// Agent status options
export const AGENT_STATUS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'All', value: 'all' },
] as const;