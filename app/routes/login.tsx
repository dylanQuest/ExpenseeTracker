import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";

import { createUserSession, getUserId } from "~/session.server";
import { verifyLogin } from "~/models/user.server";
import { safeRedirect, validateEmail } from "~/utils";
import { UnauthenticatedMenu } from "~/Components/Menu";
import * as Forms from "~/Components/Form";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  if (userId) return redirect("/");
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const redirectTo = safeRedirect(formData.get("redirectTo"), "/");
  const remember = formData.get("remember");

  if (!validateEmail(email)) {
    return json(
      { errors: { email: "Email is invalid", password: null } },
      { status: 400 },
    );
  }

  if (typeof password !== "string" || password.length === 0) {
    return json(
      { errors: { email: null, password: "Password is required" } },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return json(
      { errors: { email: null, password: "Password is too short" } },
      { status: 400 },
    );
  }

  const user = await verifyLogin(email, password);

  if (!user) {
    return json(
      { errors: { email: "Invalid email or password", password: null } },
      { status: 400 },
    );
  }

  return createUserSession({
    request,
    userId: user.id,
    remember: remember === "on" ? true : false,
    redirectTo,
  });
}

export const meta: MetaFunction = () => [{ title: "Login" }];

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";
  const actionData = useActionData<typeof action>();

  return (
    <UnauthenticatedMenu current="login">
      <Forms.Form method="post">
        <Forms.Title>Log in</Forms.Title>
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <Forms.Label>
          <Forms.LabelSpan>Email</Forms.LabelSpan>
          <Forms.Input
            name="email"
            type="email"
            required
            autoComplete="email"
            aria-invalid={actionData?.errors?.email ? true : undefined}
            aria-describedby="email-error"
          />
        </Forms.Label>
        {actionData?.errors?.email ? (
          <p className="formError" id="email-error">
            {actionData.errors.email}
          </p>
        ) : null}

        <Forms.Label>
          <Forms.LabelSpan>Password</Forms.LabelSpan>
          <Forms.Input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            aria-invalid={actionData?.errors?.password ? true : undefined}
            aria-describedby="password-error"
          />
        </Forms.Label>
        {actionData?.errors?.password ? (
          <p className="formError" id="password-error">
            {actionData.errors.password}
          </p>
        ) : null}

        <Forms.Buttons>
          <Forms.Submit type="submit">Log in</Forms.Submit>
        </Forms.Buttons>

        <p>
          Don't have an account?{" "}
          <Link style={{ color: "white" }} to={{ pathname: "/join", search: searchParams.toString() }}>
            Create one
          </Link>
        </p>
      </Forms.Form>
    </UnauthenticatedMenu>
  );
}