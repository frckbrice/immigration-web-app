'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  ColumnFiltersState,
  SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, Mail, Phone, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { getInitials } from '@/lib/utils/helpers';

export interface ClientWithCases {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
  casesCount: number;
  activeCases: number;
}

interface ClientsTableProps {
  data: ClientWithCases[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function ClientsTable({
  data,
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  searchQuery,
  onSearchChange,
}: ClientsTableProps) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Column definitions
  const columns = useMemo<ColumnDef<ClientWithCases>[]>(
    () => [
      {
        accessorKey: 'client',
        header: t('clients.client'),
        cell: ({ row }) => {
          const client = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback>
                  {getInitials(`${client.firstName} ${client.lastName}`)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium">
                  {client.firstName} {client.lastName}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {client.email}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'phone',
        header: t('clients.phone'),
        cell: ({ row }) => {
          const phone = row.original.phone;
          if (!phone) return <span className="text-muted-foreground text-sm">—</span>;
          return (
            <span className="text-sm flex items-center gap-1">
              <Phone className="h-3 w-3 text-muted-foreground" />
              {phone}
            </span>
          );
        },
      },
      {
        accessorKey: 'isActive',
        header: t('clients.status'),
        cell: ({ row }) => {
          const isActive = row.original.isActive;
          return (
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? t('clients.active') : t('clients.inactive')}
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: 'casesCount',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 data-[state=open]:bg-accent"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              {t('clients.totalCases')}
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const count = row.original.casesCount;
          return <div className="text-center font-medium">{count}</div>;
        },
      },
      {
        accessorKey: 'activeCases',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 data-[state=open]:bg-accent"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              {t('clients.activeCases')}
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const active = row.original.activeCases;
          return (
            <div className="text-center">
              <Badge variant={active > 0 ? 'default' : 'secondary'}>{active}</Badge>
            </div>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 data-[state=open]:bg-accent"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              {t('clients.joinedDate')}
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const date = new Date(row.original.createdAt);
          return <span className="text-sm text-muted-foreground">{date.toLocaleDateString()}</span>;
        },
      },
      {
        id: 'actions',
        header: t('common.actions'),
        cell: ({ row }) => {
          return (
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/clients/${row.original.id}`}>
                <Eye className="h-4 w-4 mr-1" />
                {t('common.view')}
              </Link>
            </Button>
          );
        },
      },
    ],
    [t]
  );

  // Table instance
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
    // PERFORMANCE: Server-side pagination - don't paginate client-side
    manualPagination: true,
    pageCount: totalPages,
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <Card style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder={t('clients.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="text-sm text-muted-foreground flex items-center">
              {t('clients.showing', { count: data.length, total: totalItems })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}>
        <CardContent className="p-0">
          <div className="rounded-md border-0">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
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
                    <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      {t('clients.noClientsFound')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mt-4">
              <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
                {t('clients.pagination.showing', {
                  from: (currentPage - 1) * Math.ceil(totalItems / totalPages) + 1,
                  to: Math.min(currentPage * Math.ceil(totalItems / totalPages), totalItems),
                  total: totalItems,
                })}
              </p>
              <div className="flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto justify-center sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="text-white h-9 sm:h-8 px-3 sm:px-3"
                  style={{
                    backgroundColor: '#143240',
                    borderColor: 'rgba(255, 69, 56, 0.3)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                  }}
                >
                  <ChevronLeft className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">{t('common.previous')}</span>
                </Button>
                <span className="text-xs sm:text-sm text-muted-foreground px-2 whitespace-nowrap">
                  {t('common.pageOf', { current: currentPage, total: totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="text-white h-9 sm:h-8 px-3 sm:px-3"
                  style={{
                    backgroundColor: '#143240',
                    borderColor: 'rgba(255, 69, 56, 0.3)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                  }}
                >
                  <span className="hidden sm:inline">{t('common.next')}</span>
                  <ChevronRight className="h-4 w-4 sm:ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
