const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function createFirstAdmin() {
  const email = 'kiostreni@gmail.com'; // Ganti dengan email admin Anda
  const password = '121314'; // Ganti dengan password admin Anda
  const name = 'Administrator';
  const username = 'admin';

  try {
    // 1. Buat user di Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
    });

    const uid = userRecord.uid;

    // 2. Buat dokumen di Firestore (restaurants/main/staff/{uid})
    await admin.firestore().doc(`restaurants/main/staff/${uid}`).set({
      uid: uid,
      email: email,
      username: username,
      name: name,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Sukses! Admin berhasil dibuat dengan UID: ${uid}`);
    process.exit(0);
  } catch (error) {
    console.error('Gagal membuat admin:', error);
    process.exit(1);
  }
}

createFirstAdmin();