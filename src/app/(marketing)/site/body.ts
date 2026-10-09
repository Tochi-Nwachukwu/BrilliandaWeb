// The marketing page's markup. The design came unchanged from the old site (apps/site/index.html,
// tag vite-final); the words describe v1 (rewritten 9 October 2026). Class names and data-*
// attributes drive the styles and motion in this folder, so keep them when changing copy.
export const SITE_BODY = String.raw`<!-- First visit only. After that this element is removed before paint. -->
    <div id="intro" aria-hidden="true">
      <div class="intro-in">
        <div class="intro-mark"><span>Brillianda</span></div>
        <div class="intro-bar"><i></i></div>
      </div>
    </div>

    <div id="cursor" aria-hidden="true"></div>

    <a class="sr" href="#main">Skip to content</a>

    <header class="nav over-dark" id="nav">
      <div class="wrap nav-in">
        <a class="mark" href="/" aria-label="Brillianda, home"><i></i>Brillianda</a>
        <nav class="nav-links" aria-label="Sections">
          <a href="#what">What it does</a>
          <a href="#inside">Inside</a>
          <a href="#term">Getting started</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div class="nav-right">
          <a class="btn btn-line btn-sm" id="signin" href="/login"><span class="fill"></span><span>Sign in</span></a>
          <a class="btn btn-solid btn-sm" href="/signup"><span class="fill"></span><span>Create your school</span></a>
        </div>
      </div>
    </header>

    <main id="main">
      <!-- ============ hero ============ -->
      <section class="hero" id="hero">
        <div class="hero-media">
          <div class="inner">
            <img
              src="/photos/classroom-lagos-960.webp"
              srcset="
                /photos/classroom-lagos-480.webp   480w,
                /photos/classroom-lagos-960.webp   960w,
                /photos/classroom-lagos-1600.webp 1600w
              "
              sizes="100vw"
              alt="Students at their desks in a Nigerian classroom"
              width="1600"
              height="1067"
              fetchpriority="high"
            />
          </div>
          <div class="hero-veil"></div>
        </div>

        <div class="wrap hero-in">
          <h1>
            <span class="lm"><span>Your whole school,</span></span>
            <span class="lm"><span style="--d: 90ms">set up in</span></span>
            <span class="lm"><span style="--d: 180ms">an afternoon.</span></span>
          </h1>
          <div class="hero-row">
            <p class="fu" style="--d: 180ms">
              Classes, arms, subjects and every student, kept in one place and run from the phone you already have.
              Bring your list from Excel or Word, and your school gets its own address.
            </p>
            <div class="fu" style="--d: 260ms; display: flex; gap: 10px; flex-wrap: wrap">
              <a class="btn btn-solid" href="/signup"><span class="fill"></span><span>Create your school</span></a>
              <a class="btn btn-on-dark" href="#inside"><span class="fill"></span><span>See it working</span></a>
            </div>
          </div>
        </div>

        <div class="scroll-cue" aria-hidden="true"><span class="ln"></span>Scroll</div>
      </section>

      <!-- ============ statement + counters ============ -->
      <section class="wrap statement" id="what">
        <h2>
          <span class="lm"><span>Every school keeps a register.</span></span>
          <span class="lm"><span style="--d: 80ms">Most keep it in five places.</span></span>
          <span class="lm"><span style="--d: 160ms">We put it in one.</span></span>
        </h2>

        <div class="st-sub">
          <p class="fu">
            Admission files in a cabinet, class lists in Excel, guardians’ numbers in somebody’s phone, and nobody sure
            which copy is the latest. Every new session, it starts again.
          </p>
          <p class="fu" style="--d: 110ms">
            Brillianda holds the calendar, the classes and arms, the subjects each class takes, and every student with
            their guardians, and keeps a record of who changed what.
          </p>
        </div>

        <div class="nums-row">
          <div class="num fu">
            <b data-count="4" data-suffix="">0</b>
            <span>short steps to your school’s own address</span>
          </div>
          <div class="num fu" style="--d: 100ms">
            <b data-count="18" data-suffix="">0</b>
            <span>classes from two answers: JSS 1 to SS 3, three arms each</span>
          </div>
          <div class="num fu" style="--d: 200ms">
            <b data-count="5000" data-suffix="">0</b>
            <span>students in one import, checked row by row before anything is saved</span>
          </div>
        </div>
      </section>

      <!-- ============ full-bleed band ============ -->
      <section class="bleed" id="band">
        <div class="inner" data-parallax>
          <img
            src="/photos/classroom-students-uniform-960.webp"
            srcset="
              /photos/classroom-students-uniform-480.webp   480w,
              /photos/classroom-students-uniform-960.webp   960w,
              /photos/classroom-students-uniform-1600.webp 1600w
            "
            sizes="100vw"
            alt="Secondary school students in uniform during a lesson"
            width="1600"
            height="1067"
            loading="lazy"
          />
        </div>
        <div class="bleed-veil"></div>
        <div class="bleed-copy">
          <div class="wrap">
            <h2 class="lm"><span>Built around how a Nigerian school actually runs.</span></h2>
            <p class="fu">
              Sessions and terms. Classes with arms. The 2025 curriculum’s subjects, and the old ones your older classes
              still take. Guardians shared by brothers and sisters. Nothing to bend into shape.
            </p>
          </div>
        </div>
      </section>

      <!-- ============ who it's for ============ -->
      <section class="wrap sec" id="roles">
        <div class="ehead">
          <span class="lbl"><i class="d"></i>Who signs in</span>
          <h2 class="lm"><span>The people who run the school, first.</span></h2>
          <p class="fu">Owners and admins sign in at your school’s own address. Teachers and parents come next.</p>
        </div>

        <div class="roles">
          <article class="role fu">
            <span class="rn">01</span>
            <h3>School owner</h3>
            <p>Creates the school and holds its main email.</p>
            <ul>
              <li>Signs up in four short steps</li>
              <li>Invites admins to help</li>
              <li>Sets the school’s colour and calendar</li>
            </ul>
          </article>
          <article class="role fu" style="--d: 90ms">
            <span class="rn">02</span>
            <h3>School admin</h3>
            <p>Keeps the records straight, day to day.</p>
            <ul>
              <li>Classes, arms and subjects</li>
              <li>Adding, importing and moving students</li>
              <li>Guardians and contact details</li>
            </ul>
          </article>
          <article class="role fu" style="--d: 180ms">
            <span class="rn">03</span>
            <h3>Teachers <span class="soon-tag">Coming later</span></h3>
            <p>Their own classes and subjects, nothing more.</p>
            <ul>
              <li>Class lists for the arms they teach</li>
              <li>Built on the classes you set up now</li>
            </ul>
          </article>
          <article class="role fu" style="--d: 270ms">
            <span class="rn">04</span>
            <h3>Parents <span class="soon-tag">Coming later</span></h3>
            <p>Their own children, on their own phone.</p>
            <ul>
              <li>Linked through the guardian on each record</li>
              <li>One sign-in for brothers and sisters</li>
            </ul>
          </article>
        </div>
      </section>

      <!-- ============ the six core capabilities ============ -->
      <section class="wrap sec" id="core">
        <div class="ehead">
          <span class="lbl"><i class="d"></i>What is in it today</span>
          <h2 class="lm"><span>Six things, done properly.</span></h2>
          <p class="fu">
            This is the whole of version one. We would rather these six work every day than have twenty that half work.
          </p>
        </div>

        <div class="caps">
          <article class="cap fu">
            <h3>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" stroke-linecap="round" />
              </svg>
              Your own address
            </h3>
            <p>
              Sign up in four short steps and your school gets an address like greenfield.brillianda.com, with its own logo and colour on the sign-in page.
            </p>
          </article>
          <article class="cap fu" style="--d: 70ms">
            <h3>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" />
              </svg>
              Classes and arms
            </h3>
            <p>
              Pick your first and last class and how many arms each has. JSS 1 to SS 3 with three arms is 18 classes, made in one step.
            </p>
          </article>
          <article class="cap fu" style="--d: 140ms">
            <h3>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H19v13H6.5A1.5 1.5 0 0 0 5 18.5z" /><path d="M5 18.5A1.5 1.5 0 0 0 6.5 20H19" stroke-linecap="round" />
              </svg>
              Subjects
            </h3>
            <p>
              Start from the 2025 national curriculum, ticked for your classes. Keep the older subjects your senior classes still take, and add your own.
            </p>
          </article>
          <article class="cap fu" style="--d: 210ms">
            <h3>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" stroke-linecap="round" /><path d="M16 4.8a3 3 0 0 1 0 6M18 14.8c1.9.7 3 2.4 3 5.2" stroke-linecap="round" />
              </svg>
              Students and guardians
            </h3>
            <p>
              Add a student in under a minute on a phone. Brothers and sisters share one guardian. Move a class at once, and find anyone by name, even without the accents.
            </p>
          </article>
          <article class="cap fu" style="--d: 280ms">
            <h3>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 16V4M7 9l5-5 5 5" stroke-linecap="round" stroke-linejoin="round" /><path d="M5 20h14" stroke-linecap="round" />
              </svg>
              Import your list
            </h3>
            <p>
              Upload your Excel sheet or Word table of up to 5,000 students. Every row is checked, mistakes are explained, and a whole import can be undone for a day.
            </p>
          </article>
          <article class="cap fu" style="--d: 350ms">
            <h3>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" stroke-linejoin="round" />
              </svg>
              A record of changes
            </h3>
            <p>
              Every change is kept with who made it and when. If a record is questioned next term, the history answers it.
            </p>
          </article>
        </div>
      </section>

      <!-- ============ a look inside: three screens ============ -->
      <section class="pin-outer" id="inside" data-pin>
        <div class="pin">
          <div class="pin-in">
            <div class="wrap pin-head">
              <h2 class="lm"><span>A look inside.</span></h2>
              <span class="meta"><span data-tour-index>01</span> / 03 &nbsp;·&nbsp; sample data</span>
            </div>

            <div class="pin-rail">
              <div class="pin-track" data-track>
                <!-- card 1: setting up classes -->
                <article class="tour-card">
                  <div>
                    <div class="screen-top">
                      <span class="t">Set up your classes · step 2 of 2</span>
                      <span class="s"><i class="dot-ok"></i>Flowers</span>
                    </div>
                    <div class="sheet-scroll">
                      <table class="sheet">
                        <thead>
                          <tr>
                            <th class="name">Class</th>
                            <th>Anthurium</th>
                            <th>Begonia</th>
                            <th>Calla Lily</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr><td class="name"><b>JSS 1</b></td><td>✓</td><td>✓</td><td>✓</td></tr>
                          <tr><td class="name"><b>JSS 2</b></td><td>✓</td><td>✓</td><td>✓</td></tr>
                          <tr><td class="name"><b>JSS 3</b></td><td>✓</td><td>✓</td><td>✓</td></tr>
                          <tr><td class="name"><b>SS 1</b></td><td>✓</td><td>✓</td><td>✓</td></tr>
                          <tr><td class="name"><b>SS 2</b></td><td>✓</td><td>✓</td><td>·</td></tr>
                          <tr><td class="name"><b>SS 3</b></td><td>✓</td><td>✓</td><td>·</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <div class="sheet-foot">
                      <span>This creates <b>16 classes</b>: JSS 1 Anthurium, JSS 1 Begonia and 14 more</span>
                    </div>
                  </div>
                  <div class="tour-cap">
                    <b>Classes and arms</b>
                    <span>Two answers make the whole list. Classes can differ, and every name can change later.</span>
                  </div>
                </article>

                <!-- card 2: checking an import -->
                <article class="tour-card">
                  <div class="card-doc">
                    <div class="doc-head">
                      <span class="doc-logo">R</span>
                      <div>
                        <h4 data-placeholder>Royal Heights College <span class="sample">Sample</span></h4>
                        <p>Import · our-students.xlsx · 412 rows</p>
                      </div>
                    </div>
                    <div class="doc-meta">
                      <div><span>Ready</span><b>404</b></div>
                      <div><span>To fix</span><b>6</b></div>
                      <div><span>Duplicates</span><b>2</b></div>
                      <div><span>Columns matched</span><b>9 of 9</b></div>
                    </div>
                    <table class="doc">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Student</th>
                          <th>What to fix</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td>14</td><td>Adaeze Nwosu</td><td>Class JS1 not found. Did you mean JSS 1?</td></tr>
                        <tr><td>27</td><td>Tunde Bello</td><td>Dates are read day first. Did you mean 14/03/2014?</td></tr>
                        <tr><td>88</td><td>Fatima Yusuf</td><td>Add the gender: Male or Female</td></tr>
                      </tbody>
                    </table>
                    <div class="doc-foot">
                      <div><span>Fix here</span><b>Tap a row, change the cell</b></div>
                      <div><span>Or in Excel</span><b>Download the 6 rows to fix</b></div>
                    </div>
                  </div>
                  <div class="tour-cap">
                    <b>Import your list</b>
                    <span>Excel, CSV or a Word table. Nothing is saved until every row you keep is right.</span>
                  </div>
                </article>

                <!-- card 3: students on a phone -->
                <article class="tour-card">
                  <div>
                    <div class="screen-top">
                      <span class="t">Students</span>
                      <span class="s">on a phone</span>
                    </div>
                    <div class="phone-frame">
                      <div class="phone-head">
                        <span class="doc-logo" style="width: 22px; height: 22px; font-size: 11px">G</span>
                        Greenfield College
                      </div>
                      <div class="phone-body">
                        <div class="phone-average">482</div>
                        <div class="phone-sub">Active students · 18 classes</div>
                        <div class="phone-row"><span class="grow">Adaeze Nwosu</span><span class="grade-badge" style="color: var(--success); border-color: var(--success-border); background: var(--success-bg)">JSS1 ANT</span></div>
                        <div class="phone-row"><span class="grow">Chinedu Okafor</span><span class="grade-badge" style="color: var(--success); border-color: var(--success-border); background: var(--success-bg)">JSS2 BEG</span></div>
                        <div class="phone-row"><span class="grow">Ọlá Adéṣínà</span><span class="grade-badge" style="color: var(--success); border-color: var(--success-border); background: var(--success-bg)">SS1 ANT</span></div>
                        <div class="phone-row"><span class="grow">Fatima Yusuf</span><span class="grade-badge" style="color: var(--warning); border-color: var(--warning-border); background: var(--warning-bg)">No guardian</span></div>
                        <div class="phone-cta">Add a student</div>
                      </div>
                    </div>
                  </div>
                  <div class="tour-cap">
                    <b>Students</b>
                    <span>Search, filter, move a class at once, and export when you need a copy.</span>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ============ how a term runs ============ -->
      <section class="wrap sec" id="term">
        <div class="ehead">
          <span class="lbl"><i class="d"></i>Getting started</span>
          <h2 class="lm"><span>From sign-up to a full register in an afternoon.</span></h2>
          <p class="fu">A checklist on your home screen walks you through it. Do the steps in any order, and stop whenever you like.</p>
        </div>

        <div class="setup">
          <div>
            <div class="sitem fu">
              <span class="sn">01</span>
              <div>
                <h3>Create your school</h3>
                <p>
                  Your school’s details, your account, a code to your email, and your address. Four short screens, no card.
                </p>
              </div>
            </div>
            <div class="sitem fu" style="--d: 80ms">
              <span class="sn">02</span>
              <div>
                <h3>Set your calendar</h3>
                <p>
                  The session and its terms come filled in from the Lagos calendar. Change the dates, the names, or use two terms.
                </p>
              </div>
            </div>
            <div class="sitem fu" style="--d: 160ms">
              <span class="sn">03</span>
              <div>
                <h3>Add classes and subjects</h3>
                <p>
                  Two answers make your classes and arms. The 2025 curriculum is ticked for them; untick what you don’t teach.
                </p>
              </div>
            </div>
            <div class="sitem fu" style="--d: 240ms">
              <span class="sn">04</span>
              <div>
                <h3>Bring in your students</h3>
                <p>
                  Import your list or add them one by one. Invite an admin to share the work.
                </p>
              </div>
            </div>
          </div>

          <!-- data-stats: the bars fill when this panel comes into view. -->
          <div class="setup-vis fu" style="--d: 120ms" data-stats>
            <img
              src="/photos/teacher-marking-laptop-960.webp"
              srcset="/photos/teacher-marking-laptop-480.webp 480w, /photos/teacher-marking-laptop-960.webp 960w"
              sizes="(max-width: 940px) 100vw, 46vw"
              alt="A school administrator working at a laptop"
              width="960"
              height="640"
              loading="lazy"
            />
            <div class="screen-top" style="border-top: 1px solid var(--rule)">
              <span class="t">Finish setting up</span>
              <span class="s">4 of 6 done</span>
            </div>
            <div class="rows">
              <div class="row" style="--d: 0ms">
                <span class="grow">Academic calendar<span class="sub">2026/2027, three terms</span></span>
                <span class="bar"><i style="--w: 100%; --d: 120ms"></i></span>
                <span class="pill ok" style="--pd: 900ms">Done</span>
              </div>
              <div class="row" style="--d: 90ms">
                <span class="grow">Classes and arms<span class="sub">18 classes</span></span>
                <span class="bar"><i style="--w: 100%; --d: 260ms"></i></span>
                <span class="pill ok" style="--pd: 1040ms">Done</span>
              </div>
              <div class="row" style="--d: 180ms">
                <span class="grow">Students<span class="sub">From our-students.xlsx</span></span>
                <span class="bar"><i style="--w: 72%; --d: 400ms"></i></span>
                <span class="pill mid" style="--pd: 1180ms"><span data-count="296" data-delay="400">0</span> of 412</span>
              </div>
              <div class="row" style="--d: 270ms">
                <span class="grow">Invite an admin<span class="sub">Optional</span></span>
                <span class="bar"><i style="--w: 12%; --d: 540ms"></i></span>
                <span class="pill low" style="--pd: 1320ms">Not yet</span>
              </div>
            </div>
            <div class="setup-note">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path class="tick" d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              None of it stops you using Brillianda in the meantime.
            </div>
          </div>
        </div>
      </section>

      <!-- ============ coming soon ============ -->
      <section class="soon" id="soon">
        <div class="wrap">
          <div class="ehead">
            <span class="lbl"><i class="d"></i>Next, not now</span>
            <h2 class="lm"><span>Coming soon, right after the core.</span></h2>
            <p class="fu">
              These are being built next, on the register you set up now. They are not in the plans below and you are not
              paying for them. When they arrive, we will tell you what changes.
            </p>
          </div>

          <div class="soon-grid">
            <article class="soon-item fu">
              <span class="soon-ic">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" stroke-linecap="round" />
                </svg>
              </span>
              <div>
                <h3>Results and report cards <span class="soon-tag">Coming soon</span></h3>
                <p>Scores entered by teachers, totals, grades and positions worked out, and report cards printed from the same records.</p>
              </div>
            </article>
            <article class="soon-item fu" style="--d: 80ms">
              <span class="soon-ic">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" stroke-linecap="round" />
                </svg>
              </span>
              <div>
                <h3>Attendance <span class="soon-tag">Coming soon</span></h3>
                <p>A daily register for each class, kept on the same students and classes.</p>
              </div>
            </article>
            <article class="soon-item fu" style="--d: 160ms">
              <span class="soon-ic">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M3 7h18v12H3z" /><path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2M3 12h18" stroke-linecap="round" />
                </svg>
              </span>
              <div>
                <h3>Fees and payments <span class="soon-tag">Coming soon</span></h3>
                <p>Invoices per term, what has been paid and what is outstanding, beside the student’s record.</p>
              </div>
            </article>
            <article class="soon-item fu" style="--d: 240ms">
              <span class="soon-ic">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" stroke-linecap="round" />
                </svg>
              </span>
              <div>
                <h3>Teacher and parent sign-in <span class="soon-tag">Coming soon</span></h3>
                <p>Teachers see their own classes; parents see their own children, through the guardians already on each record.</p>
              </div>
            </article>
          </div>

          <div class="soon-note fu">
            <p>
              <strong>Why we say this out loud.</strong> Plenty of school software is sold on a feature list that is
              mostly future. The six things above are working now; these four are not. When you ask us, that is the
              answer you will get.
            </p>
          </div>
        </div>
      </section>

      <!-- ============ your data ============ -->
      <section class="wrap sec" id="data">
        <div class="ehead">
          <span class="lbl"><i class="d"></i>Your data</span>
          <h2 class="lm"><span>It stays yours, and it stays separate.</span></h2>
        </div>

        <div class="trust">
          <article class="tbox fu">
            <h3>One school cannot see another</h3>
            <p>
              Every record carries the school it belongs to, and the system refuses any request for a record that is not
              yours. That rule is enforced in the database, not left to care.
            </p>
          </article>
          <article class="tbox fu" style="--d: 90ms">
            <h3>Only the people you invite</h3>
            <p>
              Your school’s owner invites its admins, and only they can sign in at your address. Nobody browses the school
              by accident.
            </p>
          </article>
          <article class="tbox fu" style="--d: 180ms">
            <h3>Take it with you</h3>
            <p>
              Export your students to a spreadsheet at any time. If you ever leave, you leave with your records.
            </p>
          </article>
        </div>
      </section>

      <!-- ============ stories ============ -->
      <section class="wrap sec" id="stories">
        <div class="v-top">
          <h2 class="lm"><span>What schools tell us</span></h2>
          <span class="v-count"><span data-v-now>01</span> — 03 <span class="sample">Sample content</span></span>
        </div>

        <div class="stories-grid">
          <div class="stories-photo fu">
            <img
              src="/photos/parent-phone-family-960.webp"
              srcset="/photos/parent-phone-family-480.webp 480w, /photos/parent-phone-family-960.webp 960w"
              sizes="(max-width: 900px) 100vw, 38vw"
              alt="A parent looking at a phone with a child beside them"
              width="960"
              height="640"
              loading="lazy"
            />
          </div>

          <div class="stories-copy" data-voices>
            <div class="v-slide" data-placeholder>
              <blockquote>“We imported four hundred students before break was over, and it told us exactly which six rows were wrong.”</blockquote>
              <div class="v-who"><b>Mrs A. Bello</b><span>Vice Principal · sample quote, not a real school</span></div>
            </div>
            <div class="v-slide" data-placeholder hidden>
              <blockquote>“For the first time, there is one list of students, and everyone is looking at the same one.”</blockquote>
              <div class="v-who"><b>Mr T. Okafor</b><span>Proprietor · sample quote, not a real school</span></div>
            </div>
            <div class="v-slide" data-placeholder hidden>
              <blockquote>“I moved a whole arm to its new class from my phone, in the staff room.”</blockquote>
              <div class="v-who"><b>Miss C. Eze</b><span>School admin · sample quote, not a real school</span></div>
            </div>

            <div class="v-nav">
              <button class="v-btn" data-v-prev aria-label="Previous quote">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                  <path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <button class="v-btn" data-v-next aria-label="Next quote">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                  <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- ============ pricing ============ -->
      <section class="wrap sec" id="pricing">
        <div class="ehead">
          <span class="lbl"><i class="d"></i>Pricing</span>
          <h2 class="lm"><span>Per student, per term.</span></h2>
          <p class="fu">
            Billed to the school, not to parents. The figures below are indicative while we are in early access
            <span class="sample">Sample</span> — the price you are quoted in a demo is the price you pay.
          </p>
        </div>

        <div class="plan-row" data-placeholder>
          <article class="plan fu">
            <span class="tag">Small school</span>
            <h3>Starter</h3>
            <div class="amt">₦350</div>
            <div class="per">per student, per term</div>
            <div class="lim">Up to 300 students</div>
            <ul>
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" /></svg>
                Classes, subjects and students
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" /></svg>
                Import from Excel or Word
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" /></svg>
                Email support
              </li>
            </ul>
            <a class="btn btn-line" href="/signup"><span class="fill"></span><span>Create your school</span></a>
          </article>

          <article class="plan best fu" style="--d: 90ms">
            <span class="tag">Most schools</span>
            <h3>School</h3>
            <div class="amt">₦280</div>
            <div class="per">per student, per term</div>
            <div class="lim">300 to 1,200 students</div>
            <ul>
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" /></svg>
                Everything in Starter
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" /></svg>
                Help with your first import
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" /></svg>
                Up to five admins
              </li>
            </ul>
            <a class="btn btn-solid" href="/signup"><span class="fill"></span><span>Create your school</span></a>
          </article>

          <article class="plan fu" style="--d: 180ms">
            <span class="tag">Large school</span>
            <h3>Group</h3>
            <div class="amt">Let’s talk</div>
            <div class="per">above 1,200 students</div>
            <div class="lim">Quoted per school</div>
            <ul>
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" /></svg>
                Everything in School
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" /></svg>
                A named person to call
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" /></svg>
                Help moving your old records in
              </li>
            </ul>
            <a class="btn btn-line" href="#start"><span class="fill"></span><span>Talk to us</span></a>
          </article>
        </div>

        <p class="price-note fu">
          The modules marked “Coming soon” are not part of any plan and are not being charged for.
        </p>
      </section>

      <!-- ============ faq ============ -->
      <section class="wrap sec" id="faq">
        <div class="faq">
          <div class="ehead" style="margin-bottom: 0">
            <span class="lbl"><i class="d"></i>Questions</span>
            <h2 class="lm"><span>Before you ask.</span></h2>
          </div>

          <div class="acc fu">
            <details>
              <summary>
                Can we keep our own class and arm names?
                <span class="ico"
                  ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round" /></svg
                ></span>
              </summary>
              <div class="ans">
                Yes. Start from Nigerian, Basic, British or American names, then rename anything. Arms can be letters, colours, flowers, gems or your own list, and JSS 1 can have four arms while SS 3 has two.
              </div>
            </details>
            <details>
              <summary>
                We already have our students in Excel. Do we type them again?
                <span class="ico"
                  ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round" /></svg
                ></span>
              </summary>
              <div class="ans">
                No. Upload the file as it is. Brillianda matches your columns, even headings like Surname, Sex and Adm No, checks every row, and shows you what to fix before anything is saved.
              </div>
            </details>
            <details>
              <summary>
                What about the new 2025 subjects?
                <span class="ico"
                  ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round" /></svg
                ></span>
              </summary>
              <div class="ans">
                The 2025 curriculum is in the list, ticked for your classes. Older subjects such as Civic Education stay available, so SS 2 and SS 3 can keep them while SS 1 moves to the new list.
              </div>
            </details>
            <details>
              <summary>
                I run two schools. Do I need two accounts?
                <span class="ico"
                  ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round" /></svg
                ></span>
              </summary>
              <div class="ans">
                No. One email can own or work in more than one school, and signing in shows a list of your schools to choose from.
              </div>
            </details>
            <details>
              <summary>
                A student left. Do we delete them?
                <span class="ico"
                  ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round" /></svg
                ></span>
              </summary>
              <div class="ans">
                No. Change their status to withdrawn, transferred or graduated, and the record stays. Delete is only for a student added by mistake.
              </div>
            </details>
            <details>
              <summary>
                Do we need fast internet?
                <span class="ico"
                  ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round" /></svg
                ></span>
              </summary>
              <div class="ans">
                No. The screens are deliberately light and work on an ordinary Android phone, so a slow connection slows you down rather than stopping you.
              </div>
            </details>
          </div>
        </div>
      </section>

      <!-- ============ request a trial ============ -->
      <section class="start" id="start">
        <div class="wrap start-grid">
          <div>
            <h2 class="lm"><span>Prefer a hand to start?</span></h2>
            <p class="start-lede fu">
              Most schools create their own in a few minutes. If you would rather talk first, tell us about your school
              and we will help you set it up and bring your student list across.
            </p>
            <ul class="start-points">
              <li class="fu">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" /></svg>
                We help you import your student list
              </li>
              <li class="fu" style="--d: 70ms">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" /></svg>
                A call with your admins, to walk through the setup
              </li>
              <li class="fu" style="--d: 140ms">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" /></svg>
                Your records exported to you whenever you ask
              </li>
            </ul>
          </div>

          <div class="form-card fu">
            <form class="form-grid" id="trial-form" novalidate>
              <div class="field full">
                <label for="schoolName">School name</label>
                <input id="schoolName" name="schoolName" autocomplete="organization" required />
                <span class="err" data-err="schoolName"></span>
              </div>
              <div class="field">
                <label for="contactName">Your name</label>
                <input id="contactName" name="contactName" autocomplete="name" required />
                <span class="err" data-err="contactName"></span>
              </div>
              <div class="field">
                <label for="role">Your role</label>
                <select id="role" name="role" required>
                  <option value="">Choose one</option>
                  <option value="PROPRIETOR">Proprietor or owner</option>
                  <option value="PRINCIPAL">Principal or head teacher</option>
                  <option value="ADMIN">School administrator</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="OTHER">Something else</option>
                </select>
                <span class="err" data-err="role"></span>
              </div>
              <div class="field">
                <label for="email">Email</label>
                <input id="email" name="email" type="email" inputmode="email" autocomplete="email" required />
                <span class="err" data-err="email"></span>
              </div>
              <div class="field">
                <label for="phone">Phone</label>
                <input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="080..." required />
                <span class="err" data-err="phone"></span>
              </div>
              <div class="field">
                <label for="studentCount">About how many students?</label>
                <input id="studentCount" name="studentCount" inputmode="numeric" placeholder="e.g. 420" required />
                <span class="err" data-err="studentCount"></span>
              </div>
              <div class="field">
                <label for="state">State</label>
                <input id="state" name="state" autocomplete="address-level1" placeholder="e.g. Lagos" />
                <span class="err" data-err="state"></span>
              </div>

              <div class="modules-pick">
                <span>Which of the coming modules matter to you? <span class="hint">Optional — it tells us what to build first</span></span>
                <div class="checks">
                  <label><input type="checkbox" name="interests" value="ATTENDANCE" />Attendance</label>
                  <label><input type="checkbox" name="interests" value="FEES" />Fees</label>
                  <label><input type="checkbox" name="interests" value="TIMETABLE" />Timetable</label>
                  <label><input type="checkbox" name="interests" value="MESSAGING" />Messages</label>
                </div>
              </div>

              <div class="field full">
                <label for="message">Anything we should know? <span class="hint">Optional</span></label>
                <textarea id="message" name="message" rows="3"></textarea>
                <span class="err" data-err="message"></span>
              </div>

              <!-- Bots fill this; people never see it. -->
              <div class="honeypot" aria-hidden="true">
                <label for="website">Website</label>
                <input id="website" name="website" tabindex="-1" autocomplete="off" />
              </div>

              <div class="form-message bad" data-form-message hidden></div>

              <div class="form-actions">
                <button class="btn btn-solid" type="submit" data-submit>
                  <span class="fill"></span><span>Send the request</span>
                </button>
                <span class="small">We reply within a working day. Your details are used for this request only.</span>
              </div>
            </form>

            <div class="form-done" id="trial-done" hidden>
              <h3>Thank you — it’s with us.</h3>
              <p>
                We will write to the email you gave to arrange the setup. If it is urgent, call us on the number in the
                footer.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer>
      <div class="wrap">
        <div class="f-top">
          <div>
            <span class="mark"><i></i>Brillianda</span>
            <p class="f-blurb">The school register for Nigerian schools: classes, subjects and students, on any phone.</p>
            <div class="f-contact">
              <a href="mailto:hello@brillianda.com">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                hello@brillianda.com
              </a>
              <a href="tel:+2348000000000" data-placeholder>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z" stroke-linejoin="round" />
                </svg>
                +234 800 000 0000 <span class="sample">Sample</span>
              </a>
            </div>
          </div>

          <div class="f-cols">
            <div>
              <h4>Product</h4>
              <ul>
                <li><a href="#what">What it does</a></li>
                <li><a href="#inside">A look inside</a></li>
                <li><a href="#term">Getting started</a></li>
                <li><a href="#pricing">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4>School</h4>
              <ul>
                <li><a href="/signup">Create your school</a></li>
                <li><a href="#faq">Questions</a></li>
                <li><a href="#data">Your data</a></li>
                <li><a href="/login" data-app-link>Sign in</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div class="ghost" aria-hidden="true">Brillianda</div>

        <div class="f-bot">
          <span>© <span data-year>2026</span> Brillianda. All rights reserved.</span>
          <span>Made in Nigeria, for Nigerian schools.</span>
          <button class="tbtn" data-theme-toggle aria-label="Switch between light and dark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke-linecap="round" />
            </svg>
            <span data-theme-label>Dark</span>
          </button>
        </div>
      </div>
    </footer>
`;
