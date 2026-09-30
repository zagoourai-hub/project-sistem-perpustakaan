-- Custom SQL (BE-1.1.10 s/d BE-1.1.13). Prisma tidak mengenal index/kolom ini:
-- review setiap migrasi baru agar tidak ada DROP INDEX / DROP COLUMN terhadapnya.

-- BE-1.1.10: Book.searchVector sebagai kolom generated + GIN
ALTER TABLE "Book" DROP COLUMN "searchVector";
ALTER TABLE "Book" ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple'::regconfig, coalesce("title", '')), 'A') ||
  setweight(to_tsvector('simple'::regconfig, coalesce("subtitle", '')), 'B') ||
  setweight(to_tsvector('simple'::regconfig, coalesce("isbn13", '') || ' ' || coalesce("isbn10", '') || ' ' || coalesce("callNumber", '')), 'A') ||
  setweight(to_tsvector('simple'::regconfig, coalesce("synopsis", '')), 'C')
) STORED;
CREATE INDEX "Book_searchVector_idx" ON "Book" USING GIN ("searchVector");

-- BE-1.1.11: trigram untuk toleransi typo
CREATE INDEX "Book_title_trgm_idx" ON "Book" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "Author_name_trgm_idx" ON "Author" USING GIN ("name" gin_trgm_ops);

-- BE-1.1.12: satu pinjaman aktif per eksemplar
CREATE UNIQUE INDEX "Loan_itemId_active_key" ON "Loan" ("itemId") WHERE "returnedAt" IS NULL;

-- BE-1.1.13: HNSW cosine untuk pencarian semantik
CREATE INDEX "BookEmbedding_embedding_hnsw_idx" ON "BookEmbedding" USING hnsw ("embedding" vector_cosine_ops);

-- Sequence untuk barcode eksemplar (PST-YYYY-seq6) dan kode anggota (AGT-seq6)
CREATE SEQUENCE IF NOT EXISTS item_barcode_seq;
CREATE SEQUENCE IF NOT EXISTS member_code_seq;
