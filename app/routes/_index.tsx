import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Link,
  useLoaderData,
  useLocation,
  useNavigation,
} from "@remix-run/react";
import { useEffect, useState } from "react";

import styles from "../Components/index.module.css";
import { getUserId } from "~/session.server";
import { getUserById, getTotalIncome } from "~/models/user.server";
import type { User } from "~/models/user.server";
import { getCategories } from "~/models/category.server";
import {
  getExpensesByCategory,
  getExpensesForChart,
  getExpensesForInsights,
  getTotalExpenses,
} from "~/models/expenses.server";
import {
  getDateFilter,
  getPeriodDateFilter,
  groupExpensesByDay,
  groupExpensesByMonth,
  groupExpensesByWeek,
  useOptionalUser,
} from "~/utils";
import { UnauthenticatedMenu, AuthenticatedMenu } from "~/Components/Menu";
import { Balance } from "~/Components/Balance";
import { ExpensesPieChart } from "~/Components/ExpensesPieChart";
import { SpendOverTimeChart } from "~/Components/SpendOverTimeChart";
import {
  BudgetProgressRing,
  CategorySpendingHeatmap,
  LargestExpensesChart,
} from "~/Components/DashboardInsights";
import { Grid, GridItem } from "~/Components/Grid";
import { PeriodToggle } from "~/Components/PeriodToggle";
import * as Forms from "~/Components/Form";

export const meta: MetaFunction = () => [{ title: "Welcome" }];

type Period = "week" | "month" | "year" | "total";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);

  if (!userId) {
    return json({
      user: null,
      balance: 0,
      balanceLabel: "Tracked balance",
      chartData: [] as { name: string; value: number; color: string }[],
      spendOverTime: [] as { label: string; total: number }[],
      insightExpenses: [],
      totalSpent: 0,
      periodBudget: null,
      filters: { from: undefined, to: undefined, period: "month" as Period },
    });
  }

  const user = await getUserById(userId);
  const url = new URL(request.url);

  const requestedPeriod = url.searchParams.get("period");

  const period: Period =
    requestedPeriod === "week" ||
    requestedPeriod === "month" ||
    requestedPeriod === "year" ||
    requestedPeriod === "total"
      ? requestedPeriod
      : "month";

  const requestedFrom = url.searchParams.get("from");
  const requestedTo = url.searchParams.get("to");
  const hasCustomDateRange = Boolean(requestedFrom || requestedTo);

  let from: string | undefined;
  let to: string | undefined;
  let createdAt: { gte?: Date; lt?: Date } | undefined;

  if (hasCustomDateRange) {
    const custom = getDateFilter(request);
    from = custom.from;
    to = custom.to;
    createdAt = custom.createdAt;
  } else if (period !== "total") {
    const preset = getPeriodDateFilter(period);
    from = preset.from;
    to = preset.to;
    createdAt = preset.createdAt;
  }

  const [
    categories,
    categoryTotals,
    expensesForChart,
    totalSpent,
    totalIncome,
    allTimeExpenses,
    insightExpenses,
  ] = await Promise.all([
    getCategories({ userId }),
    getExpensesByCategory({ userId, createdAt }),
    getExpensesForChart({ userId, createdAt }),
    getTotalExpenses({ userId, createdAt }),
    getTotalIncome({ userId }),
    getTotalExpenses({ userId, createdAt: undefined }),
    getExpensesForInsights({ userId, createdAt }),
  ]);

  const chartData = categories.map((category) => {
    const total = categoryTotals.find(
      (item) => item.categoryId === category.id
    );

    return {
      name: category.name,
      value: total?._sum.value ?? 0,
      color: category.color,
    };
  });

  const spendOverTime =
    period === "week"
      ? groupExpensesByDay(expensesForChart)
      : period === "month"
        ? groupExpensesByWeek(expensesForChart)
        : groupExpensesByMonth(expensesForChart);

  const balance = totalIncome - allTimeExpenses;

  const periodBudget =
    period === "week"
      ? totalIncome / 52
      : period === "month"
        ? totalIncome / 12
        : period === "year"
          ? totalIncome
          : null;

  console.log("Dashboard totals", {
    period,
    hasCustomDateRange,
    from,
    to,
    selectedPeriodExpenses: totalSpent,
    totalIncome,
    allTimeExpenses,
    balance,
    periodBudget,
  });

  return json({
    user,
    balance,
    balanceLabel: "Tracked balance",
    chartData,
    spendOverTime,
    insightExpenses,
    totalSpent,
    periodBudget,
    filters: { from, to, period },
  });
}

