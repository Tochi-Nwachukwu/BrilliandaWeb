// What the guide pop-ups and the Help panel say, one set per dashboard. Plain data, so a layout
// (a Server Component) can build it and hand it to the shell.
//
// - `tour`: the short walk-through shown the first time someone opens a dashboard on a device.
//   `target` names a `data-tour` mark on the page; a step without one shows in the middle.
// - `topics`: the Help panel's questions. `pages` are paths (under the dashboard's base) where a
//   question is listed first, under "On this page".

export type TourStep = { target?: string; title: string; body: string };

export type HelpItem = {
  q: string;
  a: string;
  /** A page that answers it, with the link's words. */
  href?: string;
  link?: string;
  /** Paths where this question comes first. A path matches itself and everything below it. */
  pages?: string[];
};

export type HelpGuide = {
  /** Which dashboard: also the key that remembers the tour was seen. */
  id: "admin" | "teacher" | "parent" | "student" | "console";
  /** The dashboard’s first page: questions listed for it show there only, not on every page below it. */
  home: string;
  tour: TourStep[];
  topics: { title: string; items: HelpItem[] }[];
  /** Who to ask when the answers here don't help. */
  stuck: string;
};

export function adminGuide(base: string): HelpGuide {
  const more = `${base}/more`;
  return {
    id: "admin",
    home: base || "/",
    tour: [
      { title: "Welcome to your school on Brillianda", body: "A quick look around: five stops, under a minute. You can skip it, and take it again any time from Help." },
      { target: "nav-home", title: "Home", body: "Your setup checklist and the latest changes. Start here: it tells you what to do next." },
      { target: "nav-students", title: "Students", body: "Add students one at a time or import your list from Excel or Word. Open a student for their details, guardian and report cards." },
      { target: "nav-teachers", title: "Teachers", body: "Invite your teachers, then give each one a form class and the subjects they teach." },
      { target: "nav-classes", title: "Classes", body: "Your class levels and their arms, like JSS 1 Blue. Each arm’s daily register is here too." },
      { target: "nav-results", title: "Results", body: "Follow each class’s score sheets, check the broadsheet, add remarks and publish results to parents." },
      { target: "nav-more", title: "More", body: "Parents, admins, subjects, sessions and terms, promotion, branding and change history." },
      { target: "help", title: "Help is always here", body: "Questions and answers about every screen, and this tour again. Search finds any page by name." },
    ],
    topics: [
      {
        title: "Getting started",
        items: [
          { q: "What should I set up first?", a: "Follow the checklist on Home, top to bottom: your logo and colour, the school calendar, classes and arms, subjects, students, then your team. Each item ticks itself when it’s done.", href: base || "/", link: "Open Home", pages: [base || "/"] },
          { q: "How do I set the school year and its terms?", a: "More › Sessions and terms. Check the suggested dates for the three terms and save. Results open for scores once the first term starts.", href: `${more}/sessions`, link: "Sessions and terms", pages: [`${more}/sessions`] },
          { q: "How do I change our name, colour or logo?", a: "More › Branding. Only the owner can change these. Your logo and colour show on every page, report card and email.", href: `${more}/branding`, link: "Branding", pages: [`${more}/branding`] },
        ],
      },
      {
        title: "Students",
        items: [
          { q: "How do I add a student?", a: "Students › Add a student. Leave the admission number empty and the next one in your format is given. If a sibling is already here, enter the guardian’s phone number and they’ll share the same guardian.", href: `${base}/students/new`, link: "Add a student", pages: [`${base}/students`] },
          { q: "How do I add my whole list at once?", a: "Students › Import students. Download the template or use your own Excel, CSV or Word file, match the columns, check the rows, then import. You can undo an import within 24 hours if nobody has edited those students.", href: `${base}/students/import`, link: "Import students", pages: [`${base}/students`] },
          { q: "How do I move students to another class?", a: "On Students, tick the students, then choose Move to and pick the arm. Their class history keeps the old class.", href: `${base}/students`, link: "Students", pages: [`${base}/students`] },
          { q: "A student left or was suspended. What do I do?", a: "Open the student and change their status: withdrawn, transferred, suspended or graduated. Delete only students added by mistake.", pages: [`${base}/students`] },
          { q: "How do admission numbers work?", a: "More › Admission numbers sets the format, like GC/{YEAR}/{NUMBER}, and how many digits the number has. New students get the next number unless you type one.", href: `${more}/admission-numbers`, link: "Admission numbers", pages: [`${more}/admission-numbers`] },
        ],
      },
      {
        title: "Classes and registers",
        items: [
          { q: "How do I add a class or an arm?", a: "Classes › Add a class, or open a class and add an arm. To change how many arms every class has, or their names, use Edit arms.", href: `${base}/classes`, link: "Classes", pages: [`${base}/classes`] },
          { q: "Who takes each class’s register?", a: "The class’s form teacher. Set form teachers on the Teachers page. You can also open any arm’s register from Classes and fix a day.", href: `${base}/teachers`, link: "Teachers", pages: [`${base}/classes`, `${base}/teachers`] },
          { q: "Which subjects does each class take?", a: "More › Subjects. Tick a subject for a class level as compulsory or elective, and set departments for senior electives.", href: `${base}/subjects`, link: "Subjects", pages: [`${base}/subjects`] },
        ],
      },
      {
        title: "Results",
        items: [
          { q: "How do scores get in?", a: "Each subject teacher fills in their score sheet (CA1, CA2 and Exam by default) and marks it complete. Results shows how far each class has got.", href: `${base}/results`, link: "Results", pages: [`${base}/results`] },
          { q: "How do I publish results to parents?", a: "Results › open a class. Check the broadsheet and remarks, then Publish. Parents see the report card once it’s published.", href: `${base}/results`, link: "Results", pages: [`${base}/results`] },
          { q: "Can I change the score parts or the grades?", a: "More › Results settings: the parts and their marks (they must add up to 100), the grading scale, and positions.", href: `${more}/results`, link: "Results settings", pages: [`${more}/results`] },
          { q: "How do I close a term?", a: "More › Sessions and terms › Close the term. Its scores lock and the next term opens for scores on its start date.", href: `${more}/sessions`, link: "Sessions and terms", pages: [`${more}/sessions`] },
          { q: "How does promotion work?", a: "In the last term, More › Promotion suggests who moves up from each student’s yearly average and your pass mark. Change any decision, then complete it to start the next session.", href: `${more}/promotion`, link: "Promotion", pages: [`${more}/promotion`] },
        ],
      },
      {
        title: "Your team and parents",
        items: [
          { q: "How do I add a teacher?", a: "Teachers › Invite a teacher. They get an email to set a password. Then give them a form class and the subjects they teach.", href: `${base}/teachers`, link: "Teachers", pages: [`${base}/teachers`] },
          { q: "How do students get access?", a: "More › Student accounts. Invite a student with their email (their own, or one the school gives them); they set a password and sign in at the school’s address. They see their timetable, attendance, results and book list, and later take tests.", href: `${more}/student-accounts`, link: "Student accounts", pages: [`${more}/student-accounts`] },
          { q: "How do parents get access?", a: "More › Parents. Invite one guardian, or everyone with an email at once. Parents see only their own children.", href: `${more}/parents`, link: "Parents", pages: [`${more}/parents`] },
          { q: "How do I add another admin?", a: "More › Admins › Invite an admin. Only the owner can invite or remove admins.", href: `${more}/admins`, link: "Admins", pages: [`${more}/admins`] },
          { q: "What is the question bank?", a: "More › Question bank: every subject’s questions for tests, assignments and exams, written by teachers or generated with AI from your lesson notes (typed, a Word file, or photos) and checked by them, and the school’s AI use this month.", href: `${more}/questions`, link: "Question bank", pages: [`${more}/questions`] },
          { q: "How do I set up the timetable?", a: "More › Timetable. First check the Bell schedule (the periods and breaks, the same for every class). Then pick a class and choose a subject for each period, or download the template, fill it in Excel and upload it (Excel, CSV and Word all work). A PDF can be uploaded too, as a document staff can open, but it can’t highlight anyone’s lessons.", href: `${more}/timetable`, link: "Timetable", pages: [`${more}/timetable`] },
          { q: "Who teaches each lesson on the timetable?", a: "The class’s teacher for that subject, from the Teachers page. If a teacher ends up in two classes at once, the timetable warns you.", href: `${base}/teachers`, link: "Teachers", pages: [`${more}/timetable`] },
          { q: "Can Primary, JSS and SSS have different timetables?", a: "Yes, once your school is set up for it: More › Timetable › Split by class. Choose which classes share a timetable (Primary on its own, JSS and SSS together or apart). Each timetable has its own bell schedule and its own document.", href: `${more}/timetable`, link: "Timetable", pages: [`${more}/timetable`] },
          { q: "A parent says their child’s details are wrong. What do I do?", a: "Parents can ask for a correction from their child’s page. Requests show in More › Corrections, with a count on the More tab. Check each one, then Correct the record (it changes the student’s details and goes in the change history) or Decline with a reason the parent sees.", href: `${more}/corrections`, link: "Corrections", pages: [`${more}/corrections`, `${base}/students`] },
          { q: "How do I tell parents which books to buy?", a: "More › Book lists. Pick the session and the class, add the books, exercise books, uniform and anything else, with prices if you like, then Share with parents. Parents see the list for their child’s class, and the one they move into next session.", href: `${more}/book-lists`, link: "Book lists", pages: [`${more}/book-lists`] },
          { q: "How do birthday messages work?", a: "More › Birthdays. Turn them on and write the message: each child’s first name, age and the school’s name are filled in. On the birthday, at 7:00 am, the guardian gets a text and the parent app shows a birthday card. Home lists the week’s birthdays.", href: `${more}/birthdays`, link: "Birthdays", pages: [`${more}/birthdays`, base || "/"] },
          { q: "Who changed something?", a: "More › Change history lists every change: who, what and when. Filter by person, date or student, and download it as a spreadsheet.", href: `${more}/history`, link: "Change history", pages: [`${more}/history`] },
        ],
      },
      {
        title: "Your account",
        items: [
          { q: "How do I sign out or switch accounts?", a: "Press your initials at the top right, then Sign out. Sign in again with the other account." },
          { q: "I forgot my password.", a: "On the sign-in page, choose Forgot password and we’ll email you a link. You can also ask for a sign-in link instead." },
          { q: "How do I find a page quickly?", a: "Press the search button at the top, or Ctrl+K (⌘K on a Mac), and type the page’s name." },
        ],
      },
    ],
    stuck: "Still stuck? Contact the Brillianda team from the email you signed up with.",
  };
}

