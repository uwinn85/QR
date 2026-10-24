// firestore-schema.js
// File ini berisi struktur Firestore, seed data, dan helper functions siap dipakai untuk aplikasi QR restoran.
// Copy-paste file ini ke project Anda, lalu sesuaikan firebaseConfig dan restaurantId.

import { initializeApp } from "firebase/app";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";

// -----------------------------------------------------------------------------
// 1) Firebase config
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
// 2) Konfigurasi collection dan struktur field
// -----------------------------------------------------------------------------
export const FIRESTORE_SCHEMA = {
  restaurants: {
    collection: "restaurants",
    fields: {
      name: "string",
      address: "string | null",
      phone: "string | null",
      createdAt: "Timestamp",
      updatedAt: "Timestamp",
    },
    notes: "Document utama restoran"
  },

  settings: {
    collection: "restaurants/{restaurantId}/settings",
    fields: {
      restoName: "string",
      taxRate: "number",
      serviceCharge: "number",
      staticQris: "string",
      appBackground: "string",
      restoAddress: "string",
      restoPhone: "string",
      soundEnabled: "boolean",
      receiptHeaderNote: "string",
      receiptFooterNote: "string",
      receiptShowAddress: "boolean",
      receiptShowPhone: "boolean",
      receiptShowCashier: "boolean",
      receiptPaperWidth: "string",
      createdAt: "Timestamp",
      updatedAt: "Timestamp",
    },
    notes: "Satu document: default"
  },

  staff: {
    collection: "restaurants/{restaurantId}/staff",
    fields: {
      uid: "string",
      username: "string",
      pin: "string",
      fullName: "string",
      role: "admin | cashier",
      active: "boolean",
      createdAt: "Timestamp",
      updatedAt: "Timestamp",
    },
    notes: "Dokumen staff per user"
  },

  tables: {
    collection: "restaurants/{restaurantId}/tables",
    fields: {
      code: "string",
      name: "string",
      qrLink: "string",
      status: "available | occupied | reserved",
      createdAt: "Timestamp",
      updatedAt: "Timestamp",
    },
    notes: "Meja restoran"
  },

  menuCategories: {
    collection: "restaurants/{restaurantId}/menuCategories",
    fields: {
      name: "string",
      createdAt: "Timestamp",
      updatedAt: "Timestamp",
    },
    notes: "Kategori menu"
  },

  menuItems: {
    collection: "restaurants/{restaurantId}/menuItems",
    fields: {
      categoryId: "string",
      name: "string",
      description: "string | null",
      price: "number",
      imageUrl: "string | null",
      active: "boolean",
      createdAt: "Timestamp",
      updatedAt: "Timestamp",
    },
    notes: "Item menu"
  },

  paymentMethods: {
    collection: "restaurants/{restaurantId}/paymentMethods",
    fields: {
      name: "string",
      type: "qris | ewallet | transfer | cash",
      isActive: "boolean",
      instructions: "string | null",
      createdAt: "Timestamp",
      updatedAt: "Timestamp",
    },
    notes: "Metode pembayaran"
  },

  orders: {
    collection: "restaurants/{restaurantId}/orders",
    fields: {
      orderId: "string",
      table: "string | null",
      orderType: "dine-in | takeaway",
      paymentMethod: "string",
      source: "QR | KASIR",
      status: "unverified | pending | preparing | ready | completed | cancelled",
      subtotal: "number",
      tax: "number",
      service: "number",
      total: "number",
      notes: "string | null",
      cashGiven: "number",
      changeAmount: "number",
      items: "array",
      statusHistory: "array",
      createdAt: "Timestamp",
      updatedAt: "Timestamp",
    },
    notes: "Data pesanan utama"
  },

  auditLogs: {
    collection: "restaurants/{restaurantId}/auditLogs",
    fields: {
      action: "string",
      entity: "string",
      entityId: "string | null",
      actorUserId: "string | null",
      payload: "object",
      createdAt: "Timestamp",
    },
    notes: "Log aktivitas admin/kasir"
  },
};

