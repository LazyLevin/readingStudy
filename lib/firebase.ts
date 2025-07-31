import { initializeApp } from "@firebase/app"
import { getFirestore } from "@firebase/firestore"
import { getAuth } from "@firebase/auth"
import { getAnalytics, isSupported } from "@firebase/analytics"

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBpevRmDuezk2TymhqTiEWUbQnGQGDl3a4",
  authDomain: "readingstudy-4f697.firebaseapp.com",
  projectId: "readingstudy-4f697",
  storageBucket: "readingstudy-4f697.firebasestorage.app",
  messagingSenderId: "795312421690",
  appId: "1:795312421690:web:9fcd196431641f545b2e03",
  measurementId: "G-F4155QFZPW",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

// Initialize Analytics only in browser
let analytics = null
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app)
    }
  })
}

export { db, auth, app, analytics }

// Helper function to check if Firebase is available
export const isFirebaseAvailable = () => {
  return db !== null && auth !== null
}

// Helper function to log analytics events
export const logAnalyticsEvent = (eventName: string, parameters?: any) => {
  if (analytics && typeof window !== "undefined") {
    try {
      import("@firebase/analytics").then(({ logEvent }) => {
        logEvent(analytics, eventName, parameters)
      })
    } catch (error) {
      console.log("Analytics event logging failed:", error)
    }
  }
}

// Mock data for when Firebase is not available
export const mockData = {
  participants: [
    {
      id: "1",
      name: "Alice Johnson",
      age: 25,
      technique: "speed_reading" as const,
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
      technique: "normal_reading" as const,
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
      technique: "speed_reading" as const,
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
      technique: "normal_reading" as const,
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
      technique: "speed_reading" as const,
      preReadingTime: 160,
      postReadingTime: 95,
      preErrorRate: 20,
      postErrorRate: 7,
      timestamp: new Date("2024-01-19"),
    },
  ],
}
