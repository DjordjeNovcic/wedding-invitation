const wedding = {
  couple: "Đorđe i Ksenija",
  start: "2026-09-12T09:00:00+02:00",
  end: "2026-09-12T19:00:00+02:00",
  ceremony: "Crkveno venčanje u 12:00h",
  reception: "Ručak u 15:00h",
  events: [
    "09:00h - Skup svatova kod porodice Novčić, Nate Radulović 14",
    "10:30h - Skup svatova kod porodice Subotić, Kraljevića Marka 29",
    "12:00h - Crkveno venčanje, Stara crkva, Hram Svete Trojice",
    "15:00h - Ručak",
    "16:30h - Građansko venčanje",
  ],
};

const intro = document.getElementById("intro");
const envelope = document.getElementById("envelope");
const openInvite = document.getElementById("openInvite");
const audio = document.getElementById("weddingAudio");
const soundToggle = document.getElementById("soundToggle");
const soundIcon = document.getElementById("soundIcon");
const form = document.getElementById("rsvpForm");
const formStatus = document.getElementById("formStatus");

let invitationOpened = false;

function openInvitation() {
  if (invitationOpened) {
    return;
  }

  invitationOpened = true;
  intro.classList.add("is-opening");
  if (envelope) {
    envelope.classList.add("is-opening");
  }

  setTimeout(() => {
    intro.classList.add("is-open");
    document.body.classList.remove("locked");
    soundToggle.hidden = false;
    audio.play().then(() => {
      soundIcon.textContent = "♪";
    }).catch(() => {
      soundIcon.textContent = "×";
    });

    setTimeout(() => {
      intro.hidden = true;
    }, 950);
  }, 2950);
}

openInvite.addEventListener("click", openInvitation);
openInvite.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openInvitation();
  }
});

soundToggle.addEventListener("click", () => {
  if (audio.paused) {
    audio.play();
    soundIcon.textContent = "♪";
  } else {
    audio.pause();
    soundIcon.textContent = "×";
  }
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
    }
  });
}, { threshold: 0.18 });

document.querySelectorAll(".section-reveal").forEach((section) => {
  revealObserver.observe(section);
});

function updateCountdown() {
  const target = new Date(wedding.start).getTime();
  const now = Date.now();
  const distance = Math.max(target - now, 0);

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((distance / (1000 * 60)) % 60);
  const seconds = Math.floor((distance / 1000) % 60);

  document.getElementById("days").textContent = days;
  document.getElementById("hours").textContent = String(hours).padStart(2, "0");
  document.getElementById("minutes").textContent = String(minutes).padStart(2, "0");
  document.getElementById("seconds").textContent = String(seconds).padStart(2, "0");
}

function calendarDate(value) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function setupCalendarLink() {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Vencanje ${wedding.couple}`,
    dates: `${calendarDate(wedding.start)}/${calendarDate(wedding.end)}`,
    details: wedding.events.join("\n"),
    location: wedding.reception,
  });

  document.getElementById("googleCalendar").href = `https://www.google.com/calendar/render?${params.toString()}`;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  localStorage.setItem("wedding-rsvp", JSON.stringify({ ...data, sentAt: new Date().toISOString() }));

  const text = encodeURIComponent(
    `RSVP za venčanje\nIme: ${data.name}\nDolazim: ${data.answer}\nBroj gostiju: ${data.guests}\nPoruka: ${data.message || "-"}`
  );

  formStatus.innerHTML = `Sačuvano. Za sada potvrdu možete poslati i preko <a href="mailto:djordje.novcic95@gmail.com?subject=RSVP%20za%20ven%C4%8Danje&body=${text}">emaila</a>.`;
  form.reset();
});

setupCalendarLink();
updateCountdown();
setInterval(updateCountdown, 1000);
