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
const openInvite = document.getElementById("openInvite");
const audio = document.getElementById("weddingAudio");
const soundToggle = document.getElementById("soundToggle");
const soundIcon = document.getElementById("soundIcon");
const form = document.getElementById("rsvpForm");
const formStatus = document.getElementById("formStatus");
const floatingControls = document.getElementById("floatingControls");
const replayBtn = document.getElementById("replayIntro");
const shareBtn = document.getElementById("shareInvite");
const shareToast = document.getElementById("shareToast");
const introCta = document.getElementById("introCta");
const envelopeSealed = document.getElementById("envelopeSealed");
const envelopeBlank = document.getElementById("envelopeBlank");
const envelopeGlow = document.getElementById("envelopeGlow");
const envelopeStage = document.querySelector(".envelope-stage");
const heroSection = document.querySelector(".hero");
const sealPieces = [
  document.getElementById("sealPiece1"),
  document.getElementById("sealPiece2"),
  document.getElementById("sealPiece3"),
  document.getElementById("sealPiece4"),
].filter(Boolean);

let invitationOpened = false;
let introTl = null;

/* === Envelope reveal animation ================================== */

// Each fragment gets a different flight vector + spin so the shatter feels chaotic.
const PIECE_FLIGHTS = [
  { x: -210, y: -120, rot: -200, scaleEnd: 0.7,  dur: 1.20 },
  { x:  220, y:  -80, rot:  170, scaleEnd: 0.65, dur: 1.10 },
  { x: -130, y:  170, rot:  140, scaleEnd: 0.55, dur: 1.00 },
  { x:  170, y:  160, rot: -160, scaleEnd: 0.50, dur: 0.95 },
];

function resetEnvelopeState() {
  if (!window.gsap) return;
  gsap.set(envelopeSealed, { scale: 1, y: 0, rotate: 0, opacity: 1 });
  gsap.set(envelopeBlank,  { scale: 1, y: 0, rotate: 0, opacity: 1 });
  gsap.set(envelopeGlow,   { opacity: 0, scale: 0.7 });
  gsap.set(envelopeStage,  { scale: 1, y: 0 });
  sealPieces.forEach((piece) => {
    gsap.set(piece, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 0 });
  });
}

function buildIntroTimeline() {
  if (!window.gsap) return null;
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });

  // 1. Press feedback — sealed envelope pushes in slightly.
  tl.to(envelopeSealed, {
    scale: 1.035,
    duration: 0.16,
    ease: "power2.in",
  }, 0);

  // 2. Warm glow blooms across the seal.
  tl.to(envelopeGlow, {
    opacity: 1,
    scale: 1.25,
    duration: 0.34,
    ease: "power2.out",
  }, 0.08);

  // 3. SHATTER — at the peak of the press, the sealed image cuts out and
  //    the fragments take its place at the seal position.
  tl.set(envelopeSealed, { opacity: 0 }, 0.22);
  sealPieces.forEach((piece) => {
    tl.set(piece, { opacity: 1, x: 0, y: 0, rotation: 0, scale: 1 }, 0.22);
  });

  // 4. Fragments fly outward with different vectors + spins, then fade.
  sealPieces.forEach((piece, i) => {
    const f = PIECE_FLIGHTS[i] || PIECE_FLIGHTS[0];
    tl.to(piece, {
      x: f.x,
      y: f.y,
      rotation: f.rot,
      scale: f.scaleEnd,
      opacity: 0,
      duration: f.dur,
      ease: "power2.out",
    }, 0.22);
  });

  // 5. Glow fades with the shatter.
  tl.to(envelopeGlow, {
    opacity: 0,
    scale: 1.55,
    duration: 0.6,
    ease: "power2.out",
  }, 0.40);

  // 6. The (now seal-less) envelope lifts away — the hero behind starts to
  //    show through as the intro overlay fades.
  tl.to(envelopeBlank, {
    scale: 0.94,
    y: -64,
    rotate: -2.4,
    opacity: 0,
    duration: 1.15,
    ease: "power3.inOut",
  }, 0.85);

  return tl;
}

function initIntro() {
  if (!window.gsap || !envelopeSealed) return;
  resetEnvelopeState();
  introTl = buildIntroTimeline();
  if (introCta) introCta.classList.add("is-ready");
}

if (window.gsap) {
  initIntro();
} else {
  window.addEventListener("load", initIntro, { once: true });
}

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

// Point in the timeline (ms after click) at which the intro overlay starts
// fading out — by then the envelope has lifted away and the hero behind
// begins to show. Hero gets `is-visible` at the same moment so its own
// scale-up animation cross-fades with the intro fade.
const INTRO_DURATION_MS = 2000;

// Soft scroll nudge that hints "there's more below" once the hero settles.
// Bails immediately on any user input so we never fight them.
function nudgeScroll(targetY = 140, duration = 1400) {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const startY = window.scrollY || window.pageYOffset || 0;
  if (startY >= targetY - 4) return;

  let cancelled = false;
  const cancel = () => { cancelled = true; };
  const opts = { once: true, passive: true };
  window.addEventListener("wheel",      cancel, opts);
  window.addEventListener("touchstart", cancel, opts);
  window.addEventListener("touchmove",  cancel, opts);
  window.addEventListener("mousedown",  cancel, opts);
  window.addEventListener("keydown",    cancel, { once: true });

  const startT = performance.now();
  const distance = targetY - startY;
  function tick(now) {
    if (cancelled) return;
    const t = Math.min((now - startT) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 4);
    window.scrollTo(0, startY + distance * eased);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function openInvitation() {
  if (invitationOpened || !introTl) {
    return;
  }

  invitationOpened = true;
  intro.classList.add("is-opening");

  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(40); } catch (_) {}
  }

  resetEnvelopeState();
  introTl.restart();
  startAudioSwell(INTRO_DURATION_MS);

  setTimeout(() => {
    intro.classList.add("is-open");
    if (heroSection) heroSection.classList.add("is-visible");
    document.body.classList.remove("locked");
    if (floatingControls) {
      floatingControls.hidden = false;
      requestAnimationFrame(() => floatingControls.classList.add("is-visible"));
    }

    setTimeout(() => {
      intro.hidden = true;
    }, 1100);

    // Once the hero has had a beat to settle, hint at scroll.
    setTimeout(() => nudgeScroll(140, 1400), 1500);
  }, INTRO_DURATION_MS);
}

/* === Replay intro ================================================ */

function replayIntro() {
  if (!introTl) return;
  intro.hidden = false;
  intro.classList.remove("is-open");
  intro.classList.add("is-opening");

  resetEnvelopeState();
  // Tiny delay so the unhide paint completes before the timeline starts
  setTimeout(() => introTl.restart(), 50);

  setTimeout(() => {
    intro.classList.add("is-open");
    setTimeout(() => {
      intro.hidden = true;
      intro.classList.remove("is-opening");
    }, 1100);
  }, INTRO_DURATION_MS);
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
