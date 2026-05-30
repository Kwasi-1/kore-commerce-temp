import * as React from "react"

type SegmentedBarSegment = {
  key: string
  value: number
  color?: string
  label?: string
}

interface SegmentedBarProps {
  segments: SegmentedBarSegment[]
  height?: number
  borderRadius?: number
  showLabels?: boolean
  className?: string
}

const fallbackColors = ["#0F766E", "#0EA5E9", "#F97316", "#14B8A6", "#C4B5FD"]

const SegmentedBar: React.FC<SegmentedBarProps> = ({
  segments,
  height = 10,
  borderRadius,
  showLabels = true,
  className,
}) => {
  const total = segments.reduce((sum, seg) => sum + (seg.value || 0), 0) || 1
  const computedRadius = borderRadius ?? height / 2
  const gap = 4
  const innerHeight = Math.max(2, height - gap)
  const segmentRadius = innerHeight / 2

  return (
    <div className={className}>
      <div
        className="w-full"
        style={{
          borderRadius: computedRadius,
          padding: gap / 2,
        }}
      >
        <div
          className="flex w-full"
          style={{
            gap,
            height: innerHeight,
          }}
        >
        {segments.map((segment, index) => {
          const widthPercent = ((segment.value || 0) / total) * 100
          const color = segment.color || fallbackColors[index % fallbackColors.length]

          return (
            <div
              key={segment.key}
              style={{
                width: `${widthPercent}%`,
                backgroundColor: color,
                borderRadius: segments.length === 1 ? computedRadius : segmentRadius,
              }}
              className="transition-[width] duration-150 ease-out"
              aria-label={segment.label || segment.key}
            />
          )
        })}
        </div>
      </div>

      {showLabels && (
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-600">
          {segments.map((segment, index) => {
            const color = segment.color || fallbackColors[index % fallbackColors.length]

            return (
              <div key={`${segment.key}-legend`} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span>{segment.label || segment.key}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SegmentedBar
