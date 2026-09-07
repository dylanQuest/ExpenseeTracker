PRAGMA foreign_keys=OFF;

CREATE TABLE "new_IncomeHistory" (
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

-- Prisma stores SQLite DateTime values as Unix milliseconds.
-- Convert each value to midnight UTC, still as Unix milliseconds.
-- If more than one record exists for a user on the same calendar date,
-- preserve the latest one.
INSERT INTO "new_IncomeHistory" (
    "id",
    "annualIncome",
    "effectiveFrom",
    "createdAt",
    "updatedAt",
    "userId"
)
SELECT
    "id",
    "annualIncome",
    CAST(
        strftime(
            '%s',
            "effectiveFrom" / 1000,
            'unixepoch',
            'start of day'
        ) AS INTEGER
    ) * 1000,
    "createdAt",
    "updatedAt",
    "userId"
FROM (
    SELECT
        "id",
        "annualIncome",
        "effectiveFrom",
        "createdAt",
        "updatedAt",
        "userId",
        ROW_NUMBER() OVER (
            PARTITION BY
                "userId",
                date("effectiveFrom" / 1000, 'unixepoch')
            ORDER BY
                "effectiveFrom" DESC,
                "updatedAt" DESC,
                "id" DESC
        ) AS "rowNumber"
    FROM "IncomeHistory"
)
WHERE "rowNumber" = 1;

DROP TABLE "IncomeHistory";

ALTER TABLE "new_IncomeHistory" RENAME TO "IncomeHistory";

CREATE UNIQUE INDEX "IncomeHistory_userId_effectiveFrom_key"
ON "IncomeHistory"("userId", "effectiveFrom");

PRAGMA foreign_key_check;

PRAGMA foreign_keys=ON;
