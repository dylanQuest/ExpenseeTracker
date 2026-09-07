import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SpendOverTimeChartProps = {
  data: {
    label?: string;
    month?: string;
    total: number;
  }[];
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function SpendOverTimeChart({ data }: SpendOverTimeChartProps) {
  if (!data || data.length === 0) {
    return <p>No expenses for this period yet.</p>;
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "50em",
        height: "20em",
        margin: "2em auto 0",
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 16,
            right: 16,
            bottom: 8,
            left: 16,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255, 255, 255, 0.18)"
            vertical={false}
          />

          <XAxis
            dataKey={(entry) => entry.label ?? entry.month ?? ""}
            stroke="white"
            tick={{ fill: "white", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            stroke="white"
            tick={{ fill: "white", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={70}
            tickFormatter={(value) => currencyFormatter.format(Number(value))}
          />

          <Tooltip
            cursor={{ fill: "rgba(255, 255, 255, 0.08)" }}
            formatter={(value) =>
              currencyFormatter.format(Number(value ?? 0))
            }
            labelStyle={{ color: "#111" }}
            contentStyle={{
              border: "none",
              borderRadius: "0.5rem",
              backgroundColor: "white",
            }}
          />

          <Bar
            dataKey="total"
            name="Expenses"
            fill="#ff9b8a"
            radius={[6, 6, 0, 0]}
            minPointSize={3}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
