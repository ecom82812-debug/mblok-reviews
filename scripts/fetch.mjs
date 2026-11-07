// Reads approved reviews through the Firebase SDK. The Firestore REST endpoint
// answers 429 for this project while the SDK keeps working.
import { writeFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore, query, Timestamp, where } from 'firebase/firestore';

const FIELDS = ['name', 'text', 'rating', 'photos', 'createdAt', 'verified', 'reply',
  'productId', 'productName', 'productUrl'];
const ATTEMPTS = 5;

const db = getFirestore(initializeApp({
  apiKey: 'AIzaSyCS-7Vn4X_NDxbEGyTrb1JQewf1QCQNffA',
  projectId: 'shop-reviews-3aedd',
}));

async function read() {
  for (let attempt = 1; ; attempt++) {
    try {
      return await getDocs(query(collection(db, 'reviews'), where('status', '==', 'approved')));
    } catch (e) {
      console.error(`read attempt ${attempt} failed: ${e.code}`);
      if (attempt === ATTEMPTS) throw e;
      await new Promise((done) => setTimeout(done, attempt * 15000));
    }
  }
}

const rows = (await read()).docs.map((doc) => {
  const data = doc.data();
  const row = { id: doc.id };
  for (const field of FIELDS) {
    if (data[field] === undefined || data[field] === null) continue;
    row[field] = data[field] instanceof Timestamp ? data[field].toDate().toISOString() : data[field];
  }
  return row;
});
writeFileSync(process.argv[2], JSON.stringify(rows));
console.log(`read ${rows.length} reviews`);
process.exit(0);
