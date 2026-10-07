/* Brillanda prototype: every screen is rendered from DB; every action changes DB and re-renders. */
"use strict";
(() => {
const { LEVELS, SUBJECTS, COMPONENTS } = window.D;
let DB = window.D.fresh();
const initial = () => ({ secOpen: null, stOpen: new Set(), classLevel: "all", pubTab: null, look: "pastel", school: "greenfield", role: "admin", route: { p: "home" }, device: "desktop", child: "chiamaka", classFilter: "all", stq: "", stClass: "all", stUnlinked: false, missingOnly: false, pubSel: null, setTab: null, scaleDraft: null, errors: {} });
let S = initial();
try { const q = new URLSearchParams(location.search); ["look", "role", "school", "device"].forEach((k) => { if (q.get(k)) S[k] = q.get(k); }); if (q.get("p")) S.route = { p: q.get("p") }; if (q.get("sec")) S.secOpen = q.get("sec"); if (q.get("open")) S.stOpen.add(q.get("open")); } catch {}

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n, d = 0) => Number(n).toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });
const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th");
const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
const RM = matchMedia("(prefers-reduced-motion: reduce)");
const round2 = (n) => Number(Number(n).toPrecision(12).replace(/(\.\d*?)0+$/, "$1")).toFixed(2) * 1;

