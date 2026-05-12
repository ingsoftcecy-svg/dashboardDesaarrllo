export function get_initials(name: string): string {
  const parts = name.split(" ");
  const first_initial = parts[0]?.[0] || "";
  const second_initial = parts[1]?.[0] || "";
  return `${first_initial}${second_initial}`;
}

export function get_capability_color(value: number): string {
  const rounded = Math.round(value);
  if (rounded >= 90) {
    return "bg-green-500 text-white";
  }
  if (rounded >= 70) {
    return "bg-green-400 text-slate-800";
  }
  if (rounded >= 50) {
    return "bg-yellow-400 text-slate-800";
  }
  if (rounded >= 30) {
    return "bg-orange-500 text-white";
  }
  return "bg-red-500 text-white";
}

export function normalize_string(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function is_assessment_expired(last_assessment_date?: string): boolean {
  if (!last_assessment_date) {
    return false;
  }
  const assessment = new Date(last_assessment_date);
  const now = new Date();
  const two_months_ago = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
  
  if (assessment < two_months_ago) {
    return true;
  }
  return false;
}
