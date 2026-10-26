/** Formats typed digits as HH:MM (24h), clamping hours to 23 and minutes to 59. */
export function maskTime24h(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length > 0 && Number(digits[0]) > 2) digits = `0${digits}`;
  digits = digits.slice(0, 4);

  let hours = digits.slice(0, 2);
  let minutes = digits.slice(2, 4);
  if (hours.length === 2 && Number(hours) > 23) hours = "23";
  if (minutes.length === 1 && Number(minutes) > 5) minutes = `0${minutes}`;

  if (digits.length <= 2) {
    return hours.length === 2 && raw.endsWith(":") ? `${hours}:` : hours;
  }
  return `${hours}:${minutes}`;
}