const I = {
  home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  classes: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  publish: '<path d="M4 12l16-8-6 16-3-7z"/><path d="M11 13l9-9"/>',
  students: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 4.8a3 3 0 0 1 0 6"/><path d="M18 14.8c1.9.7 3 2.4 3 5.2"/>',
  staff: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="10" r="2.5"/><path d="M8 17c.8-1.8 2.2-2.6 4-2.6s3.2.8 4 2.6"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.3-4.3"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
  results: '<path d="M4 20V10M10 20V4M16 20v-7"/><path d="M3 20h18"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  inbox: '<path d="M4 13l2.5-8h11L20 13v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  scores: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  school: '<path d="M3 10l9-5 9 5-9 5z"/><path d="M7 12.5V17c1.5 1.5 3 2 5 2s3.5-.5 5-2v-4.5"/>',
  activity: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
};
const icon = (n, cls = "ic") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${I[n] || ""}</svg>`;

/* ---------- data access ---------- */
const BAKARE_ARMS = ["jss2a", "jss2b", "ss1a", "ss2a"];
const ME = { super: { id: "super", name: "Kelechi Obi", short: "Kelechi", first: "Kelechi", init: "KO", role: "Brillanda team" }, admin: { id: "admin", name: "Funmilayo Adeyemi", short: "Mrs Adeyemi", first: "Funmilayo", init: "FA", role: "School admin" }, teacher: { id: "t-bakare", name: "Tunde Bakare", short: "Mr Bakare", first: "Tunde", init: "TB", role: "Mathematics teacher" }, parent: { id: "parent", name: "Ngozi Okafor", short: "Mrs Okafor", first: "Ngozi", init: "NO", role: "Parent" } };
const CHILDREN = ["chiamaka", "obinna"];
const arm = (id) => DB.arms.find((a) => a.id === id);
const lvl = (a) => LEVELS[(typeof a === "string" ? arm(a) : a).level];
const subj = (id) => SUBJECTS.find((s) => s.id === id);
const student = (id) => DB.students.find((s) => s.id === id);
const staff = (id) => DB.staff.find((s) => s.id === id);
const tname = (id) => { if (id === "admin") return "Mrs Adeyemi"; const s = staff(id); return s ? `${s.title} ${s.name}` : ""; };
const teacherOf = (armId, subjId) => subjId === "maths" && !BAKARE_ARMS.includes(armId) ? "t-ajayi" : subj(subjId).teacher;
const studentsIn = (armId) => DB.students.filter((s) => s.arm === armId);
const sheet = (armId, subjId) => DB.sheets[`${armId}:${subjId}`];
const done = (st) => st === "complete" || st === "locked";
const tint = (a) => { const L = lvl(a); return `--tint:${L.tint};--deep:${L.deep};--mid:${L.mid}`; };
if (!DB.staff.find((s) => s.id === "t-ajayi")) DB.staff.push({ id: "t-ajayi", name: "Femi Ajayi", title: "Mr", email: "f.ajayi@greenfield.sch.ng", role: "Teacher", status: "active" });

function scaleSorted(scale = DB.scale) { return scale.slice().sort((a, b) => b.min - a.min); }
function gradeOf(total, scale = DB.scale) { const s = scaleSorted(scale); return s.find((b) => total >= b.min) || s[s.length - 1]; }
const gtone = (g) => (g === "A" || g === "B" ? "ok" : g === "C" ? "warn" : "bad");
const gradeBadge = (total) => { const g = gradeOf(total).g; return `<span class="grade g-${gtone(g)}">${g}</span>`; };

function rowOf(e) {
  let total = 0, filled = 0, abs = false;
  COMPONENTS.forEach((c) => { const v = e[c.id]; if (v === null || v === undefined) return; filled++; if (v === "ABS") abs = true; else total += v; });
  return { total: round2(total), complete: filled === COMPONENTS.length, filled, abs };
}
function sheetInfo(armId, subjId) {
  const sh = sheet(armId, subjId);
  const list = studentsIn(armId);
  const rows = list.map((s) => ({ s, ...rowOf(sh.entries[s.id]) }));
  const complete = rows.filter((r) => r.complete).length;
  let st = sh.status;
  if (st === "progress" && complete === list.length) st = "ready";
  if (st === "none" && rows.some((r) => r.filled)) st = "progress";
  return { sh, rows, n: list.length, complete, st, pct: list.length ? complete / list.length : 0 };
}
function armInfo(armId) {
  const subs = SUBJECTS.map((s) => ({ s, ...sheetInfo(armId, s.id) }));
  const doneN = subs.filter((x) => done(x.st)).length;
  return { subs, doneN, ready: doneN === SUBJECTS.length && !DB.published[armId], published: !!DB.published[armId], reopen: subs.filter((x) => x.sh.reopen).length };
}
function armResults(armId) {
  const list = studentsIn(armId);
  const res = list.map((s) => { const totals = SUBJECTS.map((sb) => rowOf(sheet(armId, sb.id).entries[s.id]).total); return { id: s.id, totals, avg: round2(totals.reduce((a, b) => a + b, 0) / totals.length) }; });
  const sorted = res.slice().sort((a, b) => b.avg - a.avg);
  res.forEach((r) => { r.pos = sorted.findIndex((x) => x.avg === r.avg) + 1; }); // competition ranking, D-2
  return { res, of: list.length };
}
function schoolStats() {
  let doneN = 0, prog = 0, none = 0;
  DB.arms.forEach((a) => SUBJECTS.forEach((s) => { const st = sheetInfo(a.id, s.id).st; if (done(st)) doneN++; else if (st === "none") none++; else prog++; }));
  const ready = DB.arms.filter((a) => armInfo(a.id).ready);
  const published = DB.arms.filter((a) => DB.published[a.id]);
  const reopens = [];
  DB.arms.forEach((a) => SUBJECTS.forEach((s) => { const sh = sheet(a.id, s.id); if (sh.reopen) reopens.push({ arm: a, subj: s, ...sh.reopen }); }));
  const behind = {};
  DB.arms.forEach((a) => SUBJECTS.forEach((s) => { const i = sheetInfo(a.id, s.id); if (i.st === "none" || (i.st === "progress" && i.pct < 0.5)) (behind[teacherOf(a.id, s.id)] ||= []).push(`${a.name} ${s.short}`); }));
  const behindList = Object.entries(behind).map(([t, l]) => ({ t, l })).sort((x, y) => y.l.length - x.l.length);
  const unlinked = DB.students.filter((s) => s.parent !== "linked").length;
  return { doneN, prog, none, total: DB.arms.length * SUBJECTS.length, ready, published, reopens, behindList, unlinked, students: DB.students.length };
}

/* ---------- small components ---------- */
const num = (v, d = 0) => `<span class="tab" data-count="${v}" data-dec="${d}">${fmt(v, d)}</span>`;
const chipFor = (st) => ({
  none: `<span class="chip"><i></i>Not started</span>`,
  progress: `<span class="chip warn"><i></i>In progress</span>`,
  ready: `<span class="chip info"><i></i>All scores in</span>`,
  complete: `<span class="chip ok"><i></i>Complete</span>`,
  locked: `<span class="chip ink"><i></i>Locked</span>`,
  published: `<span class="chip new"><i></i>Published</span>`,
})[st];
const bar = (frac, c, d = 0) => `<span class="bar"><i style="--w:${Math.max(0, Math.min(1, frac)) * 100}%;--c:${c};--d:${d}s"></i></span>`;
function ring(frac, col, track = "var(--sunk)", label = null, cls = "ring") {
  const r = 26, L = 2 * Math.PI * r;
  return `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${r}" fill="none" stroke-width="7" style="stroke:${track}"/><circle cx="32" cy="32" r="${r}" fill="none" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(L * Math.max(0, Math.min(1, frac))).toFixed(1)} ${L.toFixed(1)}" transform="rotate(-90 32 32)" style="stroke:${col};transition:stroke-dasharray .6s var(--spring)"/><text x="32" y="37" text-anchor="middle" style="font:600 14px var(--font);fill:currentColor">${label ?? Math.round(frac * 100) + "%"}</text></svg>`;
}
const initials = (s) => (s.first ? s.first[0] + s.last[0] : s.name.split(" ").map((x) => x[0]).join("").slice(0, 2));
const empty = (title, text) => `<div class="empty"><div class="blob3"><i style="background:#FADCE4"></i><i style="background:#E6E0FB"></i><i style="background:#DDF3E6"></i></div><b>${title}</b><p>${text}</p></div>`;

/* ---------- shell ---------- */
const NAV = {
  admin: [["home", "home", "Home"], ["classes", "classes", "Classes"], ["publish", "publish", "Publishing"], ["students", "students", "Students"], ["staff", "staff", "Staff"], ["settings", "settings", "Settings"]],
  teacher: [["home", "home", "Home"], ["classes", "classes", "My classes"], ["settings", "settings", "Settings"]],
  parent: [["home", "home", "Home"], ["results", "results", "Results"], ["settings", "settings", "Settings"]],
  super: [["home", "home", "Overview"], ["schools", "school", "Schools"], ["trials", "inbox", "Trial requests"], ["activity", "activity", "Activity"], ["settings", "settings", "Settings"]],
};
const navKey = (p) => ({ arm: "classes", scores: S.role === "teacher" ? "classes" : "classes" }[p] || p);
function crumbs() {
  const r = S.route;
  const top = NAV[S.role].find((n) => n[0] === navKey(r.p));
  const parts = [];
  if (r.p === "arm") parts.push(["classes", "Classes"], [null, arm(r.arm).name]);
  else if (r.p === "scores") { if (S.role === "admin") parts.push(["classes", "Classes"], ["arm:" + r.arm, arm(r.arm).name], [null, subj(r.subj).name]); else parts.push(["classes", "My classes"], [null, `${arm(r.arm).name} ${subj(r.subj).name}`]); }
  else parts.push([null, top ? top[2] : "Home"]);
  return parts.map(([go, l], i) => go ? `<button type="button" data-go="${go}">${esc(l)}</button>${icon("chevron")}` : `<b>${esc(l)}</b>`).join("");
}
function shell(body) {
  const me = ME[S.role];
  const unread = DB.notifs.filter((n) => n.role === S.role && !n.read).length;
  const st = S.role === "admin" ? schoolStats() : null;
  const current = navKey(S.route.p);
  const navBtn = ([k, ic, l]) => `<button type="button" data-go="${k}" ${current === k ? 'aria-current="page"' : ""}>${icon(ic)}${l}${k === "publish" && st && st.ready.length ? `<span class="count">${st.ready.length}</span>` : ""}${k === "trials" && openTrials().length ? `<span class="count">${openTrials().length}</span>` : ""}</button>`;
  return `<div class="shell">
    <aside class="side">
      <div class="brand"><i></i>Brillanda</div>
      ${S.role === "super" ? `<div class="school-pill"><span class="crest">B</span><div><b>Brillanda team</b><span>${DB.platform.schools.length} schools</span></div></div>` : `<div class="school-pill"><span class="crest">GC</span><div><b>${esc(DB.school.name)}</b><span>${esc(DB.school.term)}, week ${DB.school.week}</span></div></div>`}
      <nav class="nav" aria-label="Main">${NAV[S.role].map(navBtn).join("")}</nav>
      ${S.role === "super" ? `<div class="soon-box"><b>Trial requests</b>${openTrials().length ? `${openTrials().length} waiting for you` : "None waiting"}</div>` : S.role === "admin" ? `<div class="soon-box"><b>Coming soon</b>Attendance, fees, timetable and messages.</div>` : `<div class="soon-box"><b>${S.role === "teacher" ? "Scores due" : "Next up"}</b>${S.role === "teacher" ? DB.school.dueText : "First term exams, 1 December"}</div>`}
    </aside>
    <main class="main" id="main">
      <div class="top">
        <div class="brand m-brand" style="margin-right:auto;padding:0"><i></i>Brillanda</div>
        <div class="crumbs">${crumbs()}</div>
        <button class="search" type="button" data-act="palette" aria-label="Search">${icon("search")}<span>Search ${S.role === "parent" ? "results" : S.role === "super" ? "schools" : "classes, students"}</span><kbd>Ctrl K</kbd></button>
        <button class="round" type="button" data-act="notifs" aria-label="Notifications${unread ? `, ${unread} unread` : ""}">${icon("bell")}${unread ? '<span class="dot"></span>' : ""}</button>
        <button class="avatar" type="button" data-act="menu" aria-label="Account" style="background:var(--accent-soft);color:var(--accent)">${me.init}</button>
      </div>
      ${body}
    </main>
    <nav class="tabbar" aria-label="Main">${NAV[S.role].map(([k, ic, l]) => `<button type="button" data-go="${k}" ${current === k ? 'aria-current="page"' : ""}>${icon(ic)}${l.replace("My classes", "Classes")}</button>`).join("")}</nav>
  </div>`;
}

/* ============================================================
   ADMIN
   ============================================================ */
/* Carousel: a scroll-snap track with arrows and dots. Works with touch, trackpad and keyboard. */
function carousel(id, slides, label) {
  return `<div class="carousel" data-carousel="${id}" role="region" aria-roledescription="carousel" aria-label="${esc(label)}">
    <div class="c-track">${slides.map((s, i) => `<div class="c-slide" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${slides.length}">${s}</div>`).join("")}</div>
    ${slides.length > 1 ? `<div class="c-nav"><button class="c-btn" type="button" data-car="-1" aria-label="Previous" disabled>${icon("back")}</button><div class="c-dots">${slides.map((_, i) => `<button type="button" data-dot="${i}" aria-label="Show ${i + 1} of ${slides.length}" ${i === 0 ? 'aria-current="true"' : ""}></button>`).join("")}</div><button class="c-btn" type="button" data-car="1" aria-label="Next">${icon("chevron")}</button></div>` : ""}
  </div>`;
}
const carStep = (car) => { const tr = $(".c-track", car); return tr.firstElementChild.getBoundingClientRect().width + 14; };
const carIndex = (car) => Math.round($(".c-track", car).scrollLeft / carStep(car));
function carMove(car, i) { const n = $$(".c-slide", car).length; i = Math.max(0, Math.min(n - 1, i)); $(".c-track", car).scrollTo({ left: i * carStep(car), behavior: RM.matches ? "auto" : "smooth" }); }
function carSync(car) {
  const i = carIndex(car), n = $$(".c-slide", car).length;
  $$("[data-dot]", car).forEach((d) => d.toggleAttribute("aria-current", +d.dataset.dot === i));
  const [prev, next] = $$(".c-btn", car); if (prev) { prev.disabled = i <= 0; next.disabled = i >= n - 1; }
}

function aHome() {
  const s = schoolStats();
  const L = LEVELS;
  const weekly = [0, 0, 2, 5, 9, 14, 22, 33, 47, 61, s.doneN];
  const needs = [];
  s.reopens.forEach((r) => needs.push({ c: 1, av: initials(staff(r.by)), t: `${tname(r.by)} wants to reopen ${r.arm.name} ${r.subj.short}`, p: `“${r.reason}”`, acts: `<button class="btn sm" type="button" data-act="approve" data-arm="${r.arm.id}" data-subj="${r.subj.id}">Reopen</button><button class="btn sm ghosty" type="button" data-act="decline" data-arm="${r.arm.id}" data-subj="${r.subj.id}">Decline</button>` }));
  if (s.behindList.length) needs.push({ c: 3, av: String(s.behindList.length), t: `${plural(s.behindList.length, "teacher is", "teachers are")} behind`, p: s.behindList.slice(0, 2).map((b) => `${tname(b.t)} (${b.l.length})`).join(", ") + (s.behindList.length > 2 ? ` and ${s.behindList.length - 2} more` : ""), acts: `<button class="btn sm" type="button" data-act="remind-all">Send reminders</button>` });
  if (s.unlinked) needs.push({ c: 0, av: String(s.unlinked), t: `${s.unlinked} students have no parent linked`, p: "Their parents can't see results until they're invited.", acts: `<button class="btn sm" type="button" data-go="students" data-unlinked="1">Invite parents</button>` });
  const lede = s.ready.length
    ? `${s.doneN} of ${s.total} subjects are in, and ${plural(s.ready.length, "class is", "classes are")} ready to publish.`
    : `${s.doneN} of ${s.total} subjects are in. Scores are due ${DB.school.dueText}.`;
  const stats = [["check", "Subjects in", `${num(s.doneN)}<small>of ${s.total}</small>`, `${s.prog} in progress`, 0, "classes"], ["publish", "Ready to publish", `${num(s.ready.length)}<small>${s.ready.length === 1 ? "class" : "classes"}</small>`, s.published.length ? `${s.published.length} published` : "Waiting for you", 2, "publish"], ["inbox", "Reopen requests", num(s.reopens.length), s.reopens.length ? "Waiting for you" : "All clear", 5, "classes"], ["link", "Parents linked", `${num(Math.round(((s.students - s.unlinked) / s.students) * 100))}<small>%</small>`, `${s.unlinked} to invite`, 3, "students"]];
  return `
  <header class="hero pop"><span class="blob a"></span><span class="blob b"></span><span class="blob c"></span>
    <div><p class="kick">Monday 24 November. ${esc(DB.school.term)}, week ${DB.school.week} of ${DB.school.weeks}.</p><h1>${greet()}, ${ME.admin.short}</h1><p class="say">${lede}</p>
      <div class="acts"><button class="btn" type="button" data-go="publish">${s.ready.length ? "Review and publish" : "Open publishing"}</button><button class="btn soft" type="button" data-act="remind-all">Remind teachers</button></div></div>
    <div class="hero-art"><figure class="pcard" style="margin:0"><div class="img" style="background-image:url('img/teacher.jpg')" role="img" aria-label="A teacher entering scores on a laptop"></div><p><b>Mrs Okon finished SS 3A English</b>Yesterday at 4:12 pm. That's her last class this term.</p></figure></div>
  </header>
  <div class="stats">${stats.map(([ic, l, v, d, c, go], i) => `<button type="button" class="stat pop" style="--tint:${L[c].tint};--deep:${L[c].deep};--mid:${L[c].mid};--d:${i * 0.05}s" data-go="${go}"><div class="row"><span class="bub">${icon(ic)}</span><span class="delta">${esc(d)}</span></div><div><div class="lab">${l}</div><div class="val">${v}</div></div></button>`).join("")}</div>
  <div class="grid-2">
    <section class="card"><div class="card-h"><div><h2>Progress</h2><p>Subjects complete, out of 18 per class</p></div>
      <div class="tabs sm" role="tablist" aria-label="Progress view"><button role="tab" type="button" aria-selected="true" data-tabbtn="bycls">By class</button><button role="tab" type="button" aria-selected="false" data-tabbtn="weekly">Weekly</button></div></div>
      <div data-panel="bycls">${LEVELS.map((L2, li) => { const arms = DB.arms.filter((a) => a.level === li); const d = arms.reduce((n, a) => n + armInfo(a.id).doneN, 0); return `<button type="button" class="lv" data-go="classes" data-level="${li}"><b>${L2.k}</b>${bar(d / 18, L2.mid, li * 0.06)}<span class="v tab">${d} / 18</span></button>`; }).join("")}</div>
      <div data-panel="weekly" hidden>${weekChart(weekly, s.total)}</div>
    </section>
    <section class="card needs-card"><div class="card-h"><div><h2>Needs you</h2><p>${needs.length ? `${plural(needs.length, "thing")} to look at` : "All clear"}</p></div></div>
      ${needs.length ? carousel("needs", needs.map((n) => `<div class="need" style="--tint:${L[n.c].tint};--deep:${L[n.c].deep};--mid:${L[n.c].mid}"><div class="h"><span class="avatar">${esc(n.av)}</span><b>${esc(n.t)}</b></div><p>${esc(n.p)}</p><div class="acts">${n.acts}</div></div>`), "Needs you") : empty("Nothing needs you", "No requests and nobody behind. Enjoy the quiet.")}
    </section>
  </div>`;
}
function greet() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }


function weekChart(weeks, max) {
  const W = 440, H = 190, pl = 30, pr = 14, pt = 20, pb = 26;
  const x = (i) => pl + (i * (W - pl - pr)) / (weeks.length - 1);
  const y = (v) => pt + (1 - v / max) * (H - pt - pb);
  const line = weeks.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const last = weeks.length - 1;
  const ticks = [0, Math.round(max / 3), Math.round((2 * max) / 3), max];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Subjects complete by week: ${weeks.map((v, i) => `week ${i + 1}, ${v}`).join("; ")}">
    <defs><linearGradient id="wk" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:var(--chart);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--chart);stop-opacity:0"/></linearGradient></defs>
    ${ticks.map((t) => `<line x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}" style="stroke:var(--line)"/><text x="${pl - 8}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join("")}
    <path d="${line} L${x(last)} ${H - pb} L${x(0)} ${H - pb} Z" fill="url(#wk)"/>
    <path class="draw" pathLength="1" d="${line}" fill="none" style="stroke:var(--chart)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${[1, 4, 7, 11].map((w) => `<text x="${x(w - 1)}" y="${H - 6}" text-anchor="middle">Wk ${w}</text>`).join("")}
    <circle cx="${x(last)}" cy="${y(weeks[last])}" r="5.5" style="fill:var(--chart);stroke:var(--raise)" stroke-width="2.5"/>
    <text class="val" x="${x(last) - 10}" y="${y(weeks[last]) - 12}" text-anchor="end">${weeks[last]} of ${max}</text>
    ${weeks.map((v, i) => `<rect class="hit" x="${x(i) - 16}" y="${pt}" width="32" height="${H - pt - pb}" data-tip="<b>Week ${i + 1}</b><br>${v} subjects complete"/>`).join("")}
  </svg>`;
}

/* ---------- graphics ---------- */
function liquid(frac, k) {
  const wave = "M0 10 Q25 0 50 10 T100 10 T150 10 T200 10 T250 10 T300 10 T350 10 T400 10 V20 H0Z";
  return `<span class="liq" style="--p:${(0.08 + frac * 0.44).toFixed(3)};--d:${0.2 + k * 0.04}s" aria-hidden="true"><svg class="wv w1" viewBox="0 0 400 20" preserveAspectRatio="none"><path d="${wave}"/></svg><svg class="wv w2" viewBox="0 0 400 20" preserveAspectRatio="none"><path d="${wave}"/></svg></span>`;
}
let stampT;
function stamp(text) {
  const st = $("#stamp"); if (!st) return;
  $("#stamp-text").textContent = text;
  st.classList.remove("show"); void st.offsetWidth; st.classList.add("show");
  clearTimeout(stampT); stampT = setTimeout(() => st.classList.remove("show"), RM.matches ? 900 : 1900);
}

const SECTIONS = [
  { id: "jss", name: "Junior secondary", sub: "JSS 1 to JSS 3", levels: [0, 1, 2], tint: "#DDF3E6" },
  { id: "ss", name: "Senior secondary", sub: "SS 1 to SS 3", levels: [3, 4, 5], tint: "#DAEAFB" },
];
const classCat = (x) => (x.i.published ? "published" : x.i.ready ? "ready" : x.i.reopen ? "attention" : "progress");
const CAT_LABEL = { ready: "Ready", progress: "In progress", attention: "Needs you", published: "Published" };
function klassCard(x, k) {
  const L = lvl(x.a); const c = classCat(x);
  return `<button type="button" class="klass pop" style="${tint(x.a)};--d:${k * 0.03}s" data-go="arm:${x.a.id}" aria-label="${x.a.name}, ${x.i.doneN} of 9 subjects, ${CAT_LABEL[c]}">
      <div class="k-top"><span class="lvpill"><i></i>${L.k}</span><span class="st st-${c}"><i></i>${CAT_LABEL[c]}</span></div>
      <h3>${x.a.name}</h3>
      <div class="k-prog">${bar(x.i.doneN / 9, L.mid, 0.1 + k * 0.03)}<span class="tab">${x.i.doneN}/9</span></div>
      <div class="k-foot"><span>${studentsIn(x.a.id).length} students</span><span class="go">${icon("chevron")}</span></div>
      ${liquid(x.i.doneN / 9, k)}
    </button>`;
}
function sectionCard(sec) {
  const arms = DB.arms.filter((a) => sec.levels.includes(a.level));
  const xs = arms.map((a) => ({ a, i: armInfo(a.id) }));
  const doneN = xs.reduce((n, x) => n + x.i.doneN, 0), total = arms.length * 9;
  const rd = xs.filter((x) => classCat(x) === "ready").length, at = xs.filter((x) => classCat(x) === "attention").length, pub = xs.filter((x) => classCat(x) === "published").length;
  const studs = arms.reduce((n, a) => n + studentsIn(a.id).length, 0);
  const open = S.secOpen === sec.id;
  return `<button type="button" class="sec pop ${open ? "open" : ""}" style="--sec-tint:${sec.tint}" data-act="sec" data-k="${sec.id}" aria-expanded="${open}">
    <div class="sec-top"><div><h2>${sec.name}</h2><p>${sec.sub}. ${arms.length} classes, ${studs} students.</p></div>${ring(doneN / total, "var(--chart)", "var(--sunk)", `${Math.round((doneN / total) * 100)}%`, "ring sec-ring")}</div>
    <div class="sec-levels">${sec.levels.map((li) => { const la = arms.filter((a) => a.level === li); const d = la.reduce((n, a) => n + armInfo(a.id).doneN, 0); return `<div class="sec-lv"><span><i style="background:${LEVELS[li].mid}"></i>${LEVELS[li].k}</span>${bar(d / (la.length * 9), LEVELS[li].mid)}<span class="tab">${d}/${la.length * 9}</span></div>`; }).join("")}</div>
    <div class="sec-foot"><div class="sec-chips">${rd ? `<span class="st st-ready"><i></i>${rd} ready</span>` : ""}${at ? `<span class="st st-attention"><i></i>${at} ${at === 1 ? "needs" : "need"} you</span>` : ""}${pub ? `<span class="st st-published"><i></i>${pub} published</span>` : ""}${!rd && !at && !pub ? `<span class="st"><i></i>Scores coming in</span>` : ""}</div><span class="sec-open">${open ? "Hide classes" : "Show classes"}${icon("chevron")}</span></div>
  </button>`;
}
function sectionBody(sec) {
  return `<div class="sec-body pop" role="region" aria-label="${sec.name} classes">${sec.levels.map((li) => { const la = DB.arms.filter((a) => a.level === li);
    return `<div class="lvl-row"><div class="lvl-h"><b>${LEVELS[li].k}</b><span>${plural(la.length, "class", "classes")}, ${la.reduce((n, a) => n + studentsIn(a.id).length, 0)} students</span></div><div class="klasses">${la.map((a, k) => klassCard({ a, i: armInfo(a.id) }, k)).join("")}</div></div>`; }).join("")}</div>`;
}

function aClasses() {
  const f = S.classFilter, lvF = S.classLevel ?? "all";
  const all = DB.arms.map((a) => ({ a, i: armInfo(a.id) }));
  const count = (k) => all.filter((x) => classCat(x) === k).length;
  const tabs = [["all", "All", all.length], ["ready", "Ready", count("ready")], ["progress", "In progress", count("progress")], ["attention", "Needs you", count("attention")], ["published", "Published", count("published")]].filter(([k, , n]) => k === "all" || n);
  const list = all.filter((x) => (f === "all" || classCat(x) === f) && (lvF === "all" || x.a.level === +lvF));
  const ready = count("ready"), att = count("attention");
  const grouped = f === "all" && lvF === "all";
  return `
  <div class="page-h"><div><h1>Classes</h1><p>${ready ? `${plural(ready, "class is", "classes are")} ready to publish` : "No class is ready yet"}${att ? `, and ${plural(att, "needs", "need")} your attention` : ""}.</p></div></div>
  <div class="toolbar" style="justify-content:space-between">
    <div class="tabs" role="tablist" aria-label="Filter classes">${tabs.map(([k, l, n]) => `<button role="tab" type="button" data-act="class-filter" data-f="${k}" aria-selected="${f === k}">${l}<span class="tcount">${n}</span></button>`).join("")}</div>
    <select class="select pill" id="lv-sel" aria-label="Class level"><option value="all">Every level</option>${LEVELS.map((L, i) => `<option value="${i}" ${String(lvF) === String(i) ? "selected" : ""}>${L.k}</option>`).join("")}</select>
  </div>
  ${grouped ? `<div class="secs">${SECTIONS.map((sec) => sectionCard(sec) + (S.secOpen === sec.id ? sectionBody(sec) : "")).join("")}</div>`
    : list.length ? `<div class="klasses">${list.map(klassCard).join("")}</div>` : `<div class="card">${empty("No classes here", "Try another filter or level.")}</div>`}`;
}

function aArm() {
  const a = arm(S.route.arm); const inf = armInfo(a.id);
  const tab = S.route.tab || "subjects";
  const L = lvl(a);
  const res = inf.doneN === 9 ? armResults(a.id) : null;
  const subjects = `<section class="card"><div class="rows">
    <div class="r r-subj r-head"><span>Subject</span><span class="hide-m">Progress</span><span class="hide-m">Status</span><span></span></div>
    ${inf.subs.map((x) => { const key = `${a.id}:${x.s.id}`; const t = teacherOf(a.id, x.s.id);
      let acts = `<button class="btn sm white" type="button" data-go="scores:${a.id}:${x.s.id}">${icon("eye")}View</button>`;
      if (x.sh.reopen) acts = `<button class="btn sm" type="button" data-act="approve" data-arm="${a.id}" data-subj="${x.s.id}">Reopen</button><button class="btn sm white" type="button" data-act="decline" data-arm="${a.id}" data-subj="${x.s.id}">Decline</button>`;
      else if (!done(x.st) && x.st !== "ready") acts = `<button class="btn sm ${DB.reminded[key] ? "white" : "tint"}" type="button" data-act="remind" data-key="${key}" ${DB.reminded[key] ? "disabled" : ""}>${DB.reminded[key] ? `${icon("check")}Reminded` : "Remind"}</button>` + acts;
      return `<div class="r r-subj"><div><b>${x.s.name}</b><div class="sub">${esc(tname(t))}${x.sh.reopen ? `. <span style="color:var(--bad)">Asked to reopen: “${esc(x.sh.reopen.reason)}”</span>` : ""}</div></div>
        <div class="hide-m" style="display:flex;align-items:center;gap:10px">${bar(x.pct, L.mid)}<span class="sub tab" style="white-space:nowrap">${x.complete}/${x.n}</span></div>
        <div class="hide-m">${DB.published[a.id] ? chipFor("published") : chipFor(x.st)}</div><div class="end">${acts}</div></div>`; }).join("")}
  </div></section>`;
  const studs = `<section class="card"><div class="rows">
    <div class="r r-stud r-head"><span></span><span>Student</span><span class="hide-m">Parent</span><span class="hide-m">${res ? "Average" : "Progress"}</span><span>${res ? "Position" : ""}</span></div>
    ${studentsIn(a.id).map((s) => { const r = res ? res.res.find((x) => x.id === s.id) : null; const doneSubs = SUBJECTS.filter((sb) => rowOf(sheet(a.id, sb.id).entries[s.id]).complete).length;
      return `<div class="r r-stud" style="cursor:pointer" data-act="student" data-id="${s.id}"><span class="avatar av-sm" style="background:${L.tint};color:${L.deep}">${initials(s)}</span><div><b>${esc(s.first)} ${esc(s.last)}</b></div><div class="hide-m">${parentChip(s)}</div><div class="hide-m tab">${r ? fmt(r.avg, 2) : `${doneSubs} of 9 subjects`}</div><div class="end tab">${r ? `${ord(r.pos)} of ${res.of}` : ""}</div></div>`; }).join("")}
  </div></section>`;
  return `
  <div class="aband pop" style="${tint(a)}"><div><h1>${a.name}</h1><p>${studentsIn(a.id).length} students. Form teacher ${esc(tname(a.form))}.</p></div>
    <div class="figs"><div><span>Subjects complete</span><b class="tab">${inf.doneN} of 9</b></div><div><span>Status</span><b style="font-size:20px">${inf.published ? "Published" : inf.ready ? "Ready to publish" : "Scores coming in"}</b></div></div></div>
  <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center">
    <div class="tabs" role="tablist"><button role="tab" type="button" aria-selected="${tab === "subjects"}" data-go="arm:${a.id}:subjects">Subjects</button><button role="tab" type="button" aria-selected="${tab === "students"}" data-go="arm:${a.id}:students">Students</button></div>
    ${inf.ready ? `<button class="btn" type="button" data-act="publish-one" data-arm="${a.id}">${icon("publish")}Publish ${a.name}</button>` : inf.published ? `<button class="btn white" type="button" data-act="report" data-id="${studentsIn(a.id)[0].id}">${icon("file")}Preview a report card</button>` : ""}
  </div>
  ${tab === "students" ? studs : subjects}`;
}
const parentChip = (s) => s.parent === "linked" ? `<span class="chip ok"><i></i>Linked</span>` : s.parent === "invited" ? `<span class="chip info"><i></i>Invite sent</span>` : `<span class="chip warn"><i></i>Not linked</span>`;

function aPublish() {
  const s = schoolStats();
  if (!S.pubSel) S.pubSel = new Set(s.ready.map((a) => a.id));
  const coming = DB.arms.filter((a) => { const i = armInfo(a.id); return !i.ready && !i.published; });
  const tab = S.pubTab || (s.ready.length ? "ready" : "coming");
  const sel = [...S.pubSel].filter((id) => armInfo(id).ready);
  const studentsSel = sel.reduce((n, id) => n + studentsIn(id).length, 0);
  const lists = { ready: s.ready, coming, published: s.published };
  const tabs = [["ready", "Ready", s.ready.length], ["coming", "Still coming in", coming.length], ["published", "Published", s.published.length]];
  const row = (a) => { const i = armInfo(a.id); const L = lvl(a);
    const lead = tab === "ready" ? `<input class="check" type="checkbox" aria-label="Select ${a.name}" data-act="pub-toggle" data-arm="${a.id}" ${S.pubSel.has(a.id) ? "checked" : ""}>` : `<span></span>`;
    const mid = tab === "coming" ? `<div class="hide-m" style="display:flex;align-items:center;gap:10px">${bar(i.doneN / 9, L.mid)}<span class="sub tab" style="white-space:nowrap">${9 - i.doneN} to go</span></div>` : `<span class="hide-m sub">${studentsIn(a.id).length} report cards${i.published ? `, published ${DB.published[a.id].at}` : ""}</span>`;
    const end = tab === "coming" ? `<button class="btn sm white" type="button" data-go="arm:${a.id}">Open</button>` : `<button class="btn sm white" type="button" data-act="report" data-id="${studentsIn(a.id)[0].id}">${icon("eye")}Preview</button>`;
    return `<div class="r r-pub">${lead}<div style="display:flex;align-items:center;gap:12px"><span class="avatar av-sm" style="background:${L.tint};color:${L.deep}">${a.name.split(" ")[1]}</span><b>${a.name}</b></div>${mid}<div class="end">${end}</div></div>`; };
  const emptyText = { ready: ["Nothing to publish yet", "A class lands here the moment its ninth subject is marked complete."], coming: ["Every class is in", "Nothing is still coming in."], published: ["Nothing published yet", "Classes you publish this term appear here."] }[tab];
  return `
  <div class="page-h"><div><h1>Publishing</h1><p>Publishing locks a class's scores and sends every parent the report card, straight away.</p></div></div>
  <div class="tabs" role="tablist" aria-label="Publishing">${tabs.map(([k, l, n]) => `<button role="tab" type="button" data-act="pub-tab" data-k="${k}" aria-selected="${tab === k}">${l}<span class="tcount">${n}</span></button>`).join("")}</div>
  <section class="card">${lists[tab].length ? `<div class="rows">${lists[tab].map(row).join("")}</div>` : empty(...emptyText)}</section>
  ${tab === "ready" && s.ready.length ? `<div class="actionbar pop"><div><b>${plural(sel.length, "class", "classes")} selected</b><span>${studentsSel} report cards, ${sel.reduce((n, id) => n + studentsIn(id).filter((x) => x.parent === "linked").length, 0)} parents emailed</span></div><button class="btn" type="button" data-act="publish" ${sel.length ? "" : "disabled"}>${icon("publish")}Publish</button></div>` : ""}`;
}


function aStudents() {
  return `
  <div class="page-h"><div><h1>Students</h1><p>${DB.students.length} students in ${DB.arms.length} classes. ${schoolStats().unlinked} still need a parent linked before they can see results.</p></div>
    <div class="acts"><button class="btn white" type="button" data-act="import">${icon("upload")}Import from a spreadsheet</button></div></div>
  <div class="toolbar">
    <div class="searchbox">${icon("search")}<input class="input" id="st-q" type="search" placeholder="Search by name" value="${esc(S.stq)}" aria-label="Search students"></div>
    <label class="toggle"><input type="checkbox" id="st-unlinked" ${S.stUnlinked ? "checked" : ""}>No parent linked</label>
    <button class="link" type="button" data-act="st-all" style="margin-left:auto">${S.stOpen.size ? "Collapse all" : "Expand all"}</button>
  </div>
  <div id="st-list">${studentGroups()}</div>`;
}
function studentGroups() {
  const q = S.stq.trim().toLowerCase();
  const match = (s) => (!q || `${s.first} ${s.last}`.toLowerCase().includes(q)) && (!S.stUnlinked || s.parent !== "linked");
  const filtering = !!q || S.stUnlinked;
  const out = SECTIONS.map((sec) => {
    const groups = DB.arms.filter((a) => sec.levels.includes(a.level)).map((a) => ({ a, list: studentsIn(a.id).filter(match) })).filter((g) => g.list.length);
    if (!groups.length) return "";
    const n = groups.reduce((t, g) => t + g.list.length, 0);
    return `<section class="st-sec"><div class="st-sec-h"><h2>${sec.name}</h2><span>${filtering ? `${plural(n, "match", "matches")} in ${plural(groups.length, "class", "classes")}` : `${n} students, ${plural(groups.length, "class", "classes")}`}</span></div>${groups.map((g, i) => stGroup(g, filtering, i)).join("")}</section>`;
  }).join("");
  return out || `<div class="card">${empty("No students match", q ? `Nobody called “${esc(S.stq)}”. Check the spelling.` : "Every student has a parent linked.")}</div>`;
}
function stGroup({ a, list }, filtering, i) {
  const open = filtering || S.stOpen.has(a.id);
  const unl = list.filter((s) => s.parent !== "linked").length;
  return `<div class="sgrp ${open ? "open" : ""}" style="${tint(a)};--d:${i * 0.03}s">
    <button type="button" class="sgrp-h" data-act="st-group" data-arm="${a.id}" aria-expanded="${open}">
      <span class="avatar">${a.name.split(" ")[1]}</span>
      <span class="sgrp-t"><b>${a.name}</b><span>${plural(list.length, "student")}${unl ? `, ${unl} without a parent` : ""}</span></span>
      <span class="avstack" aria-hidden="true">${list.slice(0, 4).map((s) => `<i>${esc(s.first[0])}</i>`).join("")}${list.length > 4 ? `<i class="more">+${list.length - 4}</i>` : ""}</span>
      <span class="chev">${icon("chevron")}</span>
    </button>
    ${open ? `<div class="sgrp-b"><div class="rows">${list.map((s) => `<div class="r r-stud2"><span class="avatar av-sm">${initials(s)}</span><button type="button" class="link" style="color:var(--ink);text-align:left;font-size:14px" data-act="student" data-id="${s.id}"><b>${esc(s.first)} ${esc(s.last)}</b></button><span class="hide-m">${parentChip(s)}</span><div class="end">${s.parent === "none" ? `<button class="btn sm tint" type="button" data-act="invite-parent" data-id="${s.id}">${icon("mail")}Invite parent</button>` : ""}</div></div>`).join("")}</div></div>` : ""}
  </div>`;
}

function aStaff() {
  const rows = DB.staff.map((t) => {
    const mine = []; DB.arms.forEach((a) => SUBJECTS.forEach((s) => { if (teacherOf(a.id, s.id) === t.id) mine.push(sheetInfo(a.id, s.id)); }));
    const d = mine.filter((x) => done(x.st)).length;
    const subjects = [...new Set(DB.arms.flatMap((a) => SUBJECTS.filter((s) => teacherOf(a.id, s.id) === t.id).map((s) => s.short)))].join(", ");
    return { t, mine, d, subjects };
  });
  return `
  <div class="page-h"><div><h1>Staff</h1><p>${DB.staff.length} teachers. Each one only sees the classes and subjects they're assigned.</p></div><div class="acts"><button class="btn" type="button" data-act="invite-staff">${icon("plus")}Invite staff</button></div></div>
  <section class="card"><div class="rows">
    <div class="r r-staff r-head"><span></span><span>Name</span><span class="hide-m">Teaches</span><span class="hide-m">Sheets complete</span><span></span></div>
    ${rows.map(({ t, mine, d, subjects }, i) => `<div class="r r-staff"><span class="avatar av-sm" style="background:${LEVELS[i % 6].tint};color:${LEVELS[i % 6].deep}">${initials(t)}</span><div><b>${t.title} ${esc(t.name)}</b><div class="sub">${esc(t.email)}</div></div><span class="hide-m sub">${subjects ? `${esc(subjects)}, ${plural(mine.length, "class", "classes")}` : "Not assigned yet"}</span>
      <div class="hide-m" style="display:flex;gap:10px;align-items:center">${mine.length ? bar(d / mine.length, LEVELS[i % 6].mid) + `<span class="sub tab">${d}/${mine.length}</span>` : ""}</div>
      <div class="end">${t.status === "invited" ? `<span class="chip info"><i></i>Invite sent</span>` : d < mine.length ? `<button class="btn sm ${DB.reminded[t.id] ? "white" : "tint"}" type="button" data-act="remind-teacher" data-id="${t.id}" ${DB.reminded[t.id] ? "disabled" : ""}>${DB.reminded[t.id] ? `${icon("check")}Reminded` : "Remind"}</button>` : `<span class="chip ok"><i></i>All done</span>`}</div></div>`).join("")}
  </div></section>`;
}

/* ============================================================
   SCORE SHEET (teacher edits; admin views)
   ============================================================ */
function scoresPage() {
  const a = arm(S.route.arm), sb = subj(S.route.subj);
  const inf = sheetInfo(a.id, sb.id);
  const isTeacher = S.role === "teacher";
  const editable = isTeacher && !done(inf.st) && !DB.published[a.id];
  const L = lvl(a);
  let banner = "";
  if (!isTeacher) banner = `<div class="banner info"><span>You're viewing ${esc(tname(teacherOf(a.id, sb.id)))}'s sheet. Only the subject teacher can change scores.</span></div>`;
  else if (inf.sh.reopen) banner = `<div class="banner warn"><span><b>Reopen request sent.</b> Waiting for Mrs Adeyemi: “${esc(inf.sh.reopen.reason)}”</span></div>`;
  else if (inf.st === "locked" || DB.published[a.id]) banner = `<div class="banner info"><span>${icon("lock")} <b>Locked for publishing.</b> To change a score, ask Mrs Adeyemi to reopen this sheet.</span><button class="btn sm" type="button" data-act="ask-reopen">Ask to reopen</button></div>`;
  else if (inf.st === "complete") banner = `<div class="banner ok"><span><b>Marked complete.</b> Mrs Adeyemi has been told. Need to fix something?</span><button class="btn sm" type="button" data-act="ask-reopen">Ask to reopen</button></div>`;
  const canMark = editable;
  return `
  <div class="sheet-top">
    <div style="display:flex;align-items:center;gap:14px"><span class="avatar" style="background:${L.tint};color:${L.deep}">${a.name.split(" ")[1]}</span><div><h1 style="font-size:clamp(24px,3.4cqi,34px);font-weight:500;letter-spacing:-0.03em;line-height:1.1">${a.name} ${sb.name}</h1><p class="muted" style="font-size:14px">${inf.n} students. ${COMPONENTS.map((c) => `${c.name} out of ${c.max}`).join(", ")}.</p></div></div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">${editable ? `<span class="saved" id="saved"><i></i><span>All changes saved</span></span>` : chipFor(DB.published[a.id] ? "published" : inf.st)}
      ${canMark ? `<button class="btn" type="button" data-act="mark-complete" id="mark-btn" ${inf.complete === inf.n && !Object.keys(S.errors).length ? "" : "disabled"}>${icon("check")}Mark complete</button>` : ""}</div>
  </div>
  ${banner}
  <div class="sheet-wrap">
    <div class="grid-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 10px 4px;flex-wrap:wrap">
        <span class="muted" style="font-size:13.5px" id="prog-text">${inf.complete} of ${inf.n} students have every score</span>
        ${editable ? `<label class="toggle"><input type="checkbox" id="missing-only" ${S.missingOnly ? "checked" : ""}>Only students with gaps</label>` : ""}
      </div>
      <div class="gscroll"><table class="sg" aria-label="${a.name} ${sb.name} scores">
        <thead><tr><th class="idx">#</th><th>Student</th>${COMPONENTS.map((c) => `<th class="n">${c.name}<br><span style="font-weight:400">/ ${c.max}</span></th>`).join("")}<th class="n">Total</th><th class="n">Grade</th></tr></thead>
        <tbody>${inf.rows.map((r, i) => { const e = inf.sh.entries[r.s.id]; return `<tr class="row ${S.missingOnly && editable && r.complete ? "hide" : ""} ${S.focusStudent === r.s.id ? "focus" : ""}" data-sid="${r.s.id}"><td class="idx">${i + 1}</td><td class="nm"><b>${esc(r.s.last)}</b>, ${esc(r.s.first)}</td>
          ${COMPONENTS.map((c) => { const v = e[c.id]; return `<td class="n"><input class="cell ${v === "ABS" ? "abs" : ""}" type="text" inputmode="decimal" autocomplete="off" aria-label="${esc(r.s.first)} ${esc(r.s.last)}, ${c.name}" data-s="${r.s.id}" data-c="${c.id}" value="${v === null || v === undefined ? "" : v}" ${editable ? "" : "disabled"}></td>`; }).join("")}
          <td class="n tot tab" id="tot-${r.s.id}">${r.filled ? fmt(r.total, r.total % 1 ? 1 : 0) : "—"}</td><td class="n" id="gr-${r.s.id}">${r.complete ? gradeBadge(r.total) : ""}</td></tr>`; }).join("")}</tbody>
      </table></div>
      <div class="gerr" id="gerr" role="alert"></div>
      ${editable ? `<p class="muted" style="font-size:12.5px;padding:0 12px 10px">Type a score, or ABS for an absent student. Enter and the arrow keys move between cells; everything saves as you go.</p>` : ""}
    </div>
    <aside class="side-stats">
      <section class="card"><div class="card-h"><h2>Grades so far</h2></div><div class="dist" id="dist">${distHTML(inf)}</div></section>
      <section class="card"><dl class="kv" id="kv">${kvHTML(inf)}</dl></section>
    </aside>
  </div>`;
}
function distHTML(inf) {
  const sc = scaleSorted();
  const counts = sc.map((b) => inf.rows.filter((r) => r.complete && gradeOf(r.total).g === b.g).length);
  const max = Math.max(1, ...counts);
  return sc.map((b, i) => `<div data-tip="<b>Grade ${b.g}</b> (${b.min} and up)<br>${plural(counts[i], "student")}"><b class="tab">${counts[i]}</b><i style="height:${Math.max(3, (counts[i] / max) * 96)}px;background:${gtone(b.g) === "ok" ? "#1baf7a" : gtone(b.g) === "warn" ? "#eda100" : "#e87ba4"}"></i><span>${b.g}</span></div>`).join("");
}
function kvHTML(inf) {
  const c = inf.rows.filter((r) => r.complete);
  const tots = c.map((r) => r.total);
  const avg = tots.length ? tots.reduce((a, b) => a + b, 0) / tots.length : 0;
  return `<dt>Class average</dt><dd class="tab">${tots.length ? fmt(avg, 1) : "—"}</dd><dt>Highest</dt><dd class="tab">${tots.length ? Math.max(...tots) : "—"}</dd><dt>Lowest</dt><dd class="tab">${tots.length ? Math.min(...tots) : "—"}</dd><dt>Absent for a paper</dt><dd class="tab">${inf.rows.filter((r) => r.abs).length}</dd><dt>Still to enter</dt><dd class="tab">${inf.n - inf.complete}</dd>`;
}
let saveT;
function onCell(inp) {
  const sid = inp.dataset.s, cid = inp.dataset.c;
  const comp = COMPONENTS.find((c) => c.id === cid);
  const raw = inp.value.trim().toUpperCase();
  const key = `${sid}:${cid}`;
  let val = null, err = null;
  if (raw === "") val = null;
  else if (["A", "AB", "ABS"].includes(raw)) val = "ABS";
  else if (/^\d+(\.\d+)?$/.test(raw)) { const n = parseFloat(raw); if (n > comp.max) err = `${comp.name} is out of ${comp.max}, so ${raw} is too high.`; else val = round2(n); }
  else err = `Type a score from 0 to ${comp.max}, or ABS if the student was absent.`;
  const sh = sheet(S.route.arm, S.route.subj);
  if (err) { S.errors[key] = err; inp.classList.add("bad"); inp.setAttribute("aria-invalid", "true"); }
  else {
    delete S.errors[key]; inp.classList.remove("bad"); inp.removeAttribute("aria-invalid");
    sh.entries[sid][cid] = val; inp.classList.toggle("abs", val === "ABS");
    if (sh.status === "none" && val !== null) sh.status = "progress";
    const r = rowOf(sh.entries[sid]);
    $("#tot-" + sid).textContent = r.filled ? fmt(r.total, r.total % 1 ? 1 : 0) : "—";
    $("#gr-" + sid).innerHTML = r.complete ? gradeBadge(r.total) : "";
    const sv = $("#saved"); if (sv) { sv.classList.add("saving"); sv.lastElementChild.textContent = "Saving"; clearTimeout(saveT); saveT = setTimeout(() => { sv.classList.remove("saving"); sv.lastElementChild.textContent = "All changes saved"; }, 600); }
  }
  const errs = Object.values(S.errors);
  $("#gerr").textContent = errs.length ? errs[errs.length - 1] : "";
  const inf = sheetInfo(S.route.arm, S.route.subj);
  $("#dist").innerHTML = distHTML(inf); $("#kv").innerHTML = kvHTML(inf);
  $("#prog-text").textContent = `${inf.complete} of ${inf.n} students have every score`;
  const mb = $("#mark-btn"); if (mb) mb.disabled = !(inf.complete === inf.n && !errs.length);
}
function cellNav(e) {
  const inp = e.target; if (!inp.classList.contains("cell")) return;
  const tr = inp.closest("tr"); const td = inp.closest("td"); const col = [...tr.children].indexOf(td);
  const rows = $$("tr.row", tr.parentElement).filter((r) => !r.classList.contains("hide"));
  const ri = rows.indexOf(tr);
  const focusAt = (r, c) => { const t = r && r.children[c]; const x = t && t.querySelector(".cell"); if (x) { x.focus(); x.select(); e.preventDefault(); } };
  if (e.key === "ArrowDown" || e.key === "Enter") focusAt(rows[ri + 1], col);
  else if (e.key === "ArrowUp") focusAt(rows[ri - 1], col);
  else if (e.key === "ArrowRight" && inp.selectionStart === inp.value.length) focusAt(tr, col + 1);
  else if (e.key === "ArrowLeft" && inp.selectionStart === 0) focusAt(tr, col - 1);
}

