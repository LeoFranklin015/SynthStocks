"use client"

import { useMemo } from "react"

type SparklineProps = {
  data: number[]
  width?: number
  height?: number
  positive: boolean
  className?: string
}

export function Sparkline({
  data,
  width = 200,
  height = 60,
  positive,
  className = "",
}: SparklineProps) {
  const { path, areaPath } = useMemo(() => {
    if (!data.length) return { path: "", areaPath: "" }
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const padding = 4
    const w = width - padding * 2
    const h = height - padding * 2
    const stepX = w / (data.length - 1) || 0

    const points = data.map((v, i) => {
      const x = padding + i * stepX
      const y = padding + h - ((v - min) / range) * h
      return [x, y] as const
    })

    const linePath = points
      .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
      .join(" ")

    const lastX = points[points.length - 1][0]
    const lastY = points[points.length - 1][1]
    const areaPathD = `M ${points[0][0]} ${points[0][1]} ${points
      .slice(1)
      .map(([x, y]) => `L ${x} ${y}`)
      .join(" ")} L ${lastX} ${height - padding} L ${padding} ${height - padding} Z`

    return { path: linePath, areaPath: areaPathD }
  }, [data, width, height])

  const color = positive ? "#22c55e" : "#ef4444"

  return (
    <svg
      width={width}
      height={height}
      className={className}
      preserveAspectRatio="none"
      style={{ overflow: "visible" }}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient
          id={`gradient-${positive ? "up" : "down"}-${width}`}
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#gradient-${positive ? "up" : "down"}-${width})`}
        className="transition-opacity duration-500"
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="transition-all duration-500"
      />
    </svg>
  )
}
