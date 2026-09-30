import { cacheLife } from "next/cache";

// With Cache Components a server component may not read the clock while rendering, or the prerender would freeze
// "today". Reading it inside a cached function is allowed and refreshes every hour, which is plenty for a date label.
const edition = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
const isoDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" });

export async function clock() {
  "use cache";
  cacheLife("hours");
  const now = new Date();
  const today = isoDay.format(now);
  return { year: Number(today.slice(0, 4)), today, edition: edition.format(now) };
}
