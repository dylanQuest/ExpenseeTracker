import type { Expense, Category, User } from "@prisma/client";

import { prisma } from "~/db.server";

export type { Expense } from "@prisma/client";

export function getExpenses({
  userId,
  createdAt,
  categoryId,
  minValue,
  search,
}: {
  userId: User["id"];
  createdAt?: { gte?: Date; lt?: Date };
  categoryId?: string;
  minValue?: number;
  search?: string;
}) {
  return prisma.expense.findMany({
    where: {
      userId,
      ...(createdAt?.gte || createdAt?.lt ? { createdAt } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(minValue !== undefined ? { value: { gte: minValue } } : {}),
      ...(search
        ? {
            OR: [
              { item: { contains: search } },
              { category: { name: { contains: search } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      item: true,
      value: true,
      createdAt: true,
      category: {
        select: { id: true, name: true, color: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export function getExpenseById({
  id,
  userId,
}: Pick<Expense, "id"> & { userId: User["id"] }) {
  return prisma.expense.findFirst({
    where: { id, userId },
    select: {
      id: true,
      item: true,
      value: true,
      categoryId: true,
    },
  });
}

export function getExpensesByCategory({
  userId,
  createdAt,
}: {
  userId: User["id"];
  createdAt?: { gte?: Date; lt?: Date };
}) {
  return prisma.expense.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      ...(createdAt?.gte || createdAt?.lt ? { createdAt } : {}),
    },
    _sum: { value: true },
  });
}

export function getExpensesForChart({
  userId,
  createdAt,
}: {
  userId: User["id"];
  createdAt?: { gte?: Date; lt?: Date };
}) {
  return prisma.expense.findMany({
    where: {
      userId,
      ...(createdAt?.gte || createdAt?.lt ? { createdAt } : {}),
    },
    select: {
      value: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getTotalExpenses({
  userId,
  createdAt,
}: {
  userId: User["id"];
  createdAt?: { gte?: Date; lt?: Date };
}) {
  const result = await prisma.expense.aggregate({
    where: {
      userId,
      ...(createdAt?.gte || createdAt?.lt ? { createdAt } : {}),
    },
    _sum: { value: true },
  });

  return result._sum.value ?? 0;
}

export function createExpense({
  item,
  value,
  userId,
  categoryId,
}: Pick<Expense, "item" | "value"> & {
  userId: User["id"];
  categoryId: Category["id"];
}) {
  return prisma.expense.create({
    data: {
      item,
      value,
      user: {
        connect: { id: userId },
      },
      category: {
        connect: { id: categoryId },
      },
    },
  });
}

export function updateExpense({
  id,
  userId,
  item,
  value,
  categoryId,
}: Pick<Expense, "id" | "item" | "value"> & {
  userId: User["id"];
  categoryId: Category["id"];
}) {
  return prisma.expense.updateMany({
    where: { id, userId },
    data: { item, value, categoryId },
  });
}

export async function deleteExpense({
  id,
  userId,
}: Pick<Expense, "id"> & { userId: User["id"] }) {
  return prisma.$transaction(async (transaction) => {
    const expense = await transaction.expense.findFirst({
      where: { id, userId },
      select: { id: true, categoryId: true },
    });

    if (!expense) {
      return { deleted: false, categoryDeleted: false };
    }

    await transaction.expense.delete({
      where: { id: expense.id },
    });

    const remainingExpenses = await transaction.expense.count({
      where: {
        userId,
        categoryId: expense.categoryId,
      },
    });

    if (remainingExpenses > 0) {
      return { deleted: true, categoryDeleted: false };
    }

    const deletedCategory = await transaction.category.deleteMany({
      where: {
        id: expense.categoryId,
        userId,
      },
    });

    return {
      deleted: true,
      categoryDeleted: deletedCategory.count > 0,
    };
  });
}

export function getExpensesForInsights({
  userId,
  createdAt,
}: {
  userId: User["id"];
  createdAt?: { gte?: Date; lt?: Date };
}) {
  return prisma.expense.findMany({
    where: {
      userId,
      ...(createdAt?.gte || createdAt?.lt ? { createdAt } : {}),
    },
    select: {
      id: true,
      item: true,
      value: true,
      createdAt: true,
      category: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
    orderBy: {
      value: "desc",
    },
  });
}

export async function replaceAllExpensesAndCategories({
  userId,
  categories,
  expenses,
}: {
  userId: User["id"];
  categories: { name: string; color: string }[];
  expenses: {
    item: string;
    value: number;
    categoryName: string;
    createdAt: string | Date;
  }[];
}) {
  await prisma.$transaction(async (transaction) => {
    await transaction.expense.deleteMany({ where: { userId } });
    await transaction.category.deleteMany({ where: { userId } });

    const categoryIdByName = new Map<string, string>();

    for (const category of categories) {
      const created = await transaction.category.create({
        data: {
          name: category.name,
          color: category.color,
          userId,
        },
      });

      categoryIdByName.set(category.name, created.id);
    }

    for (const expense of expenses) {
      const categoryId = categoryIdByName.get(expense.categoryName);
      const createdAt = new Date(expense.createdAt);

      if (!categoryId) {
        continue;
      }

      if (Number.isNaN(createdAt.getTime())) {
        throw new Error(`Invalid expense date for "${expense.item}".`);
      }

      await transaction.expense.create({
        data: {
          item: expense.item,
          value: expense.value,
          userId,
          categoryId,
          createdAt,
        },
      });
    }
  });
}

