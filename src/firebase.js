import { getApp, getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  inMemoryPersistence,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredConfigKeys = ["apiKey", "authDomain", "projectId", "appId"];
const missingConfig = requiredConfigKeys.filter((key) => !firebaseConfig[key]);

if (missingConfig.length > 0) {
  const error = new Error(`Konfigurasi Firebase belum lengkap: ${missingConfig.join(", ")}`);
  window.__rejectFirebaseApi?.(error);
  throw error;
}

const app = getApps().some((existingApp) => existingApp.name === "[DEFAULT]")
  ? getApp()
  : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const restaurantRef = doc(db, "restaurants", "main");
const ordersRef = collection(db, "restaurants", "main", "orders");
const staffRef = collection(db, "restaurants", "main", "staff");
const secondaryApp = getApps().some((existingApp) => existingApp.name === "staff-provisioning")
  ? getApp("staff-provisioning")
  : initializeApp(firebaseConfig, "staff-provisioning");
const secondaryAuth = getAuth(secondaryApp);
const allowedOrderStatuses = new Set(["unverified", "pending", "processing", "completed", "cancelled"]);
let anonymousSignInPromise = null;

async function readLegacyData() {
  if (!window.indexedDB) return null;

  const database = await new Promise((resolve, reject) => {
    const request = window.indexedDB.open("RestoQR_DB_v4", 1);
    let databaseWasMissing = false;

    request.onupgradeneeded = (event) => {
      databaseWasMissing = true;
      event.target.transaction.abort();
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      if (databaseWasMissing) resolve(null);
      else reject(request.error);
    };
  });

  if (!database || !database.objectStoreNames.contains("app_data")) {
    database?.close();
    return null;
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction("app_data", "readonly");
    const store = transaction.objectStore("app_data");
    const data = {};

    ["settings", "paymentMethods", "menuItems", "orders", "tables", "staffUsers", "categories"].forEach((key) => {
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result !== undefined) data[key] = request.result;
      };
      request.onerror = () => reject(request.error);
    });

    transaction.oncomplete = () => {
      database.close();
      resolve(Object.keys(data).length > 0 ? data : null);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error("Tidak dapat membaca data lokal lama."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error("Pembacaan data lokal lama dibatalkan."));
    };
  });
}

function normalizeOrder(order, ownerUid, imported = false) {
  const rawId = String(order?.id ?? "").trim();
  const id = imported
    ? rawId.replace(/[^A-Za-z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 120)
    : rawId;
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(id)) {
    throw new Error("ID pesanan tidak valid.");
  }

  const status = allowedOrderStatuses.has(order.status) ? order.status : "unverified";
  const orderTime = typeof order.time === "string" ? order.time : new Date().toISOString();

  return {
    id,
    ownerUid,
    customerName: String(order.customerName ?? "").slice(0, 120),
    table: String(order.table ?? "").slice(0, 80),
    orderType: order.orderType === "takeaway" ? "takeaway" : "dine-in",
    items: Array.isArray(order.items) ? order.items.slice(0, 50) : [],
    subtotal: Number(order.subtotal) || 0,
    tax: Number(order.tax) || 0,
    service: Number(order.service) || 0,
    total: Number(order.total) || 0,
    paymentMethod: String(order.paymentMethod ?? "").slice(0, 120),
    notes: String(order.notes ?? "").slice(0, 1000),
    status,
    time: orderTime,
    source: imported ? "IMPORT" : order.source === "KASIR" ? "KASIR" : "QR",
    cashGiven: Number(order.cashGiven) || 0,
    changeAmount: Number(order.changeAmount) || 0,
  };
}