export function teacherGuide(base: string, formTeacher: boolean): HelpGuide {
  const teach = `${base}/teach`;
  return {
    id: "teacher",
    home: teach,
    tour: [
      { title: "Welcome, teacher", body: "A quick look around your part of the school. Skip it any time; it’s in Help if you want it again." },
      { target: "nav-today", title: "Today", body: "What needs you today: the register to take and score sheets still open." },
      ...(formTeacher
        ? [
            { target: "nav-register", title: "Register", body: "Mark each student present, late or absent, then save. You can fix any school day this term." },
            { target: "nav-class", title: "My class", body: "Your form class’s broadsheet, remarks and report cards." },
          ]
        : []),
      { target: "nav-subjects", title: "My subjects", body: "A score sheet for every class you teach. Fill in the scores and mark the sheet complete." },
      { target: "nav-timetable", title: "Timetable", body: "Your week, and every class’s, with your own lessons highlighted." },
      { target: "nav-tests", title: "Tests", body: "Set tests from your question bank, see who has taken them, mark theory answers and send the scores to the score sheet." },
      { target: "nav-questions", title: "Questions", body: "Your question bank: write questions, or generate a set with AI and check every one." },
      { target: "help", title: "Help is always here", body: "Answers about each screen, and this tour again." },
    ],
    topics: [
      {
        title: "The register",
        items: [
          ...(formTeacher
            ? [
                { q: "How do I take the register?", a: "Register › mark the students who are absent or late (add a short note if you like), press Mark the rest present, then Save register.", href: `${teach}/register`, link: "Register", pages: [`${teach}/register`, teach] },
                { q: "I made a mistake on an earlier day.", a: "On Register, pick the day from the date list. You can change any school day in this term; we keep who changed it.", href: `${teach}/register`, link: "Register", pages: [`${teach}/register`] },
              ]
            : [{ q: "Why don’t I have a register?", a: "Only form teachers take a register. If you should have a form class, ask your school’s admin to set it in Teachers.", pages: [teach] }]),
        ],
      },
      {
        title: "Scores and results",
        items: [
          { q: "How do I set a test on Brillianda (CBT)?", a: "Tests › Set a test. Choose the class, pick questions from your bank, set when it opens and closes and how long it is, and whether it’s taken anywhere or in school only (students then need the code shown on the test’s page). Objective answers mark themselves; mark theory answers from the test’s page, then Send the scores to CA1, CA2 or Exam.", href: `${teach}/tests`, link: "Tests", pages: [`${teach}/tests`] },
          { q: "How do I print a test or exam paper?", a: "Questions › Print a paper. Choose the subject and class, tick the questions, set the title, time allowed and instructions, and how many versions (each with its own order). Preview it, then Print or save as PDF. The answer key comes on its own page.", href: `${teach}/questions/print`, link: "Print a paper", pages: [`${teach}/questions`] },
          { q: "How do I make questions with AI?", a: "Questions › Generate questions. Pick the subject and class, the topics and how many of each type, then Generate. AI makes mistakes: read every question, fix or remove it, and save the ones you’ll use. Your school has a monthly allowance, shown at the top.", href: `${teach}/questions`, link: "Questions", pages: [`${teach}/questions`] },
          { q: "Where is my timetable?", a: "Timetable shows your week: each lesson with its class. Choose A class to see any class’s week, with your lessons highlighted. Today lists your lessons for the day. If something is wrong, tell your school’s admin.", href: `${teach}/timetable`, link: "Timetable", pages: [`${teach}/timetable`, teach] },
          { q: "How do I enter scores?", a: "My subjects › open a class and subject. Type each student’s scores; they save as you go. The total and grade fill in themselves.", href: `${teach}/subjects`, link: "My subjects", pages: [`${teach}/subjects`, teach] },
          { q: "What does Mark complete do?", a: "It tells the school your sheet is done, so results can be checked and published. Ask an admin if you need to change it after.", pages: [`${teach}/subjects`] },
          { q: "A class or subject is missing.", a: "Your admin assigns subjects and classes in Teachers. Ask them to add it.", pages: [`${teach}/subjects`] },
          ...(formTeacher
            ? [{ q: "How do I write remarks?", a: "My class › Remarks. Write a remark for each student and rate their behaviour; they show on the report card.", href: `${teach}/class`, link: "My class", pages: [`${teach}/class`] }]
            : []),
        ],
      },
      {
        title: "Your account",
        items: [
          { q: "How do I sign out?", a: "Press your initials at the top right, then Sign out." },
          { q: "I forgot my password.", a: "On the sign-in page, choose Forgot password and we’ll email you a link." },
        ],
      },
    ],
    stuck: "Still stuck? Ask your school’s admin or the school office.",
  };
}

