const pad = (n: number) => String(n).padStart(2, "0");

/** Value for `<input type="datetime-local">` in local time. */
export function toDateTimeLocal(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function fromDateTimeLocal(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("cs-CZ", { dateStyle: "long", timeStyle: "short" });
}
