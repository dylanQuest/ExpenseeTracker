import { PropsWithChildren } from "react";

import styles from "./Grid.module.css";

export function Grid({ children }: PropsWithChildren) {
  return <div className={styles.grid}>{children}</div>;
}

export function GridItem({ children }: PropsWithChildren) {
  return <div className={styles.gridItem}>{children}</div>;
}