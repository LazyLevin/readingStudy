import { initializeApp, getApps } from "firebase/app"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"
import { getAuth, connectAuthEmulator } from "firebase/auth"

// Firebase configuration with fallbacks
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abcdef123456",
}

// Initialize Firebase only if it hasn't been initialized
let app
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApps()[0]
}

// Initialize Firestore
let db
let auth

try {
  db = getFirestore(app)
  auth = getAuth(app)

  // Connect to emulators in development if no real config is provided
  if (process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    console.log("Using Firebase emulators for development")

    // Only connect to emulators if not already connected
    try {
      connectFirestoreEmulator(db, "localhost", 8080)
      connectAuthEmulator(auth, "http://localhost:9099")
    } catch (error) {
      // Emulators might already be connected
      console.log("Emulators already connected or not available")
    }
  }
} catch (error) {
  console.error("Firebase initialization error:", error)

  // Create mock services for development
  db = null
  auth = null
}

export { db, auth, app }

// Helper function to check if Firebase is available
export const isFirebaseAvailable = () => {
  return db !== null && auth !== null
}

// Mock data for when Firebase is not available
export const mockData = {
  participants: [
    {
      id: "1",
      name: "Alice Johnson",
      age: 25,
      technique: "speed_reading",
      preReadingTime: 180,
      postReadingTime: 120,
      preErrorRate: 15,
      postErrorRate: 8,
      timestamp: new Date("2024-01-15"),
    },
    {
      id: "2",
      name: "Bob Smith",
      age: 30,
      technique: "normal_reading",
      preReadingTime: 200,
      postReadingTime: 190,
      preErrorRate: 12,
      postErrorRate: 10,
      timestamp: new Date("2024-01-16"),
    },
    {
      id: "3",
      name: "Carol Davis",
      age: 28,
      technique: "speed_reading",
      preReadingTime: 170,
      postReadingTime: 100,
      preErrorRate: 18,
      postErrorRate: 6,
      timestamp: new Date("2024-01-17"),
    },
    {
      id: "4",
      name: "David Wilson",
      age: 35,
      technique: "normal_reading",
      preReadingTime: 220,
      postReadingTime: 210,
      preErrorRate: 10,
      postErrorRate: 8,
      timestamp: new Date("2024-01-18"),
    },
    {
      id: "5",
      name: "Eva Brown",
      age: 22,
      technique: "speed_reading",
      preReadingTime: 160,
      postReadingTime: 95,
      preErrorRate: 20,
      postErrorRate: 7,
      timestamp: new Date("2024-01-19"),
    },
  ],
}
