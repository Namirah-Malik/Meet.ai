// Filter params interface
export interface FilterParams {
  search: string;
  page: number;
  sortBy?: 'newest' | 'oldest' | 'name-asc' | 'name-desc';
  status?: 'active' | 'inactive' | 'all';
}

// Pagination interface
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Filter state interface
export interface FilterState {
  filters: FilterParams;
  pagination: PaginationInfo;
  isLoading: boolean;
  error: string | null;
}

// Sorted and filtered agents response
export interface FilteredAgentsResponse {
  agents: any[];
  pagination: PaginationInfo;
}