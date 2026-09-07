import type { PropsWithChildren } from "react";
import { Form } from "@remix-run/react";

import styles from "./Menu.module.css";

type FormMenuItemProps = PropsWithChildren<{
  to: string;
  isCurrent?: boolean;
}>;

export function FormMenuItem({ to, children, isCurrent = false }: FormMenuItemProps) {
  return (
    <li className={styles.navListItem}>
      <Form method="post" action={to}>
        <button
          className={isCurrent ? styles.navButtonCurrent : styles.navButton}
        >
          {children}
        </button>
      </Form>
    </li>
  );
}