function Dashboard({
  user,
  balance,
  balanceLabel,
  chartData,
  spendOverTime,
  insightExpenses,
  totalSpent,
  periodBudget,
  filters,
}: {
  user: User;
  balance: number;
  balanceLabel: string;
  chartData: { name: string; value: number; color: string }[];
  spendOverTime: { label: string; total: number }[];
  insightExpenses: {
    id: string;
    item: string;
    value: number;
    createdAt: string;
    category: {
      id: string;
      name: string;
      color: string;
    };
  }[];
  totalSpent: number;
  periodBudget: number | null;
  filters: { from?: string; to?: string; period: Period };
}) {
  const [showFilters, setShowFilters] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setShowFilters(false);
  }, [location.key]);

  const navigation = useNavigation();
  const isFiltering = navigation.state === "loading";
  const hasActiveFilters = Boolean(filters.from || filters.to);

  return (
    <AuthenticatedMenu current="dashboard">
      <Balance defaultValue={balance} label={balanceLabel} />

      <Forms.Form
        key={`period-${filters.period}`}
        method="get"
        preventScrollReset
      >
        <PeriodToggle name="period" value={filters.period} />

        {filters.from ? (
          <input type="hidden" name="from" value={filters.from} />
        ) : null}

        {filters.to ? (
          <input type="hidden" name="to" value={filters.to} />
        ) : null}
      </Forms.Form>

      <div className={styles.filterToggleWrapper}>
        <button
          type="button"
          onClick={() => setShowFilters((isOpen) => !isOpen)}
          aria-expanded={showFilters}
          aria-controls="dashboard-date-filters"
        >
          {showFilters ? "Hide filters" : "Filter"}
        </button>
      </div>

      {showFilters ? (
        <Forms.Form
          key={`custom-${filters.from}|${filters.to}`}
          id="dashboard-date-filters"
          method="get"
          preventScrollReset
        >
          <input type="hidden" name="period" value={filters.period} />

          <Forms.Label>
            From
            <Forms.Input
              type="date"
              name="from"
              defaultValue={filters.from}
            />
          </Forms.Label>

          <Forms.Label>
            To
            <Forms.Input type="date" name="to" defaultValue={filters.to} />
          </Forms.Label>

          <Forms.Submit>Apply</Forms.Submit>

          {hasActiveFilters ? (
            <Link to="/" preventScrollReset>
              Clear filters
            </Link>
          ) : null}
        </Forms.Form>
      ) : null}

      <div
        style={{
          opacity: isFiltering ? 0.5 : 1,
          transition: "opacity 0.15s ease",
        }}
      >
        <Grid>
          <GridItem>
            <ExpensesPieChart data={chartData} />
          </GridItem>

          <GridItem>
            <SpendOverTimeChart data={spendOverTime} />
          </GridItem>
        </Grid>

        <section style={{ marginTop: "1.5rem" }}>
          <CategorySpendingHeatmap
            expenses={insightExpenses}
            period={filters.period}
          />
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.5rem",
            marginTop: "1.5rem",
          }}
        >
          <BudgetProgressRing
            budget={periodBudget}
            spent={totalSpent}
            period={filters.period}
          />

          <LargestExpensesChart expenses={insightExpenses} />
        </section>
      </div>
    </AuthenticatedMenu>
  );
}

function Welcome() {
  return (
    <UnauthenticatedMenu>
      <h1>Welcome</h1>
      <p>
        Welcome to the <strong>Expens.ee</strong> Expense Tracker application.
      </p>
      <p>
        Please <Link style={{color:"white"}} to="/login">login</Link> or{" "}
        <Link style={{color:"white"}} to="/join">create a user</Link>.
      </p>
    </UnauthenticatedMenu>
  );
}

export default function Index() {
  const {
    balance,
    balanceLabel,
    chartData,
    spendOverTime,
    insightExpenses,
    totalSpent,
    periodBudget,
    filters,
  } = useLoaderData<typeof loader>();

  const user = useOptionalUser();

  return user ? (
    <Dashboard
      user={user}
      balance={balance}
      balanceLabel={balanceLabel}
      chartData={chartData}
      spendOverTime={spendOverTime}
      insightExpenses={insightExpenses}
      totalSpent={totalSpent}
      periodBudget={periodBudget}
      filters={filters}
    />
  ) : (
    <Welcome />
  );
}
