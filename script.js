document.getElementById("year").textContent = new Date().getFullYear();

const topbar = document.querySelector(".topbar");
addEventListener("scroll", () => topbar.classList.toggle("scrolled", scrollY > 8), { passive: true });

const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  });
}, { threshold: 0.08 });
document.querySelectorAll(".block, .contact").forEach((el) => { el.classList.add("reveal"); io.observe(el); });

const links = [...document.querySelectorAll(".topbar nav a")];
const spy = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
  });
}, { rootMargin: "-45% 0px -50% 0px" });
document.querySelectorAll("section[id]").forEach((s) => spy.observe(s));

const bar = document.querySelector(".progress");
function progress() {
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
}
addEventListener("scroll", progress, { passive: true });
progress();

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

(function rotator() {
  const el = document.querySelector(".rot");
  if (!el || reduced) return;
  const words = el.dataset.words.split("|");
  let i = 0, text = words[0], deleting = true;
  setTimeout(function tick() {
    if (deleting) {
      text = text.slice(0, -1);
      if (!text) { deleting = false; i = (i + 1) % words.length; }
    } else {
      text = words[i].slice(0, text.length + 1);
      if (text === words[i]) { deleting = true; el.textContent = text; return setTimeout(tick, 2400); }
    }
    el.textContent = text;
    setTimeout(tick, deleting ? 28 : 55);
  }, 2600);
})();

document.querySelectorAll(".spot").forEach((el) => {
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
});