export function parentGuide(base: string): HelpGuide {
  const family = `${base}/family`;
  return {
    id: "parent",
    // A child’s pages sit under /family, so its questions show on them too.
    home: base || "/",
    tour: [
      { title: "Welcome", body: "Here you follow your children at school: attendance, results and report cards. Two quick stops." },
      { target: "nav-children", title: "My children", body: "Each of your children at this school. Open one to see their attendance and results." },
      { target: "help", title: "Help is always here", body: "Answers to common questions, and this tour again." },
    ],
    topics: [
      {
        title: "Your children",
        items: [
          { q: "A child of mine is missing.", a: "Children show here when the school has you as their guardian. Ask the school office to add you to their record with the same email.", pages: [family] },
          { q: "My child’s details are wrong. How do I fix them?", a: "On your child’s page, under Details, choose Ask for a correction. Pick what’s wrong and what it should say, then send it. The school checks it before the record changes; you’ll see the answer under Details.", pages: [family] },
          { q: "Which books does my child need?", a: "When the school shares its book list, it shows on your child’s page: what to buy for their class this session, and for the class they move into next session, with prices where the school gives them. Use Print on your phone or computer to keep a copy.", pages: [family] },
          { q: "Will my child get a birthday message?", a: "If the school sends them, you get a text on your child’s birthday, and their page here shows a birthday card. The date comes from your child’s record: if it’s wrong, tell the school.", pages: [family] },
          { q: "What does the attendance show?", a: "Open a child: you see how many school days they were present this term, and the last ten days’ marks. Late counts as present.", href: family, link: "My children", pages: [family] },
        ],
      },
      {
        title: "Results and report cards",
        items: [
          { q: "When can I see results?", a: "When the school publishes them, usually at the end of the term. Open your child and choose Results.", pages: [family] },
          { q: "How do I see an earlier term?", a: "Open your child: earlier published terms are listed under Results. Choose one to see its report card.", pages: [family] },
          { q: "How do I print or save a report card?", a: "Open the report card and choose Print or save as PDF. To keep a copy, pick Save as PDF in the print window.", pages: [family] },
        ],
      },
      {
        title: "Your account",
        items: [
          { q: "How do I sign out?", a: "Press your initials at the top right, then Sign out." },
          { q: "I forgot my password.", a: "On the sign-in page, choose Forgot password and we’ll email you a link." },
        ],
      },
    ],
    stuck: "Still stuck? Contact your child’s school office.",
  };
}

