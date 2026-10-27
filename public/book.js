import {
  addDays,
  formatDateLong,
  formatDayShort,
  formatTime,
  getJson,
  postJson,
  providerPath,
  providerSlugFromUrl,
  todayInIstanbul,
} from "./api.js";

const BOOKING_WINDOW_DAYS = 14;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const $ = (id) => document.getElementById(id);
const form = $("booking-form");

const state = { slug: null, services: [], service: null, date: null, slot: null };

const rules = {
  clientName: (value) => (value ? "" : "Lütfen adınızı ve soyadınızı yazın."),
  clientEmail: (value) => {
    if (!value) return "Lütfen e-posta adresinizi yazın.";
    return EMAIL_PATTERN.test(value) ? "" : "Geçerli bir e-posta adresi yazın.";
  },
};

function choiceButton(className, pressed, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.setAttribute("aria-pressed", String(pressed));
  button.addEventListener("click", onClick);
  return button;
}

function showNotFound() {
  $("status").textContent = "Bu randevu sayfası bulunamadı.";
  $("status").hidden = false;
  $("booking").hidden = true;
}

function renderServices() {
  $("services").replaceChildren(
    ...state.services.map((service) => {
      const button = choiceButton("choice", service === state.service, () => selectService(service));
      const name = document.createElement("strong");
      name.textContent = service.name;
      const duration = document.createElement("span");
      duration.className = "muted";
      duration.textContent = `${service.durationMinutes} dk`;
      button.append(name, duration);
      return button;
    }),
  );
}

function renderDays() {
  const today = todayInIstanbul();
  const days = Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => addDays(today, i));
  $("days").replaceChildren(
    ...days.map((date) => {
      const { weekday, day } = formatDayShort(date);
      const button = choiceButton("day", date === state.date, () => selectDate(date));
      button.setAttribute("aria-label", formatDateLong(date));
      const weekdayEl = document.createElement("span");
      weekdayEl.textContent = weekday;
      const dayEl = document.createElement("strong");
      dayEl.textContent = day;
      button.append(weekdayEl, dayEl);
      return button;
    }),
  );
}

function renderSlots(slots) {
  $("slots-status").textContent = slots.length ? "" : "Bu gün için boş saat yok.";
  $("slots").replaceChildren(
    ...slots.map((slot) => {
      const button = choiceButton("time-choice", slot === state.slot, () => selectSlot(slot));
      button.textContent = formatTime(slot);
      return button;
    }),
  );
}

async function loadSlots() {
  const { slug, service, date } = state;
  $("slots").replaceChildren();
  $("slots-status").textContent = "Saatler yükleniyor…";
  try {
    const { slots } = await getJson(
      `${providerPath(slug)}/slots?serviceId=${encodeURIComponent(service.id)}&date=${date}`,
    );
    // Bu arada başka bir gün ya da hizmet seçildiyse eski yanıtı gösterme.
    if (state.service !== service || state.date !== date) return;
    renderSlots(slots);
  } catch (error) {
    $("slots-status").textContent = error.message;
  }
}

function hideDetails() {
  state.slot = null;
  $("step-details").hidden = true;
}

function selectService(service) {
  state.service = service;
  state.date ??= todayInIstanbul();
  hideDetails();
  $("slots-alert").hidden = true;
  renderServices();
  renderDays();
  $("step-time").hidden = false;
  loadSlots();
}

function selectDate(date) {
  state.date = date;
  hideDetails();
  $("slots-alert").hidden = true;
  renderDays();
  loadSlots();
}

function selectSlot(slot) {
  state.slot = slot;
  for (const button of $("slots").children) {
    button.setAttribute("aria-pressed", String(button.textContent === formatTime(slot)));
  }
  $("summary").textContent = `${state.service.name} · ${formatDateLong(slot)} · ${formatTime(slot)}`;
  $("form-error").textContent = "";
  $("step-details").hidden = false;
  $("step-details").scrollIntoView({ behavior: "smooth", block: "start" });
}

function showError(fieldName, message) {
  const input = form.elements[fieldName];
  input.closest(".field").classList.toggle("is-invalid", Boolean(message));
  input.setAttribute("aria-invalid", message ? "true" : "false");
  $(`${fieldName}-error`).textContent = message;
}

async function handleSlotTaken() {
  hideDetails();
  const alert = $("slots-alert");
  alert.textContent = "Bu saat az önce doldu, lütfen başka bir saat seçin.";
  alert.hidden = false;
  await loadSlots();
  $("step-time").scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  $("form-error").textContent = "";

  const data = {};
  let firstInvalid = null;
  for (const [fieldName, validate] of Object.entries(rules)) {
    const value = form.elements[fieldName].value.trim();
    const message = validate(value);
    showError(fieldName, message);
    data[fieldName] = value;
    if (message && !firstInvalid) firstInvalid = form.elements[fieldName];
  }
  if (firstInvalid) {
    firstInvalid.focus();
    return;
  }

  const submit = form.querySelector("button[type=submit]");
  submit.disabled = true;
  try {
    const { appointment } = await postJson(`${providerPath(state.slug)}/appointments`, {
      serviceId: state.service.id,
      start: state.slot,
      ...data,
    });
    $("success-detail").textContent =
      `${state.service.name} · ${formatDateLong(appointment.start)} · ${formatTime(appointment.start)}`;
    $("booking").hidden = true;
    $("success").hidden = false;
    window.scrollTo({ top: 0 });
  } catch (error) {
    if (error.code === "slot_taken") {
      await handleSlotTaken();
    } else {
      $("form-error").textContent = error.message;
    }
  } finally {
    submit.disabled = false;
  }
});

// Kullanıcı hatalı alanı düzeltmeye başlayınca uyarıyı güncelle.
for (const fieldName of Object.keys(rules)) {
  const input = form.elements[fieldName];
  input.addEventListener("input", () => {
    if (input.closest(".field").classList.contains("is-invalid")) {
      showError(fieldName, rules[fieldName](input.value.trim()));
    }
  });
}

$("new-booking").addEventListener("click", () => {
  form.reset();
  state.service = null;
  state.date = null;
  hideDetails();
  $("slots-alert").hidden = true;
  $("step-time").hidden = true;
  renderServices();
  $("success").hidden = true;
  $("booking").hidden = false;
  window.scrollTo({ top: 0 });
});

async function init() {
  state.slug = providerSlugFromUrl();
  if (!state.slug) return showNotFound();
  try {
    const { provider, services } = await getJson(providerPath(state.slug));
    state.services = services;
    document.title = `${provider.name} — Randevu Al — Ritma`;
    $("provider-name").textContent = provider.name;
    $("provider-title").textContent = provider.title;
    renderServices();
    $("status").hidden = true;
    $("booking").hidden = false;
  } catch (error) {
    if (error.status === 404) return showNotFound();
    $("status").textContent = error.message;
  }
}

init();
