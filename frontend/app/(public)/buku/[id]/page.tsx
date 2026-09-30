import type { Metadata } from "next";
import { PublicBookDetail } from "@/features/search/components/public-book-detail";

export const metadata: Metadata = { title: "Detail buku" };

export default async function BookPage({ params }: PageProps<"/buku/[id]">) {
  const { id } = await params;
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6">
      <PublicBookDetail id={id} />
    </div>
  );
}
