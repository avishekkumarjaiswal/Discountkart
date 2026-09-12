/**
 * Utility functions for shop opening and closing hours calculations.
 */

export interface ShopHoursStatus {
  isOpen: boolean;
  isClosingSoon: boolean;
  badgeText: string;
  timeText: string;
  formattedRange: string;
  openingTimeFormatted: string;
  closingTimeFormatted: string;
}

/**
 * Parses time string (e.g., "09:00", "21:30", "9:00 AM", "9 PM") to minutes from midnight.
 */
export function parseTimeToMinutes(timeStr?: string, defaultMinutes = 0): number {
  if (!timeStr) return defaultMinutes;

  const trimmed = timeStr.trim().toUpperCase();
  const isPM = trimmed.includes('PM');
  const isAM = trimmed.includes('AM');
  const cleanStr = trimmed.replace(/(AM|PM)/g, '').trim();

  const parts = cleanStr.split(':');
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] ? parseInt(parts[1], 10) : 0;

  if (isNaN(hours)) return defaultMinutes;
  if (isNaN(minutes)) return defaultMinutes;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Formats time from minutes or "HH:MM" string to 12-hour string (e.g., "9:00 AM", "9:30 PM").
 */
export function formatTime12h(timeStr?: string, defaultFallback = "9:00 AM"): string {
  if (!timeStr) return defaultFallback;

  const totalMinutes = parseTimeToMinutes(timeStr);
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;

  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;

  return `${hours12}:${minutesStr} ${period}`;
}

/**
 * Evaluates whether a shop is currently open based on its opening & closing time.
 */
export function getShopHoursStatus(
  openingTimeStr?: string,
  closingTimeStr?: string
): ShopHoursStatus {
  // Default store hours: 09:00 AM to 09:00 PM if unconfigured
  const openTimeStr = openingTimeStr || "09:00";
  const closeTimeStr = closingTimeStr || "21:00";

  const openMinutes = parseTimeToMinutes(openTimeStr, 9 * 60); // 9:00 AM
  const closeMinutes = parseTimeToMinutes(closeTimeStr, 21 * 60); // 9:00 PM

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const openingFormatted = formatTime12h(openTimeStr, "9:00 AM");
  const closingFormatted = formatTime12h(closeTimeStr, "9:00 PM");
  const formattedRange = `${openingFormatted} - ${closingFormatted}`;

  let isOpen = false;
  let isClosingSoon = false;

  // Handle overnight hours (e.g., 6 PM to 2 AM) vs standard hours (e.g., 9 AM to 9 PM)
  if (closeMinutes > openMinutes) {
    isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    if (isOpen && (closeMinutes - currentMinutes) <= 45) {
      isClosingSoon = true;
    }
  } else {
    // Overnight case
    isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
    if (isOpen) {
      const remaining = currentMinutes >= openMinutes
        ? (24 * 60 - currentMinutes) + closeMinutes
        : (closeMinutes - currentMinutes);
      if (remaining <= 45) {
        isClosingSoon = true;
      }
    }
  }

  let badgeText = "Closed";
  let timeText = `Opens at ${openingFormatted}`;

  if (isOpen) {
    if (isClosingSoon) {
      badgeText = "Closing Soon";
      timeText = `Closes at ${closingFormatted}`;
    } else {
      badgeText = "Open Now";
      timeText = `Closes at ${closingFormatted}`;
    }
  }

  return {
    isOpen,
    isClosingSoon,
    badgeText,
    timeText,
    formattedRange,
    openingTimeFormatted: openingFormatted,
    closingTimeFormatted: closingFormatted
  };
}
