"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiDownload, apiGet, apiGetPage, apiPatch, apiPost } from "@/lib/api-client";
import { endpoints, type MasterDataKind } from "@/lib/endpoints";
import type { Book, BookDraft, BookSummary, Item, ItemWithBook, ShelfLocation } from "@/shared/types/models";
import type { AddItemsValues, BookFormValues, BookQuery, MasterDataValues, UpdateItemValues } from "../schemas/book.schema";

export const bookKeys = {
  all: ["books"] as const,
  list: (query: BookQuery) => [...bookKeys.all, "list", query] as const,
  detail: (id: string) => [...bookKeys.all, "detail", id] as const,
  similar: (id: string) => [...bookKeys.all, "detail", id, "similar"] as const,
  isbn: (isbn: string) => [...bookKeys.all, "isbn", isbn] as const,
  masterData: (kind: MasterDataKind) => ["master-data", kind] as const,
  itemLookup: (barcode: string) => ["items", "lookup", barcode] as const,
};

type MasterRow = { id: string; name: string } & Partial<Pick<ShelfLocation, "code">>;

export const booksApi = {
  list: (query: BookQuery) => apiGetPage<BookSummary>(endpoints.books.list, query),
  get: (id: string) => apiGet<Book>(endpoints.books.one(id)),
  similar: (id: string) => apiGet<BookSummary[]>(endpoints.books.similar(id)),
  isbnLookup: (isbn: string) => apiGet<BookDraft>(endpoints.books.isbnLookup(isbn)),
  create: (input: BookFormValues) => apiPost<Book>(endpoints.books.list, input),
  update: (id: string, input: Partial<BookFormValues>) => apiPatch<Book>(endpoints.books.one(id), input),
  remove: (id: string) => apiDelete(endpoints.books.one(id)),
  uploadCover: (id: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiPost<{ coverUrl: string }>(endpoints.books.cover(id), body);
  },
  addItems: (bookId: string, input: AddItemsValues) => apiPost<Item[]>(endpoints.books.items(bookId), input),
  updateItem: (id: string, input: UpdateItemValues) => apiPatch<Item>(endpoints.items.one(id), input),
  itemLookup: (barcode: string) => apiGet<ItemWithBook>(endpoints.items.lookup, { barcode }),
  /** Print-ready label sheet (FR-B7). */
  downloadLabels: (itemIds: string[]) =>
    apiDownload(endpoints.items.labels, { ids: itemIds.join(",") }, "label-barcode.pdf"),
  masterData: (kind: MasterDataKind, q?: string) => apiGet<MasterRow[]>(endpoints.masterData.list(kind), { q }),
  createMasterData: (kind: MasterDataKind, input: MasterDataValues) =>
    apiPost<MasterRow>(endpoints.masterData.list(kind), input),
  updateMasterData: (kind: MasterDataKind, id: string, input: MasterDataValues) =>
    apiPatch<MasterRow>(endpoints.masterData.one(kind, id), input),
  removeMasterData: (kind: MasterDataKind, id: string) => apiDelete(endpoints.masterData.one(kind, id)),
};

export const useBooks = (query: BookQuery) =>
  useQuery({ queryKey: bookKeys.list(query), queryFn: () => booksApi.list(query), placeholderData: keepPreviousData });

export const useBook = (id: string) =>
  useQuery({ queryKey: bookKeys.detail(id), queryFn: () => booksApi.get(id), enabled: Boolean(id) });

export const useSimilarBooks = (id: string) =>
  useQuery({ queryKey: bookKeys.similar(id), queryFn: () => booksApi.similar(id), enabled: Boolean(id) });

/** Triggered manually from the ISBN field ("Cari Data"), so it's a query with enabled=false by default. */
export const useIsbnLookup = (isbn: string | null) =>
  useQuery({
    queryKey: bookKeys.isbn(isbn ?? ""),
    queryFn: () => booksApi.isbnLookup(isbn!),
    enabled: Boolean(isbn),
    staleTime: Infinity,
  });

export const useItemLookup = (barcode: string | null) =>
  useQuery({
    queryKey: bookKeys.itemLookup(barcode ?? ""),
    queryFn: () => booksApi.itemLookup(barcode!),
    enabled: Boolean(barcode),
    staleTime: 0,
  });

export const useMasterData = (kind: MasterDataKind, q?: string) =>
  useQuery({ queryKey: [...bookKeys.masterData(kind), q ?? ""], queryFn: () => booksApi.masterData(kind, q) });

export function useCreateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: booksApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: bookKeys.all }),
  });
}

export function useUpdateBook(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<BookFormValues>) => booksApi.update(id, input),
    onSuccess: (book) => {
      qc.setQueryData(bookKeys.detail(id), book);
      return qc.invalidateQueries({ queryKey: [...bookKeys.all, "list"] });
    },
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: booksApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: bookKeys.all }),
  });
}

export function useUploadCover(bookId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => booksApi.uploadCover(bookId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookKeys.detail(bookId) }),
  });
}

export function useAddItems(bookId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddItemsValues) => booksApi.addItems(bookId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookKeys.detail(bookId) }),
  });
}

export function useUpdateItem(bookId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateItemValues & { id: string }) => booksApi.updateItem(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookKeys.detail(bookId) }),
  });
}

export function useSaveMasterData(kind: MasterDataKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: MasterDataValues & { id?: string }) =>
      id ? booksApi.updateMasterData(kind, id, input) : booksApi.createMasterData(kind, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookKeys.masterData(kind) }),
  });
}

export function useDeleteMasterData(kind: MasterDataKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => booksApi.removeMasterData(kind, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookKeys.masterData(kind) }),
  });
}