const firebaseApi = {
  observeAuth(callback) {
    return onAuthStateChanged(auth, callback);
  },
  async ensureAnonymousSession() {
    if (auth.currentUser) return auth.currentUser;
    if (!anonymousSignInPromise) {
      anonymousSignInPromise = signInAnonymously(auth)
        .then((credential) => credential.user)
        .finally(() => { anonymousSignInPromise = null; });
    }
    return anonymousSignInPromise;
  },
  async signInStaff(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  },
  async signOut() {
    await signOut(auth);
  },
  async getStaffProfile(uid) {
    const profileSnapshot = await getDoc(doc(db, "restaurants", "main", "staff", uid));
    return profileSnapshot.exists()
      ? { ...profileSnapshot.data(), id: profileSnapshot.id, uid: profileSnapshot.id }
      : null;
  },
  subscribeRestaurant(onData, onError) {
    return onSnapshot(
      restaurantRef,
      (snapshot) => onData(snapshot.exists() ? snapshot.data() : {}, snapshot.exists()),
      onError,
    );
  },
  subscribeOrders(uid, isStaff, onData, onError) {
    const orderQuery = isStaff
      ? query(ordersRef, orderBy("time", "desc"), limit(200))
      : query(ordersRef, where("ownerUid", "==", uid), limit(100));

    return onSnapshot(
      orderQuery,
      (snapshot) => {
        const orders = snapshot.docs
          .map((orderSnapshot) => ({ ...orderSnapshot.data(), id: orderSnapshot.id }))
          .sort((first, second) => String(second.time).localeCompare(String(first.time)));
        onData(orders);
      },
      onError,
    );
  },
  subscribeStaff(onData, onError) {
    return onSnapshot(
      staffRef,
      (snapshot) => {
        const staff = snapshot.docs
          .map((staffSnapshot) => ({ ...staffSnapshot.data(), id: staffSnapshot.id, uid: staffSnapshot.id }))
          .sort((first, second) => String(first.name).localeCompare(String(second.name)));
        onData(staff);
      },
      onError,
    );
  },
  async saveRestaurantConfig(fields) {
    const allowedKeys = new Set(["settings", "paymentMethods", "menuItems", "tables", "categories"]);
    if (Object.keys(fields).some((key) => !allowedKeys.has(key))) {
      throw new Error("Bagian pengaturan tidak valid.");
    }
    await setDoc(restaurantRef, { ...fields, updatedAt: serverTimestamp() }, { merge: true });
  },
  async migrateLegacyData(ownerUid) {
    const legacy = await readLegacyData();
    if (!legacy) return null;

    const config = {};
    if (legacy.settings && typeof legacy.settings === "object" && !Array.isArray(legacy.settings)) {
      config.settings = legacy.settings;
    }
    if (Array.isArray(legacy.paymentMethods)) config.paymentMethods = legacy.paymentMethods;
    if (Array.isArray(legacy.menuItems)) config.menuItems = legacy.menuItems;
    if (Array.isArray(legacy.tables)) config.tables = legacy.tables;
    if (Array.isArray(legacy.categories)) config.categories = legacy.categories;

    const legacyOrders = Array.isArray(legacy.orders) ? legacy.orders : [];
    if (Object.keys(config).length > 0) await firebaseApi.saveRestaurantConfig(config);
    if (legacyOrders.length > 0) await firebaseApi.restoreOrders(legacyOrders, ownerUid);

    return {
      config,
      orderCount: legacyOrders.length,
      hasLegacyStaff: Array.isArray(legacy.staffUsers) && legacy.staffUsers.length > 0,
    };
  },
  async createOrder(order) {
    const user = auth.currentUser;
    if (!user) throw new Error("Sesi Firebase belum siap. Silakan coba lagi.");
    if (order.source === "QR" && !user.isAnonymous) {
      throw new Error("Buka ulang halaman pelanggan untuk memulai sesi pemesanan.");
    }
    if (order.source === "KASIR" && user.isAnonymous) {
      throw new Error("Kasir harus masuk sebelum membuat pesanan POS.");
    }

    const normalizedOrder = normalizeOrder(order, user.uid);
    await setDoc(doc(ordersRef, normalizedOrder.id), normalizedOrder);
    return normalizedOrder;
  },
  async updateOrderStatus(orderId, status) {
    if (!allowedOrderStatuses.has(status)) throw new Error("Status pesanan tidak valid.");
    await updateDoc(doc(ordersRef, orderId), { status, updatedAt: serverTimestamp() });
  },
  async restoreOrders(orders, ownerUid) {
    if (!Array.isArray(orders)) throw new Error("Data pesanan tidak valid.");

    for (let offset = 0; offset < orders.length; offset += 400) {
      const batch = writeBatch(db);
      const page = orders.slice(offset, offset + 400);

      page.forEach((order) => {
        const normalizedOrder = normalizeOrder(order, ownerUid, true);
        batch.set(doc(ordersRef, normalizedOrder.id), {
          ...normalizedOrder,
          restoredAt: serverTimestamp(),
        });
      });

      await batch.commit();
    }
  },
  async createStaff({ email, password, username, name, role }) {
    await setPersistence(secondaryAuth, inMemoryPersistence);
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);

    try {
      const profile = {
        uid: credential.user.uid,
        email,
        username,
        name,
        role,
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, "restaurants", "main", "staff", credential.user.uid), profile);
      return { ...profile, id: credential.user.uid };
    } catch (error) {
      await deleteUser(credential.user).catch(() => {});
      throw error;
    } finally {
      await signOut(secondaryAuth).catch(() => {});
    }
  },
  async updateStaff(uid, { username, name, role }) {
    await updateDoc(doc(db, "restaurants", "main", "staff", uid), { username, name, role });
  },
  async deleteStaff(uid) {
    await deleteDoc(doc(db, "restaurants", "main", "staff", uid));
  },
  async sendStaffPasswordReset(email) {
    await sendPasswordResetEmail(auth, email);
  },
};

window.__resolveFirebaseApi?.(firebaseApi);
