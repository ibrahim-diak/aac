/**
 * Firebase Configuration for Plateforme Z
 * Conçu pour fonctionner sur le forfait gratuit Firebase Spark sans frais.
 * Si les clés ne sont pas encore renseignées, le mode local sécurisé prend le relais automatiquement.
 */

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSy_REMPLACEZ_PAR_VOTRE_CLE_FIREBASE_SPARK",
  authDomain: "z-plateforme.firebaseapp.com",
  projectId: "z-plateforme",
  storageBucket: "z-plateforme.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

export const IS_FIREBASE_CONFIGURED = () => {
  return FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.includes("REMPLACEZ");
};

export let firebaseApp = null;
export let firebaseAuth = null;
export let firestoreDb = null;

// Initialisation progressive et sécurisée
export async function initFirebase() {
  if (!IS_FIREBASE_CONFIGURED()) {
    console.info("[Z Platform] Mode local/démo actif. Renseignez FIREBASE_CONFIG dans js/firebase-config.js pour la synchronisation Cloud.");
    return { configured: false, app: null, auth: null, db: null };
  }

  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
    const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

    firebaseApp = initializeApp(FIREBASE_CONFIG);
    firebaseAuth = getAuth(firebaseApp);
    firestoreDb = getFirestore(firebaseApp);

    console.info("[Z Platform] Firebase connecté avec succès (Forfait Spark).");
    return { configured: true, app: firebaseApp, auth: firebaseAuth, db: firestoreDb };
  } catch (err) {
    console.warn("[Z Platform] Échec de connexion Firebase, basculement en mode local :", err.message);
    return { configured: false, error: err.message };
  }
}
