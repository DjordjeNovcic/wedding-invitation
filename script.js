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
const form = document.getElementById("rsvpForm");
const formStatus = document.getElementById("formStatus");
const introCta = document.getElementById("introCta");
const envelopeSealed = document.getElementById("envelopeSealed");
const envelopeBlank = document.getElementById("envelopeBlank");
const envelopeOpen = document.getElementById("envelopeOpen");
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
  gsap.set(envelopeOpen,   { scale: 0.97, y: 0, rotate: 0, opacity: 0 });
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

  // 6. Cross-fade from the sealed-but-closed envelope into the open
  //    envelope with the K&Đ card peeking out — reads as the flap opening.
  tl.to(envelopeOpen, {
    opacity: 1,
    scale: 1,
    duration: 0.35,
    ease: "power2.out",
  }, 0.45);
  tl.to(envelopeBlank, {
    opacity: 0,
    duration: 0.30,
    ease: "power2.inOut",
  }, 0.55);

  // 7. The opened envelope lifts away — the hero behind starts to show
  //    through as the intro overlay fades.
  tl.to(envelopeOpen, {
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
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
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

// Slow continuous drift downward once the hero settles. Driven by a
// GPU-composited transform on <body> via Web Animations so it's smooth at
// sub-pixel speeds (window.scrollTo rounds to integer pixels on non-Retina
// displays, which makes 50-60px/s look jittery). The moment the user
// touches/scrolls/types we cancel the animation, transfer the visual
// offset onto the real document scroll position, and let them take over.
function nudgeScroll(velocity = 0.060) {  // px per ms ≈ 60px/s
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const maxY = document.documentElement.scrollHeight - window.innerHeight - 4;
  if (maxY <= 0) return;

  const body = document.body;
  body.style.willChange = "transform";
  const animation = body.animate(
    [
      { transform: "translate3d(0, 0, 0)" },
      { transform: `translate3d(0, ${-maxY}px, 0)` },
    ],
    { duration: maxY / velocity, easing: "linear", fill: "forwards" }
  );

  let handed = false;
  function handover() {
    if (handed) return;
    handed = true;

    // Read where we visually are right now, then drop the transform and
    // jump real scroll to match — seamless to the user.
    let currentOffset = maxY;
    const t = getComputedStyle(body).transform;
    if (t && t !== "none") {
      try { currentOffset = -new DOMMatrixReadOnly(t).m42; } catch (_) {}
    }
    animation.cancel();
    body.style.transform = "";
    body.style.willChange = "";
    window.scrollTo(0, currentOffset);

    window.removeEventListener("wheel",      handover);
    window.removeEventListener("touchstart", handover);
    window.removeEventListener("touchmove",  handover);
    window.removeEventListener("mousedown",  handover);
    window.removeEventListener("keydown",    handover);
  }

  const opts = { passive: true };
  window.addEventListener("wheel",      handover, opts);
  window.addEventListener("touchstart", handover, opts);
  window.addEventListener("touchmove",  handover, opts);
  window.addEventListener("mousedown",  handover, opts);
  window.addEventListener("keydown",    handover);

  // When the drift completes naturally (bottom of page), still hand over
  // so the document scroll position matches the visual state.
  animation.finished.then(handover).catch(() => {});
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

    setTimeout(() => {
      intro.hidden = true;
    }, 1100);

    // Once the hero has had a beat to settle, start a slow drift downward
    // so the user feels there's more page below. They take over the moment
    // they touch / scroll / type.
    setTimeout(() => nudgeScroll(), 1500);
  }, INTRO_DURATION_MS);
}

openInvite.addEventListener("click", openInvitation);
openInvite.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openInvitation();
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
