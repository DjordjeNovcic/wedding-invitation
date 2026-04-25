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
const introCanvas = document.getElementById("introCanvas");
const floatingControls = document.getElementById("floatingControls");
const replayBtn = document.getElementById("replayIntro");
const shareBtn = document.getElementById("shareInvite");
const shareToast = document.getElementById("shareToast");

let invitationOpened = false;

/* === Canvas envelope animation =================================== */

const introCtx = introCanvas ? introCanvas.getContext("2d") : null;
const introCta = document.getElementById("introCta");
const FRAME_URLS = Array.from({ length: 19 }, (_, i) =>
  `assets/sc-frame-${String(i + 1).padStart(2, "0")}.webp`
);
const frameImages = [];
let framesLoaded = 0;
let allFramesReady = false;

function loadFrames() {
  if (!introCtx) return;
  FRAME_URLS.forEach((url, i) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      framesLoaded++;
      if (framesLoaded === FRAME_URLS.length) {
        allFramesReady = true;
        drawFrame(0);
        introCanvas.classList.add("is-ready");
        if (introCta) introCta.classList.add("is-ready");
      }
    };
    img.src = url;
    frameImages[i] = img;
  });
}

// Frames have varying aspect ratios (cropped tightly around the subject).
// We draw each one with object-fit: contain semantics — preserve aspect,
// scale to fit within the canvas, centre. The empty area shows the
// canvas background which matches the cream tone of the frames.
function drawContain(img, w, h) {
  const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;
  introCtx.drawImage(img, dx, dy, dw, dh);
}

function clearCanvas() {
  const w = introCanvas.width;
  const h = introCanvas.height;
  introCtx.fillStyle = "#efe6dc";
  introCtx.fillRect(0, 0, w, h);
}

function drawFrame(index) {
  if (!introCtx || !frameImages[index]) return;
  clearCanvas();
  drawContain(frameImages[index], introCanvas.width, introCanvas.height);
}

function drawBlend(aIndex, bIndex, t) {
  if (!introCtx) return;
  const a = frameImages[aIndex];
  const b = frameImages[bIndex];
  if (!a || !b) return;
  const w = introCanvas.width;
  const h = introCanvas.height;
  clearCanvas();
  introCtx.globalAlpha = 1;
  drawContain(a, w, h);
  introCtx.globalAlpha = t;
  drawContain(b, w, h);
  introCtx.globalAlpha = 1;
}

/* smootherstep — sharper S-curve than smoothstep. Spends less time at
   the 50/50 mid-blend, which reduces the "double-vision" ghost during
   crossfades and makes each pose snap into focus faster. */
const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/* Weighted stage timeline. Most transitions get equal weight; the
   pivotal moments (envelope opens, card emerges, final reveal) get
   1.4× so they breathe. A short hold sits at the very start. */
const STAGES = (() => {
  const HOLD_INITIAL = 0.04;
  const HOLD_FINAL = 0.06;
  const weights = [
    1.5, // 1 → 2   (wax seal cracks — the dramatic moment, gets a shake)
    1.0, // 2 → 3
    1.0, // 3 → 4
    1.0, // 4 → 5
    1.0, // 5 → 6
    1.0, // 6 → 7
    1.0, // 7 → 8
    1.0, // 8 → 9
    1.0, // 9 → 10
    1.0, // 10 → 11
    1.0, // 11 → 12
    1.0, // 12 → 13
    1.0, // 13 → 14
    1.0, // 14 → 15
    1.2, // 15 → 16
    1.3, // 16 → 17 (zoom to portrait card)
    1.2, // 17 → 18
    1.3, // 18 → 19 (final big reveal)
  ];
  const span = 1 - HOLD_INITIAL - HOLD_FINAL;
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const rows = [];
  rows.push([0.0, HOLD_INITIAL, 0, 0]);
  let cursor = HOLD_INITIAL;
  weights.forEach((w, i) => {
    const dur = (w / totalWeight) * span;
    rows.push([cursor, cursor + dur, i, i + 1]);
    cursor += dur;
  });
  rows.push([cursor, 1.0, weights.length, weights.length]);
  return rows;
})();

