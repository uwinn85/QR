// firebase-config.js
// File setup Firebase untuk frontend aplikasi QR restoran.
// Copy-paste file ini ke project Anda dan sesuaikan konfigurasi Firebase Anda.

import { initializeApp } from "firebase/app";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";

// -----------------------------------------------------------------------------
// 1) Konfigurasi Firebase Anda
// -----------------------------------------------------------------------------
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// -----------------------------------------------------------------------------
// 2) Utility: path helper
// -----------------------------------------------------------------------------
export function getRestaurantRef(restaurantId) {
  return doc(db, "restaurants", restaurantId);
}

export function getSettingsRef(restaurantId) {
  return doc(db, "restaurants", restaurantId, "settings", "default");
}

export function getStaffRef(restaurantId, staffId) {
  return doc(db, "restaurants", restaurantId, "staff", staffId);
}

export function getTableRef(restaurantId, tableId) {
  return doc(db, "restaurants", restaurantId, "tables", tableId);
}

export function getMenuCategoryRef(restaurantId, categoryId) {
  return doc(db, "restaurants", restaurantId, "menuCategories", categoryId);
}

export function getMenuItemRef(restaurantId, itemId) {
  return doc(db, "restaurants", restaurantId, "menuItems", itemId);
}

export function getPaymentMethodRef(restaurantId, methodId) {
  return doc(db, "restaurants", restaurantId, "paymentMethods", methodId);
}

export function getOrderRef(restaurantId, orderId) {
  return doc(db, "restaurants", restaurantId, "orders", orderId);
}

export function getAuditLogsCollection(restaurantId) {
  return collection(db, "restaurants", restaurantId, "auditLogs");
}

