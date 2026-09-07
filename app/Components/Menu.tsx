import { MenuItem } from "./MenuItem";
import styles from "./Menu.module.css";
import { PropsWithChildren } from "react";
import { FormMenuItem } from "./FormMenuItem";

type MenuProps = PropsWithChildren<{
  current?: string;
  listClassName?: string;
}>;

function Menu({ children, listClassName }: MenuProps) {
  return (
    <nav className={styles.nav}>
      <ul className={`${styles.navList} ${listClassName ?? ""}`}>
        {children}
      </ul>
    </nav>
  );
}

export function UnauthenticatedMenu({
  current = "",
  children,
}: MenuProps) {
  return (
    <div>
      <Menu listClassName={styles.navListUnauthenticated}>
        <MenuItem to="/" isCurrent={current === ""}>
          Welcome
        </MenuItem>

        <MenuItem to="/login" isCurrent={current === "login"}>
          Login
        </MenuItem>

        <MenuItem to="/join" isCurrent={current === "join"}>
          Join
        </MenuItem>
      </Menu>

      {children}
    </div>
  );
}


export function AuthenticatedMenu({current = "",children }: MenuProps) {
  return (
    <div>
        <Menu>
            <MenuItem to="/" isCurrent={current === "dashboard"}>
                Dashboard
            </MenuItem>
            <MenuItem to="/income" isCurrent={current === "income"}>
                Income
            </MenuItem>
            <MenuItem to="/expenses" isCurrent={current === "expenses"}>
                Expenses
            </MenuItem>
            <FormMenuItem to="/logout">
                Logout
            </FormMenuItem>
        </Menu>
        {children}
    </div>
  );
}