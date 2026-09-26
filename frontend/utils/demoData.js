/* ============================================================================
 * frontend/utils/demoData.js
 *
 *   DEMO / FALLBACK DATA — NOT REAL USER DATA, NEVER PERSISTED.
 *
 * Why this exists
 *   A brand-new account has an empty CV and a fresh deployment has an empty
 *   user table, which makes every screen look broken rather than new. This
 *   file supplies realistic stand-in content so the UI can be demonstrated
 *   and reviewed.
 *
 * Rules this data follows
 *   1. It is display-only. Nothing here is ever written to the database:
 *      - The builder passes it to the *preview* only; `resume` state (the
 *        thing that gets auto-saved) is left untouched, so opening the app
 *        never saves demo content.
 *      - The admin table only falls back to it when the API returns zero
 *        users AND no filters are applied.
 *   2. It disappears the moment real data exists — one real keystroke in the
 *      builder, or one real user row from the API, and it is gone.
 *   3. Every surface that shows it also labels it as sample data, and any
 *      action that would hit the backend with a fake id is disabled.
 *
 * HOW TO REMOVE
 *   Delete this file, then remove its imports from:
 *     - components/LivePreview.js      (DEMO_RESUME)
 *     - pages/admin/index.js           (DEMO_ADMIN)
 *   Nothing else depends on it.
 * ==========================================================================*/

/* ── Builder preview: a complete, realistic single-page CV ───────────────── */

export const DEMO_RESUME = {
  name: 'Ayesha Tariq',
  email: 'u2021458@giki.edu.pk',
  phone: '+92 336 214 8890',
  location: 'Topi, Swabi, Khyber Pakhtunkhwa',
  linkedin: 'linkedin.com/in/ayesha-tariq',
  github: 'github.com/ayeshatariq',
  others: 'ayeshatariq.dev',
  photo: '',
  markerStyle: 'number',
  summary:
    'Final-year Computer Science student at GIKI with a focus on backend systems and data infrastructure. Looking for a graduate software engineering role where I can work on distributed services at scale.',
  experience: [
    {
      id: 'demo-ex-1',
      company: 'Systems Limited',
      role: 'Software Engineering Intern',
      from: '2024-06-01',
      to: '2024-08-31',
      description:
        'Rebuilt the invoice reconciliation job in Node.js, cutting a nightly 40-minute batch down to 6 minutes. Added integration tests around the payments module that caught three rounding defects before release.',
    },
    {
      id: 'demo-ex-2',
      company: 'GIKI Data Science Lab',
      role: 'Undergraduate Research Assistant',
      from: '2023-09-01',
      to: '2024-05-31',
      description:
        'Built the labelling pipeline for a 40,000-image crop-disease dataset and trained the baseline CNN used by two follow-on papers.',
    },
  ],
  education: [
    {
      id: 'demo-ed-1',
      school: 'Ghulam Ishaq Khan Institute of Engineering Sciences and Technology',
      degree: 'BS Computer Science',
      from: '2021-09-01',
      to: '2025-06-30',
      description: 'CGPA 3.62 / 4.00 — Dean’s List 2023, 2024',
    },
    {
      id: 'demo-ed-2',
      school: 'Peshawar Model Degree College',
      degree: 'FSc Pre-Engineering',
      from: '2019-08-01',
      to: '2021-06-30',
      description: '92% — Board of Intermediate Education, Peshawar',
    },
  ],
  projects: [
    {
      id: 'demo-pj-1',
      title: 'Raft-based Key-Value Store',
      link: 'github.com/ayeshatariq/raftkv',
      description:
        '- Implemented leader election and log replication in Go from the Raft paper.\n- Linearizable reads across a 5-node cluster; recovers from leader loss in under 2s.\n- Property tests with simulated network partitions.',
    },
    {
      id: 'demo-pj-2',
      title: 'Course Registration Portal',
      link: 'github.com/ayeshatariq/regportal',
      description:
        'Next.js and PostgreSQL portal handling live seat counts for 1,200 students, with optimistic locking to prevent double-booked sections.',
    },
    {
      id: 'demo-pj-3',
      title: 'Urdu Handwriting Recognition',
      link: '',
      description:
        'CRNN trained on 18k handwritten Urdu samples; 91.4% character accuracy on the held-out set.',
    },
  ],
  skillsTitle: 'Skills',
  skills: [
    { id: 'demo-sk-1', name: 'Languages', description: 'Go, Python, JavaScript/TypeScript, C++, SQL' },
    { id: 'demo-sk-2', name: 'Backend', description: 'Node.js, Express, FastAPI, PostgreSQL, Redis' },
    { id: 'demo-sk-3', name: 'Frontend', description: 'React, Next.js, Tailwind CSS' },
    { id: 'demo-sk-4', name: 'Infrastructure', description: 'Docker, Linux, GitHub Actions, Nginx' },
    { id: 'demo-sk-5', name: 'Machine learning', description: 'PyTorch, scikit-learn, pandas' },
  ],
  customSections: [
    {
      id: 'demo-cs-1',
      title: 'Achievements',
      items: [
        { id: 'demo-cs-1-a', name: 'ICPC Regionals 2024', description: 'Ranked 11th of 120 teams, Pakistan national site.' },
        { id: 'demo-cs-1-b', name: 'GIKI Merit Scholarship', description: 'Awarded for top 5% academic standing, 2023 and 2024.' },
      ],
    },
    {
      id: 'demo-cs-2',
      title: 'Activities',
      items: [
        { id: 'demo-cs-2-a', name: 'ACM Student Chapter', description: 'Technical lead — ran weekly competitive programming sessions.' },
      ],
    },
  ],
};

