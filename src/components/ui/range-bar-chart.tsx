import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"

interface RangeSegment {
  dataKey: string
  name?: string
  color?: string
}

interface RangeBarChartProps<TData extends Record<string, unknown>> {
  data: TData[]
  xKey: keyof TData
  offsetKey: keyof TData
  segments: RangeSegment[]
  height?: number
  grid?: boolean
  barSize?: number
}

export function RangeBarChart<TData extends Record<string, unknown>>({
  data,
  xKey,
  offsetKey,
  segments,
  height = 280,
  grid = true,
  barSize = 20,
}: RangeBarChartProps<TData>) {
  const stackId = "range"

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} layout="vertical" margin={{ left: 20 }}>
        {grid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
        <XAxis type="number" tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
        <YAxis
          type="category"
          dataKey={xKey as string}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
          width={90}
        />
        <Tooltip />
        <Bar dataKey={offsetKey as string} stackId={stackId} fill="transparent" />
        {segments.map((segment) => (
          <Bar
            key={segment.dataKey}
            dataKey={segment.dataKey}
            name={segment.name}
            stackId={stackId}
            fill={segment.color ?? "#0F766E"}
            barSize={barSize}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
