import type { LoaderFunctionArgs } from "@remix-run/node";

import { requireUserId } from "~/session.server";
import { getExpenses } from "~/models/expenses.server";
import { getCategories } from "~/models/category.server";
import { getIncomeHistory } from "~/models/user.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  const [expenses, categories, incomeHistory] = await Promise.all([
    getExpenses({ userId }),
    getCategories({ userId }),
    getIncomeHistory({ userId }),
  ]);

  const data = JSON.stringify({ expenses, categories, incomeHistory }, null, 2);

  return new Response(data, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=expens-ee-backup.json",
    },
  });
}