/* ============================================================
   TEACHER
   ============================================================ */
function myClasses() { return BAKARE_ARMS.map((id) => ({ a: arm(id), ...sheetInfo(id, "maths") })); }
function tHome(onlyList) {
  const list = myClasses();
  const fin = list.filter((x) => done(x.st)).length;
  const ready = list.find((x) => x.st === "ready");
  const cont = list.find((x) => x.st === "progress") || list.find((x) => x.st === "none");
  const next = cont ? cont.rows.find((r) => !r.complete) : null;
  const lede = `You've finished ${fin} of your ${list.length} classes.${ready ? ` ${ready.a.name} is ready to mark complete.` : ""}${cont && next ? ` Next up in ${cont.a.name}: ${next.s.first} ${next.s.last}.` : ""}`;
  const cards = `<div class="tclasses">${list.map((x, i) => {
    const sc = scaleSorted(); const counts = sc.map((b) => x.rows.filter((r) => r.complete && gradeOf(r.total).g === b.g).length); const max = Math.max(1, ...counts);
    return `<div class="tc pop" style="${tint(x.a)};--d:${i * 0.05}s"><div class="row"><div><h3>${x.a.name}</h3><p>Mathematics, ${x.n} students</p></div>${ring(x.pct, "var(--deep)", "rgba(255,255,255,.7)", `${x.complete}`)}</div>
      <div class="mini" aria-label="Grades so far">${x.complete ? counts.map((c, k) => `<div style="display:grid;justify-items:center;gap:2px"><i style="height:${Math.max(2, (c / max) * 26)}px"></i><span>${sc[k].g}</span></div>`).join("") : `<span style="font-size:12.5px;opacity:.8;align-self:center">No scores yet</span>`}</div>
      <div class="row" style="align-items:center">${chipFor(DB.published[x.a.id] ? "published" : x.st)}<div class="acts">${x.st === "ready" ? `<button class="btn sm dark" type="button" data-act="mark-complete" data-arm="${x.a.id}">Mark complete</button>` : ""}<button class="btn sm" type="button" data-go="scores:${x.a.id}:maths">${done(x.st) ? "View" : "Enter scores"}</button></div></div></div>`; }).join("")}</div>`;
  if (onlyList) return `<div class="page-h"><div><h1>My classes</h1><p>Mathematics in four arms. Open one to enter or check scores.</p></div></div>${cards}`;
  return `
  <header class="hero pop"><span class="blob a"></span><span class="blob b"></span><span class="blob c"></span>
    <div><p class="kick">Monday 24 November. ${esc(DB.school.term)}, week ${DB.school.week} of ${DB.school.weeks}.</p><h1>${greet()}, ${ME.teacher.first}</h1><p class="say">${lede}</p>
      <div class="acts">${cont ? `<button class="btn" type="button" data-go="scores:${cont.a.id}:maths" data-focus="${next ? next.s.id : ""}">Continue ${cont.a.name}</button>` : ""}${ready ? `<button class="btn soft" type="button" data-act="mark-complete" data-arm="${ready.a.id}">Mark ${ready.a.name} complete</button>` : ""}</div></div>
    <figure class="pcard" style="margin:0"><div class="img" style="background-image:url('img/hands.jpg')" role="img" aria-label="Pupils raising their hands"></div><p><b>${list.reduce((n, x) => n + x.n, 0)} students this term</b>Across JSS 2A, JSS 2B, SS 1A and SS 2A.</p></figure>
  </header>
  <section><div class="card-h"><div><h2>Your classes</h2></div><button class="link" type="button" data-go="classes">See all</button></div>${cards}</section>`;
}

