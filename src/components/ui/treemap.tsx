
import React from 'react';
import { ResponsiveContainer, Treemap as RechartsTreemap, Tooltip } from 'recharts';

// Define a color palette, you can customize this
const COLORS = ['#8889DD', '#9597E4', '#8DC77B', '#A5D297', '#E2CF45', '#F8C12D'];

export interface TreemapNode {
  name: string;
  size?: number;
  children?: TreemapNode[];
  [key: string]: unknown;
}

interface TreemapProps {
  data: TreemapNode[];
  width?: number;
  height?: number;
  dataKey?: string;
  aspectRatio?: number;
  content?: React.ReactElement;
  isAnimationActive?: boolean;
  animationBegin?: number;
  animationDuration?: number;
  animationEasing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  onAnimationEnd?: () => void;
  onAnimationStart?: () => void;
  variant?: 'default' | 'neutral';
}

const CustomizedContent: React.FC<any> = (props) => {
  const { depth, x, y, width, height, index, name, variant } = props;

  const isNeutral = variant === 'neutral';

  const fillColor = isNeutral ? '#fff' : COLORS[index % COLORS.length];
  const textColor = isNeutral ? 'hsl(var(--foreground))' : '#fff';
  const strokeColor = isNeutral ? 'hsl(var(--foreground))' : '#fff';

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth: 2 / (depth + 1e-10),
          strokeOpacity: 1 / (depth + 1e-10),
        }}
      />
      {
        width > 80 && height > 25 &&
        <text x={x + width / 2} y={y + height / 2 + 7} textAnchor="middle" fill={textColor} fontSize={14}>
          {name}
        </text>
      }
    </g>
  );
};

const Treemap: React.FC<TreemapProps> = ({
  data,
  width = 500,
  height = 500,
  dataKey = 'size',
  aspectRatio = 4 / 3,
  isAnimationActive = true,
  animationDuration = 500,
  variant = 'default',
  ...rest
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsTreemap
        width={width}
        height={height}
        data={data}
        dataKey={dataKey}
        aspectRatio={aspectRatio}
        isAnimationActive={isAnimationActive}
        animationDuration={animationDuration}
        content={<CustomizedContent variant={variant} />}
        {...rest}
      >
        <Tooltip />
      </RechartsTreemap>
    </ResponsiveContainer>
  );
};

export { Treemap };