export function studentGuide(base: string): HelpGuide {
  const learn = `${base}/learn`;
  return {
    id: "student",
    home: learn,
    tour: [
      { title: "Welcome to your school on Brillianda", body: "Your lessons, attendance, results and what you need for class, in one place. Three quick stops." },
      { target: "nav-today", title: "Today", body: "Today’s lessons, your attendance this term, and your results when they’re out." },
      { target: "nav-tests", title: "Tests", body: "Tests your teachers set. Start one when it’s open; the clock runs from when you start." },
      { target: "nav-timetable", title: "Timetable", body: "Your class’s week, with each lesson’s teacher." },
      { target: "nav-results", title: "Results", body: "Your report cards, once the school publishes them." },
      { target: "help", title: "Help is always here", body: "Answers to common questions, and this tour again." },
    ],
    topics: [
      {
        title: "Your school day",
        items: [
          { q: "How do tests work?", a: "Tests lists the tests set for your class. When one is open, start it: the clock starts then and doesn’t stop. Your answers save as you go, even if the connection drops for a moment. Submit when you’re done; when time is up, it’s submitted for you. A test in school needs the code your teacher gives in the room.", href: `${learn}/tests`, link: "Tests", pages: [`${learn}/tests`, learn] },
          { q: "Where is my timetable?", a: "Timetable shows your class’s week. Today lists today’s lessons.", href: `${learn}/timetable`, link: "Timetable", pages: [learn] },
          { q: "My attendance looks wrong.", a: "Your form teacher takes the register each school day. If a day is wrong, tell them: they can correct it.", pages: [learn] },
          { q: "Which books do I need?", a: "Book list shows what your class needs, and what to get for next session, once the school shares it.", href: `${learn}/books`, link: "Book list", pages: [learn] },
        ],
      },
      {
        title: "Results",
        items: [
          { q: "When can I see my results?", a: "When the school publishes them, usually at the end of the term. Open Results to see your report card.", href: `${learn}/results`, link: "Results", pages: [`${learn}/results`] },
          { q: "How do I print my report card?", a: "Open the report card and choose Print or save as PDF.", pages: [`${learn}/results`] },
        ],
      },
      {
        title: "Your account",
        items: [
          { q: "How do I sign out?", a: "Press your initials at the top right, then Sign out. Always sign out on a shared computer." },
          { q: "I forgot my password.", a: "On the sign-in page, choose Forgot your password and we’ll email you a link." },
        ],
      },
    ],
    stuck: "Still stuck? Ask your form teacher or the school office.",
  };
}