/* ============================================================
   PARENT
   ============================================================ */
function childTerms(cid) {
  const h = DB.history[cid];
  const s = student(cid);
  const terms = h.terms.map((t) => ({ ...t, arm: h.arm, of: h.of, current: false }));
  if (DB.published[s.arm]) {
    const res = armResults(s.arm); const me = res.res.find((r) => r.id === cid);
    terms.push({ id: "2026-1", label: "First term, 2026/2027", short: "First", current: true, isNew: !DB.seen?.[cid], pos: me.pos, of: res.of, arm: arm(s.arm).name, published: DB.published[s.arm].at, scores: me.totals, remark: `${s.first} has worked steadily this term.`, by: `${tname(arm(s.arm).form)}, form teacher`, principal: "Well done. Keep going." });
  }
  terms.forEach((t) => { t.avg = round2(t.scores.reduce((a, b) => a + b, 0) / t.scores.length); });
  return terms;
}
function termEntry(cid, t, i) {
  if (t.current) { const s = student(cid); const e = sheet(s.arm, SUBJECTS[i].id).entries[cid]; return { ca1: e.ca1, ca2: e.ca2, exam: e.exam }; }
  const tot = t.scores[i]; const ca1 = Math.round(tot * 0.19), ca2 = Math.round(tot * 0.2); return { ca1, ca2, exam: tot - ca1 - ca2 };
}
function pHome() {
  const cid = S.child; const s = student(cid);
  const terms = childTerms(cid); const t = terms[terms.length - 1]; const prev = terms[terms.length - 2];
  const diff = prev ? t.avg - prev.avg : 0;
  const best = t.scores.indexOf(Math.max(...t.scores));
  const slides = [
    t.current ? `<div class="slide-note ok">${icon("spark")}<div><b>New results</b><p>${s.first}'s first term results were published ${esc(t.published)}.</p></div></div>` : `<div class="slide-note">${icon("clock")}<div><b>First term results aren't out yet</b><p>You'll get an email when ${esc(DB.school.name)} publishes them.</p></div></div>`,
    `<div class="remark"><p>“${esc(t.remark)}”</p><small>${esc(t.by)}</small></div>`,
    `<div class="news"><div class="img" style="background-image:url('img/family.jpg')" role="img" aria-label="A family at home"></div><div><b>Parents' evening</b><p>Thursday 4 December, 4 pm. Meet ${s.first}'s teachers at ${esc(DB.school.name)}.</p></div></div>`,
    `<div class="slide-note">${icon("clock")}<div><b>Next term begins</b><p>${esc(DB.school.nextTerm)}.</p></div></div>`,
  ];
  return `
  <header class="p-hero pop">
    <div>
      <div class="kids" role="group" aria-label="Child">${CHILDREN.map((k) => { const c = student(k); const nw = childTerms(k).some((x) => x.isNew); return `<button type="button" class="kid" data-act="child" data-id="${k}" aria-pressed="${k === cid}"><span class="avatar" style="background:${lvl(arm(c.arm)).tint};color:${lvl(arm(c.arm)).deep}">${initials(c)}</span>${c.first}${nw ? '<span class="new-dot" aria-label="New results"></span>' : ""}</button>`; }).join("")}</div>
      <h1>${s.first} came ${ord(t.pos)} of ${t.of}.</h1>
      <p class="say">${t.label}, ${t.arm}. Average ${fmt(t.avg, 1)}${prev ? `, ${diff >= 0 ? "up" : "down"} ${fmt(Math.abs(diff), 1)} on the term before` : ""}.</p>
      <div class="acts"><button class="btn" type="button" data-act="report" data-id="${cid}" data-term="${t.id}">${icon("file")}View report card</button><button class="btn soft" type="button" data-go="results">All results</button></div>
    </div>
    <div class="medal" aria-hidden="true">${ring(t.avg / 100, "var(--chart)", "rgba(255,255,255,.35)", fmt(t.avg, 1), "ringbig")}<i class="spk s1"></i><i class="spk s2"></i><i class="spk s3"></i><i class="spk s4"></i></div>
  </header>
  <div class="grid-2">
    <section class="card subj-card"><div class="card-h"><div><h2>Subjects</h2><p>Best: ${SUBJECTS[best].name}. Tap one for the breakdown.</p></div></div>
      <div class="subj-list">${SUBJECTS.map((sb, i) => `<button type="button" class="sl" data-act="subject" data-id="${cid}" data-term="${t.id}" data-i="${i}"><span class="sw" style="background:${LEVELS[i % 6].mid}"></span><span>${sb.name}</span><span class="v tab">${t.scores[i]}</span>${gradeBadge(t.scores[i])}${bar(t.scores[i] / 100, LEVELS[i % 6].mid, i * 0.04)}</button>`).join("")}</div>
      <button class="link more-btn" type="button" data-act="more">Show all 9 subjects</button></section>
    <div style="display:grid;gap:16px;align-content:start">
      <section class="card"><div class="card-h"><div><h2>From school</h2></div></div>${carousel("school", slides, "From school")}</section>
      <section class="card"><div class="card-h"><div><h2>Average by term</h2><p>${terms.length} terms</p></div></div>${trendChart(terms)}</section>
    </div>
  </div>`;
}