/* ── Admin dashboard: a populated student register ───────────────────────── */

const FCSE = 'Faculty of Computer Sciences and Engineering';
const FEE = 'Faculty of Electrical Engineering';
const FME = 'Faculty of Mechanical Engineering';
const FMS = 'Faculty of Management Sciences';

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

const demoUser = (i, over) => ({
  id: `demo-user-${i}`,
  isDemo: true,
  role: 'student',
  status: 'active',
  isAdmin: false,
  isRootAdmin: false,
  facultyName: FCSE,
  departmentName: 'Computer Science',
  batch: '2021',
  hasCv: true,
  cvUpdatedAt: daysAgo(i),
  lastLoginAt: daysAgo(i),
  createdAt: daysAgo(120 + i * 3),
  ...over,
});

export const DEMO_ADMIN = {
  isDemo: true,

  users: [
    demoUser(1, {
      email: 'u2021458@giki.edu.pk', fullName: 'Ayesha Tariq', firstName: 'Ayesha', lastName: 'Tariq',
      regNo: '2021458', cvUpdatedAt: daysAgo(1),
    }),
    demoUser(2, {
      email: 'u2021112@giki.edu.pk', fullName: 'Hamza Raza', firstName: 'Hamza', lastName: 'Raza',
      regNo: '2021112', departmentName: 'Software Engineering', cvUpdatedAt: daysAgo(2),
    }),
    demoUser(3, {
      email: 'u2022309@giki.edu.pk', fullName: 'Fatima Noor', firstName: 'Fatima', lastName: 'Noor',
      regNo: '2022309', batch: '2022', departmentName: 'Artificial Intelligence', cvUpdatedAt: daysAgo(4),
    }),
    demoUser(4, {
      email: 'u2021077@giki.edu.pk', fullName: 'Bilal Ahmed Khan', firstName: 'Bilal', lastName: 'Khan',
      regNo: '2021077', facultyName: FEE, departmentName: 'Electrical Engineering',
      hasCv: false, cvUpdatedAt: null,
    }),
    demoUser(5, {
      email: 'u2022541@giki.edu.pk', fullName: 'Zainab Iqbal', firstName: 'Zainab', lastName: 'Iqbal',
      regNo: '2022541', batch: '2022', departmentName: 'Data Science', cvUpdatedAt: daysAgo(9),
    }),
    demoUser(6, {
      email: 'u2020884@giki.edu.pk', fullName: 'Usman Shahid', firstName: 'Usman', lastName: 'Shahid',
      regNo: '2020884', batch: '2020', facultyName: FME, departmentName: 'Mechanical Engineering',
      hasCv: false, cvUpdatedAt: null, lastLoginAt: null,
    }),
    demoUser(7, {
      email: 'u2022167@giki.edu.pk', fullName: 'Maryam Sohail', firstName: 'Maryam', lastName: 'Sohail',
      regNo: '2022167', batch: '2022', departmentName: 'Cyber Security', cvUpdatedAt: daysAgo(15),
    }),
    demoUser(8, {
      email: 'u2021620@giki.edu.pk', fullName: 'Abdullah Yousaf', firstName: 'Abdullah', lastName: 'Yousaf',
      regNo: '2021620', facultyName: FMS, departmentName: 'Management Sciences', cvUpdatedAt: daysAgo(23),
    }),
    demoUser(9, {
      email: 'u2023044@giki.edu.pk', fullName: 'Hira Aslam', firstName: 'Hira', lastName: 'Aslam',
      regNo: '2023044', batch: '2023', departmentName: 'Computer Engineering',
      hasCv: false, cvUpdatedAt: null,
    }),
    demoUser(10, {
      email: 'placement.office@giki.edu.pk', fullName: 'Nadia Qureshi', firstName: 'Nadia', lastName: 'Qureshi',
      role: 'admin', isAdmin: true, regNo: null, facultyName: null, departmentName: null,
      batch: null, hasCv: false, cvUpdatedAt: null,
    }),
  ],

  pagination: { page: 1, limit: 20, total: 143, pages: 8, withCv: 96 },

  adminRequests: [
    {
      id: 'demo-req-1',
      email: 'career.services@giki.edu.pk',
      full_name: 'Imran Saeed',
      first_name: 'Imran',
      last_name: 'Saeed',
      created_at: daysAgo(1),
    },
    {
      id: 'demo-req-2',
      email: 'fcse.coordinator@giki.edu.pk',
      full_name: 'Sana Mahmood',
      first_name: 'Sana',
      last_name: 'Mahmood',
      created_at: daysAgo(3),
    },
  ],

  // Mirrors the shape of GET /api/admin/filters so the filter bar is
  // populated even before the real request resolves.
  filterOptions: {
    faculties: [
      {
        id: 1, code: 'FCSE', name: FCSE,
        departments: [
          { id: 1, code: 'CS', name: 'Computer Science' },
          { id: 2, code: 'CE', name: 'Computer Engineering' },
          { id: 3, code: 'SE', name: 'Software Engineering' },
          { id: 4, code: 'AI', name: 'Artificial Intelligence' },
          { id: 5, code: 'DS', name: 'Data Science' },
          { id: 6, code: 'CYBER', name: 'Cyber Security' },
        ],
      },
      { id: 2, code: 'FEE', name: FEE, departments: [{ id: 7, code: 'EE', name: 'Electrical Engineering' }] },
      { id: 3, code: 'FME', name: FME, departments: [{ id: 8, code: 'ME', name: 'Mechanical Engineering' }] },
      { id: 7, code: 'FMS', name: FMS, departments: [{ id: 12, code: 'MS', name: 'Management Sciences' }] },
    ],
    batches: ['2023', '2022', '2021', '2020'],
  },
};
