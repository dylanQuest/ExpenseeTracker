import { useMatches } from "@remix-run/react";
import { useMemo } from "react";

import type { User } from "~/models/user.server";

const DEFAULT_REDIRECT = "/";

/**
 * This should be used any time the redirect path is user-provided
 * (Like the query string on our login/signup pages). This avoids
 * open-redirect vulnerabilities.
 * @param {string} to The redirect destination
 * @param {string} defaultRedirect The redirect to use if the to is unsafe.
 */
export function safeRedirect(
  to: FormDataEntryValue | string | null | undefined,
  defaultRedirect: string = DEFAULT_REDIRECT,
) {
  if (!to || typeof to !== "string") {
    return defaultRedirect;
  }

  if (!to.startsWith("/") || to.startsWith("//")) {
    return defaultRedirect;
  }

  return to;
}

/**
 * This base hook is used in other hooks to quickly search for specific data
 * across all loader data using useMatches.
 * @param {string} id The route id
 * @returns {JSON|undefined} The router data or undefined if not found
 */
export function useMatchesData(
  id: string,
): Record<string, unknown> | undefined {
  const matchingRoutes = useMatches();
  const route = useMemo(
    () => matchingRoutes.find((route) => route.id === id),
    [matchingRoutes, id],
  );
  return route?.data as Record<string, unknown>;
}

function isUser(user: unknown): user is User {
  return (
    user != null &&
    typeof user === "object" &&
    "email" in user &&
    typeof user.email === "string"
  );
}

export function useOptionalUser(): User | undefined {
  const data = useMatchesData("root");
  if (!data || !isUser(data.user)) {
    return undefined;
  }
  return data.user;
}

export function useUser(): User {
  const maybeUser = useOptionalUser();
  if (!maybeUser) {
    throw new Error(
      "No user found in root loader, but user is required by useUser. If user is optional, try useOptionalUser instead.",
    );
  }
  return maybeUser;
}

export function validateEmail(email: unknown): email is string {
  return typeof email === "string" && email.length > 3 && email.includes("@");
}

export function groupExpensesByMonth(
  expenses: { value: number; createdAt: string | Date }[],
) {
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    const date = new Date(expense.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    totals.set(key, (totals.get(key) ?? 0) + expense.value);
  }

  return Array.from(totals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, total]) => {
      const [year, month] = key.split("-");
      const label = new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      return { label, total };
    });
}

export function getPeriodDateFilter(period: "week" | "month" | "year") {
  const now = new Date();
  const fromDate = new Date(now);
  const toDate = new Date(now);

  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);

  if (period === "week") {
    const day = fromDate.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    fromDate.setDate(fromDate.getDate() - daysSinceMonday);
    toDate.setDate(fromDate.getDate() + 6);
  }

  if (period === "month") {
    fromDate.setDate(1);
    toDate.setMonth(toDate.getMonth() + 1);
    toDate.setDate(0);
  }

  if (period === "year") {
    fromDate.setMonth(0, 1);
    toDate.setMonth(11, 31);
  }

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    from: formatDate(fromDate),
    to: formatDate(toDate),
    createdAt: { gte: fromDate, lte: toDate },
  };
}

export function groupExpensesByDay(
  expenses: { value: number; createdAt: string | Date }[],
) {
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    const date = new Date(expense.createdAt);
    const key = date.toISOString().slice(0, 10);
    totals.set(key, (totals.get(key) ?? 0) + expense.value);
  }

  return Array.from(totals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, total]) => {
      const label = new Date(key).toLocaleDateString("en-US", {
        weekday: "short",
        timeZone: "UTC",
      });
      return { label, total };
    });
}

export function groupExpensesByWeek(
  expenses: { value: number; createdAt: string | Date }[],
) {
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    const date = new Date(expense.createdAt);
    const day = date.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - daysSinceMonday);
    const key = weekStart.toISOString().slice(0, 10);
    totals.set(key, (totals.get(key) ?? 0) + expense.value);
  }

  return Array.from(totals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, total]) => {
      const label = new Date(key).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
      return { label, total };
    });
}

export function getDateFilter(request: Request) {
  const url = new URL(request.url);

  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";

  const createdAt: {
    gte?: Date;
    lt?: Date;
  } = {};

  if (from) {
    const fromDate = new Date(`${from}T00:00:00.000Z`);

    if (!Number.isNaN(fromDate.getTime())) {
      createdAt.gte = fromDate;
    }
  }

  if (to) {
    const toDate = new Date(`${to}T00:00:00.000Z`);

    if (!Number.isNaN(toDate.getTime())) {
      // Use the start of the following day so the selected end date
      // includes expenses at any time on that date.
      toDate.setUTCDate(toDate.getUTCDate() + 1);
      createdAt.lt = toDate;
    }
  }

  return {
    from,
    to,
    createdAt,
  };
}