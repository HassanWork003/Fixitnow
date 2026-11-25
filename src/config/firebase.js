const admin = require('firebase-admin');
const { cert } = require('firebase-admin/app');
const path = require('path');
const fs = require('fs');

let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) return admin;

  try {
    // Load service account key
    const serviceAccountPath = path.resolve(
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json'
    );

    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(
        `Firebase service account file not found at: ${serviceAccountPath}`
      );
    }

    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
    credential: cert(serviceAccount),
    });

    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized');
    return admin;
  } catch (error) {
    console.error('❌ Firebase Admin SDK error:', error.message);
    throw error;
  }
};

module.exports = { admin, initializeFirebase };