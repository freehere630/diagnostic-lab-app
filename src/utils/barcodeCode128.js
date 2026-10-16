// ─────────────────────────────────────────────────────────────
// Shared Code 128 encoder.
//
// Previously this logic lived in two places (barcode.jsx and
// printHelpers.js) with byte-identical tables and functions. Any
// fix had to be applied twice and could silently drift. This file
// is the single source of truth — both consumers import from here.
// ─────────────────────────────────────────────────────────────

// GS1 Code 128 patterns — 107 entries. Each character is encoded as
// a sequence of bar/space widths. Index 104 = Start B, 105 = Start C,
// 106 = Stop. Character values 0..102 cover the alphanumeric set.
export const CODE128_PATTERNS = [
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

// Code 128C — packs pairs of digits into single code points. Used
// for pure-numeric content (our 10-digit YYMM###### barcodes, patient
// UHIDs, RCP receipt numbers). Half the bars of Code 128B.
export function encodeCode128C(numericText) {
  const digits = String(numericText || "").replace(/\D/g, "");
  if (!digits) return "";
  const cleanDigits = digits.length % 2 !== 0 ? "0" + digits : digits;

  let checksum = 105;
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
  patternStr += CODE128_PATTERNS[106];
  return patternStr;
}

// Code 128B — full alphanumeric (ASCII 32..127). Used for values
// like "P-1001" or "ORD-261016-0001" that aren't pure digits.
// Characters outside the supported range are silently skipped.
export function encodeCode128B(text) {
  const str = String(text || "");
  if (!str) return "";

  let checksum = 104;
  let patternStr = CODE128_PATTERNS[104];
  let weight = 1;

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 32;
    if (code < 0 || code > 94) continue;
    checksum += code * weight;
    patternStr += CODE128_PATTERNS[code];
    weight++;
  }

  const checkDigit = checksum % 103;
  patternStr += CODE128_PATTERNS[checkDigit];
  patternStr += CODE128_PATTERNS[106];
  return patternStr;
}

// Auto-select the most efficient encoding for the given content.
// Pure digits → 128C (compact). Anything else → 128B (alphanumeric).
export function encodeCode128Auto(text) {
  const clean = String(text || "").trim();
  if (!clean) return "";
  return /^\d+$/.test(clean) ? encodeCode128C(clean) : encodeCode128B(clean);
}