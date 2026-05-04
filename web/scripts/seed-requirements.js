const admin = require('firebase-admin');

const requirements = [
  // Title approval - before defense
  { stage: 'title', timing: 'before', owner: 'leader', code: 'PNC:PRE-FO-64/65', name: 'Student Research Grouping Form', isOptional: false },
  { stage: 'title', timing: 'before', owner: 'leader', code: 'PNC:PRE-FO-66', name: 'Proposed Student Research Topics', isOptional: false },
  { stage: 'title', timing: 'before', owner: 'leader', code: 'PNC:PRE-FO-59', name: 'Research Adviser Application Form', isOptional: false },
  { stage: 'title', timing: 'before', owner: 'leader', code: 'PNC:PRE-FO-67', name: 'Research Title Assessment Form', isOptional: false },
  { stage: 'title', timing: 'before', owner: 'leader', code: 'PNC:PRE-FO-69', name: 'Summary of Student Research', isOptional: false },
  // Title approval - after defense
  { stage: 'title', timing: 'after', owner: 'leader', code: 'PNC:PRE-FO-61', name: 'Thesis Advising and Commitment Form', isOptional: false },

  // Proposal defense - before defense
  { stage: 'proposal', timing: 'before', owner: 'leader', code: null, name: 'Soft copy of completed research proposal', isOptional: false },
  { stage: 'proposal', timing: 'before', owner: 'leader', code: null, name: 'Official Receipt of Proposal Defense Fee', isOptional: false },
  { stage: 'proposal', timing: 'before', owner: 'leader', code: 'PNC:PRE-FO-71', name: 'Recommendation Form', isOptional: false },
  { stage: 'proposal', timing: 'before', owner: 'leader', code: 'PNC:PRE-FO-68', name: "Notarized University's Confidentiality and NDA for Research", isOptional: false },
  { stage: 'proposal', timing: 'before', owner: 'leader', code: 'PNC:PRE-FO-72', name: 'Panel Comment Sheet', isOptional: false },
  { stage: 'proposal', timing: 'before', owner: 'leader', code: 'PNC:PRE-FO-73', name: 'Proposal Defense Evaluation Form', isOptional: false },

  // Proposal defense - after defense
  { stage: 'proposal', timing: 'after', owner: 'leader', code: 'PNC:PRE-FO-49', name: 'Research Ethics Application Form', isOptional: false },
  { stage: 'proposal', timing: 'after', owner: 'leader', code: 'PNC:PRE-FO-50', name: 'Informed Consent Form', isOptional: false },
  { stage: 'proposal', timing: 'after', owner: 'leader', code: 'PNC:PRE-FO-51', name: 'Parental Consent Form for Research Undertaking', isOptional: true },
  { stage: 'proposal', timing: 'after', owner: 'leader', code: 'PNC:PRE-FO-89', name: 'Research Instrument Validation Form', isOptional: false },
  { stage: 'proposal', timing: 'after', owner: 'leader', code: 'PNC:PRE-FO-70', name: 'Student Research Title Changing Form', isOptional: true },
  { stage: 'proposal', timing: 'after', owner: 'leader', code: 'PNC:PRE-FO-62', name: 'Adviser/Statistician/Analysts Changing Form', isOptional: true },
  { stage: 'proposal', timing: 'after', owner: 'leader', code: 'PNC:PRE-FO-49', name: 'Approval Sheet', isOptional: false },
  { stage: 'proposal', timing: 'after', owner: 'leader', code: null, name: 'Revised Manuscript', isOptional: false },
  { stage: 'proposal', timing: 'after', owner: 'leader', code: 'PNC:PRE-FO-107', name: 'Declaration of Generative AI and AI-assisted Technologies in the Writing Process', isOptional: false },

  // Final defense - before defense
  { stage: 'final', timing: 'before', owner: 'leader', code: null, name: 'Soft copy of completed final paper', isOptional: false },
  { stage: 'final', timing: 'before', owner: 'leader', code: null, name: 'Official Receipt of Final Defense Fee', isOptional: false },
  { stage: 'final', timing: 'before', owner: 'leader', code: 'PNC:PRE-FO-71', name: 'Recommendation Form', isOptional: false },
  { stage: 'final', timing: 'before', owner: 'leader', code: 'PNC:PRE-FO-68', name: "Notarized University's Confidentiality and NDA for Research", isOptional: false },
  { stage: 'final', timing: 'before', owner: 'leader', code: 'PNC:PRE-FO-52', name: 'Research Ethics Review Committee Evaluation', isOptional: false },
  { stage: 'final', timing: 'before', owner: 'leader', code: 'PNC:PRE-FO-95', name: 'Management of RERC Post-Approval Submissions', isOptional: false },
  { stage: 'final', timing: 'before', owner: 'leader', code: 'PNC:PRE-FO-72', name: 'Panel Comment Sheet', isOptional: false },
  { stage: 'final', timing: 'before', owner: 'leader', code: 'PNC:PRE-FO-74', name: 'Final Defense Evaluation Form', isOptional: false },

  // Final defense - after defense
  { stage: 'final', timing: 'after', owner: 'leader', code: null, name: 'Revised Manuscript', isOptional: false },
  { stage: 'final', timing: 'after', owner: 'leader', code: 'PNC:PRE-FO-49', name: 'Approval Sheet', isOptional: false },
  { stage: 'final', timing: 'after', owner: 'leader', code: 'PNC:PRE-FO-81', name: 'Research Adviser/Analyst Consultation Form', isOptional: false },
  { stage: 'final', timing: 'after', owner: 'leader', code: 'PNC:PRE-FO-107', name: 'Declaration of Generative AI and AI-assisted Technologies in the Writing Process', isOptional: false }
];

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const getDocId = (req) => {
  const codePart = req.code ? req.code.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'no-code';
  return `${req.stage}-${req.timing}-${codePart}-${slugify(req.name)}`;
};

const initAdmin = () => {
  if (admin.apps.length > 0) return admin.app();

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }

  return admin.initializeApp({ credential: admin.credential.applicationDefault() });
};

const seed = async () => {
  initAdmin();
  const db = admin.firestore();
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  requirements.forEach((req) => {
    const docId = getDocId(req);
    const ref = db.collection('requirements').doc(docId);
    batch.set(ref, {
      ...req,
      category: null,
      createdAt: now,
      updatedAt: now
    }, { merge: true });
  });

  await batch.commit();
  console.log(`Seeded ${requirements.length} requirements.`);
};

seed().catch((error) => {
  console.error('Failed to seed requirements:', error);
  process.exit(1);
});
