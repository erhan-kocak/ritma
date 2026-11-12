import {
  addDays,
  formatDateLong,
  formatTime,
  getJson,
  isValidDate,
  providerPath,
  providerSlugFromUrl,
  todayInIstanbul,
} from "./api.js";

// Landing'deki takvim görselinin renk sınıfları; her hizmet sırayla bir renk alır.
const COLOR_CLASSES = ["c1", "c2", "c3"];

const $ = (id) => document.getElementById(id);
const state = { slug: null, date: null, colorByService: new Map() };

function showNotFound() {
  $("status").textContent = "Bu takvim bulunamadı.";
  $("status").hidden = false;
  $("calendar").hidden = true;
}

function appointmentItem(appointment, showDate = false) {
  const item = document.createElement("li");
  item.className = "slot";

  const appointmentDate = appointment.start.slice(0, 10);
  const isToday = appointmentDate === todayInIstanbul();

  const time = document.createElement("span");
  time.className = "time";
  time.textContent = formatTime(appointment.start);

  const body = document.createElement("div");
  const colorClass = state.colorByService.get(appointment.serviceId) ?? COLOR_CLASSES[0];
  body.className = `slot-body ${colorClass}${isToday ? " slot-today" : ""}`;

  const headerRow = document.createElement("div");
  headerRow.className = "slot-header-row";

  const name = document.createElement("strong");
  name.textContent = appointment.clientName;
  headerRow.append(name);

  if (isToday) {
    const todayBadge = document.createElement("span");
    todayBadge.className = "badge-today";
    todayBadge.textContent = "Bugün";
    headerRow.append(todayBadge);
  }

  const detail = document.createElement("span");
  const detailText = `${appointment.serviceName} · ${appointment.durationMinutes} dk`;
  detail.textContent = showDate ? `${detailText} · ${formatDateLong(appointmentDate)}` : detailText;

  body.append(headerRow, detail);
  item.append(time, body);
  return item;
}

async function showDate(date) {
  state.date = date;
  const isAll = date === null;

  const url = new URL(location.href);
  if (isAll) {
    url.searchParams.delete("date");
  } else {
    url.searchParams.set("date", date);
  }
  history.replaceState(null, "", url);

  $("date-label").textContent = isAll ? "Tüm Randevular" : formatDateLong(date);
  $("appointments").replaceChildren();
  $("list-status").textContent = "Randevular yükleniyor…";

  $("all-appointments").setAttribute("aria-pressed", isAll ? "true" : "false");
  $("today").setAttribute("aria-pressed", date === todayInIstanbul() ? "true" : "false");
  $("prev").hidden = isAll;
  $("next").hidden = isAll;

  try {
    const endpoint = isAll
      ? `${providerPath(state.slug)}/appointments`
      : `${providerPath(state.slug)}/appointments?date=${date}`;
    const { appointments } = await getJson(endpoint);
    if (state.date !== date) return;

    appointments.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

    $("list-status").textContent = appointments.length
      ? ""
      : (isAll ? "Henüz randevu bulunmuyor." : "Bu gün için randevu yok.");
    $("appointments").replaceChildren(...appointments.map((a) => appointmentItem(a, isAll)));
  } catch (error) {
    $("list-status").textContent = error.message;
  }
}

$("all-appointments").addEventListener("click", () => showDate(null));
$("today").addEventListener("click", () => showDate(todayInIstanbul()));
$("prev").addEventListener("click", () => showDate(addDays(state.date ?? todayInIstanbul(), -1)));
$("next").addEventListener("click", () => showDate(addDays(state.date ?? todayInIstanbul(), 1)));

async function init() {
  state.slug = providerSlugFromUrl();
  if (!state.slug) return showNotFound();
  try {
    const { provider, services } = await getJson(providerPath(state.slug));
    services.forEach((service, i) => state.colorByService.set(service.id, COLOR_CLASSES[i % COLOR_CLASSES.length]));
    document.title = `${provider.name} — Takvim — Ritma`;
    $("provider-name").textContent = provider.name;
    $("status").hidden = true;
    $("calendar").hidden = false;
  } catch (error) {
    if (error.status === 404) return showNotFound();
    $("status").textContent = error.message;
    return;
  }

  const requested = new URLSearchParams(location.search).get("date");
  if (requested === "all") {
    showDate(null);
  } else if (isValidDate(requested)) {
    showDate(requested);
  } else {
    showDate(null);
  }
}

init();
