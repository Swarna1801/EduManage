import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) { return twMerge(clsx(inputs)); }

export function getChatSeenStorageKey(role, schoolId, userId) {
  return `chat_seen_${role || "user"}_${schoolId || "school"}_${userId || "guest"}`;
}

export function readChatSeenMap(role, schoolId, userId) {
  if (typeof window === "undefined") return {};
  try {
    const rawValue = window.localStorage.getItem(getChatSeenStorageKey(role, schoolId, userId));
    const parsed = rawValue ? JSON.parse(rawValue) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function markChatThreadSeen(role, schoolId, userId, studentId, seenAt) {
  if (typeof window === "undefined" || !studentId || !seenAt) return;
  const currentMap = readChatSeenMap(role, schoolId, userId);
  const nextTimestamp = new Date(seenAt).getTime();
  if (!nextTimestamp) return;
  currentMap[String(studentId)] = nextTimestamp;
  window.localStorage.setItem(getChatSeenStorageKey(role, schoolId, userId), JSON.stringify(currentMap));
}

export function countUnreadChatThreads(threads, role, schoolId, userId) {
  const seenMap = readChatSeenMap(role, schoolId, userId);
  const oppositeRole = role === "teacher" ? "parent" : "teacher";
  return (Array.isArray(threads) ? threads : []).filter((thread) => {
    if (thread?.latest_sender_role !== oppositeRole || !thread?.latest_message_at) return false;
    const latestTimestamp = new Date(thread.latest_message_at).getTime();
    const seenTimestamp = Number(seenMap[String(thread.student_id)] || 0);
    return latestTimestamp > seenTimestamp;
  }).length;
}

export function isChatThreadUnread(thread, role, schoolId, userId) {
  return countUnreadChatThreads([thread], role, schoolId, userId) > 0;
}
