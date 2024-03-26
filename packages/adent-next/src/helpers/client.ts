/**
 * This is for converting dates to be used in an HTML input date field
 */
export function toInputDate(datetime?: string|number|Date) {
  const date = new Date(datetime || new Date);
  const format = {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0'),
    hour: String(date.getHours() % 12).padStart(2, '0'),
    min: String(date.getMinutes()).padStart(2, '0')
  };
  return [
    `${format.year}-${format.month}-${format.day}`,
    `${format.hour}:${format.min}`
  ].join('T');
};
