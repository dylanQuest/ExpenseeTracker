import styles from "./Balance.module.css";

type BalanceProps = {
  defaultValue?: number | null;
  label?: string;
};

export function Balance({ defaultValue, label = "Balance" }: BalanceProps) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  });

  return (
    <section className={styles.wrapper}>
      <h2 className={styles.heading}>{label}</h2>
      <p className={styles.amount}>{formatter.format(defaultValue ?? 0)}</p>
    </section>
  );
}