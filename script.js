const form = document.getElementById("signup-form");
const success = document.getElementById("signup-success");
const successTitle = document.getElementById("success-title");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const rules = {
  name: (value) => (value ? "" : "Lütfen adınızı ve soyadınızı yazın."),
  email: (value) => {
    if (!value) return "Lütfen e-posta adresinizi yazın.";
    return EMAIL_PATTERN.test(value) ? "" : "Geçerli bir e-posta adresi yazın.";
  },
  profession: (value) => (value ? "" : "Lütfen mesleğinizi seçin."),
};

function showError(fieldName, message) {
  const input = form.elements[fieldName];
  input.closest(".field").classList.toggle("is-invalid", Boolean(message));
  input.setAttribute("aria-invalid", message ? "true" : "false");
  document.getElementById(`${fieldName}-error`).textContent = message;
}

// Şimdilik veri hiçbir yere gönderilmiyor. Gerçek bir servis bağlanınca burası değişecek.
function submitSignup(data) {
  return Promise.resolve(data);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

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

  await submitSignup(data);

  const firstName = data.name.split(/\s+/)[0];
  successTitle.textContent = `Teşekkürler ${firstName}!`;
  form.hidden = true;
  success.hidden = false;
});

// Kullanıcı hatalı alanı düzeltmeye başlayınca uyarıyı kaldır.
for (const fieldName of Object.keys(rules)) {
  const input = form.elements[fieldName];
  const eventName = input.tagName === "SELECT" ? "change" : "input";
  input.addEventListener(eventName, () => {
    if (input.closest(".field").classList.contains("is-invalid")) {
      showError(fieldName, rules[fieldName](input.value.trim()));
    }
  });
}
