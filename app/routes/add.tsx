import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { AuthenticatedMenu } from "~/Components/Menu";
import * as Forms from "~/Components/Form";
import { IncomeSelector } from "~/Components/IncomeSelector";
import { getUserById, updateUser } from "~/models/user.server";
import { createExpense, getExpenses, getExpensesByCategory } from "~/models/expenses.server";
import { createCategory, getCategories } from "~/models/category.server";
import { prisma } from "~/db.server";


export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  // TODO: fetch income data for this user
  const user = await getUserById(userId);
  //const expenses = await getExpenses({ userId }); 
  const categories = await getCategories({ userId });///LOOOOK AT THISSSSSSSSSSSSSSSSSSSSSS
  return json({ user: user, categories: categories });
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const mode = formData.get("categoryMode");

  // TODO: read fields, validate, save
  if(mode?.valueOf() === "existing") {
    const categoryId = formData.get("categoryId");
    const description = formData.get("description");
    const amount = formData.get("amount");

    if (typeof amount !== "string" || parseFloat(amount) <= 0) {
      return json(
        { errors: { amount: "Amount must be a positive number" } },
        { status: 400 },
      );
    }
    
    await createExpense({
      item: description as string,
      value: parseFloat(amount),
      categoryId: categoryId as string,
      userId: userId,
    });
    return redirect("/expenses");
    
  }

  else if(mode?.valueOf() === "new") {
    const newCategoryName = formData.get("newCategoryName");
    const newCategoryColor = formData.get("newCategoryColor");
    const description = formData.get("description");
    const amount = formData.get("amount");

    if (typeof amount !== "string" || parseFloat(amount) <= 0) {
      return json(
        { errors: { amount: "Amount must be a positive number" } },
        { status: 400 },
      );
    }

    const newCategory = await createCategory({
      name: newCategoryName as string,
      color: newCategoryColor as string,
      userId: userId,
    });
    
    await createExpense({
      item: description as string,
      value: parseFloat(amount),
      categoryId: newCategory.id,
      userId: userId,
    });
    return redirect("/expenses");
  }

  return json({ errors: null });
}

export const meta: MetaFunction = () => [{ title: "Income" }];

export default function addPage() {
  const { categories } = useLoaderData<typeof loader>();

  return (
      <Forms.Form method="post">
          <Forms.Title>Add Expense</Forms.Title>

          <Forms.Label>
              <Forms.LabelSpan>Description</Forms.LabelSpan>
              <Forms.Input name="description" type="text" required />
          </Forms.Label>
          <Forms.Label>
              <Forms.LabelSpan>Amount</Forms.LabelSpan>
              <Forms.Input name="amount" type="number" required />
          </Forms.Label>

          <Forms.Label>
            <Forms.LabelSpan>Category</Forms.LabelSpan>
            <Forms.OptionGroup>
              <Forms.Option type="radio" name="categoryMode" id="existing" value="existing" defaultChecked />
                <Forms.OptionName htmlFor="existing">Select existing category</Forms.OptionName>
                <Forms.OptionContent>
                  <Forms.Select name="categoryId">
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Forms.Select>
                </Forms.OptionContent>
              </Forms.OptionGroup>
              <Forms.OptionGroup>
                  <Forms.Option type="radio" name="categoryMode" id="new" value="new" />
                    <Forms.OptionName htmlFor="new">Create new category</Forms.OptionName>
                    <Forms.OptionContent>
                        <Forms.Input name="newCategoryName" placeholder="Category name" />
                        <input type="color" name="newCategoryColor" />
                    </Forms.OptionContent>
              </Forms.OptionGroup>
          </Forms.Label>

          <Forms.Buttons>
            <Forms.CancelLink to="/expenses">Cancel</Forms.CancelLink>
            <Forms.Submit>Add</Forms.Submit>
          </Forms.Buttons>
      </Forms.Form>
  );
}