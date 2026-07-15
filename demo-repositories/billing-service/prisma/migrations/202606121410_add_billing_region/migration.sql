ALTER TABLE "BillingProfile" ADD COLUMN "billingRegion" TEXT;
UPDATE "BillingProfile" SET "billingRegion" = 'US' WHERE "billingRegion" IS NULL;
ALTER TABLE "BillingProfile" ALTER COLUMN "billingRegion" SET NOT NULL;
