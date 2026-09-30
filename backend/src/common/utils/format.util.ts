export const formatDate = (d: Date, tz: string) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: tz }).format(
    d,
  );

export const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