// -----------------------------------------------------------------------------
// 3) Data contoh default untuk satu restoran
// -----------------------------------------------------------------------------
export const DEFAULT_RESTAURANT = {
  name: "Nusantara Resto",
  address: "Jl. Sudirman No. 45, Jakarta",
  phone: "0812-3456-7890",
};

export const DEFAULT_SETTINGS = {
  restoName: "Nusantara Resto",
  taxRate: 11,
  serviceCharge: 5,
  staticQris:
    "00020101021126580016ID.CO.QRIS.WWW01189360091430000000010303UMI51440014ID.A0107070303UMI021500000000000000303UMI5204581253033605802ID5915Nusantara Resto6007Jakarta6304",
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
};

export const DEFAULT_USERS = [
  {
    uid: "admin_1",
    username: "admin",
    pin: "1234",
    fullName: "Administrator Utama",
    role: "admin",
    active: true,
  },
  {
    uid: "cashier_1",
    username: "kasir1",
    pin: "1111",
    fullName: "Kasir Shift 1",
    role: "cashier",
    active: true,
  },
  {
    uid: "cashier_2",
    username: "kasir2",
    pin: "2222",
    fullName: "Kasir Shift 2",
    role: "cashier",
    active: true,
  },
];

export const DEFAULT_TABLES = [
  { code: "T1", name: "Meja 1", qrLink: "https://example.com/?table=1", status: "available" },
  { code: "T2", name: "Meja 2", qrLink: "https://example.com/?table=2", status: "available" },
  { code: "T3", name: "Meja 3", qrLink: "https://example.com/?table=3", status: "available" },
];

export const DEFAULT_CATEGORIES = [
  { name: "Makanan Utama" },
  { name: "Minuman" },
  { name: "Camilan" },
  { name: "Penutup" },
];

export const DEFAULT_PAYMENT_METHODS = [
  {
    name: "QRIS (Gopay, OVO, Dana)",
    type: "qris",
    isActive: true,
    instructions: "Scan QRIS di bawah ini menggunakan aplikasi mobile banking atau e-wallet Anda.",
  },
  {
    name: "E-Wallet Transfer (GoPay/OVO: 08123456789)",
    type: "ewallet",
    isActive: true,
    instructions: "Transfer ke nomor GoPay/OVO 08123456789 a.n. Nusantara Resto.",
  },
  {
    name: "Transfer Bank (BCA: 12345678)",
    type: "transfer",
    isActive: true,
    instructions: "Transfer melalui Bank BCA nomor rekening 12345678 a.n. Nusantara Resto.",
  },
  {
    name: "Tunai di Kasir",
    type: "cash",
    isActive: true,
    instructions: "Silakan pesan terlebih dahulu dan lakukan pembayaran tunai secara langsung ke meja kasir.",
  },
];

export const DEFAULT_MENU_ITEMS = [
  {
    categoryName: "Makanan Utama",
    name: "Nasi Goreng Spesial",
    description: "Nasi goreng dengan telur, ayam, dan bumbu spesial.",
    price: 45000,
    imageUrl: "https://placehold.co/400x400/aa1c22/ffffff?text=Nasi+Goreng",
    active: true,
  },
  {
    categoryName: "Makanan Utama",
    name: "Sop Buntut Bakar",
    description: "Sop buntut sapi pilihan dimasak khas Nusantara.",
    price: 85000,
    imageUrl: "https://placehold.co/400x400/aa1c22/ffffff?text=Sop+Buntut",
    active: true,
  },
  {
    categoryName: "Makanan Utama",
    name: "Ayam Penyet Sambal Ijo",
    description: "Ayam goreng gurih dengan sambal ijo pedas.",
    price: 38000,
    imageUrl: "https://placehold.co/400x400/aa1c22/ffffff?text=Ayam+Penyet",
    active: true,
  },
  {
    categoryName: "Minuman",
    name: "Es Teh Manis",
    description: "Teh melati seduh segar.",
    price: 10000,
    imageUrl: "https://placehold.co/400x400/aa1c22/ffffff?text=Es+Teh",
    active: true,
  },
  {
    categoryName: "Minuman",
    name: "Es Kopi Susu Aren",
    description: "Espresso, susu, dan gula aren yang creamy.",
    price: 25000,
    imageUrl: "https://placehold.co/400x400/aa1c22/ffffff?text=Kopi+Susu",
    active: true,
  },
  {
    categoryName: "Camilan",
    name: "Tahu Cabe Garam",
    description: "Tahu krispi dengan taburan cabai garam.",
    price: 22000,
    imageUrl: "https://placehold.co/400x400/aa1c22/ffffff?text=Tahu+Garam",
    active: true,
  },
  {
    categoryName: "Penutup",
    name: "Pisang Goreng Keju",
    description: "Pisang kepok goreng dengan keju lumer.",
    price: 20000,
    imageUrl: "https://placehold.co/400x400/aa1c22/ffffff?text=Pisang+Goreng",
    active: true,
  },
];

