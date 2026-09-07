import { Link } from "@remix-run/react";
import { ComponentPropsWithoutRef } from "react";
import styles from "./Menu.module.css";

type LinkProps = ComponentPropsWithoutRef<typeof Link>;

interface MenuItemProps extends Pick<LinkProps, "to" | "children"> {
  isCurrent?: boolean;
}

export function MenuItem({ to, children, isCurrent = false }: MenuItemProps) {
  return (
    <li className={styles.navListItem}>
        <Link className={isCurrent ? styles.navLinkCurrent : styles.navLink} to={to}>
            {children}
        </Link>
    </li>
  );
}