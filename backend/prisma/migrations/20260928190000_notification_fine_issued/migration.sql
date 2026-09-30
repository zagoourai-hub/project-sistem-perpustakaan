-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('CHECKOUT_CONFIRMATION', 'DUE_REMINDER', 'OVERDUE', 'HOLD_READY', 'HOLD_EXPIRED', 'FINE_ISSUED');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;

