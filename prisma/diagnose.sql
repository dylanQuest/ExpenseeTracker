SELECT id, effectiveFrom, typeof(effectiveFrom), userId
FROM IncomeHistory
WHERE datetime(effectiveFrom, 'start of day') IS NULL;