(function network() {
  const canvas = document.getElementById("net");
  if (!canvas) return;
  const hero = canvas.parentElement;
  const ctx = canvas.getContext("2d");
  const LINK = 170, REACH = 150;
  const GOOD = "rgba(166,244,216,.9)", BAD = "255,128,112";
  let w = 0, h, dpr, nodes = [], packets = [], flags = [], visible = true, running = false;
  const mouse = { x: -9999, y: -9999 };

  function resize() {
    const nw = canvas.clientWidth;
    h = canvas.clientHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = nw * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (nw === w && nodes.length) return;
    w = nw;
    const count = Math.round(Math.min(75, (w * h) / 15000));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.6 + 1,
    }));
    packets = []; flags = [];
  }

  function spawnPacket() {
    const a = nodes[(Math.random() * nodes.length) | 0];
    const near = nodes.filter((b) => b !== a && Math.hypot(a.x - b.x, a.y - b.y) < LINK);
    if (!near.length) return;
    packets.push({ a, b: near[(Math.random() * near.length) | 0], t: 0, bad: Math.random() < 0.1 });
  }

  hero.addEventListener("click", (e) => {
    if (e.target.closest("a")) return;
    const r = canvas.getBoundingClientRect();
    const src = { x: e.clientX - r.left, y: e.clientY - r.top };
    nodes
      .map((n) => ({ n, d: Math.hypot(n.x - src.x, n.y - src.y) }))
      .sort((p, q) => p.d - q.d).slice(0, 7)
      .forEach(({ n }, k) => packets.push({ a: src, b: n, t: -k * 0.08, bad: k % 3 === 0 }));
    flags.push({ x: src.x, y: src.y, life: 1, src: true });
    if (!running) frame();
  });
  hero.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  hero.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });

  function frame() {
    running = true;
    ctx.clearRect(0, 0, w, h);
    for (const n of nodes) {
      if (!reduced) { n.x += n.vx; n.y += n.vy; }
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
      const dx = n.x - mouse.x, dy = n.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 60 && d > 0) { n.x += (dx / d) * 0.8; n.y += (dy / d) * 0.8; }
    }
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK) {
          ctx.strokeStyle = `rgba(127,207,180,${0.15 * (1 - d / LINK)})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
      if (dm < REACH) {
        ctx.strokeStyle = `rgba(47,224,166,${0.45 * (1 - dm / REACH)})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
    }
    for (const n of nodes) {
      const near = Math.hypot(n.x - mouse.x, n.y - mouse.y) < REACH;
      ctx.fillStyle = near ? "#2fe0a6" : "rgba(157,184,168,.55)";
      ctx.beginPath(); ctx.arc(n.x, n.y, near ? n.r + 0.8 : n.r, 0, 7); ctx.fill();
    }
    if (!reduced && Math.random() < 0.18 && packets.length < 30) spawnPacket();
    packets = packets.filter((p) => {
      p.t += p.bad ? 0.012 : 0.018;
      if (p.t < 0) return true;
      const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
      ctx.fillStyle = p.bad ? `rgb(${BAD})` : GOOD;
      if (p.bad) { ctx.shadowColor = `rgb(${BAD})`; ctx.shadowBlur = 8; }
      ctx.beginPath(); ctx.arc(x, y, p.bad ? 2.6 : 1.6, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
      if (p.t >= 1) { if (p.bad) flags.push({ x: p.b.x, y: p.b.y, life: 1 }); return false; }
      return true;
    });
    ctx.font = "500 10px 'JetBrains Mono', monospace";
    flags = flags.filter((f) => {
      f.life -= 0.012;
      const r = 6 + (1 - f.life) * 26;
      const col = f.src ? "47,224,166" : BAD;
      ctx.strokeStyle = `rgba(${col},${f.life})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 7); ctx.stroke();
      if (!f.src) {
        ctx.fillStyle = `rgba(${col},${f.life * 0.95})`;
        ctx.fillText("ANOMALY FLAGGED", f.x + 10, f.y - 10);
      }
      return f.life > 0;
    });
    const busy = packets.length || flags.length;
    if (visible && (!reduced || busy)) requestAnimationFrame(frame);
    else running = false;
  }

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !running) frame();
  }).observe(hero);

  resize();
  addEventListener("resize", resize);
  frame();
})();

(function lab() {
  const root = document.getElementById("lab");
  if (!root) return;
  const sliders = [...root.querySelectorAll("input[type=range]")];
  const NORMAL = 900;
  const $ = (id) => document.getElementById(id);
  const f1 = (p, r) => (p + r ? (2 * p * r) / (p + r) : 0);

  function update() {
    let caught = 0, missed = 0;
    const f1s = [];
    sliders.forEach((s) => {
      const n = +s.dataset.n, tp = Math.round(n * s.value / 100);
      caught += tp; missed += n - tp;
      f1s.push(f1(tp ? 1 : 0, tp / n));
      s.style.setProperty("--p", s.value + "%");
      s.nextElementSibling.textContent = s.value + "%";
    });
    f1s.unshift(f1(NORMAL / (NORMAL + missed), 1));
    const acc = (NORMAL + caught) / (NORMAL + caught + missed);
    const macro = f1s.reduce((a, b) => a + b, 0) / f1s.length;
    $("m-acc").textContent = (acc * 100).toFixed(1) + "%";
    $("m-f1").textContent = (macro * 100).toFixed(1) + "%";
    $("b-acc").style.width = acc * 100 + "%";
    $("b-f1").style.width = macro * 100 + "%";
    const gap = acc - macro;
    $("lab-say").textContent =
      gap > 0.25 ? "Accuracy looks great, but a whole attack class is going undetected. Macro-F1 gives every class an equal vote, so it notices."
      : gap > 0.08 ? "Closer, but the rare classes still drag macro-F1 down. That gap is exactly the problem I want to work on."
      : "Every class is detected well, so both metrics agree. On real IoT traffic, getting here is the hard part.";
  }
  sliders.forEach((s) => s.addEventListener("input", update));
  update();
})();

const NTFY_TOPIC = "mb-visits-4229c3dcef64";

(function notifyVisit() {
  const params = new URLSearchParams(location.search);
  if (params.get("me") === "1") localStorage.setItem("mb_owner", "1");
  if (params.get("me") === "0") localStorage.removeItem("mb_owner");
  if (localStorage.getItem("mb_owner")) return;
  if (!/github\.io$/.test(location.hostname)) return;
  if (sessionStorage.getItem("mb_notified")) return;
  if (/bot|crawl|spider|preview|slurp|facebookexternalhit|linkedinbot/i.test(navigator.userAgent)) return;
  sessionStorage.setItem("mb_notified", "1");

  let from = "direct / unknown";
  try { if (document.referrer) from = new URL(document.referrer).hostname; } catch (_) {}
  const device = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "phone" : "computer";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";

  fetch("https://ntfy.sh/", {
    method: "POST",
    keepalive: true,
    body: JSON.stringify({
      topic: NTFY_TOPIC,
      title: "Someone is viewing your portfolio",
      message: `From: ${from}\nTime zone: ${tz}\nDevice: ${device}\nLanguage: ${navigator.language}`,
      tags: ["eyes"],
      click: location.href,
    }),
  }).catch(() => {});
})();
