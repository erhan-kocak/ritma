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

function appointmentItem(appointment) {
  const item = document.createElement("li");
  item.className = "slot";

  const time = document.createElement("span");
  time.className = "time";
  time.textContent = formatTime(appointment.start);

  const body = document.createElement("div");
  body.className = `slot-body ${state.colorByService.get(appointment.serviceId) ?? COLOR_CLASSES[0]}`;
  const name = document.createElement("strong");
  name.textContent = appointment.clientName;
  const detail = document.createElement("span");
  detail.textContent = `${appointment.serviceName} · ${appointment.durationMinutes} dk`;
  body.append(name, detail);

  item.append(time, body);
  return item;
}

async function showDate(date) {
  state.date = date;
  const url = new URL(location.href);
  url.searchParams.set("date", date);
  history.replaceState(null, "", url);

  $("date-label").textContent = formatDateLong(date);
  $("appointments").replaceChildren();
  $("list-status").textContent = "Randevular yükleniyor…";

  try {
    const { appointments } = await getJson(`${providerPath(state.slug)}/appointments?date=${date}`);
    if (state.date !== date) return;
    $("list-status").textContent = appointments.length ? "" : "Bu gün için randevu yok.";
    $("appointments").replaceChildren(...appointments.map(appointmentItem));
  } catch (error) {
    $("list-status").textContent = error.message;
  }
}

$("prev").addEventListener("click", () => showDate(addDays(state.date, -1)));
$("next").addEventListener("click", () => showDate(addDays(state.date, 1)));
$("today").addEventListener("click", () => showDate(todayInIstanbul()));

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
  showDate(isValidDate(requested) ? requested : todayInIstanbul());
}

init();
