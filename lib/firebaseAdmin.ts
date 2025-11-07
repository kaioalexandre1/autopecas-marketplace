import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app: App;

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    // Inicializa sem credenciais — evitar crash em build; chamadas irão falhar se usadas
    app = initializeApp();
  } else {
    app = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }
} else {
  app = getApps()[0];
}

export const adminDb = getFirestore(app);