function trendChart(terms) {
  const W = 420, H = 170, pl = 30, pr = 16, pt = 22, pb = 26, lo = 40, hi = 90;
  const n = terms.length;
  const x = (i) => pl + (n === 1 ? (W - pl - pr) / 2 : (i * (W - pl - pr)) / (n - 1));
  const y = (v) => pt + ((hi - v) / (hi - lo)) * (H - pt - pb);
  const pts = terms.map((t, i) => [x(i), y(t.avg)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Average by term: ${terms.map((t) => `${t.label} ${fmt(t.avg, 1)}`).join("; ")}">
    <defs><linearGradient id="tr" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:var(--chart);stop-opacity:.25"/><stop offset="1" style="stop-color:var(--chart);stop-opacity:0"/></linearGradient></defs>
    ${[50, 70, 90].map((v) => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" style="stroke:var(--line)"/><text x="${pl - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join("")}
    <path d="${line} L${pts[n - 1][0]} ${H - pb} L${pts[0][0]} ${H - pb} Z" fill="url(#tr)"/><path class="draw" pathLength="1" d="${line}" fill="none" style="stroke:var(--chart)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${terms.map((t, i) => `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${t.short}${t.current ? " ’26" : ""}</text>`).join("")}
    ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === n - 1 ? 5.5 : 4}" style="fill:var(--chart);stroke:var(--raise)" stroke-width="2.5"/>`).join("")}
    <text class="val" x="${pts[n - 1][0] - 8}" y="${pts[n - 1][1] - 12}" text-anchor="end">${fmt(terms[n - 1].avg, 1)}</text>
    ${terms.map((t, i) => `<rect class="hit" x="${x(i) - 24}" y="${pt - 10}" width="48" height="${H - pt - pb + 10}" data-tip="<b>${esc(t.label)}</b><br>Average ${fmt(t.avg, 1)}, ${ord(t.pos)} of ${t.of}"/>`).join("")}
  </svg>`;
}
function pResults() {
  const cid = S.child; const s = student(cid); const terms = childTerms(cid);
  const t = terms.find((x) => x.id === S.route.term) || terms[terms.length - 1];
  if (t.current && t.isNew) { DB.seen = { ...(DB.seen || {}), [cid]: true }; }
  return `
  <div class="page-h"><div><h1>${s.first}'s results</h1><p>Every published term, with the full breakdown for each subject.</p></div>
    <div class="kids" style="display:flex;gap:6px" role="group" aria-label="Child">${CHILDREN.map((k) => `<button type="button" class="kid" style="background:#fff;box-shadow:var(--shadow-1)" data-act="child" data-id="${k}" aria-pressed="${k === cid}"><span class="avatar" style="background:${lvl(arm(student(k).arm)).tint};color:${lvl(arm(student(k).arm)).deep}">${initials(student(k))}</span>${student(k).first}</button>`).join("")}</div></div>
  <div class="terms" role="group" aria-label="Term">${terms.map((x) => `<button type="button" data-go="results" data-term="${x.id}" aria-pressed="${x.id === t.id}">${x.label}${x.isNew ? '<span class="new-dot"></span>' : ""}</button>`).join("")}</div>
  <div class="stats">
    ${[["results", "Average", fmt(t.avg, 1), 2], ["classes", `Position in ${t.arm}`, `${ord(t.pos)}<small>of ${t.of}</small>`, 0], ["check", "Best subject", `${Math.max(...t.scores)}<small>${SUBJECTS[t.scores.indexOf(Math.max(...t.scores))].short}</small>`, 3], ["inbox", "Needs attention", `${Math.min(...t.scores)}<small>${SUBJECTS[t.scores.indexOf(Math.min(...t.scores))].short}</small>`, 5]].map(([ic, l, v, c]) => `<div class="stat" style="--tint:${LEVELS[c].tint};--deep:${LEVELS[c].deep};--mid:${LEVELS[c].mid}"><div class="row"><span class="bub">${icon(ic)}</span></div><div><div class="lab">${l}</div><div class="val">${v}</div></div></div>`).join("")}
  </div>
  <section class="card"><div class="card-h"><div><h2>${t.label}</h2><p>Published ${esc(t.published || "")}</p></div><button class="btn" type="button" data-act="report" data-id="${cid}" data-term="${t.id}">${icon("file")}Report card</button></div>
    <div class="rows"><div class="r r-res r-head"><span>Subject</span>${COMPONENTS.map((c) => `<span class="hide-m" style="text-align:center">${c.name}</span>`).join("")}<span style="text-align:center">Total</span><span></span></div>
    ${SUBJECTS.map((sb, i) => { const e = termEntry(cid, t, i); return `<div class="r r-res" style="cursor:pointer" data-act="subject" data-id="${cid}" data-term="${t.id}" data-i="${i}"><b>${sb.name}</b>${COMPONENTS.map((c) => `<span class="hide-m tab" style="text-align:center">${e[c.id] ?? "—"}</span>`).join("")}<span class="tab" style="text-align:center;font-weight:600">${t.scores[i]}</span>${gradeBadge(t.scores[i])}</div>`; }).join("")}</div></section>`;
}

/* ============================================================
   SETTINGS
   ============================================================ */
/* ============================================================
   BRILLANDA TEAM (super admin)
   ============================================================ */
const SCH_TINT = { active: LEVELS[0], trial: LEVELS[4], suspended: LEVELS[5] };
const SCH_LABEL = { active: "Active", trial: "Trial", suspended: "Suspended" };
const schoolPct = (sc) => sc.id === "greenfield" ? schoolStats().doneN / schoolStats().total : sc.pct || 0;
const sch = (id) => DB.platform.schools.find((x) => x.id === id);
const trial = (id) => DB.platform.trials.find((x) => x.id === id);
const openTrials = () => DB.platform.trials.filter((t) => t.st === "new" || t.st === "call");
const tintOf = (L) => `--tint:${L.tint};--deep:${L.deep};--mid:${L.mid}`;
function logActivity(k, s, x) { DB.platform.activity.unshift({ t: "Just now", k, s, x }); }

function sHome() {
  const P = DB.platform;
  const students = P.schools.reduce((n, s) => n + s.students, 0);
  const count = (st) => P.schools.filter((s) => s.st === st).length;
  const tr = openTrials();
  const ending = P.schools.filter((s) => s.st === "trial" && s.day >= 20);
  const stats = [["school", "Active schools", `${num(count("active"))}<small>of ${P.schools.length}</small>`, `${count("trial")} on trial`, 0, "schools"], ["inbox", "Trial requests", num(tr.length), tr.length ? "Waiting for you" : "All clear", 2, "trials"], ["students", "Students", num(students), "Across every school", 3, "schools"], ["user", "Signed in today", num(1284), "71% teachers", 4, "activity"]];
  const needs = [
    ...tr.map((t) => ({ c: 2, av: t.n.split(" ").map((w) => w[0]).join("").slice(0, 2), t: `${t.n}, ${t.c}`, p: t.st === "call" ? `Call booked: ${t.call}.` : `${t.who}, ${t.role.toLowerCase()}. About ${t.students} students. ${t.when}.`, acts: `<button class="btn sm" type="button" data-act="create-school" data-id="${t.id}">Create school</button><button class="btn sm ghosty" type="button" data-go="trials">Details</button>` })),
    ...ending.map((s) => ({ c: 4, av: String(30 - s.day), t: `${s.n} has ${30 - s.day} days left on its trial`, p: `${Math.round(schoolPct(s) * 100)}% of scores are in. A good moment to talk about a paid plan.`, acts: `<button class="btn sm" type="button" data-act="school" data-id="${s.id}">Open school</button>` })),
    ...P.schools.filter((s) => s.st === "suspended").map((s) => ({ c: 5, av: "!", t: `${s.n} is suspended`, p: s.reason || "", acts: `<button class="btn sm" type="button" data-act="school" data-id="${s.id}">Review</button>` })),
  ];
  return `
  <header class="hero pop"><span class="blob a"></span><span class="blob b"></span><span class="blob c"></span>
    <div><p class="kick">Monday 24 November. Brillanda team.</p><h1>${greet()}, Kelechi</h1><p class="say">${P.schools.length} schools and ${fmt(students)} students on Brillanda. ${tr.length ? `${plural(tr.length, "school has", "schools have")} asked for a trial.` : "No trial requests waiting."}</p>
      <div class="acts"><button class="btn" type="button" data-go="trials">Review trial requests</button><button class="btn soft" type="button" data-act="create-school">Create a school</button></div></div>
    <div class="hero-art"><figure class="pcard" style="margin:0"><div class="img" style="background-image:url('img/courtyard.jpg')" role="img" aria-label="Students crossing a school courtyard"></div><p><b>Crestview published JSS 3</b>This morning. 204 parents emailed in one go.</p></figure></div>
  </header>
  <div class="stats">${stats.map(([ic, l, v, d, c, go], i) => `<button type="button" class="stat pop" style="${tintOf(LEVELS[c])};--d:${i * 0.05}s" data-go="${go}"><div class="row"><span class="bub">${icon(ic)}</span><span class="delta">${esc(d)}</span></div><div><div class="lab">${l}</div><div class="val">${v}</div></div></button>`).join("")}</div>
  <div class="grid-2">
    <section class="card"><div class="card-h"><div><h2>This term, school by school</h2><p>Share of scores already in</p></div><button class="link" type="button" data-go="schools">All schools</button></div>
      ${P.schools.filter((s) => s.st !== "suspended").map((s, i) => { const L = SCH_TINT[s.st]; return `<button type="button" class="lv" style="grid-template-columns:minmax(0,11rem) minmax(0,1fr) 3.4rem" data-act="school" data-id="${s.id}"><b style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.n)}</b>${bar(schoolPct(s), L.mid, i * 0.05)}<span class="v tab">${Math.round(schoolPct(s) * 100)}%</span></button>`; }).join("")}
    </section>
    <section class="card needs-card"><div class="card-h"><div><h2>Needs you</h2><p>${needs.length ? plural(needs.length, "thing") + " to look at" : "All clear"}</p></div></div>
      ${needs.length ? carousel("sneeds", needs.map((n) => `<div class="need" style="${tintOf(LEVELS[n.c])}"><div class="h"><span class="avatar">${esc(n.av)}</span><b>${esc(n.t)}</b></div><p>${esc(n.p)}</p><div class="acts">${n.acts}</div></div>`), "Needs you") : empty("Nothing needs you", "No requests, no trials ending, nobody suspended.")}
    </section>
  </div>`;
}

function sSchools() {
  const f = S.schFilter || "all";
  const q = (S.schq || "").trim().toLowerCase();
  const all = DB.platform.schools;
  const tabs = [["all", "All", all.length], ["active", "Active", all.filter((s) => s.st === "active").length], ["trial", "On trial", all.filter((s) => s.st === "trial").length], ["suspended", "Suspended", all.filter((s) => s.st === "suspended").length]].filter(([k, , n]) => k === "all" || n);
  const list = all.filter((s) => (f === "all" || s.st === f) && (!q || `${s.n} ${s.c}`.toLowerCase().includes(q)));
  return `
  <div class="page-h"><div><h1>Schools</h1><p>Every school on Brillanda. Open one to see its details, extend a trial, or suspend and restore access.</p></div><div class="acts"><button class="btn" type="button" data-act="create-school">${icon("plus")}Create a school</button></div></div>
  <div class="toolbar" style="justify-content:space-between">
    <div class="tabs" role="tablist" aria-label="Filter schools">${tabs.map(([k, l, n]) => `<button role="tab" type="button" data-act="sch-filter" data-f="${k}" aria-selected="${f === k}">${l}<span class="tcount">${n}</span></button>`).join("")}</div>
    <div class="searchbox">${icon("search")}<input class="input" id="sch-q" type="search" placeholder="Search schools or cities" value="${esc(S.schq || "")}" aria-label="Search schools"></div>
  </div>
  <div id="sch-list">${schoolCards(list)}</div>`;
}
function schoolCards(list) {
  if (!list.length) return `<div class="card">${empty("No schools match", "Try another name, city or filter.")}</div>`;
  return `<div class="klasses">${list.map((s, k) => { const L = SCH_TINT[s.st]; const pct = schoolPct(s);
    const stCls = s.st === "active" ? "ready" : s.st === "suspended" ? "attention" : "progress";
    const sub = s.st === "trial" ? `Day ${s.day} of 30` : s.st === "suspended" ? "No access" : s.plan;
    return `<button type="button" class="klass pop" style="${tintOf(L)};--d:${k * 0.03}s" data-act="school" data-id="${s.id}" aria-label="${esc(s.n)}, ${SCH_LABEL[s.st]}">
      <div class="k-top"><span class="lvpill"><i></i>${esc(s.c)}</span><span class="st st-${stCls}"><i></i>${SCH_LABEL[s.st]}</span></div>
      <h3 style="font-size:24px;line-height:1.1">${esc(s.n)}</h3>
      <div class="k-prog">${bar(pct, L.mid, 0.1 + k * 0.03)}<span class="tab">${s.st === "suspended" ? "—" : Math.round(pct * 100) + "%"}</span></div>
      <div class="k-foot"><span>${fmt(s.students)} students. ${sub}</span><span class="go">${icon("chevron")}</span></div>
      ${liquid(s.st === "suspended" ? 0 : pct, k)}
    </button>`; }).join("")}</div>`;
}
function schoolSheet(id) {
  const s = sch(id); const L = SCH_TINT[s.st]; const pct = schoolPct(s);
  const acts = s.st === "suspended"
    ? `<button class="btn block" type="button" data-act="restore" data-id="${s.id}">${icon("check")}Restore access</button>`
    : `${s.st === "trial" ? `<button class="btn block" type="button" data-act="convert" data-id="${s.id}">Move to a paid plan</button><button class="btn white block" type="button" data-act="extend" data-id="${s.id}">Extend the trial by 14 days</button>` : ""}
       ${s.id === "greenfield" ? `<button class="btn white block" type="button" data-act="view-as" data-id="${s.id}">${icon("eye")}See it as the school admin</button>` : ""}
       <button class="btn danger block" type="button" data-act="suspend" data-id="${s.id}">${icon("lock")}Suspend this school</button>`;
  return `<button class="x" type="button" data-act="close" aria-label="Back">${icon("back")}</button>
    <div class="ttl"><div class="icon-tile" style="background:${L.tint};color:${L.deep}">${icon("school")}</div><h2>${esc(s.n)}</h2><p>${esc(s.c)}. On Brillanda since ${esc(s.since)}.</p></div>
    ${s.st === "suspended" ? `<div class="banner warn"><span><b>Suspended.</b> ${esc(s.reason || "")} Staff and parents can't sign in.</span></div>` : ""}
    <div class="card"><dl class="kv"><dt>Status</dt><dd>${SCH_LABEL[s.st]}${s.st === "trial" ? `, day ${s.day} of 30` : ""}</dd><dt>Plan</dt><dd>${esc(s.plan)}</dd><dt>Students</dt><dd class="tab">${fmt(s.students)}</dd><dt>Scores in this term</dt><dd class="tab">${s.st === "suspended" ? "—" : Math.round(pct * 100) + "%"}</dd><dt>Last active</dt><dd>${esc(s.last)}</dd></dl></div>
    <div class="card"><dl class="kv"><dt>School admin</dt><dd>${esc(s.admin)}</dd><dt>Email</dt><dd style="word-break:break-all">${esc(s.email)}</dd></dl></div>
    <div class="end">${acts}</div>`;
}

function sTrials() {
  const tab = S.trTab || "new";
  const T = DB.platform.trials;
  const groups = { new: T.filter((t) => t.st === "new"), call: T.filter((t) => t.st === "call"), done: T.filter((t) => t.st === "created" || t.st === "declined") };
  const tabs = [["new", "New", groups.new.length], ["call", "Call booked", groups.call.length], ["done", "Done", groups.done.length]];
  const card = (t, i) => `<article class="trial pop" style="--d:${i * 0.05}s">
    <div class="trial-h"><span class="avatar" style="background:${LEVELS[(i + 2) % 6].tint};color:${LEVELS[(i + 2) % 6].deep}">${t.n.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span><div><h3>${esc(t.n)}</h3><p>${esc(t.c)}. About ${t.students} students. Asked ${esc(t.when)}.</p></div>
      ${t.st === "created" ? `<span class="chip ok"><i></i>School created</span>` : t.st === "declined" ? `<span class="chip"><i></i>Declined</span>` : t.st === "call" ? `<span class="chip info"><i></i>${esc(t.call)}</span>` : `<span class="chip new"><i></i>New</span>`}</div>
    <blockquote class="trial-msg">“${esc(t.msg)}”</blockquote>
    <div class="trial-f"><div class="trial-who"><b>${esc(t.who)}</b>, ${esc(t.role.toLowerCase())}<span>${esc(t.email)}. ${esc(t.phone)}</span></div>
      <div class="acts">${t.st === "new" || t.st === "call" ? `${t.st === "new" ? `<button class="btn sm white" type="button" data-act="book-call" data-id="${t.id}">Book a call</button>` : ""}<button class="btn sm white" type="button" data-act="decline-trial" data-id="${t.id}">Decline</button><button class="btn sm" type="button" data-act="create-school" data-id="${t.id}">${icon("plus")}Create school</button>` : ""}</div></div>
  </article>`;
  return `
  <div class="page-h"><div><h1>Trial requests</h1><p>Schools that filled in "Request a trial" on the website. Nobody gets in until we create their school, so every request lands here first.</p></div></div>
  <div class="tabs" role="tablist" aria-label="Trial requests">${tabs.map(([k, l, n]) => `<button role="tab" type="button" data-act="tr-tab" data-k="${k}" aria-selected="${tab === k}">${l}<span class="tcount">${n}</span></button>`).join("")}</div>
  ${groups[tab].length ? `<div class="trials">${groups[tab].map(card).join("")}</div>` : `<div class="card">${empty(tab === "done" ? "Nothing here yet" : "No requests waiting", tab === "done" ? "Schools you create or decline appear here." : "New requests from the website appear here straight away.")}</div>`}`;
}

function sActivity() {
  const f = S.actFilter || "all";
  const kinds = [["all", "Everything"], ["publish", "Publishing"], ["trial", "Trials and schools"], ["invite", "Invites and imports"], ["billing", "Billing and access"]];
  const match = (a) => f === "all" || a.k === f || (f === "invite" && a.k === "import") || (f === "trial" && (a.k === "created" || a.k === "settings")) || (f === "billing" && (a.k === "suspend" || a.k === "restore"));
  const ic = { publish: "publish", invite: "mail", import: "upload", trial: "inbox", created: "school", settings: "settings", billing: "file", suspend: "lock", restore: "check" };
  const list = DB.platform.activity.filter(match);
  return `
  <div class="page-h"><div><h1>Activity</h1><p>What's happening across every school, newest first.</p></div></div>
  <div class="filters" role="group" aria-label="Filter activity">${kinds.map(([k, l]) => `<button type="button" data-act="act-filter" data-f="${k}" aria-pressed="${f === k}">${l}</button>`).join("")}</div>
  <section class="card">${list.length ? `<ol class="timeline">${list.map((a, i) => { const L = LEVELS[i % 6]; return `<li class="pop" style="--d:${i * 0.04}s"><span class="tl-dot" style="background:${L.tint};color:${L.deep}">${icon(ic[a.k] || "activity")}</span><div><p>${esc(a.x)}</p><span>${esc(a.t)}</span></div>${a.s ? `<button class="btn sm white" type="button" data-act="school" data-id="${a.s}">Open school</button>` : ""}</li>`; }).join("")}</ol>` : empty("Nothing yet", "Nothing of this kind has happened recently.")}</section>`;
}

function createSchoolForm(tId) {
  const t = tId ? trial(tId) : null;
  return `${modalHead("Create a school", t ? `From ${esc(t.n)}'s trial request. Their admin gets an invite to set a password.` : "Their admin gets an invite by email to set a password.")}
    <form class="form" data-form="create-school" data-trial="${t ? t.id : ""}" novalidate>
      <div class="form-2"><div class="field"><label for="cs-name">School name</label><input class="input" id="cs-name" value="${t ? esc(t.n) : ""}" autofocus></div><div class="field"><label for="cs-city">Town or city</label><input class="input" id="cs-city" value="${t ? esc(t.c) : ""}"></div></div>
      <div class="form-2"><div class="field"><label for="cs-admin">School admin's name</label><input class="input" id="cs-admin" value="${t ? esc(t.who) : ""}"></div><div class="field"><label for="cs-email">Admin's email</label><input class="input" id="cs-email" type="email" value="${t ? esc(t.email) : ""}"><span class="err" id="cs-err"></span></div></div>
      <div class="field"><label for="cs-plan">Start on</label><select class="select" id="cs-plan"><option value="trial">A free 30-day trial</option><option value="paid">A paid plan</option></select></div>
      <div class="acts"><button class="btn white" type="button" data-act="close">Cancel</button><button class="btn" type="submit">${icon("school")}Create school and send invite</button></div>
    </form>`;
}

const ACCENTS = { neutral: ["#0B0B0C", "#E5E5E4", "Neutral"], lilac: ["#4A3AA7", "#ECE7FF", "Lilac"], leaf: ["#1E6B45", "#DDF3E6", "Leaf"], coral: ["#A4471C", "#FFE3D1", "Coral"], ocean: ["#1F5E9C", "#DAEAFB", "Ocean"], rose: ["#A23457", "#FADCE4", "Rose"] };
function applyAccent() { const [a, s] = ACCENTS[DB.accent]; document.documentElement.style.setProperty("--accent", a); document.documentElement.style.setProperty("--accent-soft", s); }
function settingsPage() {
  const tabs = S.role === "admin" ? [["school", "School"], ["grading", "Grading scale"], ["term", "Term dates"], ["notifications", "Notifications"], ["profile", "Your profile"]] : [["profile", "Your profile"], ["notifications", "Notifications"]];
  const tab = S.setTab && tabs.some((t) => t[0] === S.setTab) ? S.setTab : tabs[0][0];
  const me = ME[S.role];
  let body = "";
  if (tab === "school") body = `<section class="card"><div class="card-h"><div><h2>School</h2><p>Shown on report cards and in every portal.</p></div></div>
    <form class="form" data-form="school"><div class="field"><label for="f-name">School name</label><input class="input" id="f-name" name="name" value="${esc(DB.school.name)}" required></div>
    <div class="field"><label for="f-motto">Motto</label><input class="input" id="f-motto" name="motto" value="${esc(DB.school.motto)}"><span class="hint">Printed under the name on report cards.</span></div>
    <div class="field"><label for="f-place">Address</label><input class="input" id="f-place" name="place" value="${esc(DB.school.place)}"></div>
    <div class="field"><label>Colour</label><div class="swatches" role="group" aria-label="Colour">${Object.entries(ACCENTS).map(([k, [a, s, l]]) => `<button type="button" data-act="accent" data-k="${k}" aria-pressed="${S.look === "neutral" ? k === "neutral" : DB.accent === k}" style="--s:${a};--s-soft:${s}"><i></i>${l}</button>`).join("")}</div><span class="hint">Used for highlights across the app. Changes as you pick.</span></div>
    <div><button class="btn" type="submit">Save changes</button></div></form></section>`;
  if (tab === "grading") {
    const d = S.scaleDraft || (S.scaleDraft = DB.scale.map((x) => ({ ...x })));
    const problems = scaleProblems(d);
    body = `<section class="card"><div class="card-h"><div><h2>Grading scale</h2><p>A total gets the highest grade it reaches. Totals are rounded to two decimal places first, so 69.995 counts as 70.</p></div></div>
      <div class="scale"><div class="scale-row scale-head"><span>Grade</span><span>From</span><span>Remark on report cards</span><span></span></div>
      ${scaleSorted(d).map((b) => { const i = d.indexOf(b); return `<div class="scale-row"><input class="input" data-scale="${i}" data-k="g" value="${esc(b.g)}" aria-label="Grade letter" maxlength="2"><input class="input tab" data-scale="${i}" data-k="min" value="${b.min}" inputmode="decimal" aria-label="Lowest total for ${esc(b.g)}"><input class="input" data-scale="${i}" data-k="remark" value="${esc(b.remark)}" aria-label="Remark for ${esc(b.g)}"><button class="x" type="button" data-act="scale-del" data-i="${i}" aria-label="Remove ${esc(b.g)}">${icon("trash")}</button></div>`; }).join("")}
      <div><button class="btn sm white" type="button" data-act="scale-add">${icon("plus")}Add a grade</button></div></div>
      <div class="try" style="margin-top:16px"><label for="try-score">Try a total</label><input class="input tab" id="try-score" inputmode="decimal" value="69.5"><span id="try-out">${tryOut(69.5, d)}</span></div>
      <div id="scale-problems" style="margin-top:12px">${problems.map((p) => `<p class="field err">${p}</p>`).join("")}</div>
      <div style="display:flex;gap:8px;margin-top:16px"><button class="btn" type="button" data-act="scale-save" ${problems.length ? "disabled" : ""}>Save scale</button><button class="btn white" type="button" data-act="scale-reset">Undo changes</button></div>
      <p class="muted" style="font-size:12.5px;margin-top:12px">This scale applies to ${esc(DB.school.session)}. Report cards already published keep the scale they were printed with.</p></section>`;
  }
  if (tab === "term") body = `<section class="card"><div class="card-h"><div><h2>Term dates</h2><p>${esc(DB.school.term)}, ${esc(DB.school.session)}.</p></div></div>
    <form class="form" data-form="term"><div class="form-2"><div class="field"><label for="f-start">Term starts</label><input class="input" type="date" id="f-start" value="${DB.school.starts}"></div><div class="field"><label for="f-end">Term ends</label><input class="input" type="date" id="f-end" value="${DB.school.ends}"></div></div>
    <div class="field"><label for="f-due">Scores due</label><input class="input" type="date" id="f-due" value="${DB.school.due}"><span class="hint">Teachers see this on their home screen and get a reminder three days before.</span></div>
    <div class="field"><label for="f-next">Next term begins</label><input class="input" id="f-next" value="${esc(DB.school.nextTerm)}"><span class="hint">Printed at the bottom of report cards.</span></div>
    <div><button class="btn" type="submit">Save dates</button></div></form></section>`;
  if (tab === "notifications") body = `<section class="card"><div class="card-h"><div><h2>Notifications</h2><p>What we email you about. You'll always see everything in the app.</p></div></div><div class="prefs">
    ${(S.role === "super" ? [["A school asks for a trial", "The moment the website form is sent", true], ["A trial is ending", "Seven days before, so there's time to talk", true], ["A payment is late", "Once it is seven days overdue", true]] : S.role === "admin" ? [["A teacher asks to reopen a sheet", "So you can unblock them quickly", true], ["A class is ready to publish", "When its last subject is marked complete", true], ["Weekly summary", "Every Monday: what's in, what's behind", true], ["Parents open report cards", "A daily count, after publishing", false]] : S.role === "teacher" ? [["Deadline reminders", "Three days and one day before scores are due", true], ["Your admin reopens or locks a sheet", "So you know when you can edit", true]] : [["Results are published", "The moment your child's report card is ready", true], ["School announcements", "Events and term dates", true]]).map(([t, d, on], i) => `<label class="pref"><div><b>${t}</b><span>${d}</span></div><span class="toggle"><input type="checkbox" ${on ? "checked" : ""} aria-label="${t}" data-act="pref"></span></label>`).join("")}</div></section>`;
  if (tab === "profile") body = `<section class="card"><div class="card-h"><div><h2>Your profile</h2><p>${S.role === "super" ? "Brillanda team" : `${me.role} at ${esc(DB.school.name)}`}</p></div></div>
    <form class="form" data-form="profile"><div class="form-2"><div class="field"><label for="p-name">Full name</label><input class="input" id="p-name" value="${esc(me.name)}" required></div><div class="field"><label for="p-phone">Phone</label><input class="input" id="p-phone" inputmode="tel" value="0803 555 0142"></div></div>
    <div class="field"><label for="p-email">Email</label><input class="input" id="p-email" type="email" value="${S.role === "super" ? "kelechi@brillanda.ng" : `${S.role === "admin" ? "f.adeyemi" : S.role === "teacher" ? "t.bakare" : "ngozi.okafor"}@${S.role === "parent" ? "gmail.com" : "greenfield.sch.ng"}`}" required><span class="hint">You sign in with this.</span></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="submit">Save profile</button><button class="btn white" type="button" data-act="toast" data-msg="We've emailed you a link to change your password">Change password</button></div></form></section>`;
  return `<div class="page-h"><div><h1>Settings</h1></div></div><div class="set-wrap"><nav class="set-nav" aria-label="Settings">${tabs.map(([k, l]) => `<button type="button" data-act="set-tab" data-k="${k}" aria-current="${k === tab}">${l}</button>`).join("")}</nav>${body}</div>`;
}
function scaleProblems(d) {
  const p = [];
  if (!d.some((b) => Number(b.min) === 0)) p.push("Add a grade that starts at 0, so every total gets a grade.");
  const mins = d.map((b) => Number(b.min));
  if (mins.some((m) => isNaN(m) || m < 0 || m > 100)) p.push("Every “From” needs a number from 0 to 100.");
  if (new Set(mins).size !== mins.length) p.push("Two grades start at the same total. Give each one its own starting point.");
  const letters = d.map((b) => String(b.g).trim().toUpperCase());
  if (letters.some((l) => !l)) p.push("Every grade needs a letter.");
  if (new Set(letters).size !== letters.length) p.push("Two grades use the same letter.");
  return p;
}
function tryOut(v, d) { if (isNaN(v)) return "Type a total from 0 to 100"; const b = gradeOf(round2(v), d.map((x) => ({ ...x, min: Number(x.min) }))); return b ? `gets <b>${esc(b.g)}</b>, ${esc(b.remark)}` : ""; }

/* ============================================================
   OVERLAYS: modal, sheet, menus, palette, toast
   ============================================================ */
const scrim = () => $("#scrim");
function openModal(html, width) {
  closeAll(); const m = $("#modal"); m.style.setProperty("--mw", (width || 520) + "px"); m.innerHTML = html; m.classList.add("show"); m.setAttribute("aria-hidden", "false"); scrim().classList.add("show");
  setTimeout(() => (m.querySelector("[autofocus]") || m.querySelector("input,textarea,button"))?.focus(), 60);
}
function openSheet(html) { closeAll(); const s = $("#sheet"); s.innerHTML = html; s.classList.add("show"); s.setAttribute("aria-hidden", "false"); scrim().classList.add("show"); setTimeout(() => s.querySelector("button")?.focus(), 60); }
function openPop(html, anchor) {
  closeAll(); const p = $("#pop"); p.innerHTML = html; p.classList.add("show");
  const fr = $("#frame"); const phone = fr.classList.contains("phone");
  const r = anchor.getBoundingClientRect(); const fb = fr.getBoundingClientRect();
  const w = Math.min(360, (phone ? fb.width : innerWidth) - 24);
  let left = r.right - w; let top = r.bottom + 8;
  if (phone) { left -= fb.left; top -= fb.top; }
  p.style.left = Math.max(12, left) + "px"; p.style.top = top + "px"; p.style.width = w + "px";
  scrim().classList.add("show"); scrim().style.background = "transparent"; scrim().style.backdropFilter = "none";
}
function closeAll() {
  ["#modal", "#sheet", "#pop", "#pal"].forEach((s) => { const el = $(s); el.classList.remove("show"); el.setAttribute("aria-hidden", "true"); });
  const sc = scrim(); sc.classList.remove("show"); sc.style.background = ""; sc.style.backdropFilter = "";
}
let toastT;
function toast(msg) { const t = $("#toast"); $("#toast-t").textContent = msg; t.classList.remove("show"); void t.offsetWidth; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3200); }
const modalHead = (title, sub) => `<div class="modal-h"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div><button class="x" type="button" data-act="close" aria-label="Close">${icon("close")}</button></div>`;

function reportCard(cid, termId) {
  const s = student(cid);
  let t, entries, pos, of, armName;
  if (DB.history[cid] && termId) { t = childTerms(cid).find((x) => x.id === termId); }
  if (t) { entries = SUBJECTS.map((sb, i) => ({ ...termEntry(cid, t, i), total: t.scores[i] })); pos = t.pos; of = t.of; armName = t.arm; }
  else {
    const res = armResults(s.arm); const me = res.res.find((r) => r.id === cid);
    entries = SUBJECTS.map((sb, i) => { const e = sheet(s.arm, sb.id).entries[cid]; return { ...e, total: me.totals[i] }; });
    t = { label: `${DB.school.term}, ${DB.school.session}`, remark: `${s.first} has worked steadily this term.`, by: `${tname(arm(s.arm).form)}, form teacher`, principal: "Well done. Keep going." };
    pos = me.pos; of = res.of; armName = arm(s.arm).name;
  }
  const avg = entries.reduce((a, e) => a + e.total, 0) / entries.length;
  return `${modalHead("Report card", `${esc(s.first)} ${esc(s.last)}, ${esc(t.label)}`)}
  <div class="rc">
    <div class="rc-head"><div class="rc-school"><span class="crest">GC</span><div><b>${esc(DB.school.name)}</b><span>${esc(DB.school.motto)}. ${esc(DB.school.place)}</span></div></div><div class="rc-title"><b>Report card</b>${esc(t.label)}</div></div>
    <div class="rc-who"><div><span>Student</span><b>${esc(s.first)} ${esc(s.last)}</b></div><div><span>Class</span><b>${esc(armName)}</b></div><div><span>Average</span><b class="tab">${fmt(avg, 2)}</b></div><div><span>Position</span><b>${ord(pos)} of ${of}</b></div></div>
    <div style="overflow-x:auto"><table><thead><tr><th>Subject</th>${COMPONENTS.map((c) => `<th class="n">${c.name} (${c.max})</th>`).join("")}<th class="n">Total</th><th class="n">Grade</th><th>Remark</th></tr></thead>
    <tbody>${entries.map((e, i) => { const g = gradeOf(e.total); return `<tr><td>${SUBJECTS[i].name}</td>${COMPONENTS.map((c) => `<td class="n tab">${e[c.id] ?? "—"}</td>`).join("")}<td class="n tab"><b>${fmt(e.total, e.total % 1 ? 1 : 0)}</b></td><td class="n"><span class="grade g-${gtone(g.g)}">${g.g}</span></td><td>${esc(g.remark)}</td></tr>`; }).join("")}</tbody></table></div>
    <div class="rc-foot"><div><span>Class teacher</span>“${esc(t.remark)}” ${esc(t.by)}</div><div><span>Principal</span>“${esc(t.principal)}”</div></div>
    <p class="rc-key">Grading: ${scaleSorted().map((b) => `${b.g} ${b.min} and above`).join(", ").replace(/, ([^,]*)$/, ", $1")}. Next term begins ${esc(DB.school.nextTerm)}.</p>
  </div>
  <div class="acts"><button class="btn white" type="button" data-act="close">Close</button><button class="btn" type="button" data-act="toast" data-msg="In the app this downloads ${esc(s.first)}'s report card as a PDF">${icon("download")}Download PDF</button></div>`;
}

function subjectSheet(cid, termId, i) {
  const s = student(cid); const t = childTerms(cid).find((x) => x.id === termId); const sb = SUBJECTS[i];
  const e = termEntry(cid, t, i); const g = gradeOf(t.scores[i]);
  const L = LEVELS[i % 6];
  return `<button class="x" type="button" data-act="close" aria-label="Back">${icon("back")}</button>
    <div class="ttl"><div class="icon-tile" style="background:${L.tint};color:${L.deep}">${icon("results")}</div><h2>${sb.name}</h2><p>${esc(s.first)}, ${esc(t.label)}</p></div>
    <div class="card" style="display:grid;gap:14px">${COMPONENTS.map((c) => `<div><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:6px"><span>${c.name}</span><b class="tab">${e[c.id] ?? "—"} <span class="muted" style="font-weight:400">/ ${c.max}</span></b></div>${bar(e[c.id] === "ABS" ? 0 : (e[c.id] || 0) / c.max, L.mid)}</div>`).join("")}</div>
    <div class="card"><dl class="kv"><dt>Total</dt><dd class="tab">${t.scores[i]} / 100</dd><dt>Grade</dt><dd><span class="grade g-${gtone(g.g)}">${g.g}</span> ${esc(g.remark)}</dd><dt>Subject teacher</dt><dd>${esc(tname(sb.teacher))}</dd></dl></div>
    <div class="end"><button class="btn block" type="button" data-act="report" data-id="${cid}" data-term="${termId}">${icon("file")}See the whole report card</button></div>`;
}
function studentSheet(id) {
  const s = student(id); const a = arm(s.arm); const L = lvl(a);
  const subs = SUBJECTS.map((sb) => ({ sb, r: rowOf(sheet(a.id, sb.id).entries[id]) }));
  return `<button class="x" type="button" data-act="close" aria-label="Back">${icon("back")}</button>
    <div class="ttl"><div class="icon-tile" style="background:${L.tint};color:${L.deep};font-size:18px;font-weight:600">${initials(s)}</div><h2>${esc(s.first)} ${esc(s.last)}</h2><p>${a.name}</p></div>
    <div class="card"><dl class="kv"><dt>Parent</dt><dd>${parentChip(s)}</dd><dt>Subjects with every score</dt><dd class="tab">${subs.filter((x) => x.r.complete).length} of 9</dd></dl></div>
    <div class="card"><div class="rows">${subs.map((x) => `<div class="r" style="grid-template-columns:1fr auto auto;padding:8px 4px"><span>${x.sb.name}</span><span class="tab muted">${x.r.filled ? x.r.total : "—"}</span>${x.r.complete ? gradeBadge(x.r.total) : `<span class="chip" style="height:22px">${x.r.filled ? "Partial" : "None"}</span>`}</div>`).join("")}</div></div>
    <div class="end">${s.parent === "none" ? `<button class="btn block" type="button" data-act="invite-parent" data-id="${id}">${icon("mail")}Invite a parent</button>` : ""}<button class="btn white block" type="button" data-go="arm:${a.id}:students">Open ${a.name}</button></div>`;
}

/* Command palette */
function paletteIndex() {
  const items = [];
  const page = (label, go, ic) => items.push({ g: "Pages", label, go, ic });
  NAV[S.role].forEach(([k, ic, l]) => page(l, k, ic));
  if (S.role === "admin") {
    page("Grading scale", "settings:grading", "settings");
    items.push({ g: "Actions", label: "Invite a member of staff", act: "invite-staff", ic: "plus" }, { g: "Actions", label: "Publish ready classes", go: "publish", ic: "publish" }, { g: "Actions", label: "Remind teachers who are behind", act: "remind-all", ic: "mail" });
    DB.arms.forEach((a) => items.push({ g: "Classes", label: a.name, sub: `${studentsIn(a.id).length} students`, go: `arm:${a.id}`, ic: "classes" }));
    DB.arms.forEach((a) => SUBJECTS.forEach((s) => items.push({ g: "Score sheets", label: `${a.name} ${s.name}`, sub: tname(teacherOf(a.id, s.id)), go: `scores:${a.id}:${s.id}`, ic: "scores" })));
    DB.students.forEach((s) => items.push({ g: "Students", label: `${s.first} ${s.last}`, sub: arm(s.arm).name, act: "student", id: s.id, ic: "user" }));
  } else if (S.role === "teacher") {
    myClasses().forEach((x) => items.push({ g: "Score sheets", label: `${x.a.name} Mathematics`, sub: `${x.complete} of ${x.n} done`, go: `scores:${x.a.id}:maths`, ic: "scores" }));
    BAKARE_ARMS.forEach((id) => studentsIn(id).forEach((s) => items.push({ g: "Students", label: `${s.first} ${s.last}`, sub: arm(id).name, go: `scores:${id}:maths`, focus: s.id, ic: "user" })));
  } else if (S.role === "super") {
    items.push({ g: "Actions", label: "Create a school", act: "create-school", ic: "plus" });
    DB.platform.schools.forEach((x) => items.push({ g: "Schools", label: x.n, sub: `${x.c}, ${SCH_LABEL[x.st].toLowerCase()}`, act: "school", id: x.id, ic: "school" }));
    openTrials().forEach((t) => items.push({ g: "Trial requests", label: t.n, sub: t.c, go: "trials", ic: "inbox" }));
  } else {
    CHILDREN.forEach((c) => { const s = student(c); items.push({ g: "Children", label: s.first, sub: arm(s.arm).name, act: "child", id: c, ic: "user" }); childTerms(c).forEach((t) => items.push({ g: "Report cards", label: `${s.first}, ${t.label}`, act: "report", id: c, term: t.id, ic: "file" })); });
  }
  return items;
}
let palSel = 0, palItems = [];
function openPalette() { closeAll(); const p = $("#pal"); p.classList.add("show"); p.setAttribute("aria-hidden", "false"); scrim().classList.add("show"); const q = $("#pal-q"); q.value = ""; palSel = 0; drawPalette(); setTimeout(() => q.focus(), 40); }
function drawPalette() {
  const q = $("#pal-q").value.trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  const all = paletteIndex();
  const match = all.filter((x) => words.every((w) => (x.label + " " + (x.sub || "")).toLowerCase().includes(w)));
  const groups = {}; match.forEach((x) => { (groups[x.g] ||= []).push(x); });
  palItems = []; Object.values(groups).forEach((l) => palItems.push(...l.slice(0, q ? 6 : 4)));
  palSel = Math.min(palSel, Math.max(0, palItems.length - 1));
  if (!palItems.length) { $("#pal-list").innerHTML = `<div class="pal-empty">Nothing called “${esc(q)}”. Try a class like JSS 2B, a subject or a student's name.</div>`; return; }
  const hl = (s) => { let h = esc(s); words.forEach((w) => { h = h.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"), "<mark>$1</mark>"); }); return h; };
  let g = "", html = "";
  palItems.forEach((x, i) => { if (x.g !== g) { g = x.g; html += `<p class="g">${g}</p>`; } html += `<button type="button" role="option" data-pal="${i}" aria-selected="${i === palSel}"><span class="pi">${icon(x.ic)}</span><span>${hl(x.label)}</span>${x.sub ? `<small>${esc(x.sub)}</small>` : ""}</button>`; });
  $("#pal-list").innerHTML = html;
  $(`[data-pal="${palSel}"]`)?.scrollIntoView({ block: "nearest" });
}
function pickPalette(i) {
  const x = palItems[i]; if (!x) return; closeAll();
  if (x.go) { if (x.focus) S.focusStudent = x.focus; go(x.go); }
  else if (x.act === "student") openSheet(studentSheet(x.id));
  else if (x.act === "child") { S.child = x.id; go("home"); }
  else if (x.act === "report") openModal(reportCard(x.id, x.term), 860);
  else act(x.act, x);
}

/* ---------- navigation ---------- */
function go(spec) {
  const [p, a, b] = spec.split(":");
  if (p === "arm") S.route = { p, arm: a, tab: b };
  else if (p === "scores") S.route = { p, arm: a, subj: b };
  else if (p === "settings") { S.route = { p }; if (a) S.setTab = a; }
  else S.route = { p };
  if (p !== "scores") S.focusStudent = null;
  S.errors = {};
  render(true);
}
const PAGES = {
  admin: { home: aHome, classes: aClasses, arm: aArm, scores: scoresPage, publish: aPublish, students: aStudents, staff: aStaff, settings: settingsPage },
  teacher: { home: () => tHome(false), classes: () => tHome(true), scores: scoresPage, settings: settingsPage },
  parent: { home: pHome, results: pResults, settings: settingsPage },
  super: { home: sHome, schools: sSchools, trials: sTrials, activity: sActivity, settings: settingsPage },
};
function render(scrollTop) {
  const page = PAGES[S.role][S.route.p] || PAGES[S.role].home;
  const app = $("#app");
  app.innerHTML = shell(page());
  const fr = $("#frame"); fr.className = `frame look-${S.look}${S.device === "phone" ? " phone" : ""}`; fr.dataset.school = S.school; $("#school-seg").hidden = S.look !== "school";
  $$("[data-demo]").forEach((b) => b.setAttribute("aria-pressed", String(S[b.dataset.demo] === b.dataset.v)));
  if (scrollTop) { app.scrollTop = 0; if (S.device !== "phone" && $("#frame").getBoundingClientRect().top < 0) $("#frame").scrollIntoView({ block: "start" }); }
  hydrate();
}
function hydrate() {
  $$("[data-count]").forEach((el) => {
    const to = parseFloat(el.dataset.count), d = +el.dataset.dec || 0;
    if (RM.matches || !to) return;
    const t0 = performance.now();
    const tick = (t) => { const p = Math.min(1, (t - t0) / 800), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(to * e, d); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  if (S.route.p === "scores") {
    const tb = $("table.sg"); if (!tb) return;
    tb.addEventListener("input", (e) => { if (e.target.classList.contains("cell")) onCell(e.target); });
    tb.addEventListener("change", (e) => { const t = e.target; if (t.classList.contains("cell") && ["A", "AB", "ABS"].includes(t.value.trim().toUpperCase())) t.value = "ABS"; });
    tb.addEventListener("keydown", cellNav);
    tb.addEventListener("focusin", (e) => { $$("tr.row.focus", tb).forEach((r) => r.classList.remove("focus")); e.target.closest("tr.row")?.classList.add("focus"); });
    if (S.focusStudent) { const c = tb.querySelector(`tr[data-sid="${S.focusStudent}"] .cell:not(:disabled)`); const emptyCell = tb.querySelector(`tr[data-sid="${S.focusStudent}"] .cell[value=""]`); (emptyCell || c)?.focus(); (emptyCell || c)?.scrollIntoView({ block: "center" }); }
    $("#missing-only")?.addEventListener("change", (e) => { S.missingOnly = e.target.checked; render(); });
  }
  $$(".carousel").forEach((car) => $(".c-track", car).addEventListener("scroll", () => carSync(car), { passive: true }));
  $("#lv-sel")?.addEventListener("change", (e) => { S.classLevel = e.target.value; render(); });
  $("#sch-q")?.addEventListener("input", (e) => { S.schq = e.target.value; const f = S.schFilter || "all", q = S.schq.trim().toLowerCase(); $("#sch-list").innerHTML = schoolCards(DB.platform.schools.filter((x) => (f === "all" || x.st === f) && (!q || `${x.n} ${x.c}`.toLowerCase().includes(q)))); });
  if (S.route.p === "students") {
    $("#st-q").addEventListener("input", (e) => { S.stq = e.target.value; $("#st-list").innerHTML = studentGroups(); });
    $("#st-unlinked").addEventListener("change", (e) => { S.stUnlinked = e.target.checked; $("#st-list").innerHTML = studentGroups(); });
  }
  if (S.route.p === "settings") {
    $$("[data-scale]").forEach((inp) => inp.addEventListener("input", () => { const d = S.scaleDraft; d[+inp.dataset.scale][inp.dataset.k] = inp.dataset.k === "min" ? inp.value : inp.value; refreshScale(); }));
    $("#try-score")?.addEventListener("input", refreshScale);
  }
}
function refreshScale() {
  const d = S.scaleDraft; const p = scaleProblems(d);
  $("#scale-problems").innerHTML = p.map((x) => `<p class="field err">${x}</p>`).join("");
  $('[data-act="scale-save"]').disabled = p.length > 0;
  const v = parseFloat($("#try-score").value); $("#try-out").innerHTML = p.length ? "Fix the scale to try it" : tryOut(v, d);
}

/* ---------- actions ---------- */
function notify(role, who, text, goSpec) { DB.notifs.unshift({ id: "n" + Date.now() + Math.random(), role, who, text, time: "Just now", go: goSpec }); }
function act(name, d, el) {
  const s = schoolStats();
  switch (name) {
    case "close": closeAll(); break;
    case "toast": toast(d.msg); break;
    case "palette": openPalette(); break;
    case "notifs": {
      const list = DB.notifs.filter((n) => n.role === S.role);
      openPop(`<div class="pm-h"><b>Notifications</b>${list.some((n) => !n.read) ? `<button class="link" type="button" data-act="read-all">Mark all as read</button>` : ""}</div>${list.length ? list.map((n) => { const w = n.who === "admin" ? ["FA", "#E6E0FB", "#4A3AA7"] : n.who === "brillanda" ? ["B", "#E6E0FB", "#4A3AA7"] : n.who === "school" ? ["GC", "#DDF3E6", "#1E6B45"] : [initials(staff(n.who) || { name: "B" }), "#FFE3D1", "#A4471C"]; return `<button type="button" class="nt ${n.read ? "read" : ""}" data-act="notif" data-id="${n.id}"><span class="avatar" style="background:${w[1]};color:${w[2]}">${w[0]}</span><div><p>${esc(n.text)}</p><span>${esc(n.time)}</span></div><i class="ud"></i></button>`; }).join("") : empty("You're all caught up", "New activity shows up here.")}`, el);
      break;
    }
    case "read-all": DB.notifs.forEach((n) => { if (n.role === S.role) n.read = true; }); closeAll(); render(); toast("All caught up"); break;
    case "notif": { const n = DB.notifs.find((x) => x.id === d.id); n.read = true; closeAll(); if (n.go.child) S.child = n.go.child; S.route = { ...n.go }; if (n.go.p === "scores") S.route = { p: "scores", arm: n.go.arm, subj: n.go.subj }; render(true); break; }
    case "menu": openPop(`<div class="pm-h"><div><b>${ME[S.role].name}</b><p class="muted" style="font-size:13px">${ME[S.role].role}, ${esc(DB.school.name)}</p></div></div><button class="menu-item" type="button" data-go="settings:profile">${icon("user")}Your profile</button><button class="menu-item" type="button" data-go="settings">${icon("settings")}Settings</button><button class="menu-item" type="button" data-act="toast" data-msg="In the app this signs you out">${icon("logout")}Sign out</button>`, el); break;
    case "class-filter": S.classFilter = d.f; render(); break;
    case "pub-tab": S.pubTab = d.k; render(); break;
    case "school": openSheet(schoolSheet(d.id)); break;
    case "sch-filter": S.schFilter = d.f; render(); break;
    case "tr-tab": S.trTab = d.k; render(); break;
    case "act-filter": S.actFilter = d.f; render(); break;
    case "create-school": openModal(createSchoolForm(d.id), 640); break;
    case "book-call": { const t = trial(d.id); openModal(`${modalHead(`Book a call with ${esc(t.who)}`, `${esc(t.n)}. They'll get a calendar invite at ${esc(t.email)}.`)}
        <form class="form" data-form="book-call" data-id="${t.id}" novalidate><div class="form-2"><div class="field"><label for="bc-day">Day</label><input class="input" type="date" id="bc-day" value="2026-11-27"></div><div class="field"><label for="bc-time">Time</label><input class="input" type="time" id="bc-time" value="11:00"></div></div>
        <div class="acts"><button class="btn white" type="button" data-act="close">Cancel</button><button class="btn" type="submit">Book the call</button></div></form>`); break; }
    case "decline-trial": { const t = trial(d.id); openModal(`${modalHead(`Decline ${esc(t.n)}?`, "We'll email them a polite note. You can add a reason.")}
        <form class="form" data-form="decline-trial" data-id="${t.id}" novalidate><div class="field"><label for="dt-why">Reason (optional)</label><textarea class="textarea" id="dt-why" placeholder="e.g. Primary schools aren't supported yet."></textarea></div>
        <div class="acts"><button class="btn white" type="button" data-act="close">Keep it</button><button class="btn" type="submit">Decline</button></div></form>`); break; }
    case "suspend": { const x = sch(d.id); openModal(`${modalHead(`Suspend ${esc(x.n)}?`, "Everyone at the school is signed out straight away, including people signed in right now. Their data stays safe, and you can restore access at any time.")}
        <form class="form" data-form="suspend" data-id="${x.id}" novalidate><div class="field"><label for="su-why">Why?</label><select class="select" id="su-why"><option>Payment is overdue.</option><option>The school asked us to.</option><option>We're investigating a security concern.</option></select></div>
        <div class="field"><label for="su-confirm">Type the school's name to confirm</label><input class="input" id="su-confirm" placeholder="${esc(x.n)}" autocomplete="off"><span class="err" id="su-err"></span></div>
        <div class="acts"><button class="btn white" type="button" data-act="close">Cancel</button><button class="btn danger" type="submit">${icon("lock")}Suspend school</button></div></form>`); break; }
    case "restore": { const x = sch(d.id); x.st = x.day ? "trial" : "active"; x.reason = null; x.last = "Just now"; logActivity("restore", x.id, `${x.n}'s access was restored.`); closeAll(); render(); toast(`${x.n} can sign in again`); break; }
    case "convert": { const x = sch(d.id); x.st = "active"; x.plan = "Standard"; delete x.day; logActivity("billing", x.id, `${x.n} moved to a paid plan.`); closeAll(); render(); stamp("PAID PLAN • WELCOME ABOARD • "); toast(`${x.n} is now on a paid plan`); break; }
    case "extend": { const x = sch(d.id); x.day = Math.max(1, x.day - 14); logActivity("trial", x.id, `${x.n}'s trial was extended by 14 days.`); render(); openSheet(schoolSheet(x.id)); toast(`Trial extended. ${30 - x.day} days left`); break; }
    case "view-as": S.role = "admin"; S.route = { p: "home" }; closeAll(); render(true); toast("You're seeing Greenfield College as its admin sees it"); break;
    case "sec": S.secOpen = S.secOpen === d.k ? null : d.k; render(); break;
    case "st-group": if (S.stOpen.has(d.arm)) S.stOpen.delete(d.arm); else S.stOpen.add(d.arm); $("#st-list").innerHTML = studentGroups(); { const b = $('[data-act="st-all"]'); if (b) b.textContent = S.stOpen.size ? "Collapse all" : "Expand all"; } break;
    case "st-all": if (S.stOpen.size) S.stOpen.clear(); else DB.arms.forEach((a) => S.stOpen.add(a.id)); $("#st-list").innerHTML = studentGroups(); el.textContent = S.stOpen.size ? "Collapse all" : "Expand all"; break;
    case "more": { const c = el.closest(".card"); const open = c.classList.toggle("expanded"); el.textContent = open ? "Show fewer" : "Show all 9 subjects"; break; }
    case "approve": { const sh = sheet(d.arm, d.subj); const by = sh.reopen.by; sh.reopen = null; sh.status = "progress"; notify("teacher", "admin", `Mrs Adeyemi reopened ${arm(d.arm).name} ${subj(d.subj).name}`, { p: "scores", arm: d.arm, subj: d.subj }); render(); toast(`Reopened. ${tname(by)} can edit ${arm(d.arm).name} ${subj(d.subj).short} again`); break; }
    case "decline": { const sh = sheet(d.arm, d.subj); const by = sh.reopen.by; sh.reopen = null; render(); toast(`Declined. We've let ${tname(by)} know`); break; }
    case "remind": DB.reminded[d.key] = true; render(); toast(`Reminder sent to ${tname(teacherOf(...d.key.split(":")))}`); break;
    case "remind-teacher": DB.reminded[d.id] = true; render(); toast(`Reminder sent to ${tname(d.id)}`); break;
    case "remind-all": {
      if (!s.behindList.length) { toast("Nobody is behind right now"); break; }
      openModal(`${modalHead("Remind teachers", `They'll get an email and a note on their home screen. Scores are due ${DB.school.dueText}.`)}
        <div class="sum">${s.behindList.map((b) => `<div><label class="toggle" style="gap:12px"><input type="checkbox" checked data-remind="${b.t}"><span style="color:var(--ink)">${esc(tname(b.t))}</span></label><span>${plural(b.l.length, "sheet")} behind</span></div>`).join("")}</div>
        <div class="field"><label for="rm-note">Add a note (optional)</label><textarea class="textarea" id="rm-note" placeholder="Please finish by Friday so we can publish before the holiday."></textarea></div>
        <div class="acts"><button class="btn white" type="button" data-act="close">Cancel</button><button class="btn" type="button" data-act="remind-send">Send reminders</button></div>`); break;
    }
    case "remind-send": { const n = $$("[data-remind]:checked").length; $$("[data-remind]:checked").forEach((c) => { DB.reminded[c.dataset.remind] = true; }); closeAll(); render(); toast(n ? `Reminders sent to ${plural(n, "teacher")}` : "No one selected, so nothing was sent"); break; }
    case "pub-toggle": if (el.checked) S.pubSel.add(d.arm); else S.pubSel.delete(d.arm); render(); break;
    case "publish-one": S.pubSel = new Set([d.arm]); act("publish", {}); break;
    case "publish": {
      const sel = [...(S.pubSel || [])].filter((id) => armInfo(id).ready);
      if (!sel.length) break;
      const studs = sel.flatMap((id) => studentsIn(id)); const linked = studs.filter((x) => x.parent === "linked").length;
      openModal(`${modalHead(`Publish ${plural(sel.length, "class", "classes")}?`, "Check the numbers, then publish. Parents are emailed straight away.")}
        <div class="sum"><div><span>Classes</span><b>${sel.map((id) => arm(id).name).join(", ")}</b></div><div><span>Report cards</span><b class="tab">${studs.length}</b></div><div><span>Parents emailed</span><b class="tab">${linked}</b></div><div><span>Printed slips needed</span><b class="tab">${studs.length - linked}</b></div></div>
        <div class="banner info"><span>${icon("lock")} Publishing locks every score in ${sel.length === 1 ? "this class" : "these classes"}. A teacher who needs to change one will have to ask you to reopen it.</span></div>
        <div class="acts"><button class="btn white" type="button" data-act="report" data-id="${studentsIn(sel[0])[0].id}" data-back="publish">${icon("eye")}Preview a report card</button><button class="btn" type="button" data-act="publish-go" data-arms="${sel.join(",")}">${icon("publish")}Publish now</button></div>`); break;
    }
    case "publish-go": {
      el.classList.add("busy"); el.innerHTML = "Publishing";
      setTimeout(() => {
        const ids = d.arms.split(",");
        ids.forEach((id) => { DB.published[id] = { at: "just now" }; SUBJECTS.forEach((sb) => { sheet(id, sb.id).status = "locked"; }); S.pubSel.delete(id); });
        const parents = ids.flatMap((id) => studentsIn(id)).filter((x) => x.parent === "linked").length;
        ids.forEach((id) => CHILDREN.forEach((c) => { if (student(c).arm === id) notify("parent", "school", `${student(c).first}'s first term results are out`, { p: "results", child: c, term: "2026-1" }); }));
        closeAll(); render(); stamp("PUBLISHED • RESULTS SENT • "); toast(`Published ${ids.map((id) => arm(id).name).join(" and ")}. ${parents} parents are being emailed`);
      }, RM.matches ? 100 : 1100);
      break;
    }
    case "report": openModal(reportCard(d.id, d.term), 860); break;
    case "subject": openSheet(subjectSheet(d.id, d.term, +d.i)); break;
    case "student": openSheet(studentSheet(d.id)); break;
    case "child": S.child = d.id; render(); break;
    case "invite-parent": {
      const st = student(d.id);
      openModal(`${modalHead(`Invite ${esc(st.first)}'s parent`, `They'll get a link to set a password and see ${esc(st.first)}'s results. It works for 72 hours.`)}
        <form class="form" data-form="invite-parent" data-id="${d.id}" novalidate><div class="field"><label for="ip-name">Parent's name</label><input class="input" id="ip-name" autofocus placeholder="e.g. Mrs Bola ${esc(st.last)}"></div>
        <div class="field"><label for="ip-email">Email</label><input class="input" id="ip-email" type="email" placeholder="name@example.com"><span class="err" id="ip-err"></span><span class="hint">No email? Print an access code from the student's page instead.</span></div>
        <div class="acts"><button class="btn white" type="button" data-act="close">Cancel</button><button class="btn" type="submit">${icon("mail")}Send invite</button></div></form>`); break;
    }
    case "invite-staff": openModal(`${modalHead("Invite a member of staff", "They'll get an email with a link to set their password.")}
        <form class="form" data-form="invite-staff" novalidate><div class="form-2"><div class="field"><label for="is-first">Title and name</label><input class="input" id="is-first" autofocus placeholder="e.g. Mrs Ruth Ekanem"></div><div class="field"><label for="is-role">Role</label><select class="select" id="is-role"><option>Teacher</option><option>School admin</option></select></div></div>
        <div class="field"><label for="is-email">Email</label><input class="input" id="is-email" type="email" placeholder="name@greenfield.sch.ng"><span class="err" id="is-err"></span></div>
        <div class="acts"><button class="btn white" type="button" data-act="close">Cancel</button><button class="btn" type="submit">${icon("mail")}Send invite</button></div></form>`); break;
    case "import": openModal(`${modalHead("Import students", "Add a whole class from a spreadsheet.")}
        <div class="empty" style="border-radius:20px;background:#fff;border:2px dashed var(--line-2)"><div class="blob3"><i style="background:#DDF3E6"></i><i style="background:#DAEAFB"></i><i style="background:#FAF0C4"></i></div><b>Drop a spreadsheet here</b><p>CSV or Excel, one student per row: first name, last name, class, parent's email.</p></div>
        <div class="acts"><button class="btn white" type="button" data-act="toast" data-msg="In the app this downloads the template">Download the template</button><button class="btn" type="button" data-act="toast" data-msg="In the app this opens your files">Choose a file</button></div>`); break;
    case "mark-complete": {
      const armId = d.arm || S.route.arm; const a = arm(armId);
      openModal(`${modalHead(`Mark ${a.name} Mathematics complete?`, `Your scores lock and Mrs Adeyemi is told. To change anything afterwards, you'll need to ask her to reopen the sheet.`)}
        <div class="sum"><div><span>Students</span><b class="tab">${studentsIn(armId).length}, all scored</b></div><div><span>Class average</span><b class="tab">${fmt(kvAvg(armId), 1)}</b></div></div>
        <div class="acts"><button class="btn white" type="button" data-act="close">Not yet</button><button class="btn" type="button" data-act="mark-go" data-arm="${armId}">${icon("check")}Mark complete</button></div>`); break;
    }
    case "mark-go": { const sh = sheet(d.arm, "maths"); sh.status = "complete"; notify("admin", "t-bakare", `Mr Tunde Bakare marked ${arm(d.arm).name} Mathematics complete`, { p: "arm", arm: d.arm }); closeAll(); render(); stamp("COMPLETE • SCORES LOCKED • "); toast(`${arm(d.arm).name} Mathematics marked complete`); break; }
    case "ask-reopen": openModal(`${modalHead("Ask to reopen this sheet", "Tell Mrs Adeyemi what needs changing. She'll get it straight away.")}
        <form class="form" data-form="reopen" novalidate><div class="field"><label for="ro-why">What needs changing?</label><textarea class="textarea" id="ro-why" autofocus placeholder="e.g. Two students' exam scores were swapped."></textarea><span class="err" id="ro-err"></span></div>
        <div class="acts"><button class="btn white" type="button" data-act="close">Cancel</button><button class="btn" type="submit">Send request</button></div></form>`); break;
    case "set-tab": S.setTab = d.k; render(); break;
    case "accent": if (d.k === "neutral") S.look = "neutral"; else { DB.accent = d.k; if (S.look === "neutral") S.look = "pastel"; applyAccent(); } render(); break;
    case "scale-add": S.scaleDraft.push({ g: "", min: "", remark: "" }); render(); break;
    case "scale-del": S.scaleDraft.splice(+d.i, 1); render(); break;
    case "scale-reset": S.scaleDraft = null; render(); toast("Changes undone"); break;
    case "scale-save": DB.scale = S.scaleDraft.map((b) => ({ g: String(b.g).trim().toUpperCase(), min: Number(b.min), remark: b.remark })); S.scaleDraft = null; render(); toast("Grading scale saved. Every total has been regraded"); break;
    case "pref": toast(el.checked ? "Turned on" : "Turned off"); break;
  }
}
function kvAvg(armId) { const inf = sheetInfo(armId, "maths"); const t = inf.rows.filter((r) => r.complete).map((r) => r.total); return t.length ? t.reduce((a, b) => a + b, 0) / t.length : 0; }

function onSubmit(e) {
  const f = e.target.closest("form[data-form]"); if (!f) return; e.preventDefault();
  const kind = f.dataset.form;
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  if (kind === "school") { DB.school.name = $("#f-name").value.trim() || DB.school.name; DB.school.motto = $("#f-motto").value.trim(); DB.school.place = $("#f-place").value.trim(); render(); toast("School details saved"); }
  if (kind === "term") { DB.school.due = $("#f-due").value; const dd = new Date($("#f-due").value); if (!isNaN(dd)) DB.school.dueText = dd.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }); DB.school.nextTerm = $("#f-next").value; render(); toast(`Dates saved. Scores are now due ${DB.school.dueText}`); }
  if (kind === "profile") toast("Profile saved");
  if (kind === "create-school") {
    const nm = $("#cs-name").value.trim(), city = $("#cs-city").value.trim(), who = $("#cs-admin").value.trim(), em = $("#cs-email").value.trim();
    for (const [id, v] of [["#cs-name", nm], ["#cs-city", city], ["#cs-admin", who]]) { if (!v) { $(id).classList.add("bad"); $(id).focus(); return; } }
    if (!emailOk(em)) { $("#cs-err").textContent = "Check this email address. The invite goes here."; $("#cs-email").classList.add("bad"); $("#cs-email").focus(); return; }
    const paid = $("#cs-plan").value === "paid"; const t = f.dataset.trial ? trial(f.dataset.trial) : null;
    DB.platform.schools.push({ id: "s" + Date.now(), n: nm, c: city, st: paid ? "active" : "trial", day: paid ? undefined : 1, plan: paid ? "Standard" : "Trial", students: t ? t.students : 0, pct: 0, admin: who, email: em, since: "today", last: "Not signed in yet" });
    if (t) t.st = "created";
    logActivity("created", null, `${nm} was created. An invite went to ${em}.`);
    closeAll(); render(); stamp("SCHOOL CREATED • INVITE SENT • "); toast(`${nm} created. Invite sent to ${em}`);
  }
  if (kind === "book-call") { const t = trial(f.dataset.id); const dd = new Date($("#bc-day").value + "T" + ($("#bc-time").value || "11:00")); t.st = "call"; t.call = isNaN(dd) ? "soon" : dd.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) + ", " + $("#bc-time").value; closeAll(); render(); toast(`Call booked with ${t.who}`); }
  if (kind === "decline-trial") { const t = trial(f.dataset.id); t.st = "declined"; closeAll(); render(); toast(`Declined. We've emailed ${t.who}`); }
  if (kind === "suspend") { const x = sch(f.dataset.id); if ($("#su-confirm").value.trim().toLowerCase() !== x.n.toLowerCase()) { $("#su-err").textContent = `Type ${x.n} exactly, so nobody suspends a school by accident.`; $("#su-confirm").classList.add("bad"); $("#su-confirm").focus(); return; } x.st = "suspended"; x.reason = $("#su-why").value; logActivity("suspend", x.id, `${x.n} was suspended. ${x.reason}`); closeAll(); render(); toast(`${x.n} is suspended. Everyone there has been signed out`); }
  if (kind === "invite-parent") { const v = $("#ip-email").value.trim(); if (!emailOk(v)) { $("#ip-err").textContent = "Check this email address. It should look like name@example.com."; $("#ip-email").classList.add("bad"); $("#ip-email").focus(); return; } const st = student(f.dataset.id); st.parent = "invited"; closeAll(); if (S.route.p === "students") $("#st-list").innerHTML = studentGroups(); else render(); toast(`Invite sent to ${v}`); }
  if (kind === "invite-staff") { const n = $("#is-first").value.trim(); const v = $("#is-email").value.trim(); if (!n) { $("#is-first").classList.add("bad"); $("#is-first").focus(); return; } if (!emailOk(v)) { $("#is-err").textContent = "Check this email address. It should look like name@greenfield.sch.ng."; $("#is-email").classList.add("bad"); $("#is-email").focus(); return; } const parts = n.split(" "); const title = /^(Mr|Mrs|Ms|Miss|Dr)\.?$/i.test(parts[0]) ? parts.shift().replace(".", "") : ""; DB.staff.push({ id: "t-" + Date.now(), name: parts.join(" "), title, email: v, role: $("#is-role").value, status: "invited" }); closeAll(); render(); toast(`Invite sent to ${v}`); }
  if (kind === "reopen") { const v = $("#ro-why").value.trim(); if (v.length < 8) { $("#ro-err").textContent = "Say a little more, so Mrs Adeyemi knows what to expect."; $("#ro-why").classList.add("bad"); $("#ro-why").focus(); return; } sheet(S.route.arm, S.route.subj).reopen = { by: "t-bakare", reason: v, at: "Just now" }; notify("admin", "t-bakare", `Mr Tunde Bakare asked to reopen ${arm(S.route.arm).name} Mathematics`, { p: "arm", arm: S.route.arm }); closeAll(); render(); toast("Request sent to Mrs Adeyemi"); }
}

/* ---------- events ---------- */
document.addEventListener("click", (e) => {
  const t = e.target;
  const demo = t.closest("[data-demo]");
  if (demo) { const k = demo.dataset.demo; S[k] = demo.dataset.v; if (k === "role") { S.route = { p: "home" }; S.setTab = null; } closeAll(); render(true); return; }
  if (t.closest("#reset")) { DB = window.D.fresh(); if (!DB.staff.find((s) => s.id === "t-ajayi")) DB.staff.push({ id: "t-ajayi", name: "Femi Ajayi", title: "Mr", email: "f.ajayi@greenfield.sch.ng", role: "Teacher", status: "active" }); const keep = { device: S.device, role: S.role, look: S.look, school: S.school }; S = initial(); Object.assign(S, keep); applyAccent(); closeAll(); render(true); toast("Demo reset to its starting point"); return; }
  if (t === scrim()) { closeAll(); return; }
  const p = t.closest("[data-pal]"); if (p) { pickPalette(+p.dataset.pal); return; }
  const cb = t.closest("[data-car]"); if (cb) { const car = cb.closest(".carousel"); carMove(car, carIndex(car) + +cb.dataset.car); return; }
  const cd = t.closest("[data-dot]"); if (cd) { carMove(cd.closest(".carousel"), +cd.dataset.dot); return; }
  const tb = t.closest("[data-tabbtn]"); if (tb) { const card = tb.closest(".card"); $$("[data-tabbtn]", card).forEach((b) => b.setAttribute("aria-selected", String(b === tb))); $$("[data-panel]", card).forEach((x) => { x.hidden = x.dataset.panel !== tb.dataset.tabbtn; }); return; }
  const a = t.closest("[data-act]");
  if (a && a.tagName !== "INPUT") { e.preventDefault(); act(a.dataset.act, a.dataset, a); return; }
  if (a) return; // checkboxes act on "change"
  const g = t.closest("[data-go]");
  if (g) {
    e.preventDefault(); closeAll();
    if (g.dataset.filter !== undefined) S.classFilter = g.dataset.filter;
    if (g.dataset.level !== undefined) { S.classLevel = g.dataset.level; S.classFilter = "all"; }
    if (g.dataset.unlinked) { S.stUnlinked = true; S.stq = ""; S.stClass = "all"; }
    if (g.dataset.focus) S.focusStudent = g.dataset.focus;
    if (g.dataset.term) S.route = { p: "results", term: g.dataset.term };
    if (g.dataset.go === "results" && g.dataset.term) { render(); return; }
    go(g.dataset.go); return;
  }
});
document.addEventListener("change", (e) => { const a = e.target.closest?.('input[data-act]'); if (a) act(a.dataset.act, a.dataset, a); });
document.addEventListener("submit", onSubmit);
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); return; }
  if (e.key === "Escape") { closeAll(); return; }
  if ($("#pal").classList.contains("show")) {
    if (e.key === "ArrowDown") { e.preventDefault(); palSel = Math.min(palItems.length - 1, palSel + 1); drawPalette(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); palSel = Math.max(0, palSel - 1); drawPalette(); }
    else if (e.key === "Enter") { e.preventDefault(); pickPalette(palSel); }
  }
});
$("#pal-q").addEventListener("input", () => { palSel = 0; drawPalette(); });
const tip = $("#tip");
document.addEventListener("pointermove", (e) => { const el = e.target.closest?.("[data-tip]"); if (!el) { tip.classList.remove("show"); return; } tip.innerHTML = el.dataset.tip; tip.classList.add("show"); const w = tip.offsetWidth, h = tip.offsetHeight; let x = e.clientX + 14, y = e.clientY - h - 12; if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y < 8) y = e.clientY + 18; tip.style.left = x + "px"; tip.style.top = y + "px"; });

applyAccent();
render();
})();
