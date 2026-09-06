/** Shared display formatting. Kept DOM-free so the tests can use the same functions the HUD does. */

export function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "--";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  return `${minutes}:${String(secs).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export function formatDelta(seconds) {
  if (!Number.isFinite(seconds)) return "--";
  const sign = seconds >= 0 ? "+" : "-";
  return `${sign}${Math.abs(seconds).toFixed(2)}`;
}

export function formatMoney(value) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}
