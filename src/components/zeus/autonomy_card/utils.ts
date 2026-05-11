import { COLORS } from "./constants";

export function get_autonomy_color(value: number): string {
  if (value >= 4) return COLORS.EXCELLENT;
  if (value >= 3) return COLORS.GOOD;
  if (value >= 2.5) return COLORS.WARNING;
  return COLORS.CRITICAL;
}
