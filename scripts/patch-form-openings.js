/*
One-time migration: populate `groupIds` for existing section-scoped `formOpenings`.

Usage:
1. Install dependencies: npm install firebase-admin
2. Place your Firebase service account JSON at the project root named `serviceAccountKey.json`, or set GOOGLE_APPLICATION_CREDENTIALS to its path.
3. Run: node scripts/patch-form-openings.js

This will:
- Load all documents from `formOpenings`.
- For each doc where `scopeType === 'section'` and `(!groupIds || groupIds.length === 0)` and `sectionId` is present,
  it will query `groups` where `sectionId` matches and set `groupIds` to the list of group IDs.
- Update `updatedAt` timestamp.

Be careful: run this only once and review changes.
*/

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize admin SDK using serviceAccountKey.json in repo root or GOOGLE_APPLICATION_CREDENTIALS env var
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.cwd(), 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
  console.error('Service account key not found. Place serviceAccountKey.json in project root or set GOOGLE_APPLICATION_CREDENTIALS.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(keyPath))
});

const db = admin.firestore();

async function run() {
  console.log('Fetching formOpenings...');
  const openingsSnap = await db.collection('formOpenings').get();
  const openings = openingsSnap.docs.map(d => ({ id: d.id, data: d.data() }));
  console.log(`Found ${openings.length} formOpenings`);

  let updated = 0;

  for (const op of openings) {
    const data = op.data || {};
    if (data.scopeType === 'section' && data.sectionId && (!Array.isArray(data.groupIds) || data.groupIds.length === 0)) {
      console.log(`Processing opening ${op.id} for section ${data.sectionId}`);
      const groupsSnap = await db.collection('groups').where('sectionId', '==', data.sectionId).get();
      const groupIds = groupsSnap.docs.map(g => g.id);
      console.log(`  Found ${groupIds.length} groups in section`);
      try {
        await db.collection('formOpenings').doc(op.id).update({
          groupIds,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        updated++;
        console.log(`  Updated opening ${op.id} with ${groupIds.length} groupIds`);
      } catch (err) {
        console.error(`  Failed to update opening ${op.id}:`, err);
      }
    }
  }

  console.log(`Done. Updated ${updated} openings.`);
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
