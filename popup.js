const STORAGE_KEY = "hacktrack_events";
const TYPE_COLORS = {
  Hackathon: "#6c8cff",
  Competition: "#46d39a",
  Contest: "#ffce5a",
  Other: "#9aa3b2",
};

let currentFilter = "all";

const $ = (id) => document.getElementById(id);
const form = $("eventForm");
const list = $("eventList");
const emptyState = $("emptyState");

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadEvents() {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (res) => {
      resolve(Array.isArray(res[STORAGE_KEY]) ? res[STORAGE_KEY] : []);
    });
  });
}

function saveEvents(events) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: events }, () => {
      chrome.runtime.sendMessage({ type: "eventsChanged" });
      resolve();
    });
  });
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diff = Math.round((target - today) / 86400000);
  return diff;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function countdownText(diff) {
  if (diff > 0) {
    const cls = diff <= 3 ? "countdown-soon" : "countdown-days";
    return `<div class="event-countdown ${cls}">${diff} day${diff === 1 ? "" : "s"} left</div>`;
  }
  if (diff === 0) {
    return `<div class="event-countdown countdown-soon">Today!</div>`;
  }
  const past = Math.abs(diff);
  return `<div class="event-countdown countdown-over">${past} day${past === 1 ? "" : "s"} ago</div>`;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

async function render() {
  const events = await loadEvents();
  const sorted = events.slice().sort((a, b) => a.date.localeCompare(b.date));
  const diffs = Object.fromEntries(sorted.map((e) => [e.id, daysUntil(e.date)]));

  const filtered = sorted.filter((e) => {
    const d = diffs[e.id];
    if (currentFilter === "upcoming") return d >= 0;
    if (currentFilter === "past") return d < 0;
    return true;
  });

  list.innerHTML = "";
  emptyState.classList.toggle("hidden", filtered.length > 0);

  for (const e of filtered) {
    const d = diffs[e.id];
    let state = "upcoming";
    if (d < 0) state = "overdue";
    else if (d <= 3) state = "soon";

    const li = document.createElement("li");
    li.className = `event-card ${state}`;

    const typeColor = TYPE_COLORS[e.type] || TYPE_COLORS.Other;
    li.innerHTML = `
      <div class="event-top">
        <span class="event-name">${escapeHtml(e.name)}</span>
        <span class="event-type" style="color:${typeColor}">${escapeHtml(e.type)}</span>
      </div>
      <div class="event-date">${formatDate(e.date)}</div>
      ${countdownText(d)}
      ${e.notes ? `<div class="event-notes">${escapeHtml(e.notes)}</div>` : ""}
      <div class="event-actions">
        ${e.link ? `<a href="${escapeHtml(e.link)}" target="_blank" rel="noopener">Open</a>` : ""}
        <button data-edit="${e.id}">Edit</button>
        <button class="del" data-del="${e.id}">Delete</button>
      </div>
    `;
    list.appendChild(li);
  }
}

function startEdit(id) {
  loadEvents().then((events) => {
    const e = events.find((x) => x.id === id);
    if (!e) return;
    $("eventId").value = e.id;
    $("name").value = e.name;
    $("type").value = e.type;
    $("date").value = e.date;
    $("link").value = e.link || "";
    $("remindDays").value = e.remindDays ?? 1;
    $("notes").value = e.notes || "";
    $("saveBtn").textContent = "Save Changes";
    $("cancelEdit").hidden = false;
    $("name").focus();
  });
}

function resetForm() {
  form.reset();
  $("eventId").value = "";
  $("remindDays").value = 1;
  $("saveBtn").textContent = "Add Event";
  $("cancelEdit").hidden = true;
}

async function deleteEvent(id) {
  const events = await loadEvents();
  await saveEvents(events.filter((e) => e.id !== id));
  render();
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const id = $("eventId").value;
  const data = {
    name: $("name").value.trim(),
    type: $("type").value,
    date: $("date").value,
    link: $("link").value.trim(),
    remindDays: parseInt($("remindDays").value, 10) || 0,
    notes: $("notes").value.trim(),
  };
  if (!data.name || !data.date) return;

  const events = await loadEvents();
  if (id) {
    const idx = events.findIndex((e) => e.id === id);
    if (idx >= 0) events[idx] = { ...events[idx], ...data };
  } else {
    events.push({ id: uid(), createdAt: Date.now(), ...data });
  }
  await saveEvents(events);
  resetForm();
  render();
});

$("cancelEdit").addEventListener("click", resetForm);

list.addEventListener("click", (ev) => {
  const editId = ev.target.getAttribute("data-edit");
  const delId = ev.target.getAttribute("data-del");
  if (editId) startEdit(editId);
  if (delId) deleteEvent(delId);
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    currentFilter = chip.dataset.filter;
    render();
  });
});

$("exportBtn").addEventListener("click", async () => {
  const events = await loadEvents();
  const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hacktrack-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

$("importBtn").addEventListener("click", () => $("importFile").click());

$("importFile").addEventListener("change", async (ev) => {
  const file = ev.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    if (!Array.isArray(imported)) throw new Error("Invalid file");
    const existing = await loadEvents();
    const merged = existing.slice();
    for (const item of imported) {
      if (!item.id) item.id = uid();
      const idx = merged.findIndex((e) => e.id === item.id);
      if (idx >= 0) merged[idx] = item;
      else merged.push(item);
    }
    await saveEvents(merged);
    render();
  } catch (err) {
    alert("Import failed: invalid JSON file.");
  }
  ev.target.value = "";
});

render();
