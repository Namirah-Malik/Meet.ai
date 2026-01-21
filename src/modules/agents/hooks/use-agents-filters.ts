'use client';

import { useState, useCallback, useMemo } from 'react';
import { FilterParams, PaginationInfo } from '@/modules/agents/params';
import { ITEMS_PER_PAGE, DEFAULT_FILTERS } from '@/constants';

export const useAgentsFilters = (agents: any[] = []) => {
  const [filters, setFilters] = useState<FilterParams>({
    search: DEFAULT_FILTERS.search,
    page: DEFAULT_FILTERS.page,
    sortBy: 'newest',
    status: 'all',
  });

  // Filter and search agents
  const filteredAgents = useMemo(() => {
    let result = [...agents];

    // Apply search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      result = result.filter(
        (agent) =>
          agent.name.toLowerCase().includes(searchTerm) ||
          agent.instructions.toLowerCase().includes(searchTerm)
      );
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      result = result.filter((agent) => {
        const isActive = agent.createdAt && new Date(agent.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return filters.status === 'active' ? isActive : !isActive;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      const sortBy = filters.sortBy || 'newest';
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [agents, filters.search, filters.status, filters.sortBy]);

  // Calculate pagination info
  const paginationInfo = useMemo<PaginationInfo>(() => {
    const totalItems = filteredAgents.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
    const currentPage = Math.max(1, Math.min(filters.page, totalPages));

    return {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage: ITEMS_PER_PAGE,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
  }, [filteredAgents.length, filters.page]);

  // Get paginated results
  const paginatedAgents = useMemo(() => {
    const startIndex = (paginationInfo.currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAgents.slice(startIndex, endIndex);
  }, [filteredAgents, paginationInfo.currentPage]);

  // Update search filter
  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({
      ...prev,
      search,
      page: 1, // Reset to first page on search
    }));
  }, []);

  // Update sort filter
  const setSortBy = useCallback((sortBy: 'newest' | 'oldest' | 'name-asc' | 'name-desc') => {
    setFilters((prev) => ({
      ...prev,
      sortBy,
      page: 1, // Reset to first page on sort
    }));
  }, []);

  // Update status filter
  const setStatus = useCallback((status: 'active' | 'inactive' | 'all') => {
    setFilters((prev) => ({
      ...prev,
      status,
      page: 1, // Reset to first page on filter
    }));
  }, []);

  // Update page
  const setPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, paginationInfo.totalPages || 1));
    setFilters((prev) => ({
      ...prev,
      page: validPage,
    }));
  }, [paginationInfo.totalPages]);

  // Navigate to next page
  const nextPage = useCallback(() => {
    if (paginationInfo.hasNextPage) {
      setPage(paginationInfo.currentPage + 1);
    }
  }, [paginationInfo, setPage]);

  // Navigate to previous page
  const previousPage = useCallback(() => {
    if (paginationInfo.hasPreviousPage) {
      setPage(paginationInfo.currentPage - 1);
    }
  }, [paginationInfo, setPage]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters({
      search: DEFAULT_FILTERS.search,
      page: DEFAULT_FILTERS.page,
      sortBy: 'newest',
      status: 'all',
    });
  }, []);

  return {
    // State
    filters,
    paginationInfo,
    paginatedAgents,
    filteredAgents,

    // Actions
    setSearch,
    setSortBy,
    setStatus,
    setPage,
    nextPage,
    previousPage,
    resetFilters,
  };
};