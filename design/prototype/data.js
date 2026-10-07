/* Sample data for the prototype. Everything here is invented and marked as sample in the UI. */
"use strict";
window.D = (() => {
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  const SCHOOL = { name: "Greenfield College", place: "Lekki, Lagos", motto: "Knowledge, character, service", session: "2026/2027", term: "First term", week: 11, weeks: 13, starts: "2026-09-08", ends: "2026-12-12", due: "2026-12-05", dueText: "Friday 5 December", nextTerm: "Monday 12 January 2027" };

  // Class colours: validated categorical set (dataviz), each with a pastel tint and a deep ink for text.
  const LEVELS = [
    { k: "JSS 1", tint: "#DDF3E6", deep: "#1E6B45", mid: "#1baf7a" },
    { k: "JSS 2", tint: "#FFE3D1", deep: "#A4471C", mid: "#eb6834" },
    { k: "JSS 3", tint: "#E6E0FB", deep: "#4A3AA7", mid: "#4a3aa7" },
    { k: "SS 1", tint: "#DAEAFB", deep: "#1F5E9C", mid: "#2a78d6" },
    { k: "SS 2", tint: "#FAF0C4", deep: "#7A5A00", mid: "#eda100" },
    { k: "SS 3", tint: "#FADCE4", deep: "#A23457", mid: "#e87ba4" },
  ];

  const STAFF = [
    { id: "t-bakare", name: "Tunde Bakare", title: "Mr", email: "t.bakare@greenfield.sch.ng", role: "Teacher" },
    { id: "t-okon", name: "Grace Okon", title: "Mrs", email: "g.okon@greenfield.sch.ng", role: "Teacher" },
    { id: "t-bello", name: "Halima Bello", title: "Ms", email: "h.bello@greenfield.sch.ng", role: "Teacher" },
    { id: "t-eze", name: "Chinedu Eze", title: "Mr", email: "c.eze@greenfield.sch.ng", role: "Teacher" },
    { id: "t-nwosu", name: "Emeka Nwosu", title: "Mr", email: "e.nwosu@greenfield.sch.ng", role: "Teacher" },
    { id: "t-danjuma", name: "Musa Danjuma", title: "Mr", email: "m.danjuma@greenfield.sch.ng", role: "Teacher" },
    { id: "t-ibe", name: "Ngozi Ibe", title: "Mrs", email: "n.ibe@greenfield.sch.ng", role: "Teacher" },
    { id: "t-lawal", name: "Aisha Lawal", title: "Mrs", email: "a.lawal@greenfield.sch.ng", role: "Teacher" },
    { id: "t-adewale", name: "Bisi Adewale", title: "Mrs", email: "b.adewale@greenfield.sch.ng", role: "Teacher" },
  ];

  const SUBJECTS = [
    { id: "maths", name: "Mathematics", short: "Maths", teacher: "t-bakare" },
    { id: "english", name: "English Language", short: "English", teacher: "t-okon" },
    { id: "computer", name: "Computer Studies", short: "Computer", teacher: "t-bello" },
    { id: "agric", name: "Agricultural Science", short: "Agric", teacher: "t-eze" },
    { id: "phe", name: "Physical and Health Education", short: "PHE", teacher: "t-nwosu" },
    { id: "civic", name: "Civic Education", short: "Civic", teacher: "t-danjuma" },
    { id: "crs", name: "Christian Religious Studies", short: "CRS", teacher: "t-ibe" },
    { id: "french", name: "French", short: "French", teacher: "t-lawal" },
    { id: "yoruba", name: "Yoruba", short: "Yoruba", teacher: "t-adewale" },
  ];

  const COMPONENTS = [
    { id: "ca1", name: "First CA", max: 20 },
    { id: "ca2", name: "Second CA", max: 20 },
    { id: "exam", name: "Exam", max: 60 },
  ];

  const SCALE = [
    { g: "A", min: 70, remark: "Excellent" },
    { g: "B", min: 60, remark: "Very good" },
    { g: "C", min: 50, remark: "Good" },
    { g: "D", min: 45, remark: "Fair" },
    { g: "E", min: 40, remark: "Pass" },
    { g: "F", min: 0, remark: "Fail" },
  ];

  const FIRST = ["Adaeze", "Ifeanyi", "Tolu", "Zainab", "David", "Chisom", "Emeka", "Fatima", "Olumide", "Kemi", "Sade", "Musa", "Halima", "Ebuka", "Amaka", "Yusuf", "Blessing", "Tobi", "Femi", "Aisha", "Uche", "Nneka", "Segun", "Bisola", "Ikenna", "Temi", "Ada", "Funke", "Kelechi", "Nkechi", "Seun", "Dayo", "Ireti", "Somto", "Hauwa", "Precious", "Daniel", "Esther", "Joshua", "Grace", "Victor", "Ruth", "Samuel", "Deborah", "Ibrahim", "Maryam", "Chidi", "Oluwaseun"];
  const LAST = ["Adeyemi", "Bello", "Eze", "Nwosu", "Okon", "Danjuma", "Ibe", "Lawal", "Adewale", "Obi", "Yusuf", "Etim", "Nnaji", "Balogun", "Uzor", "Ogunleye", "Abubakar", "Chukwu", "Ojo", "Afolabi", "Onyeka", "Salami", "Mohammed", "Olatunji", "Akande", "Nwachukwu", "Oyelaran", "Ekanem", "Okoro", "Ajayi"];

  function fresh() {
    const r = rng(2026);
    const arms = [];
    LEVELS.forEach((lv, li) => ["A", "B"].forEach((a) => arms.push({ id: (lv.k.replace(" ", "") + a).toLowerCase(), name: `${lv.k}${a}`.replace(/(\d)([AB])$/, "$1$2"), label: `${lv.k}${a}`, level: li })));
    arms.forEach((a) => { a.name = `${LEVELS[a.level].k}${a.id.slice(-1).toUpperCase()}`; });
    const formTeachers = ["t-okon", "t-bello", "t-bakare", "t-danjuma", "t-eze", "t-ibe", "t-nwosu", "t-lawal", "t-adewale", "t-okon", "t-danjuma", "t-bello"];
    arms.forEach((a, i) => { a.form = formTeachers[i]; });

    // Students
    const students = [];
    const used = new Set();
    arms.forEach((a, ai) => {
      const n = 26 + Math.floor(r() * 9);
      for (let k = 0; k < n; k++) {
        let f, l, key;
        do { f = FIRST[Math.floor(r() * FIRST.length)]; l = LAST[Math.floor(r() * LAST.length)]; key = f + l; } while (used.has(key));
        used.add(key);
        students.push({ id: `s${ai}_${k}`, first: f, last: l, arm: a.id, ability: Math.max(28, Math.min(95, 62 + (r() + r() + r() - 1.5) * 34)), parent: r() < 0.93 ? "linked" : "none" });
      }
    });
    // The parent in the demo, and a few named students the demo refers to.
    const place = (id, arm, first, last, ability, parent = "linked") => { const s = students.find((x) => x.arm === arm && !x.fixed); Object.assign(s, { id, first, last, ability, parent, fixed: true }); };
    place("chiamaka", "jss2b", "Chiamaka", "Okafor", 76);
    place("obinna", "ss3a", "Obinna", "Okafor", 66);
    place("ifeanyi", "jss2b", "Ifeanyi", "Obi", 58);
    place("adaobi", "ss2b", "Adaobi", "Nnaji", 71);
    students.sort((a, b) => a.arm === b.arm ? a.last.localeCompare(b.last) || a.first.localeCompare(b.first) : 0);

    // Score sheets: one per arm x subject.
    const sheets = {};
    const byArm = (id) => students.filter((s) => s.arm === id);
    const gen = (s, subj, comp) => { const n = (r() - 0.5) * 26 + (subj.id.length % 3) * 2; const pct = Math.max(8, Math.min(100, s.ability + n)); return Math.round((comp.max * pct) / 100); };
    arms.forEach((a) => SUBJECTS.forEach((subj) => {
      const x = r();
      let status = "complete", pct = 1;
      if (x < 0.1) { status = "none"; pct = 0; } else if (x < 0.36) { status = "progress"; pct = 0.25 + r() * 0.65; }
      sheets[`${a.id}:${subj.id}`] = { status, pct, reopen: null };
    }));
    const set = (arm, subj, status, pct, extra = {}) => Object.assign(sheets[`${arm}:${subj}`], { status, pct }, extra);
    SUBJECTS.forEach((s) => { set("jss1a", s.id, "complete", 1); set("ss3a", s.id, "complete", 1); });
    ["maths", "english", "computer"].forEach((s) => set("ss3b", s, "locked", 1));
    SUBJECTS.forEach((s, i) => { if (i % 3 !== 1) set("jss2b", s.id, i % 2 ? "none" : "progress", i % 2 ? 0 : 0.18 + i * 0.04); });
    set("jss2a", "maths", "progress", 1);
    set("jss2b", "maths", "progress", 0.58);
    set("ss1a", "maths", "none", 0);
    set("ss2a", "maths", "locked", 1);
    set("jss3a", "agric", "complete", 1, { reopen: { by: "t-eze", reason: "Two continuous assessment scores went into the wrong column.", at: "2 hours ago" } });
    set("ss2b", "english", "complete", 1, { reopen: { by: "t-okon", reason: "Adaobi Nnaji's exam script turned up after I marked the sheet complete.", at: "Yesterday" } });

    // Fill the entries to match each sheet's progress.
    Object.entries(sheets).forEach(([key, sh]) => {
      const [armId, subjId] = key.split(":");
      const subj = SUBJECTS.find((s) => s.id === subjId);
      const list = byArm(armId);
      const full = Math.round(list.length * sh.pct);
      sh.entries = {};
      list.forEach((s, i) => {
        const e = { ca1: null, ca2: null, exam: null };
        if (i < full) COMPONENTS.forEach((c) => { e[c.id] = gen(s, subj, c); });
        else if (i === full && sh.status === "progress") { e.ca1 = gen(s, subj, COMPONENTS[0]); }
        if (i < full && r() < 0.012) e.exam = "ABS";
        sh.entries[s.id] = e;
      });
    });

    // Last session's results, for the parent's history.
    const history = {
      chiamaka: { arm: "JSS 1B", of: 32, terms: [
        { id: "2025-1", label: "First term, 2025/2026", short: "First", pos: 7, scores: [72, 66, 81, 60, 70, 71, 76, 49, 57] },
        { id: "2025-2", label: "Second term, 2025/2026", short: "Second", pos: 5, scores: [78, 70, 85, 64, 73, 74, 78, 54, 58] },
        { id: "2025-3", label: "Third term, 2025/2026", short: "Third", pos: 4, published: "24 July 2026", scores: [82, 74, 88, 69, 71, 77, 80, 58, 65], remark: "Chiamaka is careful and asks good questions. French needs steady practice over the holiday.", by: "Mrs Grace Okon, class teacher", principal: "A very good term. Keep it up." },
      ] },
      obinna: { arm: "SS 2A", of: 29, terms: [
        { id: "2025-1", label: "First term, 2025/2026", short: "First", pos: 13, scores: [55, 63, 74, 70, 66, 58, 69, 44, 52] },
        { id: "2025-2", label: "Second term, 2025/2026", short: "Second", pos: 12, scores: [57, 64, 77, 71, 67, 60, 70, 46, 55] },
        { id: "2025-3", label: "Third term, 2025/2026", short: "Third", pos: 11, published: "24 July 2026", scores: [58, 66, 79, 72, 68, 61, 70, 47, 56], remark: "Obinna has grown in confidence this year. Mathematics will come with more practice at home.", by: "Mr Musa Danjuma, class teacher", principal: "Steady progress. Final year now: focus." },
      ] },
    };

    const notifs = [
      { id: "n1", role: "admin", who: "t-eze", text: "Mr Chinedu Eze asked to reopen JSS 3A Agricultural Science", time: "2 hours ago", go: { p: "arm", arm: "jss3a" } },
      { id: "n2", role: "admin", who: "t-okon", text: "Mrs Grace Okon asked to reopen SS 2B English Language", time: "Yesterday", go: { p: "arm", arm: "ss2b" } },
      { id: "n3", role: "admin", who: "t-okon", text: "Mrs Grace Okon marked SS 3A English Language complete", time: "Yesterday", go: { p: "arm", arm: "ss3a" }, read: true },
      { id: "n4", role: "teacher", who: "admin", text: "Scores are due Friday 5 December", time: "Today", go: { p: "home" } },
      { id: "n5", role: "teacher", who: "admin", text: "Mrs Adeyemi locked SS 2A Mathematics for publishing", time: "Monday", go: { p: "scores", arm: "ss2a", subj: "maths" }, read: true },
      { id: "n6", role: "parent", who: "school", text: "Chiamaka's third term report card is ready", time: "24 July", go: { p: "results", child: "chiamaka", term: "2025-3" }, read: true },
      { id: "n7", role: "parent", who: "school", text: "First term exams start Monday 1 December", time: "Today", go: { p: "home" } },
    ];

    // The Brillanda team's view: every school on the platform. Greenfield's figures come from the live sample above.
    const platform = {
      schools: [
        { id: "greenfield", n: "Greenfield College", c: "Lekki, Lagos", st: "active", plan: "Standard", students: students.length, admin: "Mrs Funmilayo Adeyemi", email: "f.adeyemi@greenfield.sch.ng", since: "January 2026", last: "2 min ago" },
        { id: "crestview", n: "Crestview Academy", c: "Wuse, Abuja", st: "active", plan: "Standard", students: 612, pct: 0.83, admin: "Mr Yakubu Garba", email: "admin@crestview.edu.ng", since: "September 2025", last: "Just now" },
        { id: "kings", n: "Kings' Model School", c: "Enugu", st: "trial", day: 9, plan: "Trial", students: 198, pct: 0.22, admin: "Mrs Chioma Nwankwo", email: "office@kingsmodel.sch.ng", since: "16 September 2026", last: "1 hour ago" },
        { id: "brightfuture", n: "Bright Future Secondary", c: "Ibadan", st: "active", plan: "Standard", students: 455, pct: 0.58, admin: "Mr Wale Adigun", email: "info@brightfuture.sch.ng", since: "January 2026", last: "12 min ago" },
        { id: "stanne", n: "St. Anne's Girls' School", c: "Owerri", st: "trial", day: 23, plan: "Trial", students: 287, pct: 0.64, admin: "Rev. Sr. Mary Okeke", email: "stannes.owerri@gmail.com", since: "2 September 2026", last: "3 hours ago" },
        { id: "hilltop", n: "Hilltop Secondary", c: "Jos", st: "suspended", plan: "Standard", students: 240, pct: 0, admin: "Mr Danladi Pam", email: "hilltopjos@yahoo.com", since: "April 2026", last: "12 days ago", reason: "Payment is 12 days overdue." },
        { id: "alameen", n: "Al-Ameen Academy", c: "Kano", st: "active", plan: "Standard", students: 530, pct: 0.47, admin: "Mallam Sani Bello", email: "alameen.kano@gmail.com", since: "May 2026", last: "40 min ago" },
        { id: "riverspearl", n: "Rivers Pearl College", c: "Port Harcourt", st: "active", plan: "Standard", students: 389, pct: 0.76, admin: "Mrs Ibiere George", email: "admin@riverspearl.sch.ng", since: "January 2026", last: "5 min ago" },
      ],
      trials: [
        { id: "unity", n: "Unity Heights School", c: "Asaba", students: 412, who: "Mr Efe Okoro", role: "Proprietor", email: "efe.okoro@unityheights.ng", phone: "0806 221 4410", when: "2 hours ago", st: "new", msg: "We still do results in Excel and it takes two weeks every term. We'd like to try it before our first term exams." },
        { id: "graceland", n: "Graceland Schools", c: "Abeokuta", students: 268, who: "Mrs Kemi Sowole", role: "Principal", email: "k.sowole@graceland.sch.ng", phone: "0703 118 9027", when: "Yesterday", st: "call", call: "Thursday 27 November, 11:00", msg: "Two campuses. Can each campus have its own admin?" },
        { id: "starlight", n: "Starlight Academy", c: "Kaduna", students: 505, who: "Mallam Idris Sule", role: "Administrator", email: "idris.sule@starlight.edu.ng", phone: "0812 440 3391", when: "3 days ago", st: "new", msg: "Our parents mostly use phones. Does the report card work on a phone?" },
      ],
      activity: [
        { t: "Today, 9:42", k: "publish", s: "crestview", x: "Crestview Academy published JSS 3 results. 204 parents emailed." },
        { t: "Today, 9:15", k: "invite", s: "kings", x: "Kings' Model School invited 11 teachers." },
        { t: "Today, 8:50", k: "import", s: "riverspearl", x: "Rivers Pearl College imported 389 students from a spreadsheet." },
        { t: "Today, 8:02", k: "trial", s: null, x: "Unity Heights School asked for a trial." },
        { t: "Yesterday, 16:20", k: "settings", s: "stanne", x: "St. Anne's Girls' School changed its grading scale." },
        { t: "Yesterday, 11:05", k: "billing", s: "hilltop", x: "Payment reminder sent to Hilltop Secondary." },
        { t: "Monday, 14:30", k: "publish", s: "greenfield", x: "Greenfield College published last term's catch-up results." },
      ],
    };
    notifs.push(
      { id: "n8", role: "super", who: "brillanda", text: "Unity Heights School asked for a trial", time: "2 hours ago", go: { p: "trials" } },
      { id: "n9", role: "super", who: "brillanda", text: "St. Anne's Girls' School has 7 days left on its trial", time: "Today", go: { p: "schools" } },
      { id: "n10", role: "super", who: "brillanda", text: "Hilltop Secondary is 12 days past its payment date", time: "Yesterday", go: { p: "schools" }, read: true },
    );

    return {
      platform,
      school: { ...SCHOOL },
      scale: SCALE.map((x) => ({ ...x })),
      arms, students, sheets, history, notifs,
      staff: STAFF.map((s) => ({ ...s, status: "active" })),
      published: {},
      accent: "lilac",
      reminded: {},
    };
  }

  return { LEVELS, SUBJECTS, COMPONENTS, fresh };
})();
