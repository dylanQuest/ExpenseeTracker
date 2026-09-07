// ~/Components/Table.tsx
import { ComponentPropsWithoutRef, CSSProperties, PropsWithChildren } from "react";

import styles from "./Table.module.css";

export function Table({ children }: PropsWithChildren) {
  return <table className={styles.table}>{children}</table>;
}

export function Head({ children }: PropsWithChildren) {
  return <thead className={styles.head}>{children}</thead>;
}

export function Body({ children }: PropsWithChildren) {
  return <tbody className={styles.body}>{children}</tbody>;
}

export function Row({ children }: PropsWithChildren) {
  return <tr className={styles.row}>{children}</tr>;
}

export function HeaderCell({ children }: PropsWithChildren) {
  return <th className={styles.headerCell}>{children}</th>;
}

export function Cell(props: ComponentPropsWithoutRef<"td">) {
  return <td className={styles.cell} {...props} />;
}

type CellCategoryProps = {
  name: string;
  color: string;
};

export function CellCategory({ name, color }: CellCategoryProps) {
  return (
    <td className={styles.cell}>
      <span
        className={styles.categoryBubble}
        style={{ "--category-color": color } as CSSProperties}
      >
        {name}
      </span>
    </td>
  );
}