export function consoleGuide(): HelpGuide {
  return {
    id: "console",
    home: "/console",
    tour: [
      { title: "The team console", body: "Where the Brillianda team looks after every school. Three quick stops." },
      { target: "nav-overview", title: "Overview", body: "Totals across schools and what needs the team today." },
      { target: "nav-schools", title: "Schools", body: "Every school with its status. Open one to see its details, or pause and resume it." },
      { target: "nav-trials", title: "Trial requests", body: "Requests from the website’s trial form. Follow each one up and set its status." },
      { target: "help", title: "Help is always here", body: "Answers about the console, and this tour again." },
    ],
    topics: [
      {
        title: "Schools",
        items: [
          { q: "How do I pause a school?", a: "Schools › open the school › Pause the school, with a reason. Its people can’t sign in until it’s resumed; nothing is deleted.", href: "/console/schools", link: "Schools", pages: ["/console/schools"] },
          { q: "How do I find a school?", a: "Schools has a search box: type part of the school’s name, address or owner.", href: "/console/schools", link: "Schools", pages: ["/console/schools"] },
        ],
      },
      {
        title: "Trial requests",
        items: [
          { q: "Where do trial requests come from?", a: "From the trial form on the Brillianda website. New ones show first.", href: "/console/trials", link: "Trial requests", pages: ["/console/trials"] },
          { q: "How do I mark one as followed up?", a: "Open Trial requests and change the request’s status.", href: "/console/trials", link: "Trial requests", pages: ["/console/trials"] },
        ],
      },
    ],
    stuck: "Still stuck? Ask in the team’s channel.",
  };
}
