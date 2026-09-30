import type { Metadata } from "next";
import { CirculationDesk, type DeskMode } from "@/features/circulation/components/circulation-desk";

export const metadata: Metadata = { title: "Sirkulasi" };

// PRD FE-6.4.3. F2/F3 (staff shell) navigate here with ?mode=pinjam|kembali.
export default async function CirculationPage({ searchParams }: PageProps<"/staf/sirkulasi">) {
  const { mode } = await searchParams;
  const deskMode: DeskMode = mode === "kembali" ? "kembali" : "pinjam";
  return <CirculationDesk mode={deskMode} />;
}