// -----------------------------------------------------------------------------
// 3) Data restaurant & settings
// -----------------------------------------------------------------------------
export async function createRestaurant(restaurantId, restaurantData) {
  const ref = getRestaurantRef(restaurantId);
  await setDoc(ref, {
    ...restaurantData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref;
}

export async function getRestaurant(restaurantId) {
  const ref = getRestaurantRef(restaurantId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateRestaurant(restaurantId, updateData) {
  const ref = getRestaurantRef(restaurantId);
  await updateDoc(ref, {
    ...updateData,
    updatedAt: serverTimestamp(),
  });
}

export async function setSettings(restaurantId, settingsData) {
  const ref = getSettingsRef(restaurantId);
  await setDoc(ref, {
    ...settingsData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref;
}

export async function getSettings(restaurantId) {
  const ref = getSettingsRef(restaurantId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// -----------------------------------------------------------------------------
// 4) Staff / login
// -----------------------------------------------------------------------------
export async function addStaff(restaurantId, staffData) {
  const id = staffData.uid || staffData.username || `staff_${Date.now()}`;
  const ref = getStaffRef(restaurantId, id);

  await setDoc(ref, {
    ...staffData,
    uid: id,
    active: staffData.active !== undefined ? staffData.active : true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id, ref };
}

export async function getAllStaff(restaurantId) {
  const q = query(collection(db, "restaurants", restaurantId, "staff"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function loginStaff(restaurantId, username, pin) {
  const q = query(
    collection(db, "restaurants", restaurantId, "staff"),
    where("username", "==", username),
    where("pin", "==", pin),
    where("active", "==", true)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  const user = snap.docs[0].data();
  return { id: snap.docs[0].id, ...user };
}

// -----------------------------------------------------------------------------
// 5) Tables
// -----------------------------------------------------------------------------
export async function addTable(restaurantId, tableData) {
  const id = tableData.id || tableData.code || `T${Date.now()}`;
  const ref = getTableRef(restaurantId, id);

  await setDoc(ref, {
    ...tableData,
    code: tableData.code || id,
    status: tableData.status || "available",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id, ref };
}

export async function getAllTables(restaurantId) {
  const q = query(collection(db, "restaurants", restaurantId, "tables"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateTableStatus(restaurantId, tableId, status) {
  const ref = getTableRef(restaurantId, tableId);
  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
  });
}

// -----------------------------------------------------------------------------
// 6) Menu category & menu items
// -----------------------------------------------------------------------------
export async function addMenuCategory(restaurantId, categoryData) {
  const id = categoryData.id || `cat_${Date.now()}`;
  const ref = getMenuCategoryRef(restaurantId, id);

  await setDoc(ref, {
    ...categoryData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id, ref };
}

export async function getMenuCategories(restaurantId) {
  const q = query(collection(db, "restaurants", restaurantId, "menuCategories"), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addMenuItem(restaurantId, itemData) {
  const id = itemData.id || `menu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ref = getMenuItemRef(restaurantId, id);

  await setDoc(ref, {
    ...itemData,
    price: Number(itemData.price || 0),
    active: itemData.active !== undefined ? itemData.active : true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id, ref };
}

export async function getMenuItems(restaurantId) {
  const q = query(collection(db, "restaurants", restaurantId, "menuItems"), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteMenuItem(restaurantId, itemId) {
  const ref = getMenuItemRef(restaurantId, itemId);
  await deleteDoc(ref);
}

// -----------------------------------------------------------------------------
// 7) Payment methods
// -----------------------------------------------------------------------------
export async function addPaymentMethod(restaurantId, methodData) {
  const id = methodData.id || `pay_${Date.now()}`;
  const ref = getPaymentMethodRef(restaurantId, id);

  await setDoc(ref, {
    ...methodData,
    isActive: methodData.isActive !== undefined ? methodData.isActive : true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id, ref };
}

export async function getPaymentMethods(restaurantId) {
  const q = query(collection(db, "restaurants", restaurantId, "paymentMethods"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// -----------------------------------------------------------------------------
// 8) Orders and realtime listeners
// -----------------------------------------------------------------------------
export async function addOrder(restaurantId, orderData) {
  const orderId = orderData.orderId || `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
  const ref = getOrderRef(restaurantId, orderId);

  await setDoc(ref, {
    ...orderData,
    orderId,
    status: orderData.status || "unverified",
    statusHistory: orderData.statusHistory || [
      {
        from: "created",
        to: orderData.status || "unverified",
        at: new Date().toISOString(),
      },
    ],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { orderId, ref };
}

export async function getOrders(restaurantId) {
  const q = query(collection(db, "restaurants", restaurantId, "orders"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateOrderStatus(restaurantId, orderId, newStatus, changedBy = null, notes = "") {
  const ref = getOrderRef(restaurantId, orderId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error(`Order ${orderId} tidak ditemukan`);
  }

  const current = snap.data();
  const history = Array.isArray(current.statusHistory) ? current.statusHistory : [];

  await updateDoc(ref, {
    status: newStatus,
    statusHistory: [
      ...history,
      {
        from: current.status || "created",
        to: newStatus,
        by: changedBy,
        notes,
        at: new Date().toISOString(),
      },
    ],
    updatedAt: serverTimestamp(),
  });
}

export function subscribeOrders(restaurantId, callback) {
  const q = query(collection(db, "restaurants", restaurantId, "orders"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(orders);
  });
}

export function subscribeMenuItems(restaurantId, callback) {
  const q = query(collection(db, "restaurants", restaurantId, "menuItems"), orderBy("name"));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}

export function subscribeSettings(restaurantId, callback) {
  const ref = getSettingsRef(restaurantId);
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

// -----------------------------------------------------------------------------
// 9) Audit log
// -----------------------------------------------------------------------------
export async function addAuditLog(restaurantId, logData) {
  const ref = doc(getAuditLogsCollection(restaurantId));
  await setDoc(ref, {
    ...logData,
    createdAt: serverTimestamp(),
  });
  return ref;
}

// -----------------------------------------------------------------------------
// 10) Helper untuk seed awal dari localStorage / default data
// -----------------------------------------------------------------------------
export async function seedRestaurantData(restaurantId, data = {}) {
  const payload = {
    restaurant: data.restaurant || {
      name: "Nusantara Resto",
      address: "Jl. Sudirman No. 45, Jakarta",
      phone: "0812-3456-7890",
    },
    settings: data.settings || {
      restoName: "Nusantara Resto",
      taxRate: 11,
      serviceCharge: 5,
      staticQris: "00020101021126580016ID.CO.QRIS.WWW01189360091430000000010303UMI51440014ID.A0107070303UMI021500000000000000303UMI5204581253033605802ID5915Nusantara Resto6007Jakarta6304",
      appBackground: "#f4f4f5",
      restoAddress: "Jl. Sudirman No. 45, Jakarta",
      restoPhone: "0812-3456-7890",
      soundEnabled: true,
      receiptHeaderNote: "Struk Pembayaran Resmi",
      receiptFooterNote: "Terima Kasih Atas Kunjungan Anda!",
      receiptShowAddress: true,
      receiptShowPhone: true,
      receiptShowCashier: true,
      receiptPaperWidth: "300px",
    },
    staff: data.staff || [
      { uid: "admin_1", username: "admin", pin: "1234", fullName: "Administrator Utama", role: "admin", active: true },
      { uid: "cashier_1", username: "kasir1", pin: "1111", fullName: "Kasir Shift 1", role: "cashier", active: true },
      { uid: "cashier_2", username: "kasir2", pin: "2222", fullName: "Kasir Shift 2", role: "cashier", active: true },
    ],
    tables: data.tables || [
      { code: "T1", name: "Meja 1", qrLink: "https://example.com/?table=1", status: "available" },
      { code: "T2", name: "Meja 2", qrLink: "https://example.com/?table=2", status: "available" },
    ],
    categories: data.categories || [
      { name: "Makanan Utama" },
      { name: "Minuman" },
      { name: "Camilan" },
      { name: "Penutup" },
    ],
    paymentMethods: data.paymentMethods || [
      {
        name: "QRIS (Gopay, OVO, Dana)",
        type: "qris",
        isActive: true,
        instructions: "Scan QRIS di bawah ini menggunakan aplikasi mobile banking atau e-wallet Anda.",
      },
      {
        name: "Tunai di Kasir",
        type: "cash",
        isActive: true,
        instructions: "Silakan bayar tunai di meja kasir.",
      },
    ],
    menuItems: data.menuItems || [
      {
        categoryName: "Makanan Utama",
        name: "Nasi Goreng Spesial",
        description: "Nasi goreng dengan telur dan ayam.",
        price: 45000,
        imageUrl: "https://placehold.co/400x400/aa1c22/ffffff?text=Nasi+Goreng",
        active: true,
      },
      {
        categoryName: "Minuman",
        name: "Es Teh Manis",
        description: "Teh melati segar.",
        price: 10000,
        imageUrl: "https://placehold.co/400x400/aa1c22/ffffff?text=Es+Teh",
        active: true,
      },
    ],
  };

  await createRestaurant(restaurantId, payload.restaurant);
  await setSettings(restaurantId, payload.settings);

  for (const staff of payload.staff) {
    await addStaff(restaurantId, staff);
  }

  for (const table of payload.tables) {
    await addTable(restaurantId, table);
  }

  for (const category of payload.categories) {
    await addMenuCategory(restaurantId, category);
  }

  for (const payment of payload.paymentMethods) {
    await addPaymentMethod(restaurantId, payment);
  }

  const categoryDocs = await getMenuCategories(restaurantId);
  const categoryMap = {};
  categoryDocs.forEach((cat) => {
    categoryMap[cat.name] = cat.id;
  });

  for (const item of payload.menuItems) {
    await addMenuItem(restaurantId, {
      ...item,
      categoryId: categoryMap[item.categoryName] || "",
    });
  }
}

export default {
  app,
  db,
  firebaseConfig,
  createRestaurant,
  getRestaurant,
  updateRestaurant,
  setSettings,
  getSettings,
  addStaff,
  getAllStaff,
  loginStaff,
  addTable,
  getAllTables,
  updateTableStatus,
  addMenuCategory,
  getMenuCategories,
  addMenuItem,
  getMenuItems,
  deleteMenuItem,
  addPaymentMethod,
  getPaymentMethods,
  addOrder,
  getOrders,
  updateOrderStatus,
  subscribeOrders,
  subscribeMenuItems,
  subscribeSettings,
  addAuditLog,
  seedRestaurantData,
};

// -----------------------------------------------------------------------------
// 11) Contoh penggunaan
// -----------------------------------------------------------------------------
/*
import {
  db,
  loginStaff,
  addOrder,
  updateOrderStatus,
  subscribeOrders,
  subscribeMenuItems,
  getSettings,
} from "./firebase-config.js";

const restaurantId = "restaurant_123";

const user = await loginStaff(restaurantId, "admin", "1234");
console.log("User login:", user);

const settings = await getSettings(restaurantId);
console.log("Settings:", settings);

subscribeOrders(restaurantId, (orders) => {
  console.log("Realtime orders:", orders);
});

subscribeMenuItems(restaurantId, (menu) => {
  console.log("Realtime menu:", menu);
});

await addOrder(restaurantId, {
  orderId: "ORD-1501",
  table: "T1",
  orderType: "dine-in",
  paymentMethod: "pay_1",
  source: "QR",
  status: "unverified",
  subtotal: 90000,
  tax: 9900,
  service: 4500,
  total: 104400,
  notes: "Tanpa sambal",
  cashGiven: 0,
  changeAmount: 0,
  items: [
    { itemId: "menu_1", name: "Nasi Goreng Spesial", qty: 1, price: 45000, subtotal: 45000 },
    { itemId: "menu_4", name: "Es Teh Manis", qty: 2, price: 10000, subtotal: 20000 },
  ],
  statusHistory: [
    { from: "created", to: "unverified", at: new Date().toISOString() }
  ]
});

await updateOrderStatus(restaurantId, "ORD-1501", "preparing", "admin_1", "Pesanan sedang disiapkan");
*/
