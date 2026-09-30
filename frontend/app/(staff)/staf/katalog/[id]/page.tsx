import type { Metadata } from "next";
import { BookDetail } from "@/features/catalog/components/book-detail";

export const metadata: Metadata = { title: "Detail buku" };

export default async function BookDetailPage({ params }: PageProps<"/staf/katalog/[id]">) {
  const { id } = await params;
  return <BookDetail id={id} />;
}
