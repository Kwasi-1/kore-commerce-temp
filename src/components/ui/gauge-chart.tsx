import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

type GaugeSize = 'sm' | 'md' | 'lg';

interface Segment {
  value: number;
  color: string;
  name?: string;
  [key: string]: number | string | undefined;
}

interface GaugeChartProps {
  value: number;
  label?: string;
  units?: string;
  max?: number;
  min?: number;
  color?: string;
  size?: GaugeSize;
  showNeedle?: boolean;
  segments?: Segment[];
}

const sizeConfig: Record<GaugeSize, { height: number; outerRadius: number; innerRadius: number; fontSize: string; labelFontSize: string; }> = {
  sm: { height: 100, outerRadius: 40, innerRadius: 25, fontSize: '16px', labelFontSize: '12px' },
  md: { height: 200, outerRadius: 80, innerRadius: 50, fontSize: '24px', labelFontSize: '16px' },
  lg: { height: 300, outerRadius: 120, innerRadius: 75, fontSize: '32px', labelFontSize: '20px' },
};

const RADIAN = Math.PI / 180;

const renderNeedle = (value: number, max: number, color: string, cx: number, cy: number, iR: number, oR: number) => {
  const ang = 180.0 * (1 - value / max);
  const length = (iR + 2 * oR) / 3;
  const sin = Math.sin(-RADIAN * ang);
  const cos = Math.cos(-RADIAN * ang);
  const r = 5;
  const x0 = cx;
  const y0 = cy;
  const xba = x0 + r * sin;
  const yba = y0 - r * cos;
  const xbb = x0 - r * sin;
  const ybb = y0 + r * cos;
  const xp = x0 + length * cos;
  const yp = y0 + length * sin;

  return [
    <circle key="needle-circle" cx={x0} cy={y0} r={r} fill={color} stroke="none" />,
    <path key="needle-path" d={`M${xba},${yba}L${xbb},${ybb}L${xp},${yp}L${xba},${yba}`} stroke="#none" fill={color} />,
  ];
};

const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  label,
  units = '%',
  max = 100,
  min = 0,
  color = '#8884d8',
  size = 'md',
  showNeedle = true,
  segments,
}) => {
  const fallbackWidth = sizeConfig[size].height * 2;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(fallbackWidth);

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateWidth = () => {
      setContainerWidth(element.clientWidth || fallbackWidth);
    };

    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => updateWidth());
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [fallbackWidth]);

  const safeMax = Math.max(max, min + 1);
  const range = safeMax - min;
  const clampedValue = Math.min(Math.max(value, min), safeMax);
  const normalizedValue = clampedValue - min;

  const data = segments
    ? segments
    : [
        { value: normalizedValue, color: color },
        { value: range - normalizedValue, color: '#f0f0f0' },
      ];

  const { height, outerRadius, innerRadius, fontSize, labelFontSize } = sizeConfig[size];
  const chartWidth = containerWidth || fallbackWidth;
  const cx = chartWidth / 2;
  const cy = height * 0.8;
  const valueY = cy - outerRadius * 0.35;
  const labelY = cy + outerRadius * 0.35;

  return (
    <div ref={containerRef} className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            dataKey="value"
            startAngle={180}
            endAngle={0}
            data={data}
            cx="50%"
            cy="80%"
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            fill="#8884d8"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          {showNeedle && renderNeedle(normalizedValue, range, color, cx, cy, innerRadius, outerRadius)}
          <text x="50%" y={valueY} textAnchor="middle" dominantBaseline="middle" fontSize={fontSize}>
            {clampedValue}
            {units}
          </text>
          {label && (
            <text x="50%" y={labelY} textAnchor="middle" dominantBaseline="middle" fontSize={labelFontSize} fill="#666">
              {label}
            </text>
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export { GaugeChart };