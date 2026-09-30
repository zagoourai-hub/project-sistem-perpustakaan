import type { Metadata } from "next";
import { BookForm } from "@/features/catalog/components/book-form";

export const metadata: Metadata = { title: "Tambah buku" };

export default function NewBookPage() {
  return <BookForm />;
}
