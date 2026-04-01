import dayjs from "dayjs";

export function splitStudentNames(text: string) {
  return text
    .split(/\r?\n|,|，/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function sessionLabelNow() {
  const now = dayjs();
  const ap = now.hour() < 12 ? "上午" : "下午";
  return `${now.format("YYYY-MM-DD")}_${ap}`;
}

export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