// -----------------------------------------------------------------------------
// 4) Helper function: menambahkan field createdAt / updatedAt
// -----------------------------------------------------------------------------
export function withTimestamps(data = {}) {
  return {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function withUpdatedAt(data = {}) {
  return {
    ...data,
    updatedAt: serverTimestamp(),
  };
}

// -----------------------------------------------------------------------------
// 5) Helper function: membuat restaurant dan subcollection default
// -----------------------------------------------------------------------------
export async function createRestaurant(dbRef, restaurantId, restaurantData = DEFAULT_RESTAURANT) {
  const restaurantRef = doc(dbRef, "restaurants", restaurantId);

  await setDoc(restaurantRef, {
    ...restaurantData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return restaurantRef;
}

export async function createRestaurantDefaults(dbRef, restaurantId, options = {}) {
  const restaurant = options.restaurant ?? DEFAULT_RESTAURANT;
  const settings = options.settings ?? DEFAULT_SETTINGS;
  const staffList = options.staff ?? DEFAULT_USERS;
  const tables = options.tables ?? DEFAULT_TABLES;
  const categories = options.categories ?? DEFAULT_CATEGORIES;
  const paymentMethods = options.paymentMethods ?? DEFAULT_PAYMENT_METHODS;
  const menuItems = options.menuItems ?? DEFAULT_MENU_ITEMS;

  const batch = writeBatch(dbRef);

  const restaurantRef = doc(dbRef, "restaurants", restaurantId);
  batch.set(restaurantRef, {
    ...restaurant,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const settingsRef = doc(dbRef, "restaurants", restaurantId, "settings", "default");
  batch.set(settingsRef, {
    ...settings,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  staffList.forEach((staff) => {
    const staffRef = doc(dbRef, "restaurants", restaurantId, "staff", staff.uid || staff.username);
    batch.set(staffRef, {
      ...staff,
      uid: staff.uid || staff.username,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  tables.forEach((table) => {
    const tableId = table.code || table.name;
    const tableRef = doc(dbRef, "restaurants", restaurantId, "tables", tableId);
    batch.set(tableRef, {
      ...table,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  const categoryMap = {};
  categories.forEach((category, index) => {
    const categoryId = category.id || `cat_${index + 1}`;
    const categoryRef = doc(dbRef, "restaurants", restaurantId, "menuCategories", categoryId);
    batch.set(categoryRef, {
      ...category,
      name: category.name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    categoryMap[category.name] = categoryId;
  });

  paymentMethods.forEach((method, index) => {
    const methodId = method.id || `pay_${index + 1}`;
    const methodRef = doc(dbRef, "restaurants", restaurantId, "paymentMethods", methodId);
    batch.set(methodRef, {
      ...method,
      isActive: method.isActive !== undefined ? method.isActive : true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  menuItems.forEach((item) => {
    const categoryId = categoryMap[item.categoryName];
    const itemId = item.id || `menu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const itemRef = doc(dbRef, "restaurants", restaurantId, "menuItems", itemId);

    batch.set(itemRef, {
      name: item.name,
      categoryId: categoryId || "",
      description: item.description || "",
      price: Number(item.price || 0),
      imageUrl: item.imageUrl || "",
      active: item.active !== undefined ? item.active : true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
  return { restaurantRef, restaurantId };
}

// -----------------------------------------------------------------------------
// 6) Helper functions untuk CRUD umum
// -----------------------------------------------------------------------------
export async function addTable(dbRef, restaurantId, tableData) {
  const id = tableData.code || `T${Date.now()}`;
  const ref = doc(dbRef, "restaurants", restaurantId, "tables", id);

  await setDoc(ref, {
    ...tableData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref;
}

export async function addMenuCategory(dbRef, restaurantId, categoryData) {
  const id = categoryData.id || `cat_${Date.now()}`;
  const ref = doc(dbRef, "restaurants", restaurantId, "menuCategories", id);

  await setDoc(ref, {
    ...categoryData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref;
}

export async function addMenuItem(dbRef, restaurantId, itemData) {
  const id = itemData.id || `menu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ref = doc(dbRef, "restaurants", restaurantId, "menuItems", id);

  await setDoc(ref, {
    ...itemData,
    price: Number(itemData.price || 0),
    active: itemData.active !== undefined ? itemData.active : true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref;
}

export async function addPaymentMethod(dbRef, restaurantId, methodData) {
  const id = methodData.id || `pay_${Date.now()}`;
  const ref = doc(dbRef, "restaurants", restaurantId, "paymentMethods", id);

  await setDoc(ref, {
    ...methodData,
    isActive: methodData.isActive !== undefined ? methodData.isActive : true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref;
}

export async function addStaff(dbRef, restaurantId, staffData) {
  const id = staffData.uid || staffData.username || `staff_${Date.now()}`;
  const ref = doc(dbRef, "restaurants", restaurantId, "staff", id);

  await setDoc(ref, {
    ...staffData,
    uid: id,
    active: staffData.active !== undefined ? staffData.active : true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref;
}

export async function addOrder(dbRef, restaurantId, orderData) {
  const orderId = orderData.orderId || `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
  const ref = doc(dbRef, "restaurants", restaurantId, "orders", orderId);

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

  return ref;
}

export async function updateOrderStatus(dbRef, restaurantId, orderId, newStatus, changedBy = null, notes = "") {
  const orderRef = doc(dbRef, "restaurants", restaurantId, "orders", orderId);
  const orderSnap = await getDoc(orderRef);

  if (!orderSnap.exists()) {
    throw new Error(`Order ${orderId} tidak ditemukan`);
  }

  const current = orderSnap.data();
  const history = Array.isArray(current.statusHistory) ? current.statusHistory : [];

  await setDoc(
    orderRef,
    {
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
    },
    { merge: true }
  );

  return orderRef;
}

export async function addAuditLog(dbRef, restaurantId, payload) {
  const ref = doc(collection(dbRef, "restaurants", restaurantId, "auditLogs"));

  await setDoc(ref, {
    ...payload,
    createdAt: serverTimestamp(),
  });

  return ref;
}

// -----------------------------------------------------------------------------
// 7) Query helper untuk data umum
// -----------------------------------------------------------------------------
export async function getCollection(dbRef, path) {
  const snapshot = await getDocs(collection(dbRef, ...path));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function getRestaurantSettings(dbRef, restaurantId) {
  const ref = doc(dbRef, "restaurants", restaurantId, "settings", "default");
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getRestaurantMenu(dbRef, restaurantId) {
  const q = query(collection(dbRef, "restaurants", restaurantId, "menuItems"), orderBy("name"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function getOrdersByRestaurant(dbRef, restaurantId) {
  const q = query(collection(dbRef, "restaurants", restaurantId, "orders"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

// -----------------------------------------------------------------------------
// 8) Seed data lengkap untuk Firestore
// -----------------------------------------------------------------------------
export async function seedFirestoreExample(dbRef, restaurantId) {
  const restaurantRef = await createRestaurant(dbRef, restaurantId, DEFAULT_RESTAURANT);

  await setDoc(doc(dbRef, "restaurants", restaurantId, "settings", "default"), {
    ...DEFAULT_SETTINGS,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const batch = writeBatch(dbRef);

  DEFAULT_USERS.forEach((staff) => {
    const ref = doc(dbRef, "restaurants", restaurantId, "staff", staff.uid || staff.username);
    batch.set(ref, {
      ...staff,
      uid: staff.uid || staff.username,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  DEFAULT_TABLES.forEach((table) => {
    const id = table.code || table.name;
    const ref = doc(dbRef, "restaurants", restaurantId, "tables", id);
    batch.set(ref, {
      ...table,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  DEFAULT_CATEGORIES.forEach((category, index) => {
    const id = `cat_${index + 1}`;
    const ref = doc(dbRef, "restaurants", restaurantId, "menuCategories", id);
    batch.set(ref, {
      ...category,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  DEFAULT_PAYMENT_METHODS.forEach((method, index) => {
    const id = `pay_${index + 1}`;
    const ref = doc(dbRef, "restaurants", restaurantId, "paymentMethods", id);
    batch.set(ref, {
      ...method,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  const categoryRefList = await getDocs(collection(dbRef, "restaurants", restaurantId, "menuCategories"));
  const categoryMap = {};
  categoryRefList.forEach((categoryDoc) => {
    const data = categoryDoc.data();
    categoryMap[data.name] = categoryDoc.id;
  });

  DEFAULT_MENU_ITEMS.forEach((item) => {
    const id = `menu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const ref = doc(dbRef, "restaurants", restaurantId, "menuItems", id);
    batch.set(ref, {
      categoryId: categoryMap[item.categoryName] || "",
      name: item.name,
      description: item.description || "",
      price: Number(item.price || 0),
      imageUrl: item.imageUrl || "",
      active: item.active !== undefined ? item.active : true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();

  return { restaurantRef, restaurantId };
}

// -----------------------------------------------------------------------------
// 9) Contoh data pesanan siap pakai
// -----------------------------------------------------------------------------
export const EXAMPLE_ORDER = {
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
    {
      itemId: "menu_1",
      name: "Nasi Goreng Spesial",
      qty: 1,
      price: 45000,
      subtotal: 45000,
    },
    {
      itemId: "menu_4",
      name: "Es Teh Manis",
      qty: 2,
      price: 10000,
      subtotal: 20000,
    },
  ],
  statusHistory: [
    {
      from: "created",
      to: "unverified",
      at: new Date().toISOString(),
    },
  ],
};

export default {
  firebaseConfig,
  db,
  FIRESTORE_SCHEMA,
  DEFAULT_RESTAURANT,
  DEFAULT_SETTINGS,
  DEFAULT_USERS,
  DEFAULT_TABLES,
  DEFAULT_CATEGORIES,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_MENU_ITEMS,
  EXAMPLE_ORDER,
  createRestaurant,
  createRestaurantDefaults,
  addTable,
  addMenuCategory,
  addMenuItem,
  addPaymentMethod,
  addStaff,
  addOrder,
  updateOrderStatus,
  addAuditLog,
  seedFirestoreExample,
};

// -----------------------------------------------------------------------------
// 10) Contoh penggunaan cepat
// -----------------------------------------------------------------------------
/*
  import { db, createRestaurantDefaults, addOrder, updateOrderStatus } from "./firestore-schema.js";

  const restaurantId = "restaurant_123";

  await createRestaurantDefaults(db, restaurantId);

  await addOrder(db, restaurantId, {
    orderId: "ORD-1542",
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

  await updateOrderStatus(db, restaurantId, "ORD-1542", "preparing", "admin_1", "Pesanan sedang diproses");
*/
