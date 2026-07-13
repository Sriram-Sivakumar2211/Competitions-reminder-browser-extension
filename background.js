const STORAGE_KEY = "hacktrack_events";

function loadEvents() {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (res) => {
      resolve(Array.isArray(res[STORAGE_KEY]) ? res[STORAGE_KEY] : []);
    });
  });
}

function reminderTimestamp(dateStr, remindDays) {
  const target = new Date(dateStr + "T09:00:00");
  return target.getTime() - (remindDays || 0) * 86400000;
}

async function rescheduleAlarms() {
  const events = await loadEvents();
  const existing = await chrome.alarms.getAll();
  const validIds = new Set();

  for (const e of events) {
    const when = reminderTimestamp(e.date, e.remindDays);
    if (when > Date.now()) {
      validIds.add(e.id);
      chrome.alarms.create(`reminder-${e.id}`, { when });
    }
  }

  for (const alarm of existing) {
    if (alarm.name.startsWith("reminder-")) {
      const id = alarm.name.replace("reminder-", "");
      if (!validIds.has(id)) chrome.alarms.clear(alarm.name);
    }
  }
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target - today) / 86400000);
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith("reminder-")) return;
  const id = alarm.name.replace("reminder-", "");
  const events = await loadEvents();
  const e = events.find((x) => x.id === id);
  if (!e) return;

  const d = daysUntil(e.date);
  let body;
  if (d > 0) body = `${d} day${d === 1 ? "" : "s"} left until ${e.type}.`;
  else if (d === 0) body = `Happening today!`;
  else body = `This was ${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"} ago.`;

  chrome.notifications.create(`notif-${id}-${Date.now()}`, {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: `Reminder: ${e.name}`,
    message: body,
    priority: 2,
  });

  chrome.alarms.clear(alarm.name);
});

chrome.runtime.onInstalled.addListener(rescheduleAlarms);
chrome.runtime.onStartup.addListener(rescheduleAlarms);

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "eventsChanged") rescheduleAlarms();
});
