import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

type ExpensesPieChartProps = {
  data: { name: string; value: number; color: string }[];
};

export function ExpensesPieChart({ data }: ExpensesPieChartProps) {
  if (!data || data.length === 0) {
    return <p>No expenses yet.</p>;
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "40em",
        height: "28em",
        margin: "0 auto",
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius="80%"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}