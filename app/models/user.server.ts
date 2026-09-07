import type { IncomeHistory, Password, User } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "~/db.server";

export type { User } from "@prisma/client";

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new Error("Income date must be in YYYY-MM-DD format.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

  const isValidDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!isValidDate) {
    throw new Error("Income date is invalid.");
  }

  return date;
}

export async function getUserById(id: User["id"]) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email: User["email"]) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(email: User["email"], password: string) {
  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      email,
      password: {
        create: {
          hash: hashedPassword,
        },
      },
    },
  });
}

export async function updateUser(id: User["id"], income: User["income"]) {
  return prisma.user.update({
    where: { id },
    data: { income },
  });
}

export async function deleteUserByEmail(email: User["email"]) {
  return prisma.user.delete({ where: { email } });
}

export async function verifyLogin(
  email: User["email"],
  password: Password["hash"],
) {
  const userWithPassword = await prisma.user.findUnique({
    where: { email },
    include: {
      password: true,
    },
  });

  if (!userWithPassword || !userWithPassword.password) {
    return null;
  }

  const isValid = await bcrypt.compare(
    password,
    userWithPassword.password.hash,
  );

  if (!isValid) {
    return null;
  }

  const { password: _password, ...userWithoutPassword } = userWithPassword;

  return userWithoutPassword;
}

export function getIncomeHistory({ userId }: { userId: User["id"] }) {
  return prisma.incomeHistory.findMany({
    where: { userId },
    orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      annualIncome: true,
      effectiveFrom: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getTotalIncome({
  userId,
}: {
  userId: User["id"];
}) {
  const result = await prisma.incomeHistory.aggregate({
    where: { userId },
    _sum: {
      annualIncome: true,
    },
  });

  return result._sum.annualIncome ?? 0;
}

export async function createIncomeRecord({
  userId,
  amount,
  receivedAt,
}: {
  userId: User["id"];
  amount: IncomeHistory["annualIncome"];
  receivedAt: string;
}) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Income amount must be a positive number.");
  }

  const receivedDate = parseDateOnly(receivedAt);

  return prisma.$transaction(async (transaction) => {
    const incomeRecord = await transaction.incomeHistory.create({
      data: {
        userId,
        annualIncome: amount,
        effectiveFrom: receivedDate,
      },
    });

    const totalIncome = await transaction.incomeHistory.aggregate({
      where: { userId },
      _sum: {
        annualIncome: true,
      },
    });

    await transaction.user.update({
      where: { id: userId },
      data: {
        income: totalIncome._sum.annualIncome ?? 0,
      },
    });

    return incomeRecord;
  });
}

export async function deleteIncomeRecord({
  userId,
  incomeHistoryId,
}: {
  userId: User["id"];
  incomeHistoryId: IncomeHistory["id"];
}) {
  return prisma.$transaction(async (transaction) => {
    const deleted = await transaction.incomeHistory.deleteMany({
      where: {
        id: incomeHistoryId,
        userId,
      },
    });

    if (deleted.count === 0) {
      throw new Error("Income entry was not found.");
    }

    const totalIncome = await transaction.incomeHistory.aggregate({
      where: { userId },
      _sum: {
        annualIncome: true,
      },
    });

    await transaction.user.update({
      where: { id: userId },
      data: {
        income: totalIncome._sum.annualIncome ?? 0,
      },
    });
  });
}

export async function replaceIncomeHistory({
  userId,
  incomeHistory,
}: {
  userId: User["id"];
  incomeHistory: {
    annualIncome: number;
    effectiveFrom: string | Date;
    createdAt?: string | Date;
  }[];
}) {
  await prisma.$transaction(async (transaction) => {
    await transaction.incomeHistory.deleteMany({ where: { userId } });

    let totalIncome = 0;

    for (const record of incomeHistory) {
      const effectiveFrom = new Date(record.effectiveFrom);
      const createdAt = record.createdAt
        ? new Date(record.createdAt)
        : undefined;

      if (Number.isNaN(effectiveFrom.getTime())) {
        throw new Error("An imported income entry has an invalid received date.");
      }

      if (createdAt && Number.isNaN(createdAt.getTime())) {
        throw new Error("An imported income entry has an invalid creation date.");
      }

      if (
        !Number.isFinite(record.annualIncome) ||
        record.annualIncome <= 0
      ) {
        throw new Error("An imported income entry has an invalid amount.");
      }

      await transaction.incomeHistory.create({
        data: {
          userId,
          annualIncome: record.annualIncome,
          effectiveFrom,
          ...(createdAt ? { createdAt } : {}),
        },
      });

      totalIncome += record.annualIncome;
    }

    await transaction.user.update({
      where: { id: userId },
      data: {
        income: totalIncome,
      },
    });
  });
}
