import styles from "./IncomeSelector.module.css";
import * as Forms from "./Form";

type IncomeSelectorProps = {
  name: string;           // so formData.get(name) picks it up on submit
  defaultValue?: number | string | null;  // prefill from loader data
  required?: boolean;
};

export function IncomeSelector({ name, defaultValue, required }: IncomeSelectorProps) {
  return (
    <section className={styles.wrapper}>
      <h2 className={styles.heading}>Income</h2>
      <Forms.Input
        type="number"
        name={name}
        min={0.00}
        className={styles.amount}
        placeholder="0.00"
        defaultValue={defaultValue ?? 0.00}
        step="1"
        required={required}
      />
    </section>
  );
}