function runIntroAnimation(durationMs) {
  if (!introCtx || !allFramesReady) return;
  const start = performance.now();
  let shakeFired = false;

  function tick(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / durationMs, 1);

    if (t >= 1) {
      drawFrame(FRAME_URLS.length - 1);
      return;
    }

    const stage = STAGES.find(([s, e]) => t >= s && t < e) || STAGES[STAGES.length - 1];
    const [s, e, a, b] = stage;
    if (a === b) {
      drawFrame(a);
    } else {
      const local = (t - s) / (e - s);
      drawBlend(a, b, smootherstep(local));
    }

    // Shake at the moment the wax seal cracks (start of the 1 → 2 transition)
    if (!shakeFired && a === 0 && b === 1) {
      shakeFired = true;
      introCanvas.classList.add("is-shaking");
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try { navigator.vibrate([80, 50, 60, 40, 50, 30, 40]); } catch (_) {}
      }
      setTimeout(() => introCanvas.classList.remove("is-shaking"), 1040);
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

loadFrames();

/* === Click handler =============================================== */

function startAudioSwell(totalAnimMs) {
  if (!audio) return;
  // Begin silently playing immediately (we're inside a user gesture
  // so iOS Safari will allow it). Then linearly ramp the volume up
  // during the back half of the animation so the music swells in
  // exactly as the invitation reveals itself.
  audio.volume = 0;
  audio.muted = false;
  const playPromise = audio.play();
  if (playPromise && typeof playPromise.then === "function") {
    playPromise.then(() => {
      soundIcon.textContent = "♪";
    }).catch(() => {
      soundIcon.textContent = "×";
    });
  }

  const fadeStart = totalAnimMs * 0.35;
  const fadeDuration = totalAnimMs * 0.65 + 250;
  setTimeout(() => {
    const t0 = performance.now();
    function ramp() {
      const t = Math.min((performance.now() - t0) / fadeDuration, 1);
      audio.volume = t;
      if (t < 1) requestAnimationFrame(ramp);
    }
    requestAnimationFrame(ramp);
  }, fadeStart);
}

function openInvitation() {
  if (invitationOpened || !allFramesReady) {
    return;
  }

  invitationOpened = true;
  intro.classList.add("is-opening");
  if (envelope) {
    envelope.classList.add("is-opening");
  }

  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(40); } catch (_) {}
  }

  const animMs = 3800;
  runIntroAnimation(animMs);
  startAudioSwell(animMs);

  setTimeout(() => {
    intro.classList.add("is-open");
    document.body.classList.remove("locked");
    if (floatingControls) {
      floatingControls.hidden = false;
      requestAnimationFrame(() => floatingControls.classList.add("is-visible"));
    }

    setTimeout(() => {
      intro.hidden = true;
    }, 950);
  }, animMs + 150);
}

/* === Replay intro ================================================ */

function replayIntro() {
  if (!allFramesReady) return;
  intro.hidden = false;
  intro.classList.remove("is-open");
  intro.classList.add("is-opening");
  drawFrame(0);

  const animMs = 3800;
  // Tiny delay so the unhide paint completes before the rAF starts
  setTimeout(() => runIntroAnimation(animMs), 50);

  setTimeout(() => {
    intro.classList.add("is-open");
    setTimeout(() => {
      intro.hidden = true;
      intro.classList.remove("is-opening");
    }, 950);
  }, animMs + 150);
}

if (replayBtn) {
  replayBtn.addEventListener("click", replayIntro);
}

/* === Share ======================================================= */

let shareToastTimer = null;
function flashShareToast(message) {
  if (!shareToast) return;
  shareToast.textContent = message;
  shareToast.classList.add("is-visible");
  if (shareToastTimer) clearTimeout(shareToastTimer);
  shareToastTimer = setTimeout(() => {
    shareToast.classList.remove("is-visible");
  }, 2200);
}

async function shareInvitation() {
  const data = {
    title: "Pozivnica za venčanje",
    text: `${wedding.couple} — 12. septembar 2026.`,
    url: window.location.href,
  };
  if (navigator.share) {
    try {
      await navigator.share(data);
    } catch (_) { /* user cancelled */ }
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(data.url);
      flashShareToast("Link kopiran");
      return;
    } catch (_) {}
  }
  flashShareToast("Kopiraj link iz adresne trake");
}

if (shareBtn) {
  shareBtn.addEventListener("click", shareInvitation);
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
