import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useRevalidator,
} from "@remix-run/react";
import { useEffect, useRef } from "react";

import { requireUserId } from "~/session.server";
import { AuthenticatedMenu } from "~/Components/Menu";
import * as Forms from "~/Components/Form";
import {
  createIncomeRecord,
  deleteIncomeRecord,
  getIncomeHistory,
  getTotalIncome,
  replaceIncomeHistory,
} from "~/models/user.server";
import styles from "~/Components/Income.module.css";
import { replaceAllExpensesAndCategories } from "~/models/expenses.server";

export const meta: MetaFunction = () => [{ title: "Income" }];

const currencyFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});

const dateFormatter = new Intl.DateTimeFormat("en-IE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

type ActionErrors = {
  income: string | null;
  receivedAt: string | null;
  importError: string | null;
  form: string | null;
};

function errorResult(errors: Partial<ActionErrors>, status = 400) {
  return json(
    {
      errors: {
        income: errors.income ?? null,
        receivedAt: errors.receivedAt ?? null,
        importError: errors.importError ?? null,
        form: errors.form ?? null,
      },
    },
    { status },
  );
}

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  const [incomeHistory, totalIncome] = await Promise.all([
    getIncomeHistory({ userId }),
    getTotalIncome({ userId }),
  ]);

  return json({ incomeHistory, totalIncome });
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "import") {
    const file = formData.get("backupFile");

    if (!(file instanceof File) || file.size === 0) {
      return errorResult({ importError: "No file selected" });
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      await replaceAllExpensesAndCategories({
        userId,
        categories: parsed.categories ?? [],
        expenses: (parsed.expenses ?? []).map((expense: any) => ({
          item: expense.item,
          value: expense.value,
          categoryName: expense.category?.name,
          createdAt: expense.createdAt,
        })),
      });

      await replaceIncomeHistory({
        userId,
        incomeHistory: (parsed.incomeHistory ?? []).map((record: any) => ({
          annualIncome: record.annualIncome,
          effectiveFrom: record.effectiveFrom,
          createdAt: record.createdAt,
        })),
      });


      return redirect("/income");
    } catch (error) {
      return errorResult({ importError: "Invalid backup file" });
    }
  }

  if (intent === "delete") {
    const incomeHistoryId = formData.get("incomeHistoryId");

    if (typeof incomeHistoryId !== "string" || incomeHistoryId.length === 0) {
      return errorResult({ form: "Income entry was not provided." });
    }

    try {
      await deleteIncomeRecord({ userId, incomeHistoryId });
      return redirect("/income");
    } catch (error) {
      return errorResult({
        form:
          error instanceof Error
            ? error.message
            : "Unable to delete income entry.",
      });
    }
  }

  const amount = formData.get("income");
  const receivedAt = formData.get("receivedAt");
  const income = Number(amount);

  if (typeof amount !== "string" || !Number.isFinite(income) || income <= 0) {
    return errorResult({ income: "Income amount must be a positive number." });
  }

  if (typeof receivedAt !== "string" || receivedAt.length === 0) {
    return errorResult({ receivedAt: "Income date is required." });
  }

  const today = new Date().toISOString().slice(0, 10);

  if (receivedAt > today) {
    return errorResult({ receivedAt: "Income date cannot be in the future." });
  }

  try {
    await createIncomeRecord({
      userId,
      amount: income,
      receivedAt,
    });

    return redirect("/income");
  } catch (error) {
    return errorResult({
      receivedAt:
        error instanceof Error ? error.message : "Unable to save income.",
    });
  }
}

export default function IncomePage() {
  const { incomeHistory, totalIncome } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const hasSubmittedIncome = useRef(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (navigation.state === "submitting") {
      hasSubmittedIncome.current = true;
      return;
    }

    if (hasSubmittedIncome.current && navigation.state === "idle") {
      hasSubmittedIncome.current = false;
      revalidator.revalidate();
    }
  }, [navigation.state, revalidator]);

  return (
    <AuthenticatedMenu current="income">
      <div className={styles.pageHeader}>
        <Forms.Title>Add income</Forms.Title>

        <div className={styles.headerActions}>
          <a href="/export" className={styles.exportLink}>
            Export data
          </a>

          <Forms.Form
            method="post"
            encType="multipart/form-data"
            className={styles.importForm}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  "This will replace all your existing data with the imported backup. Continue?",
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <input
              type="file"
              name="backupFile"
              accept="application/json"
              required
              className={styles.fileInput}
            />
            <input type="hidden" name="intent" value="import" />
            <button type="submit" className={styles.importButton}>
              Import
            </button>
          </Forms.Form>
        </div>
      </div>

      {actionData?.errors?.importError ? (
        <p className="formError">{actionData.errors.importError}</p>
      ) : null}
      <Forms.Form method="post">
        <Forms.Label>
          <Forms.LabelSpan>Amount</Forms.LabelSpan>
          <Forms.Input
            type="number"
            name="income"
            min="0.01"
            step="0.01"
            required
          />
        </Forms.Label>

        {actionData?.errors?.income ? (
          <p className="formError">{actionData.errors.income}</p>
        ) : null}

        <Forms.Label>
          <Forms.LabelSpan>Date received</Forms.LabelSpan>
          <Forms.Input
            type="date"
            name="receivedAt"
            defaultValue={today}
            max={today}
            required
          />
        </Forms.Label>

        {actionData?.errors?.receivedAt ? (
          <p className="formError">{actionData.errors.receivedAt}</p>
        ) : null}

        {actionData?.errors?.form ? (
          <p className="formError">{actionData.errors.form}</p>
        ) : null}

        <input type="hidden" name="intent" value="create" />

        <Forms.Buttons>
          <Forms.Submit>Add income</Forms.Submit>
        </Forms.Buttons>
      </Forms.Form>

      <section className={styles.historyPanel}>
        <div className={styles.historyHeader}>
          <div>
            <p className={styles.historyLabel}>Total income</p>
            <p className={styles.totalIncome}>
              {currencyFormatter.format(totalIncome)}
            </p>
          </div>

          <span className={styles.entryCount}>
            {incomeHistory.length}{" "}
            {incomeHistory.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        <div className={styles.historyDivider} />

        {incomeHistory.length === 0 ? (
          <p className={styles.emptyState}>No income entries yet.</p>
        ) : (
          <ul className={styles.historyList}>
            {incomeHistory.map((record) => (
              <li key={record.id} className={styles.historyItem}>
                <div>
                  <p className={styles.incomeAmount}>
                    {currencyFormatter.format(record.annualIncome)}
                  </p>

                  <p className={styles.incomeDate}>
                    {dateFormatter.format(new Date(record.effectiveFrom))}
                  </p>
                </div>

                <Forms.Form method="post" className={styles.deleteForm}>
                  <input type="hidden" name="intent" value="delete" />
                  <input
                    type="hidden"
                    name="incomeHistoryId"
                    value={record.id}
                  />

                  <button
                    type="submit"
                    className={styles.deleteButton}
                    onClick={(event) => {
                      if (
                        !window.confirm(
                          "Delete this income entry? This cannot be undone.",
                        )
                      ) {
                        event.preventDefault();
                      }
                    }}
                  >
                    Delete
                  </button>
                </Forms.Form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AuthenticatedMenu>
  );
}