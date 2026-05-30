import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts"

interface BarSeries {
  dataKey: string
  name?: string
  color?: string
  stackId?: string
}

interface BarChartProps<TData extends Record<string, unknown>> {
  data: TData[]
  xKey: keyof TData
  series: BarSeries[]
  height?: number
  grid?: boolean
}

export function BarChart<TData extends Record<string, unknown>>({
  data,
  xKey,
  series,
  height = 320,
  grid = true,
}: BarChartProps<TData>) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} barGap={8}>
        {grid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
        <XAxis dataKey={xKey as string} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
        <YAxis tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
        <Tooltip />
        <Legend />
        {series.map((serie) => (
          <Bar
            key={serie.dataKey}
            dataKey={serie.dataKey}
            name={serie?.name}
            stackId={serie.stackId}
            fill={serie.color ?? "#0F766E"}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
