// Date formatting utility to prevent UTC midnight date shift across timezones
export function formatAppointmentDate(dateVal, options = {}) {
  if (!dateVal) return '';

  const {
    showWeekday = true,
    showYear = true,
    locale = 'en-IN'
  } = options;

  let y, m, d;

  if (typeof dateVal === 'string') {
    const cleanStr = dateVal.split('T')[0];
    const parts = cleanStr.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      [y, m, d] = parts;
    }
  }

  let dateObj;
  if (y && m && d) {
    // Set midday (12:00 PM) to completely prevent timezone backwards offset
    dateObj = new Date(y, m - 1, d, 12, 0, 0);
  } else {
    dateObj = new Date(dateVal);
  }

  const formatOptions = {
    day: 'numeric',
    month: 'short',
    ...(showWeekday ? { weekday: 'short' } : {}),
    ...(showYear ? { year: 'numeric' } : {})
  };

  return dateObj.toLocaleDateString(locale, formatOptions);
}

export function isAppointmentToday(dateVal) {
  if (!dateVal) return false;
  const today = new Date();
  
  if (typeof dateVal === 'string') {
    const cleanStr = dateVal.split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    if (cleanStr === todayStr) return true;
  }

  const d = new Date(dateVal);
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
}
