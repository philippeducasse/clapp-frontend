"use client";
import { useState, useEffect, useCallback } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
  SortingState,
  getSortedRowModel,
  PaginationState,
  OnChangeFn,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import TablePagination from "./TablePagination";
import { EntityName } from "@/interfaces/Enums";
import DataTableHeader from "./DataTableHeader";
import { FilterConfig } from "@/interfaces/table/FilterCongig";
import { PaginatedResponse } from "@/interfaces/table/PaginatedResponse";

interface FetchParams {
  offset: number;
  limit: number;
  search?: string;
  filters?: Record<string, unknown>;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  entityName: EntityName;
  totalCount?: number;
  filters?: FilterConfig[];
  defaultSorting?: SortingState;
  fetchData?: (params: FetchParams) => Promise<PaginatedResponse<TData>>;
  onDataFetched?: (data: PaginatedResponse<TData>) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  entityName,
  totalCount,
  filters,
  defaultSorting = [],
  fetchData,
  onDataFetched,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(defaultSorting);
  const [searchBarFilter, setSearchBarFilter] = useState<string>("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [hasInitialized, setHasInitialized] = useState(false);

  const handlePaginationChange: OnChangeFn<PaginationState> = useCallback((updater) => {
    setPagination((prev) => {
      const newPagination = typeof updater === "function" ? updater(prev) : updater;
      return newPagination;
    });
  }, []);

  // Initialize state with data on mount
  useEffect(() => {
    if (data.length > 0 && onDataFetched && !hasInitialized) {
      onDataFetched({
        results: data,
        count: totalCount || data.length,
      } as PaginatedResponse<TData>);
    }
  }, [data, totalCount, onDataFetched, hasInitialized]);

  // Fetch data when pagination, filters, or search changes
  useEffect(() => {
    if (fetchData && (data.length === 0 || hasInitialized)) {
      const offset = pagination.pageIndex * pagination.pageSize;

      // Convert columnFilters to a simple object for the API
      const filterParams: Record<string, unknown> = {};
      columnFilters.forEach((filter) => {
        filterParams[filter.id] = filter.value;
      });

      fetchData({
        offset,
        limit: pagination.pageSize,
        search: searchBarFilter || undefined,
        filters: Object.keys(filterParams).length > 0 ? filterParams : undefined,
      }).then(onDataFetched);
    }
    setHasInitialized(true);
  }, [pagination, columnFilters, searchBarFilter, fetchData, onDataFetched, data.length, hasInitialized]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setSearchBarFilter,
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: handlePaginationChange,
    manualPagination: true,
    pageCount: totalCount ? Math.ceil(totalCount / pagination.pageSize) : undefined,
    state: {
      sorting,
      columnFilters,
      globalFilter: searchBarFilter,
      pagination,
    },
  });
  // Reset to page 0 when filters or search changes
  useEffect(() => {
    setPagination((prev) => ({ pageIndex: 0, pageSize: prev.pageSize }));
  }, [columnFilters, searchBarFilter]);

  return (
    <>
      <Card className="rounded-md border px-6">
        <DataTableHeader
          searchBarFilter={searchBarFilter}
          setSearchBarFilter={setSearchBarFilter}
          entityName={entityName.toLowerCase()}
          table={table}
          filters={filters}
        />
        <Table style={{ tableLayout: "fixed" }}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: `${header.getSize()}px` }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} style={{ width: `${cell.column.getSize()}px` }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      <TablePagination
        table={table}
        pagination={pagination}
        entityName={entityName}
        totalCount={totalCount}
      />
    </>
  );
}
