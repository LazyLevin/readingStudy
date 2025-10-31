"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from "@firebase/auth"
import { collection, getDocs, query, orderBy, addDoc } from "@firebase/firestore"
import { auth, db, isFirebaseAvailable, mockData, logAnalyticsEvent } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Area,
} from "recharts"
import {
  Users,
  Target,
  TrendingUp,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  LogOut,
  Lock,
  Activity,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

interface ParticipantData {
  id: string
  nickname: string
  testGroup: number
  technique: string
  phase1Time: number
  phase1Score: number
  phase2Time: number
  phase2Score: number
  phase1MistakeRatio: number
  phase2MistakeRatio: number
  timestamp: Date
  improvement: number
}

interface ChartData {
  name: string
  phase1Time: number
  phase2Time: number
  phase1Score: number
  phase2Score: number
  improvement: number
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#FF6B9D"]
const TECHNIQUE_COLORS = {
  1: "#3B82F6", // Blue - Subvocalization Suppression
  2: "#10B981", // Green - Pointer Aid
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginLoading, setLoginLoading] = useState(false)
  const [participants, setParticipants] = useState<ParticipantData[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [firebaseStatus, setFirebaseStatus] = useState<"checking" | "available" | "unavailable">("checking")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  })

  // Manual data entry form
  const [manualEntry, setManualEntry] = useState({
    nickname: "",
    testGroup: 1,
    phase1Time: "",
    phase1Score: "",
    phase2Time: "",
    phase2Score: "",
  })

  useEffect(() => {
    checkFirebaseAndSetupAuth()
  }, [])

  useEffect(() => {
    if (user) {
      loadParticipantData()
    }
  }, [user])

  const checkFirebaseAndSetupAuth = async () => {
    setLoading(true)

    try {
      if (isFirebaseAvailable()) {
        setFirebaseStatus("available")
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setUser(user)
          setLoading(false)
        })
        return () => unsubscribe()
      } else {
        setFirebaseStatus("unavailable")
        setLoading(false)
        setUser({ email: "demo@example.com" } as User)
        loadMockData()
      }
    } catch (error) {
      console.error("Error setting up auth:", error)
      setFirebaseStatus("unavailable")
      setLoading(false)
      setUser({ email: "demo@example.com" } as User)
      loadMockData()
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)

    if (!isFirebaseAvailable()) {
      toast({
        title: "Demo Mode",
        description: "Logged in with demo credentials",
      })
      setUser({ email: "demo@example.com" } as User)
      setLoginLoading(false)
      return
    }

    try {
      await signInWithEmailAndPassword(auth, loginData.email, loginData.password)
      toast({
        title: "Success",
        description: "Logged in successfully",
      })
    } catch (error: any) {
      console.error("Login error:", error)
      toast({
        title: "Error",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      })
    }
    setLoginLoading(false)
  }

  const handleLogout = async () => {
    if (isFirebaseAvailable()) {
      try {
        await signOut(auth)
      } catch (error) {
        console.error("Logout error:", error)
      }
    } else {
      setUser(null)
    }

    toast({
      title: "Success",
      description: "Logged out successfully",
    })
  }

  const loadParticipantData = async () => {
    setDataLoading(true)

    try {
      const usersSnapshot = await getDocs(collection(db, "users"))
      const participantMap = new Map<string, Partial<ParticipantData>>()

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data()
        const userId = userDoc.id

        if (userData.testGroup > 2) {
          continue
        }

        try {
          const resultsSnapshot = await getDocs(collection(db, "users", userId, "results"))

          let phase1Data: any = null
          let phase2Data: any = null

          resultsSnapshot.forEach((resultDoc) => {
            const resultData = resultDoc.data()
            if (resultDoc.id === "phase1") {
              phase1Data = resultData
            } else if (resultDoc.id === "phase2") {
              phase2Data = resultData
            }
          })

          if (phase1Data && phase2Data) {
            const participant: ParticipantData = {
              id: userId,
              nickname: userData.nickname || `User ${userId.slice(0, 6)}`,
              testGroup: userData.testGroup,
              technique: userData.technique || "Speed Reading",
              phase1Time: phase1Data.readingTime || 0,
              phase1Score: phase1Data.score || 0,
              phase2Time: phase2Data.readingTime || 0,
              phase2Score: phase2Data.score || 0,
              phase1MistakeRatio: phase1Data.mistakeRatio || 0,
              phase2MistakeRatio: phase2Data.mistakeRatio || 0,
              timestamp: userData.createdAt?.toDate() || new Date(),
              improvement:
                phase1Data.readingTime && phase2Data.readingTime
                  ? ((phase1Data.readingTime - phase2Data.readingTime) / phase1Data.readingTime) * 100
                  : 0,
            }
            participantMap.set(userId, participant)
          }
        } catch (error) {
          console.log(`Error fetching results for user ${userId}:`, error)
        }
      }

      const completeParticipants = Array.from(participantMap.values()) as ParticipantData[]

      if (completeParticipants.length > 0) {
        setParticipants(completeParticipants)
        toast({
          title: "Success",
          description: `Loaded ${completeParticipants.length} participants from Firebase`,
        })
      } else {
        try {
          const resultsQuery = query(collection(db, "reading_study_results"), orderBy("timestamp", "desc"))
          const querySnapshot = await getDocs(resultsQuery)

          const sessionMap = new Map<string, Partial<ParticipantData>>()

          querySnapshot.forEach((doc) => {
            const data = doc.data()
            const sessionId = data.sessionId

            if (data.testGroup > 2) {
              return
            }

            if (!sessionMap.has(sessionId)) {
              sessionMap.set(sessionId, {
                id: sessionId,
                nickname: data.nickname,
                testGroup: data.testGroup,
                technique: data.technique,
                timestamp: data.timestamp?.toDate() || new Date(),
              })
            }

            const participant = sessionMap.get(sessionId)!

            if (data.phase === 1) {
              participant.phase1Time = data.readingTime
              participant.phase1Score = data.score
              participant.phase1MistakeRatio = data.mistakeRatio
            } else if (data.phase === 2) {
              participant.phase2Time = data.readingTime
              participant.phase2Score = data.score
              participant.phase2MistakeRatio = data.mistakeRatio
            }
          })

          const legacyParticipants = Array.from(sessionMap.values())
            .filter((p) => p.phase1Time !== undefined && p.phase2Time !== undefined)
            .map((p) => ({
              ...p,
              improvement: p.phase1Time && p.phase2Time ? ((p.phase1Time - p.phase2Time) / p.phase1Time) * 100 : 0,
            })) as ParticipantData[]

          if (legacyParticipants.length > 0) {
            setParticipants(legacyParticipants)
            toast({
              title: "Success",
              description: `Loaded ${legacyParticipants.length} participants from legacy structure`,
            })
          } else {
            loadMockData()
            toast({
              title: "No Data",
              description: "No participants found in Firebase. Using sample data.",
              variant: "destructive",
            })
          }
        } catch (legacyError) {
          console.error("Error loading from legacy structure:", legacyError)
          loadMockData()
          toast({
            title: "Error",
            description: "Failed to load data from Firebase. Using sample data.",
            variant: "destructive",
          })
        }
      }

      logAnalyticsEvent("admin_data_loaded", {
        participant_count: completeParticipants.length,
        firebase_connected: true,
      })
    } catch (error) {
      console.error("Error loading participant data:", error)
      loadMockData()
      toast({
        title: "Error",
        description: "Failed to load data from Firebase. Using sample data.",
        variant: "destructive",
      })
    }

    setDataLoading(false)
  }

  const loadMockData = () => {
    const mockParticipants: ParticipantData[] = mockData.participants
      .map((p, index) => ({
        id: p.id,
        nickname: p.name,
        testGroup: (index % 2) + 1, // Only groups 1 and 2
        technique: p.technique === "speed_reading" ? "Speed Reading" : "Normal Reading",
        phase1Time: p.preReadingTime,
        phase1Score: Math.floor(Math.random() * 3) + 7,
        phase2Time: p.postReadingTime,
        phase2Score: Math.floor(Math.random() * 3) + 7,
        phase1MistakeRatio: p.preErrorRate / 100,
        phase2MistakeRatio: p.postErrorRate / 100,
        timestamp: p.timestamp,
        improvement: ((p.preReadingTime - p.postReadingTime) / p.preReadingTime) * 100,
      }))
      .filter((p) => p.testGroup <= 2) // Only keep groups 1 and 2

    setParticipants(mockParticipants)

    logAnalyticsEvent("admin_data_loaded", {
      participant_count: mockParticipants.length,
      firebase_connected: false,
    })
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    if (user) {
      await loadParticipantData()
    }
    setIsRefreshing(false)
    toast({
      title: "Data Refreshed",
      description: "Participant data has been updated",
    })
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isFirebaseAvailable()) {
      toast({
        title: "Firebase Required",
        description: "Manual data entry requires Firebase connection",
        variant: "destructive",
      })
      return
    }

    if (manualEntry.testGroup > 2) {
      toast({
        title: "Invalid Group",
        description: "Test group must be 1 or 2",
        variant: "destructive",
      })
      return
    }

    try {
      const phase1Time = Number.parseFloat(manualEntry.phase1Time)
      const phase1Score = Number.parseInt(manualEntry.phase1Score)
      const phase2Time = Number.parseFloat(manualEntry.phase2Time)
      const phase2Score = Number.parseInt(manualEntry.phase2Score)

      const sessionId = `manual_${Date.now()}`
      const timestamp = new Date()
      const technique = manualEntry.testGroup === 1 ? "Subvocalization Suppression" : "Pointer Aid"

      await addDoc(collection(db, "reading_study_results"), {
        sessionId,
        nickname: manualEntry.nickname,
        phase: 1,
        readingTime: phase1Time,
        score: phase1Score,
        totalQuestions: 10,
        timestamp,
        testGroup: manualEntry.testGroup,
        mistakeRatio: (10 - phase1Score) / 10,
        technique,
      })

      await addDoc(collection(db, "reading_study_results"), {
        sessionId,
        nickname: manualEntry.nickname,
        phase: 2,
        readingTime: phase2Time,
        score: phase2Score,
        totalQuestions: 10,
        timestamp,
        testGroup: manualEntry.testGroup,
        mistakeRatio: (10 - phase2Score) / 10,
        technique,
      })

      setManualEntry({
        nickname: "",
        testGroup: 1,
        phase1Time: "",
        phase1Score: "",
        phase2Time: "",
        phase2Score: "",
      })

      await loadParticipantData()

      toast({
        title: "Success",
        description: "Manual entry added successfully",
      })
    } catch (error) {
      console.error("Error adding manual entry:", error)
      toast({
        title: "Error",
        description: "Failed to add manual entry",
        variant: "destructive",
      })
    }
  }

  const exportData = () => {
    const csvContent = [
      "Nickname,Test Group,Technique,Phase 1 Time,Phase 1 Score,Phase 2 Time,Phase 2 Score,Improvement %,Phase 1 Comprehension,Phase 2 Comprehension,Timestamp",
      ...participants.map(
        (p) =>
          `${p.nickname},${p.testGroup},${p.technique},${p.phase1Time},${p.phase1Score},${p.phase2Time},${p.phase2Score},${p.improvement.toFixed(2)},${((p.phase1Score / 10) * 100).toFixed(1)}%,${((p.phase2Score / 10) * 100).toFixed(1)}%,${p.timestamp.toISOString()}`,
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `reading_study_results_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    logAnalyticsEvent("data_exported", {
      participant_count: participants.length,
      export_format: "csv",
    })
  }

  // Calculate statistics
  const stats = {
    totalParticipants: participants.length,
    averageImprovement:
      participants.length > 0 ? participants.reduce((sum, p) => sum + p.improvement, 0) / participants.length : 0,
    group1Participants: participants.filter((p) => p.testGroup === 1).length,
    group2Participants: participants.filter((p) => p.testGroup === 2).length,
    avgPhase1Comprehension:
      participants.length > 0
        ? (participants.reduce((sum, p) => sum + p.phase1Score, 0) / participants.length / 10) * 100
        : 0,
    avgPhase2Comprehension:
      participants.length > 0
        ? (participants.reduce((sum, p) => sum + p.phase2Score, 0) / participants.length / 10) * 100
        : 0,
  }

  // Prepare chart data with null checks
  const chartData: ChartData[] = participants
    .filter((p) => p && p.phase1Time && p.phase2Time)
    .map((p, index) => ({
      name: p.nickname || `Participant ${index + 1}`,
      phase1Time: Number(p.phase1Time) || 0,
      phase2Time: Number(p.phase2Time) || 0,
      phase1Score: Number(p.phase1Score) || 0,
      phase2Score: Number(p.phase2Score) || 0,
      improvement: Number(p.improvement) || 0,
    }))

  const techniqueGroups = [
    { name: "Group 1: Subvocalization Suppression", group: 1 },
    { name: "Group 2: Pointer Aid", group: 2 },
  ]

  const techniqueComparisonData = techniqueGroups
    .map((technique) => {
      const groupParticipants = participants.filter((p) => p.testGroup === technique.group)
      const count = groupParticipants.length

      if (count === 0) {
        return {
          name: technique.name,
          avgTimeImprovement: 0,
          avgPhase1Time: 0,
          avgPhase2Time: 0,
          avgPhase1Score: 0,
          avgPhase2Score: 0,
          count: 0,
        }
      }

      return {
        name: technique.name,
        avgTimeImprovement: groupParticipants.reduce((sum, p) => sum + p.improvement, 0) / count,
        avgPhase1Time: groupParticipants.reduce((sum, p) => sum + p.phase1Time, 0) / count,
        avgPhase2Time: groupParticipants.reduce((sum, p) => sum + p.phase2Time, 0) / count,
        avgPhase1Score: (groupParticipants.reduce((sum, p) => sum + p.phase1Score, 0) / count / 10) * 100,
        avgPhase2Score: (groupParticipants.reduce((sum, p) => sum + p.phase2Score, 0) / count / 10) * 100,
        count,
      }
    })
    .filter((d) => d.count > 0)

  // Comprehension vs Time data
  const comprehensionVsTimeData = participants
    .filter((p) => p && p.phase1Time && p.phase2Time)
    .map((p) => ({
      name: p.nickname,
      phase1Time: p.phase1Time,
      phase2Time: p.phase2Time,
      phase1Comprehension: (p.phase1Score / 10) * 100,
      phase2Comprehension: (p.phase2Score / 10) * 100,
      group: p.testGroup,
    }))

  // Radar chart data for technique comparison
  const radarData = techniqueGroups
    .map((technique) => {
      const groupParticipants = participants.filter((p) => p.testGroup === technique.group)
      if (groupParticipants.length === 0) return null

      const avgTimeImprovement = groupParticipants.reduce((sum, p) => sum + p.improvement, 0) / groupParticipants.length
      const avgComprehensionImprovement =
        groupParticipants.reduce((sum, p) => sum + (p.phase2Score - p.phase1Score), 0) / groupParticipants.length
      const avgPhase2Speed =
        100 - (groupParticipants.reduce((sum, p) => sum + p.phase2Time, 0) / groupParticipants.length / 180) * 100

      return {
        technique: technique.name.split(":")[1].trim(),
        timeImprovement: Math.max(0, Math.min(100, avgTimeImprovement)),
        comprehensionMaintained: Math.max(
          0,
          Math.min(
            100,
            (groupParticipants.reduce((sum, p) => sum + p.phase2Score, 0) / groupParticipants.length / 10) * 100,
          ),
        ),
        speed: Math.max(0, Math.min(100, avgPhase2Speed)),
        consistency: Math.max(
          0,
          Math.min(
            100,
            100 -
              (groupParticipants.reduce((sum, p) => sum + Math.abs(p.phase1Score - p.phase2Score), 0) /
                groupParticipants.length) *
                10,
          ),
        ),
      }
    })
    .filter((d) => d !== null)

  // Score distribution data
  const scoreDistributionData = Array.from({ length: 11 }, (_, i) => ({
    score: i,
    phase1Count: participants.filter((p) => p.phase1Score === i).length,
    phase2Count: participants.filter((p) => p.phase2Score === i).length,
  }))

  // Time efficiency data (comprehension per second)
  const efficiencyData = participants
    .filter((p) => p && p.phase1Time && p.phase2Time)
    .map((p) => ({
      name: p.nickname,
      phase1Efficiency: (p.phase1Score / p.phase1Time) * 100,
      phase2Efficiency: (p.phase2Score / p.phase2Time) * 100,
      group: p.testGroup,
    }))

  const pieData = [
    { name: "Group 1 (Subvocalization Suppression)", value: participants.filter((p) => p.testGroup === 1).length },
    { name: "Group 2 (Pointer Aid)", value: participants.filter((p) => p.testGroup === 2).length },
  ].filter((item) => item.value > 0)

  const improvementByMethodData = techniqueGroups
    .map((technique) => {
      const groupParticipants = participants.filter((p) => p.testGroup === technique.group)
      if (groupParticipants.length === 0) return null

      const avgTimeImprovement = groupParticipants.reduce((sum, p) => sum + p.improvement, 0) / groupParticipants.length
      const avgScoreImprovement =
        groupParticipants.reduce((sum, p) => sum + (p.phase2Score - p.phase1Score), 0) / groupParticipants.length

      return {
        name: technique.name.split(":")[1].trim(),
        timeImprovement: avgTimeImprovement,
        scoreImprovement: avgScoreImprovement,
        count: groupParticipants.length,
      }
    })
    .filter((d) => d !== null)

  const initialSpeedVsImprovementData = participants
    .filter((p) => p && p.phase1Time && p.phase2Time)
    .map((p) => ({
      name: p.nickname,
      initialSpeed: p.phase1Time,
      improvement: p.improvement,
      group: p.testGroup,
    }))

  const boxplotData = techniqueGroups
    .map((technique) => {
      const groupParticipants = participants.filter((p) => p.testGroup === technique.group)
      if (groupParticipants.length === 0) return null

      const phase1Times = groupParticipants.map((p) => p.phase1Time).sort((a, b) => a - b)
      const phase2Times = groupParticipants.map((p) => p.phase2Time).sort((a, b) => a - b)

      const getQuartiles = (arr: number[]) => {
        const q1 = arr[Math.floor(arr.length * 0.25)]
        const median = arr[Math.floor(arr.length * 0.5)]
        const q3 = arr[Math.floor(arr.length * 0.75)]
        const min = arr[0]
        const max = arr[arr.length - 1]
        return { min, q1, median, q3, max }
      }

      return {
        name: technique.name.split(":")[1].trim(),
        phase1: getQuartiles(phase1Times),
        phase2: getQuartiles(phase2Times),
      }
    })
    .filter((d) => d !== null)

  const allParticipantsPhase1Avg =
    participants.length > 0 ? participants.reduce((sum, p) => sum + p.phase1Time, 0) / participants.length : 0

  const allParticipantsPhase2Avg =
    participants.length > 0 ? participants.reduce((sum, p) => sum + p.phase2Time, 0) / participants.length : 0

  const allParticipantsPhase1Score =
    participants.length > 0
      ? (participants.reduce((sum, p) => sum + p.phase1Score, 0) / participants.length / 10) * 100
      : 0

  const allParticipantsPhase2Score =
    participants.length > 0
      ? (participants.reduce((sum, p) => sum + p.phase2Score, 0) / participants.length / 10) * 100
      : 0

  const overallTimeImprovement =
    allParticipantsPhase1Avg > 0
      ? ((allParticipantsPhase1Avg - allParticipantsPhase2Avg) / allParticipantsPhase1Avg) * 100
      : 0

  const overallComprehensionChange = allParticipantsPhase2Score - allParticipantsPhase1Score

  const phase1VsPhase2Data = [
    {
      phase: "Phase 1\n(Baseline)",
      avgTime: allParticipantsPhase1Avg,
      avgScore: allParticipantsPhase1Score,
      count: participants.length,
    },
    {
      phase: "Phase 2\n(After Training)",
      avgTime: allParticipantsPhase2Avg,
      avgScore: allParticipantsPhase2Score,
      count: participants.length,
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>
              {firebaseStatus === "unavailable"
                ? "Demo mode - use any credentials"
                : "Enter your admin credentials to access the dashboard"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {firebaseStatus === "unavailable" && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Running in demo mode. Firebase authentication is not available.</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="your.email@gmail.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reading Study Dashboard</h1>
            <p className="text-gray-600">Comprehensive analytics and participant management</p>
            <p className="text-sm text-gray-500">Logged in as: {user.email}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {firebaseStatus === "available" && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Firebase Connected
              </Badge>
            )}
            {firebaseStatus === "unavailable" && (
              <Badge variant="secondary">
                <AlertCircle className="h-3 w-3 mr-1" />
                Demo Mode
              </Badge>
            )}
            {dataLoading && (
              <Badge variant="outline">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Loading Data
              </Badge>
            )}
            <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={exportData} disabled={participants.length === 0} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Firebase Status Alert */}
        {firebaseStatus === "unavailable" && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Running in demo mode with sample data. Connect Firebase to view real participant data.
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalParticipants}</div>
              <p className="text-xs text-muted-foreground">
                {stats.group1Participants} subvocalization, {stats.group2Participants} pointer
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Improvement</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageImprovement.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Reading time reduction</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Phase 1 Comprehension</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgPhase1Comprehension.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Before training</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Phase 2 Comprehension</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgPhase2Comprehension.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">After training</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="analytics" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="data-entry">Data Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-8">
            {chartData.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No data available for analysis</p>
                    <p className="text-sm text-gray-400">Complete some study sessions to see visualizations</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Phase 1 vs Phase 2: Overall Effectiveness</h2>
                    <p className="text-gray-600">
                      Comparing baseline performance (Phase 1) with post-training performance (Phase 2) across all
                      participants to evaluate overall study effectiveness
                    </p>
                  </div>

                  {/* Overall Effectiveness Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Phase 1 Average Time</CardTitle>
                        <CardDescription>Baseline reading speed (no methods)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-gray-600">{allParticipantsPhase1Avg.toFixed(1)}s</div>
                        <p className="text-xs text-muted-foreground mt-1">All participants (n={participants.length})</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Phase 2 Average Time</CardTitle>
                        <CardDescription>After training/practice</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-blue-600">{allParticipantsPhase2Avg.toFixed(1)}s</div>
                        <p className="text-xs text-muted-foreground mt-1">All participants (n={participants.length})</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Overall Improvement</CardTitle>
                        <CardDescription>Time reduction from Phase 1 to Phase 2</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div
                          className={`text-3xl font-bold ${overallTimeImprovement > 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {overallTimeImprovement > 0 ? "+" : ""}
                          {overallTimeImprovement.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Average across all participants</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Phase 1 vs Phase 2: Reading Time Comparison */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Phase 1 vs Phase 2: Reading Time</CardTitle>
                      <CardDescription>
                        Comparing baseline reading time (Phase 1) with post-training reading time (Phase 2) for all
                        participants
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={phase1VsPhase2Data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="phase" />
                            <YAxis label={{ value: "Average Time (seconds)", angle: -90, position: "insideLeft" }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="avgTime" fill="#3B82F6" name="Average Reading Time (seconds)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 text-sm text-gray-600">
                        <p>
                          <strong>Time reduction:</strong>{" "}
                          {(allParticipantsPhase1Avg - allParticipantsPhase2Avg).toFixed(1)} seconds (
                          {overallTimeImprovement.toFixed(1)}% improvement)
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Phase 1 vs Phase 2: Comprehension Scores */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Phase 1 vs Phase 2: Comprehension Scores</CardTitle>
                      <CardDescription>
                        Comparing comprehension accuracy between baseline (Phase 1) and post-training (Phase 2)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={phase1VsPhase2Data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="phase" />
                            <YAxis
                              domain={[0, 100]}
                              label={{ value: "Average Comprehension Score (%)", angle: -90, position: "insideLeft" }}
                            />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="avgScore" fill="#10B981" name="Average Comprehension Score (%)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 text-sm text-gray-600">
                        <p>
                          <strong>Comprehension change:</strong> {overallComprehensionChange > 0 ? "+" : ""}
                          {overallComprehensionChange.toFixed(1)}% (
                          {overallComprehensionChange > 0
                            ? "improved"
                            : overallComprehensionChange < 0
                              ? "decreased"
                              : "maintained"}
                          )
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Phase 1 vs Phase 2: Combined View */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Phase 1 vs Phase 2: Combined Performance</CardTitle>
                      <CardDescription>
                        Overall view of time improvement and comprehension maintenance from baseline to post-training
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={phase1VsPhase2Data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="phase" />
                            <YAxis
                              yAxisId="left"
                              label={{ value: "Reading Time (seconds)", angle: -90, position: "insideLeft" }}
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              domain={[0, 100]}
                              label={{ value: "Comprehension (%)", angle: 90, position: "insideRight" }}
                            />
                            <Tooltip />
                            <Legend />
                            <Bar yAxisId="left" dataKey="avgTime" fill="#3B82F6" name="Reading Time (seconds)" />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="avgScore"
                              stroke="#10B981"
                              strokeWidth={3}
                              name="Comprehension (%)"
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 text-sm text-gray-600 space-y-2">
                        <p className="font-semibold">Key Findings:</p>
                        <p>
                          Reading time {overallTimeImprovement > 0 ? "decreased" : "increased"} by{" "}
                          {Math.abs(overallTimeImprovement).toFixed(1)}% from Phase 1 to Phase 2, while comprehension{" "}
                          {overallComprehensionChange > 0
                            ? "improved"
                            : overallComprehensionChange < 0
                              ? "decreased"
                              : "remained stable"}
                          by {Math.abs(overallComprehensionChange).toFixed(1)} percentage points.
                        </p>
                        <p className="text-xs">
                          <strong>Study Design:</strong> Phase 1 serves as the baseline for all participants (no speed
                          reading methods). Phase 2 shows results after training with speed reading techniques (Group 1:
                          Subvocalization Suppression, Group 2: Pointer Aid).
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Separator className="my-8" />

                {/* Individual Technique Analysis */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Individual Technique Analysis</h2>
                  <p className="text-gray-600">
                    Detailed comparison of the two speed reading techniques: Subvocalization Suppression and Pointer Aid
                  </p>
                </div>

                {/* Technique Comparison Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Technique Comparison Overview</CardTitle>
                    <CardDescription>Comparing both reading techniques across key performance metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={techniqueComparisonData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="avgTimeImprovement" fill="#3B82F6" name="Avg Time Improvement (%)" />
                          <Bar dataKey="avgPhase1Score" fill="#10B981" name="Avg Phase 1 Score (%)" />
                          <Bar dataKey="avgPhase2Score" fill="#F59E0B" name="Avg Phase 2 Score (%)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Reading Speed Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Reading Speed by Technique</CardTitle>
                      <CardDescription>Average reading time before and after training</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={techniqueComparisonData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                            <YAxis label={{ value: "Time (seconds)", angle: -90, position: "insideLeft" }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="avgPhase1Time" fill="#EF4444" name="Phase 1 Time" />
                            <Bar dataKey="avgPhase2Time" fill="#10B981" name="Phase 2 Time" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Comprehension Rate by Technique</CardTitle>
                      <CardDescription>Accuracy scores across different methods</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={techniqueComparisonData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                            <YAxis
                              domain={[0, 100]}
                              label={{ value: "Score (%)", angle: -90, position: "insideLeft" }}
                            />
                            <Tooltip />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="avgPhase1Score"
                              stroke="#8B5CF6"
                              strokeWidth={2}
                              name="Phase 1"
                            />
                            <Line
                              type="monotone"
                              dataKey="avgPhase2Score"
                              stroke="#10B981"
                              strokeWidth={2}
                              name="Phase 2"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Average Improvement by Method */}
                <Card>
                  <CardHeader>
                    <CardTitle>Average Improvement (%) per Method</CardTitle>
                    <CardDescription>
                      Which technique produces the greatest improvements in time and comprehension? (n = sample size)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={improvementByMethodData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis label={{ value: "Improvement (%)", angle: -90, position: "insideLeft" }} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload
                                return (
                                  <div className="bg-white p-3 border rounded shadow-lg">
                                    <p className="font-semibold">{data.name}</p>
                                    <p className="text-sm">Time Improvement: {data.timeImprovement.toFixed(1)}%</p>
                                    <p className="text-sm">
                                      Score Change: {data.scoreImprovement > 0 ? "+" : ""}
                                      {data.scoreImprovement.toFixed(1)} points
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">Sample size: n={data.count}</p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Legend />
                          <Bar dataKey="timeImprovement" fill="#3B82F6" name="Time Improvement (%)" />
                          <Bar dataKey="scoreImprovement" fill="#10B981" name="Score Improvement (points)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Reading Speed Distribution by Method */}
                <Card>
                  <CardHeader>
                    <CardTitle>Reading Speed Distribution by Method</CardTitle>
                    <CardDescription>
                      Shows spread, median, and outliers for each technique (box = Q1-Q3, line = median, whiskers =
                      min-max)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={boxplotData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis label={{ value: "Time (seconds)", angle: -90, position: "insideLeft" }} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload
                                return (
                                  <div className="bg-white p-3 border rounded shadow-lg">
                                    <p className="font-semibold">{data.name}</p>
                                    <p className="text-sm">Phase 1:</p>
                                    <p className="text-xs">Min: {data.phase1.min.toFixed(1)}s</p>
                                    <p className="text-xs">Q1: {data.phase1.q1.toFixed(1)}s</p>
                                    <p className="text-xs">Median: {data.phase1.median.toFixed(1)}s</p>
                                    <p className="text-xs">Q3: {data.phase1.q3.toFixed(1)}s</p>
                                    <p className="text-xs">Max: {data.phase1.max.toFixed(1)}s</p>
                                    <p className="text-sm mt-2">Phase 2:</p>
                                    <p className="text-xs">Min: {data.phase2.min.toFixed(1)}s</p>
                                    <p className="text-xs">Q1: {data.phase2.q1.toFixed(1)}s</p>
                                    <p className="text-xs">Median: {data.phase2.median.toFixed(1)}s</p>
                                    <p className="text-xs">Q3: {data.phase2.q3.toFixed(1)}s</p>
                                    <p className="text-xs">Max: {data.phase2.max.toFixed(1)}s</p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Legend />
                          <Bar dataKey="phase1.median" fill="#EF4444" name="Phase 1 Median" />
                          <Bar dataKey="phase2.median" fill="#10B981" name="Phase 2 Median" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                      <p>Note: Hover over bars to see full distribution statistics (min, Q1, median, Q3, max)</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Comprehension vs Reading Speed */}
                <Card>
                  <CardHeader>
                    <CardTitle>Comprehension vs Reading Speed Correlation</CardTitle>
                    <CardDescription>
                      Analyzing the relationship between reading speed and comprehension accuracy
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart>
                          <CartesianGrid />
                          <XAxis
                            type="number"
                            dataKey="phase2Time"
                            name="Reading Time"
                            unit="s"
                            label={{ value: "Phase 2 Reading Time (seconds)", position: "insideBottom", offset: -5 }}
                          />
                          <YAxis
                            type="number"
                            dataKey="phase2Comprehension"
                            name="Comprehension"
                            unit="%"
                            label={{ value: "Phase 2 Comprehension (%)", angle: -90, position: "insideLeft" }}
                          />
                          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                          <Legend />
                          <Scatter
                            name="Group 1: Subvocalization Suppression"
                            data={comprehensionVsTimeData.filter((d) => d.group === 1)}
                            fill="#3B82F6"
                          />
                          <Scatter
                            name="Group 2: Pointer Aid"
                            data={comprehensionVsTimeData.filter((d) => d.group === 2)}
                            fill="#10B981"
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Initial Speed vs. Improvement Correlation */}
                <Card>
                  <CardHeader>
                    <CardTitle>Initial Speed vs. Improvement Correlation</CardTitle>
                    <CardDescription>
                      Do slower readers benefit more from speed reading training? (Shows if initial reading speed
                      predicts improvement)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart>
                          <CartesianGrid />
                          <XAxis
                            type="number"
                            dataKey="initialSpeed"
                            name="Initial Reading Time"
                            unit="s"
                            label={{ value: "Phase 1 Reading Time (seconds)", position: "insideBottom", offset: -5 }}
                          />
                          <YAxis
                            type="number"
                            dataKey="improvement"
                            name="Improvement"
                            unit="%"
                            label={{ value: "Time Improvement (%)", angle: -90, position: "insideLeft" }}
                          />
                          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                          <Legend />
                          <Scatter
                            name="Group 1: Subvocalization Suppression"
                            data={initialSpeedVsImprovementData.filter((d) => d.group === 1)}
                            fill="#3B82F6"
                          />
                          <Scatter
                            name="Group 2: Pointer Aid"
                            data={initialSpeedVsImprovementData.filter((d) => d.group === 2)}
                            fill="#10B981"
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                      <p>
                        Interpretation: If points trend upward-right, slower initial readers benefit more from training.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Radar Chart and Efficiency */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Technique Performance Radar</CardTitle>
                      <CardDescription>Multi-dimensional comparison of reading techniques</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="technique" />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} />
                            <Radar
                              name="Time Improvement"
                              dataKey="timeImprovement"
                              stroke="#3B82F6"
                              fill="#3B82F6"
                              fillOpacity={0.3}
                            />
                            <Radar
                              name="Comprehension"
                              dataKey="comprehensionMaintained"
                              stroke="#10B981"
                              fill="#10B981"
                              fillOpacity={0.3}
                            />
                            <Radar name="Speed" dataKey="speed" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.3} />
                            <Radar
                              name="Consistency"
                              dataKey="consistency"
                              stroke="#8B5CF6"
                              fill="#8B5CF6"
                              fillOpacity={0.3}
                            />
                            <Legend />
                            <Tooltip />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Reading Efficiency Score</CardTitle>
                      <CardDescription>Comprehension points per second (higher is better)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={efficiencyData.slice(0, 15)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                            <YAxis label={{ value: "Efficiency Score", angle: -90, position: "insideLeft" }} />
                            <Tooltip />
                            <Legend />
                            <Area
                              type="monotone"
                              dataKey="phase1Efficiency"
                              fill="#EF4444"
                              stroke="#EF4444"
                              fillOpacity={0.3}
                              name="Phase 1"
                            />
                            <Area
                              type="monotone"
                              dataKey="phase2Efficiency"
                              fill="#10B981"
                              stroke="#10B981"
                              fillOpacity={0.3}
                              name="Phase 2"
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Score Distribution and Participant Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Score Distribution</CardTitle>
                      <CardDescription>Frequency of comprehension scores (0-10)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={scoreDistributionData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="score" label={{ value: "Score", position: "insideBottom", offset: -5 }} />
                            <YAxis label={{ value: "Frequency", angle: -90, position: "insideLeft" }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="phase1Count" fill="#8B5CF6" name="Phase 1" />
                            <Bar dataKey="phase2Count" fill="#10B981" name="Phase 2" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Participant Distribution by Technique</CardTitle>
                      <CardDescription>Sample size for each reading method</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          {pieData.length > 0 && (
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent, value }) =>
                                  `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                                }
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Individual Performance Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Individual Performance Comparison</CardTitle>
                    <CardDescription>Phase 1 vs Phase 2 reading times for each participant</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.slice(0, 20)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            type="number"
                            label={{ value: "Time (seconds)", position: "insideBottom", offset: -5 }}
                          />
                          <YAxis type="category" dataKey="name" width={100} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="phase1Time" fill="#EF4444" name="Phase 1 Time" />
                          <Bar dataKey="phase2Time" fill="#10B981" name="Phase 2 Time" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="participants" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Participant Data</CardTitle>
                <CardDescription>View and manage all participant records</CardDescription>
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Users className="h-16 w-16 text-gray-400 mb-4" />
                    <p className="text-gray-500">No participant data available.</p>
                    <p className="text-gray-400 text-sm">
                      Load data from Firebase or enter manually to see participant records.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Nickname
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Group
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Technique
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Phase 1 Time
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Phase 1 Score
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Phase 2 Time
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Phase 2 Score
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Improvement
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Timestamp
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {participants.map((p) => (
                          <tr key={p.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {p.nickname}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.testGroup}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.technique}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {p.phase1Time.toFixed(2)}s
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.phase1Score}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {p.phase2Time.toFixed(2)}s
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.phase2Score}</td>
                            <td
                              className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                                p.improvement > 0
                                  ? "text-green-600"
                                  : p.improvement < 0
                                    ? "text-red-600"
                                    : "text-gray-500"
                              }`}
                            >
                              {p.improvement.toFixed(1)}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {p.timestamp.toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data-entry" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Manual Data Entry</CardTitle>
                <CardDescription>Add new participant results manually (Groups 1-2 only)</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="manual-nickname">Nickname</Label>
                    <Input
                      id="manual-nickname"
                      value={manualEntry.nickname}
                      onChange={(e) => setManualEntry((prev) => ({ ...prev, nickname: e.target.value }))}
                      placeholder="e.g., Alex"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-test-group">Test Group (1 or 2 only)</Label>
                    <Input
                      id="manual-test-group"
                      type="number"
                      value={manualEntry.testGroup}
                      onChange={(e) =>
                        setManualEntry((prev) => ({ ...prev, testGroup: Number.parseInt(e.target.value) }))
                      }
                      placeholder="1 or 2"
                      min="1"
                      max="2"
                      required
                    />
                    <p className="text-xs text-gray-500">1 = Subvocalization Suppression, 2 = Pointer Aid</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-phase1-time">Phase 1 Reading Time (seconds)</Label>
                    <Input
                      id="manual-phase1-time"
                      type="number"
                      step="0.01"
                      value={manualEntry.phase1Time}
                      onChange={(e) => setManualEntry((prev) => ({ ...prev, phase1Time: e.target.value }))}
                      placeholder="e.g., 120.50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-phase1-score">Phase 1 Score (0-10)</Label>
                    <Input
                      id="manual-phase1-score"
                      type="number"
                      min="0"
                      max="10"
                      value={manualEntry.phase1Score}
                      onChange={(e) => setManualEntry((prev) => ({ ...prev, phase1Score: e.target.value }))}
                      placeholder="e.g., 8"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-phase2-time">Phase 2 Reading Time (seconds)</Label>
                    <Input
                      id="manual-phase2-time"
                      type="number"
                      step="0.01"
                      value={manualEntry.phase2Time}
                      onChange={(e) => setManualEntry((prev) => ({ ...prev, phase2Time: e.target.value }))}
                      placeholder="e.g., 90.25"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-phase2-score">Phase 2 Score (0-10)</Label>
                    <Input
                      id="manual-phase2-score"
                      type="number"
                      min="0"
                      max="10"
                      value={manualEntry.phase2Score}
                      onChange={(e) => setManualEntry((prev) => ({ ...prev, phase2Score: e.target.value }))}
                      placeholder="e.g., 9"
                      required
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Button type="submit" className="w-full">
                      Add Entry
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Toaster />
    </div>
  )
}
