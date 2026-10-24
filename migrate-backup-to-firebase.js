const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const args = process.argv.slice(2);
const backupFileArg = args[0] || './backup.json';
const restaurantId = args[1] || 'restaurant_123';

function getServiceAccount() {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) return null;

  try {
    const resolvedPath = path.resolve(serviceAccountPath);
    return require(resolvedPath);
  } catch (error) {
    console.error('Gagal membaca file service account:', error.message);
    process.exit(1);
  }
}

function initFirebase() {
  const serviceAccount = getServiceAccount();

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    return;
  }

  admin.initializeApp();
}

async function clearCollection(collectionRef) {
  const snapshot = await collectionRef.get();
  if (snapshot.empty) return;

  const batch = admin.firestore().batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function uploadData() {
  const backupPath = path.resolve(backupFileArg);

  if (!fs.existsSync(backupPath)) {
    throw new Error(`File backup tidak ditemukan: ${backupPath}`);
  }

  const raw = fs.readFileSync(backupPath, 'utf8');
  const data = JSON.parse(raw);

  const db = admin.firestore();
  const restaurantRef = db.collection('restaurants').doc(restaurantId);
  const batch = db.batch();

  const settings = data.settings || {};
  const paymentMethods = Array.isArray(data.paymentMethods) ? data.paymentMethods : [];
  const menuItems = Array.isArray(data.menuItems) ? data.menuItems : [];
  const orders = Array.isArray(data.orders) ? data.orders : [];
  const tables = Array.isArray(data.tables) ? data.tables : [];
  const staffUsers = Array.isArray(data.staffUsers) ? data.staffUsers : [];
  const categories = Array.isArray(data.categories) ? data.categories : [];

  batch.set(restaurantRef, {
    id: restaurantId,
    name: settings.restoName || 'Nusantara Resto',
    address: settings.restoAddress || '',
    phone: settings.restoPhone || '',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  batch.set(restaurantRef.collection('settings').doc('default'), {
    ...settings,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  const paymentCollection = restaurantRef.collection('paymentMethods');
  const menuCollection = restaurantRef.collection('menuItems');
  const tableCollection = restaurantRef.collection('tables');
  const staffCollection = restaurantRef.collection('staff');
  const categoryCollection = restaurantRef.collection('menuCategories');
  const orderCollection = restaurantRef.collection('orders');

  await clearCollection(paymentCollection);
  await clearCollection(menuCollection);
  await clearCollection(tableCollection);
  await clearCollection(staffCollection);
  await clearCollection(categoryCollection);
  await clearCollection(orderCollection);

  paymentMethods.forEach((method, index) => {
    const id = method.id || method.name || `pay_${index + 1}`;
    batch.set(paymentCollection.doc(id), {
      ...method,
      id,
      type: method.type || 'cash',
      isActive: method.isActive !== undefined ? method.isActive : true,
      instructions: method.instructions || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  menuItems.forEach((item, index) => {
    const id = item.id || item.name || `menu_${index + 1}`;
    batch.set(menuCollection.doc(String(id)), {
      id: String(id),
      name: item.name || `Menu ${index + 1}`,
      description: item.description || '',
      price: Number(item.price || 0),
      category: item.category || 'Makanan Utama',
      categoryId: item.category || 'Makanan Utama',
      image: item.image || item.imageUrl || '',
      imageUrl: item.image || item.imageUrl || '',
      active: item.active !== undefined ? item.active : true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  tables.forEach((table, index) => {
    const id = table.id || table.code || `table_${index + 1}`;
    batch.set(tableCollection.doc(String(id)), {
      id: String(id),
      code: table.code || table.name || String(id),
      name: table.name || table.code || String(id),
      qrLink: table.link || table.qrLink || `${process.env.APP_URL || 'http://localhost:8000'}?table=${encodeURIComponent(table.name || table.code || id)}`,
      status: table.status || 'available',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  staffUsers.forEach((user, index) => {
    const id = user.id || user.username || `staff_${index + 1}`;
    batch.set(staffCollection.doc(String(id)), {
      id: String(id),
      username: user.username || '',
      pin: user.pin || '',
      name: user.name || user.fullName || user.username || `Staff ${index + 1}`,
      fullName: user.fullName || user.name || user.username || `Staff ${index + 1}`,
      role: user.role || 'cashier',
      active: user.active !== undefined ? user.active : true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  categories.forEach((category, index) => {
    const id = category.id || category.name || `cat_${index + 1}`;
    batch.set(categoryCollection.doc(String(id)), {
      id: String(id),
      name: category.name || `Kategori ${index + 1}`,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  orders.forEach((order, index) => {
    const id = order.id || order.orderId || `ORD-${index + 1}`;
    batch.set(orderCollection.doc(String(id)), {
      id: String(id),
      orderId: order.orderId || String(id),
      table: order.table || 'Takeaway',
      orderType: order.orderType || 'dine-in',
      source: order.source || 'QR',
      paymentMethod: order.paymentMethod || 'cash',
      notes: order.notes || '',
      status: order.status || 'unverified',
      time: order.time || new Date().toISOString(),
      items: Array.isArray(order.items) ? order.items : [],
      subtotal: Number(order.subtotal || 0),
      tax: Number(order.tax || 0),
      service: Number(order.service || 0),
      total: Number(order.total || 0),
      cashGiven: Number(order.cashGiven || 0),
      changeAmount: Number(order.changeAmount || 0),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  console.log(`Migrasi selesai. Data backup berhasil diupload ke restaurant: ${restaurantId}`);
}

async function main() {
  try {
    initFirebase();
    await uploadData();
  } catch (error) {
    console.error('Terjadi error saat migrasi:', error);
    process.exit(1);
  }
}

main();

module.exports = {
  initFirebase,
  uploadData,
};
