-- Frontend memakai { code, name } untuk lokasi rak
ALTER TABLE "ShelfLocation" RENAME COLUMN "description" TO "name";
UPDATE "ShelfLocation" SET "name" = "code" WHERE "name" IS NULL;
ALTER TABLE "ShelfLocation" ALTER COLUMN "name" SET NOT NULL;
