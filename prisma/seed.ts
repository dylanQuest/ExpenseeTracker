import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function randomDateWithinLastMonths(months: number) {
  const now = new Date();
  const past = new Date(now);
  past.setMonth(past.getMonth() - months);

  const timestamp = randomInt(past.getTime(), now.getTime());
  return new Date(timestamp);
}

const EXPENSE_ITEMS: { item: string; category: string; range: [number, number] }[] = [
  { item: "Rent", category: "Housing", range: [1000, 1500] },
  { item: "Electricity bill", category: "Utilities", range: [40, 120] },
  { item: "Water bill", category: "Utilities", range: [20, 60] },
  { item: "Internet", category: "Utilities", range: [30, 70] },
  { item: "Groceries", category: "Food", range: [20, 150] },
  { item: "Takeaway", category: "Food", range: [10, 45] },
  { item: "Coffee", category: "Food", range: [3, 8] },
  { item: "Fuel", category: "Transportation", range: [30, 80] },
  { item: "Train ticket", category: "Transportation", range: [5, 40] },
  { item: "Car insurance", category: "Transportation", range: [60, 120] },
];

async function createCategoriesForUser(userId: string) {
  const definitions = [
    { name: "Housing", color: "#c0ffee" },
    { name: "Transportation", color: "#bada55" },
    { name: "Food", color: "#00ff00" },
    { name: "Utilities", color: "#aaaaff" },
  ];

  const categories: Record<string, { id: string }> = {};

  for (const definition of definitions) {
    const category = await prisma.category.create({
      data: { ...definition, userId },
    });
    categories[category.name] = category;
  }

  return categories;
}

async function createIncomeHistory(userId: string) {
  // Roughly one income change every 4-8 months over the last 2 years,
  // ending with the most recent (current) figure.
  const now = new Date();
  const raises = [32000, 35000, 38000, 42000];

  let cursor = startOfUtcDay(new Date(now));
  cursor.setUTCFullYear(cursor.getUTCFullYear() - 2);

  const records: { annualIncome: number; effectiveFrom: Date }[] = [];

  for (let i = 0; i < raises.length; i++) {
    records.push({ annualIncome: raises[i], effectiveFrom: startOfUtcDay(cursor) });

    const monthsForward = randomInt(4, 8);
    cursor = new Date(cursor);
    cursor.setUTCMonth(cursor.getUTCMonth() + monthsForward);

    if (cursor > now) break;
  }

  for (const record of records) {
    await prisma.incomeHistory.create({
      data: {
        userId,
        annualIncome: record.annualIncome,
        effectiveFrom: record.effectiveFrom,
      },
    });
  }

  const currentIncome = records[records.length - 1].annualIncome;

  await prisma.user.update({
    where: { id: userId },
    data: { income: currentIncome },
  });
}

async function createExpenses(
  userId: string,
  categories: Record<string, { id: string }>,
  count: number,
  monthsBack: number,
) {
  for (let i = 0; i < count; i++) {
    const definition = randomChoice(EXPENSE_ITEMS);
    const category = categories[definition.category];
    const value = randomInt(definition.range[0], definition.range[1]);
    const createdAt = randomDateWithinLastMonths(monthsBack);

    await prisma.expense.create({
      data: {
        item: definition.item,
        value,
        userId,
        categoryId: category.id,
        createdAt,
        updatedAt: createdAt,
      },
    });
  }
}

async function createSampleUser({
  email,
  password,
  expenseCount,
  monthsBack,
  withIncomeHistory,
}: {
  email: string;
  password: string;
  expenseCount: number;
  monthsBack: number;
  withIncomeHistory: boolean;
}) {
  await prisma.user.delete({ where: { email } }).catch(() => {
    // no worries if it doesn't exist yet
  });

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: {
        create: { hash: hashedPassword },
      },
    },
  });

  const categories = await createCategoriesForUser(user.id);

  if (withIncomeHistory) {
    await createIncomeHistory(user.id);
  }

  await createExpenses(user.id, categories, expenseCount, monthsBack);

  return user;
}

async function seed() {
  // Primary sample user: 2 years of income history, up to 25 expenses.
  await createSampleUser({
    email: "admin@expens.ee",
    password: "iloveexpenses",
    expenseCount: 25,
    monthsBack: 24,
    withIncomeHistory: true,
  });

  // Secondary sample user: heavier expense history, no income history.
  await createSampleUser({
    email: "poweruser@expens.ee",
    password: "iloveexpenses",
    expenseCount: 100,
    monthsBack: 18,
    withIncomeHistory: false,
  });

  console.log(`Database has been seeded. 🌱`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });