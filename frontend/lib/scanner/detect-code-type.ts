// FR-H3: recognise what was scanned from its shape. Relative import keeps it
// runnable under plain Node for detect-code-type.check.ts.
import { ITEM_BARCODE_PATTERN, MEMBER_CODE_PATTERN } from "../../shared/constants.ts";
import type { ScanCodeType } from "../../shared/props/components.ts";

function isValidIsbn13(d: string) {
  if (!/^(978|979)\d{10}$/.test(d)) return false;
  const sum = [...d].reduce((acc, ch, i) => acc + Number(ch) * (i % 2 ? 3 : 1), 0);
  return sum % 10 === 0;
}

function isValidIsbn10(d: string) {
  if (!/^\d{9}[\dX]$/.test(d)) return false;
  const sum = [...d].reduce((acc, ch, i) => acc + (ch === "X" ? 10 : Number(ch)) * (10 - i), 0);
  return sum % 11 === 0;
}

/** Scanner wedges sometimes send lowercase or stray whitespace; normalise first. */
export function normalizeCode(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

export function detectCodeType(raw: string): ScanCodeType {
  const code = normalizeCode(raw);
  if (MEMBER_CODE_PATTERN.test(code)) return "MEMBER";
  if (ITEM_BARCODE_PATTERN.test(code)) return "ITEM";
  const digits = code.replace(/-/g, "");
  if (isValidIsbn13(digits) || isValidIsbn10(digits)) return "ISBN";
  return "UNKNOWN";
}
