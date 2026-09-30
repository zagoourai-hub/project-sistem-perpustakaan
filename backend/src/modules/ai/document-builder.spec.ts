import { buildBookDocument } from './document-builder.js';

const book = {
  title: 'Laskar Pelangi',
  subtitle: null,
  authors: ['Andrea Hirata'],
  subjects: ['Novel', 'Pendidikan'],
  synopsis: '  Kisah sepuluh anak\n di Belitung. ',
};

describe('buildBookDocument', () => {
  it('menggabungkan field dan membersihkan spasi', () => {
    expect(buildBookDocument(book, 'm').text).toBe(
      'Judul: Laskar Pelangi\nPengarang: Andrea Hirata\nSubjek: Novel, Pendidikan\nSinopsis: Kisah sepuluh anak di Belitung.',
    );
  });

  it('melewati field kosong', () => {
    expect(
      buildBookDocument({ title: 'X', authors: [], subjects: [] }, 'm').text,
    ).toBe('Judul: X');
  });

  it('hash stabil, berubah bila konten atau model berubah', () => {
    const a = buildBookDocument(book, 'm').contentHash;
    expect(buildBookDocument(book, 'm').contentHash).toBe(a);
    expect(
      buildBookDocument({ ...book, title: 'Sang Pemimpi' }, 'm').contentHash,
    ).not.toBe(a);
    expect(buildBookDocument(book, 'model-lain').contentHash).not.toBe(a);
  });
});
