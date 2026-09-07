import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData, useNavigation } from "@remix-run/react";
import { useState } from "react";

import { requireUserId } from "~/session.server";
import { AuthenticatedMenu } from "~/Components/Menu";
import * as Forms from "~/Components/Form";
import { getExpenses, deleteExpense } from "~/models/expenses.server";
import { getCategories } from "~/models/category.server";
import * as Table from "~/Components/Table";
import { getDateFilter } from "~/utils";

const MAX_EXPENSE_FILTER = 10000;

const currencyFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});

const dateFormatter = new Intl.DateTimeFormat("en-IE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const { from, to, createdAt } = getDateFilter(request);

  const url = new URL(request.url);
  const categoryId = url.searchParams.get("categoryId") || undefined;
  const minValueParam = url.searchParams.get("minValue");
  const minValue = minValueParam ? parseFloat(minValueParam) : undefined;
  const search = url.searchParams.get("search") || undefined;

  const [expenses, categories] = await Promise.all([
    getExpenses({ userId, createdAt, categoryId, minValue, search }),
    getCategories({ userId }),
  ]);

  return json({
    expenses,
    categories,
    filters: { from, to, categoryId, minValue, search },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();

  const expenseId = formData.get("deleteExpenseId");

  if (typeof expenseId !== "string" || expenseId.length === 0) {
    return json(
      { errors: { form: "Expense to delete was not provided." } },
      { status: 400 },
    );
  }

  await deleteExpense({
    id: expenseId,
    userId,
  });

  const url = new URL(request.url);

  return redirect(`${url.pathname}${url.search}`);
}

export const meta: MetaFunction = () => [{ title: "Expenses" }];

export default function ExpensesPage() {
  const { expenses, categories, filters } = useLoaderData<typeof loader>();

  const [showFilters, setShowFilters] = useState(
    Boolean(
      filters.from ||
        filters.to ||
        filters.categoryId ||
        filters.minValue ||
        filters.search,
    ),
  );

  const [minValueDisplay, setMinValueDisplay] = useState(
    filters.minValue ?? 0,
  );

  const navigation = useNavigation();
  const isFiltering = navigation.state === "loading";

  const hasActiveFilters = Boolean(
    filters.from ||
      filters.to ||
      filters.categoryId ||
      filters.minValue ||
      filters.search,
  );

  const totalExpenses = expenses.reduce(
    (total, expense) => total + expense.value,
    0,
  );

  return (
    <AuthenticatedMenu current="expenses">
      <br />

      <div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: "1rem",
  }}
>
  <div
    style={{
      flex: "0 0 160px",
      width: "120px",
      height: "40px",
    }}
  >
    <Forms.SubmitLink
      to="/add"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        width: "100%",
        height: "100%",
        padding: 0,
        color: "white",
      }}
    >
      Add Expense
    </Forms.SubmitLink>
  </div>

  <div
    style={{
      flex: "0 0 160px",
      width: "120px",
      height: "40px",
    }}
  >
    <button
      type="button"
      onClick={() => setShowFilters((isOpen) => !isOpen)}
      aria-expanded={showFilters}
      aria-controls="expense-filters"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        width: "100%",
        height: "100%",
        padding: 0,
        color: "white",
      }}
    >
      {showFilters ? "Hide filters" : "Filter"}
    </button>
  </div>
</div>


      {showFilters ? (
        <Forms.Form id="expense-filters" method="get" preventScrollReset>
          <Forms.Label>
            From
            <Forms.Input type="date" name="from" defaultValue={filters.from} />
          </Forms.Label>

          <Forms.Label>
            To
            <Forms.Input type="date" name="to" defaultValue={filters.to} />
          </Forms.Label>

          <Forms.Label>
            Category
            <Forms.Select
              name="categoryId"
              defaultValue={filters.categoryId ?? ""}
            >
              <option value="">All categories</option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Forms.Select>
          </Forms.Label>

          <Forms.Label>
            Minimum amount: {currencyFormatter.format(minValueDisplay)}
            <input
              type="range"
              name="minValue"
              min={0}
              max={MAX_EXPENSE_FILTER}
              step={10}
              defaultValue={filters.minValue ?? 0}
              onChange={(event) =>
                setMinValueDisplay(Number(event.target.value))
              }
            />
          </Forms.Label>

          <Forms.Label>
            Search
            <Forms.Input
              type="search"
              name="search"
              defaultValue={filters.search ?? ""}
              placeholder="Search description or category"
            />
          </Forms.Label>

          <Forms.Buttons>
            <Forms.Submit style={{ color: "white" }}>Filter</Forms.Submit>
          </Forms.Buttons>

          {hasActiveFilters ? (
            <Link style={{ color: "white" }} to="/expenses">
              Clear filters
            </Link>
          ) : null}
        </Forms.Form>
      ) : null}

      <Forms.Form method="post">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            marginBottom: "1rem",
            color: "white",
          }}
        >
          <strong>
            {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}
          </strong>

          <strong>Total: {currencyFormatter.format(totalExpenses)}</strong>
        </div>

        <div
          style={{
            opacity: isFiltering ? 0.5 : 1,
            transition: "opacity 0.15s ease",
          }}
        >
          <Forms.Label>
            <Table.Table>
              <Table.Body>
                {expenses.map((expense) => (
                  <Table.Row key={expense.id}>
                    <Table.Cell>
                      {dateFormatter.format(new Date(expense.createdAt))}
                    </Table.Cell>

                    <Table.Cell>{expense.item}</Table.Cell>

                    <Table.CellCategory
                      name={expense.category?.name || "Uncategorized"}
                      color={expense.category?.color || "#ccc"}
                    />

                    <Table.Cell>
                      {currencyFormatter.format(expense.value)}
                    </Table.Cell>

                    <Table.Cell
                      style={{
                        width: "1%",
                        whiteSpace: "nowrap",
                        textAlign: "right",
                      }}
                    >
                      <button
                        type="submit"
                        name="deleteExpenseId"
                        value={expense.id}
                        style={{ color: "white" }}
                        onClick={(event) => {
                          if (!window.confirm(`Delete "${expense.item}"?`)) {
                            event.preventDefault();
                          }
                        }}
                      >
                        Delete
                      </button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Table>
          </Forms.Label>
        </div>
      </Forms.Form>
    </AuthenticatedMenu>
  );
}
