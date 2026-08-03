export function get_initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function get_skill_color(level: 'basic' | 'intermediate' | 'advanced', value: number): string {
  // Heatmap logic: more intense color for higher values
  const opacity = Math.max(0.2, value / 100);
  
  if (level === 'basic') return `rgba(34, 197, 94, ${opacity})`; // Green-500
  if (level === 'intermediate') return `rgba(250, 204, 21, ${opacity})`; // Yellow-400
  return `rgba(29, 78, 216, ${opacity})`; // Blue-700
}
