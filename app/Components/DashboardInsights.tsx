import { Fragment } from "react";

import styles from "./DashboardInsights.module.css";

type Period = "week" | "month" | "year" | "total";

type InsightExpense = {
  id: string;
  item: string;
  value: number;
  createdAt: string | Date;
  category: {
    id: string;
    name: string;
    color: string;
  };
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function getHeatmapColumns(period: Period) {
  if (period === "week") {
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  }

  if (period === "year") {
    return [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
  }

  return ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
}

function getBucketIndex(dateValue: string | Date, period: Period) {
  const date = new Date(dateValue);

  if (period === "week") {
    return (date.getDay() + 6) % 7;
  }

  if (period === "year") {
    return date.getMonth();
  }

  return Math.min(Math.floor((date.getDate() - 1) / 7), 4);
}

function hexToRgba(hex: string, opacity: number) {
  const safeHex = hex.replace("#", "");

  if (safeHex.length !== 6) {
    return `rgba(248, 113, 142, ${opacity})`;
  }

  const red = Number.parseInt(safeHex.slice(0, 2), 16);
  const green = Number.parseInt(safeHex.slice(2, 4), 16);
  const blue = Number.parseInt(safeHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export function BudgetProgressRing({
  budget,
  spent,
  period,
}: {
  budget: number | null;
  spent: number;
  period: Period;
}) {
  if (period === "total" || budget === null) {
    return (
      <div className={styles.insight}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Budget</p>
            <h2>Budget vs spending</h2>
          </div>
        </div>

        <p className={styles.emptyMessage}>
          Budget tracking is available for week, month, and year views.
        </p>
      </div>
    );
  }

  const percentage = budget > 0 ? (spent / budget) * 100 : 0;
  const displayedPercentage = Math.round(Math.min(percentage, 100));
  const remaining = budget - spent;
  const isOverBudget = remaining < 0;

  const accent = isOverBudget
    ? "#ff8fa3"
    : percentage >= 80
      ? "#ffca7a"
      : "#f8718e";

  return (
    <div className={styles.insight}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Period allowance</p>
          <h2>Budget vs spending</h2>
        </div>
      </div>

      <div className={styles.budgetLayout}>
        <div
          className={styles.ring}
          style={{
            background: `conic-gradient(${accent} ${displayedPercentage}%, hsl(0deg 0% 100% / 14%) ${displayedPercentage}% 100%)`,
          }}
        >
          <div className={styles.ringCenter}>
            <strong>{Math.round(percentage)}%</strong>
            <span>used</span>
          </div>
        </div>

        <div className={styles.budgetDetails}>
          <p className={styles.budgetSpent}>
            {money.format(spent)}
            <span> spent</span>
          </p>

          <p className={isOverBudget ? styles.overBudget : styles.remaining}>
            {isOverBudget
              ? `${money.format(Math.abs(remaining))} over budget`
              : `${money.format(remaining)} remaining`}
          </p>

          <p className={styles.budgetTotal}>
            Allowance: {money.format(budget)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function LargestExpensesChart({
  expenses,
}: {
  expenses: InsightExpense[];
}) {
  const largestExpenses = expenses.slice(0, 5);
  const largestValue = largestExpenses[0]?.value ?? 0;

  return (
    <div className={styles.insight}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Selected period</p>
          <h2>Largest expenses</h2>
        </div>

        <span className={styles.smallLabel}>Top 5</span>
      </div>

      {largestExpenses.length ? (
        <div className={styles.lollipopList}>
          {largestExpenses.map((expense) => {
            const width =
              largestValue > 0 ? (expense.value / largestValue) * 100 : 0;

            return (
              <div className={styles.lollipopRow} key={expense.id}>
                <div className={styles.expenseMeta}>
                  <strong title={expense.item}>{expense.item}</strong>
                  <span>{expense.category.name}</span>
                </div>

                <div className={styles.lollipopTrack}>
                  <div
                    className={styles.lollipopStem}
                    style={{
                      width: `${Math.max(width, 5)}%`,
                      backgroundColor: expense.category.color,
                    }}
                  >
                    <span
                      className={styles.lollipopDot}
                      style={{ backgroundColor: expense.category.color }}
                    />
                  </div>
                </div>

                <strong className={styles.expenseAmount}>
                  {money.format(expense.value)}
                </strong>
              </div>
            );
          })}
        </div>
      ) : (
        <p className={styles.emptyMessage}>No expenses in this period.</p>
      )}
    </div>
  );
}

export function CategorySpendingHeatmap({
  expenses,
  period,
}: {
  expenses: InsightExpense[];
  period: Period;
}) {
  if (period === "total") {
    return (
      <div className={styles.insight}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Spending patterns</p>
            <h2>Category spending over time</h2>
          </div>
        </div>

        <p className={styles.emptyMessage}>
          Choose a week, month, or year to view category spending patterns.
        </p>
      </div>
    );
  }

  const columns = getHeatmapColumns(period);

  const categoryMap = new Map<
    string,
    {
      id: string;
      name: string;
      color: string;
      totals: number[];
    }
  >();

  for (const expense of expenses) {
    const category = expense.category;
    const bucketIndex = getBucketIndex(expense.createdAt, period);

    if (!categoryMap.has(category.id)) {
      categoryMap.set(category.id, {
        id: category.id,
        name: category.name,
        color: category.color,
        totals: Array(columns.length).fill(0),
      });
    }

    categoryMap.get(category.id)!.totals[bucketIndex] += expense.value;
  }

  const rows = [...categoryMap.values()].sort(
    (first, second) =>
      second.totals.reduce((total, value) => total + value, 0) -
      first.totals.reduce((total, value) => total + value, 0)
  );

  const highestCellValue = Math.max(
    ...rows.flatMap((row) => row.totals),
    0
  );

  return (
    <div className={styles.insight}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Spending patterns</p>
          <h2>Category spending over time</h2>
        </div>

        <span className={styles.smallLabel}>
          Darker cells = higher spending
        </span>
      </div>

      {rows.length ? (
        <div className={styles.heatmapScroll}>
          <div
            className={styles.heatmap}
            style={{
              gridTemplateColumns: `minmax(110px, 150px) repeat(${columns.length}, minmax(52px, 1fr))`,
            }}
          >
            <div className={styles.heatmapCorner} />

            {columns.map((column) => (
              <div className={styles.heatmapColumnLabel} key={column}>
                {column}
              </div>
            ))}

            {rows.map((row) => (
              <Fragment key={row.id}>
                <div className={styles.heatmapRowLabel}>
                  <span
                    className={styles.categoryDot}
                    style={{ backgroundColor: row.color }}
                  />
                  {row.name}
                </div>

                {row.totals.map((value, index) => {
                  const intensity =
                    highestCellValue > 0 ? value / highestCellValue : 0;

                  return (
                    <div
                      className={styles.heatmapCell}
                      key={`${row.id}-${columns[index]}`}
                      title={`${row.name} — ${columns[index]}: ${money.format(value)}`}
                      style={{
                        backgroundColor:
                          value > 0
                            ? hexToRgba(row.color, 0.18 + intensity * 0.82)
                            : "rgba(255, 255, 255, 0.08)",
                      }}
                    >
                      {value > 0 ? money.format(value) : ""}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      ) : (
        <p className={styles.emptyMessage}>No expenses in this period.</p>
      )}
    </div>
  );
}