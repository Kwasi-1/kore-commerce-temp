import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Area,
} from "recharts"

interface LineSeries {
  dataKey: string
  name?: string
  color?: string
  strokeWidth?: number
  type?: "monotone" | "linear" | "basis"
  area?: boolean
}

interface LineChartProps<TData extends Record<string, unknown>> {
  data: TData[]
  xKey: keyof TData
  series: LineSeries[]
  height?: number
  grid?: boolean
}

export function LineChart<TData extends Record<string, unknown>>({
  data,
  xKey,
  series,
  height = 320,
  grid = true,
}: LineChartProps<TData>) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data}>
        {grid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
        <XAxis dataKey={xKey as string} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
        <YAxis tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
        <Tooltip />
        <Legend />
        {series.map((serie) =>
          serie.area ? (
            <Area
              key={serie.dataKey}
              type={serie.type ?? "monotone"}
              dataKey={serie.dataKey}
              name={serie.name}
              stroke={serie.color ?? "#0F766E"}
              fill={(serie.color ?? "#0F766E") + "33"}
              strokeWidth={serie.strokeWidth ?? 2}
            />
          ) : (
            <Line
              key={serie.dataKey}
              type={serie.type ?? "monotone"}
              dataKey={serie.dataKey}
              name={serie.name}
              stroke={serie.color ?? "#0F766E"}
              strokeWidth={serie.strokeWidth ?? 2}
              dot={false}
            />
          )
        )}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}
