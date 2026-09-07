-- CreateTable
CREATE TABLE "IncomeHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "annualIncome" REAL NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "IncomeHistory_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "User" ("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "IncomeHistory_userId_effectiveFrom_key"
ON "IncomeHistory"("userId", "effectiveFrom");

-- Backfill the current saved income for every existing user.
-- The account creation date is used as the initial effective date.
INSERT INTO "IncomeHistory" (
    "id",
    "annualIncome",
    "effectiveFrom",
    "createdAt",
    "updatedAt",
    "userId"
)
SELECT
    'legacy-income-' || "id",
    "income",
    "createdAt",
    "createdAt",
    "updatedAt",
    "id"
FROM "User";
