import type { ChangeEvent } from "react";
import styles from "./PeriodToggle.module.css";

type Period = "week" | "month" | "year" | "total";

const OPTIONS: { value: Period; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "total", label: "Total" },
];

type PeriodToggleProps = {
  name: string;
  value: Period;
};

export function PeriodToggle({ name, value }: PeriodToggleProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const form = event.currentTarget.form;
    if (!form) return;

    // Selecting a preset means "not custom" — clear any leftover
    // from/to text so it doesn't override the preset on submit.
    const fromInput = form.elements.namedItem("from") as HTMLInputElement | null;
    const toInput = form.elements.namedItem("to") as HTMLInputElement | null;
    if (fromInput) fromInput.value = "";
    if (toInput) toInput.value = "";

    form.requestSubmit();
  }

  return (
    <div className={styles.toggle}>
      {OPTIONS.map((option) => (
        <label key={option.value} className={styles.option}>
          <input
            type="radio"
            name={name}
            value={option.value}
            defaultChecked={value === option.value}
            onChange={handleChange}
            className={styles.input}
          />
          <span className={styles.label}>{option.label}</span>
        </label>
      ))}
    </div>
  );
}