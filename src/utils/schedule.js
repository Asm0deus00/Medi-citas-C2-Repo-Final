const { SLOT_MINUTES } = require('../config/constants');

function timeToMinutes(timeText) {
  const [hours, minutes] = String(timeText).split(':');
  return Number(hours) * 60 + Number(minutes);
}

function formatMinutes(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function rangesOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  return firstStart < secondEnd && firstEnd > secondStart;
}

function isFutureLocalTime(dateText, minuteOfDay, utcOffset, now = Date.now()) {
  const slotInstant = new Date(`${dateText}T${formatMinutes(minuteOfDay)}:00${utcOffset}`);
  return slotInstant.getTime() > now;
}

function buildFreeSlots({ date, workingBlocks, busyRanges, utcOffset, now = Date.now() }) {
  const slots = [];
  for (const block of workingBlocks) {
    const blockEnd = timeToMinutes(block.end_time);
    for (
      let slotStart = timeToMinutes(block.start_time);
      slotStart + SLOT_MINUTES <= blockEnd;
      slotStart += SLOT_MINUTES
    ) {
      const isBusy = busyRanges.some((busy) =>
        rangesOverlap(
          slotStart,
          slotStart + SLOT_MINUTES,
          busy.startMinute,
          busy.startMinute + busy.durationMinutes
        )
      );
      if (!isBusy && isFutureLocalTime(date, slotStart, utcOffset, now)) {
        slots.push({
          starts_at: `${date}T${formatMinutes(slotStart)}:00`,
          duration_minutes: SLOT_MINUTES
        });
      }
    }
  }
  return slots;
}

module.exports = { timeToMinutes, formatMinutes, buildFreeSlots };
