/** Display formatting for resume dates ("YYYY", "YYYY-MM" or "present"). */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(value: string): string {
  if (value === "present") return "Present";
  const [year, month] = value.split("-");
  if (month === undefined) return value;
  const name = MONTHS[Number(month) - 1];
  if (name === undefined) throw new RangeError(`no month ${month} in "${value}"`);
  return `${name} ${year}`;
}

export function formatRange(start: string, end: string): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}
