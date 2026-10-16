import React, { useMemo } from "react";
import { encodeCode128Auto } from "./barcodeCode128";

// Legacy named export kept for any callers that still import it.
// New code should import directly from barcodeCode128.js.
export { encodeCode128C, encodeCode128B, encodeCode128Auto } from "./barcodeCode128";

export function BarcodeSVG({ value, height = 34 }) {
  const pattern = useMemo(
    () => encodeCode128Auto(value || "2026000001"),
    [value]
  );

  const quietZone = 8;
  let x = quietZone;
  const rects = [];
  const moduleWidth = 1.8; // Wide, spacious bars (NOT DENSE!)

  for (let i = 0; i < pattern.length; i++) {
    const w = parseInt(pattern[i], 10) * moduleWidth;
    if (i % 2 === 0) {
      rects.push(
        <rect
          key={i}
          x={x.toFixed(1)}
          y="0"
          width={w.toFixed(1)}
          height={height}
          fill="#000000"
          shapeRendering="crispEdges"
        />
      );
    }
    x += w;
  }
  x += quietZone;

  return (
    <svg
      className="w-full"
      style={{ height: `${height}px` }}
      viewBox={`0 0 ${x.toFixed(1)} ${height}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
    >
      <rect width="100%" height="100%" fill="#ffffff" />
      {rects}
    </svg>
  );
}