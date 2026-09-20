import React, { useMemo } from "react";

// Standard GS1 Code 128 Patterns
const CODE128_PATTERNS = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
  "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
  "114131","311141","411131","211412","211214","211232","2331112"
];

// CODE 128C COMPRESSION (Pairs digits -> Cuts line density by 50%)
export function encodeCode128C(numericText) {
  const digits = String(numericText || "").replace(/\D/g, "");
  if (!digits) return "";

  // Pad to even number of digits for 128C pairs
  const cleanDigits = digits.length % 2 !== 0 ? "0" + digits : digits;

  let checksum = 105; // Start C
  let patternStr = CODE128_PATTERNS[105];

  let weight = 1;
  for (let i = 0; i < cleanDigits.length; i += 2) {
    const pairValue = parseInt(cleanDigits.substr(i, 2), 10);
    checksum += pairValue * weight;
    patternStr += CODE128_PATTERNS[pairValue];
    weight++;
  }

  const checkDigit = checksum % 103;
  patternStr += CODE128_PATTERNS[checkDigit];
  patternStr += CODE128_PATTERNS[106]; // Stop C
  return patternStr;
}

export function BarcodeSVG({ value, height = 34 }) {
  const pattern = useMemo(() => encodeCode128C(value || "2026000001"), [value]);
  
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