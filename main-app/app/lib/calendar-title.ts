export function calendarEventTitle(place: string, work: string) {
  return `${place}【${work}】`;
}

export function calendarRecordStatus(workDate: string, currentDate: string) {
  return workDate > currentDate ? "予定" : "実績";
}
