"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, getDocs } from "firebase/firestore"
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth"
import { db, auth } from "@/lib/firebase"
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
  ZAxis,
} from "recharts"
import type { Payload } from "recharts/types/component/Tooltip"
import { LogOut, Download, FileImage, FileText } from "lucide-react"
import { downloadCSV, exportAllChartsAsPDF, exportChartAsImage, exportChartAsSVG } from "@/lib/exportUtils"

type Result = {
  id: string
  sessionId: string
  nickname: string
  phase: number
  readingTime: number
  score: number
  totalQuestions: number
  timestamp: any
  testGroup: number
  mistakeRatio: number
  technique: string
}

type UserData = {
  id: string
  nickname: string
  testGroup: number
  technique: string
  createdAt: any
  results?: {
    phase1?: {
      readingTime: number
      score: number
      mistakeRatio: number
    }
    phase2?: {
      readingTime: number
      score: number
      mistakeRatio: number
    }
  }
}

export default function AdminDashboard() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authenticated, setAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [results, setResults] = useState<Result[]>([])
  const [userData, setUserData] = useState<UserData[]>([])
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [loginError, setLoginError] = useState("")
  const [exportingCharts, setExportingCharts] = useState(false)
  const [dataReady, setDataReady] = useState(false)
  const [timeVsMistakeData, setTimeVsMistakeData] = useState([])
  const [testGroupData, setTestGroupData] = useState([])
  const [individualData, setIndividualData] = useState([])
  const [avgTimeData, setAvgTimeData] = useState([])
  const [avgErrorData, setAvgErrorData] = useState([])

  // Refs for chart containers
  const scatterChartRef = useRef<HTMLDivElement>(null)
  const avgTimeChartRef = useRef<HTMLDivElement>(null)
  const avgErrorChartRef = useRef<HTMLDivElement>(null)
  const techniqueComparisonRef = useRef<HTMLDivElement>(null)
  const timeByTechniqueRef = useRef<HTMLDivElement>(null)
  const errorByTechniqueRef = useRef<HTMLDivElement>(null)
  const individualImprovementRef = useRef<HTMLDivElement>(null)

  // Check authentication state on component mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthenticated(true)
        setUser(user)
        fetchData()
      } else {
        setAuthenticated(false)
        setUser(null)
      }
      setAuthLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleLogin = async () => {
    setLoginError("")
    setAuthLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      // Authentication state will be handled by onAuthStateChanged
    } catch (error: any) {
      console.error("Login error:", error)
      setLoginError("Ungültige Anmeldedaten. Bitte versuchen Sie es erneut.")
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      setResults([])
      setUserData([])
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    setDataReady(false)
    try {
      // Fetch all results from the flat collection for backward compatibility
      const resultsSnapshot = await getDocs(collection(db, "reading_study_results"))
      const resultsData: Result[] = []
      resultsSnapshot.forEach((doc) => {
        resultsData.push({ id: doc.id, ...doc.data() } as Result)
      })

      // Fetch user data with their results
      const usersSnapshot = await getDocs(collection(db, "users"))
      const usersData: UserData[] = []
      const additionalResults: Result[] = []

      for (const userDoc of usersSnapshot.docs) {
        const userData = { id: userDoc.id, ...userDoc.data() } as UserData

        // Fetch results for this user
        const resultsSnapshot = await getDocs(collection(db, "users", userDoc.id, "results"))
        userData.results = {}

        resultsSnapshot.forEach((resultDoc) => {
          const resultData = resultDoc.data()
          if (resultDoc.id === "phase1") {
            userData.results.phase1 = {
              readingTime: resultData.readingTime,
              score: resultData.score,
              mistakeRatio: resultData.mistakeRatio,
            }
            // Add to results array for chart compatibility
            additionalResults.push({
              id: `${userDoc.id}_phase1`,
              sessionId: userDoc.id,
              nickname: userData.nickname,
              phase: 1,
              readingTime: resultData.readingTime,
              score: resultData.score,
              totalQuestions: resultData.totalQuestions || 10,
              timestamp: resultData.timestamp,
              testGroup: userData.testGroup,
              mistakeRatio: resultData.mistakeRatio,
              technique: "Normales Lesen",
            })
          } else if (resultDoc.id === "phase2") {
            userData.results.phase2 = {
              readingTime: resultData.readingTime,
              score: resultData.score,
              mistakeRatio: resultData.mistakeRatio,
            }
            // Add to results array for chart compatibility
            additionalResults.push({
              id: `${userDoc.id}_phase2`,
              sessionId: userDoc.id,
              nickname: userData.nickname,
              phase: 2,
              readingTime: resultData.readingTime,
              score: resultData.score,
              totalQuestions: resultData.totalQuestions || 10,
              timestamp: resultData.timestamp,
              testGroup: userData.testGroup,
              mistakeRatio: resultData.mistakeRatio,
              technique: userData.technique,
            })
          }
        })

        usersData.push(userData)
      }

      // Combine both result sources
      const allResults = [...resultsData, ...additionalResults]
      setResults(allResults)
      setUserData(usersData)
      setDataReady(true)

      console.log("Fetched results:", allResults.length)
      console.log("Fetched users:", usersData.length)
      console.log("Sample userData:", usersData.slice(0, 2))
      console.log("Sample results:", allResults.slice(0, 2))
    } catch (error) {
      console.error("Error fetching data:", error)
    }
    setLoading(false)
  }

  // Prepare data functions
  const prepareTimeVsMistakeData = () => {
    if (!results || results.length === 0) {
      return []
    }

    const normalReadingData = results
      .filter((r) => r.phase === 1)
      .map((r) => ({
        readingTime: Number(r.readingTime) || 0,
        mistakeRatio: Number(r.mistakeRatio) || 0,
        type: "Normales Lesen",
      }))

    const speedReadingData = results
      .filter((r) => r.phase === 2)
      .map((r) => ({
        readingTime: Number(r.readingTime) || 0,
        mistakeRatio: Number(r.mistakeRatio) || 0,
        type: "Schnelllesen",
      }))

    return [...normalReadingData, ...speedReadingData]
  }

  const prepareTestGroupData = () => {
    if (!userData || userData.length === 0) {
      return []
    }

    const validUsers = userData.filter((user) => user.results?.phase1 && user.results?.phase2)

    if (validUsers.length === 0) {
      return []
    }

    const groupData = {}

    // Initialize with empty arrays
    for (let i = 1; i <= 3; i++) {
      groupData[i] = {
        group: i,
        technique: ["Skimming-Technik", "Zeiger-Technik", "Subvokalisierung minimieren"][i - 1],
        normalReadingTime: 0,
        speedReadingTime: 0,
        normalMistakeRatio: 0,
        speedMistakeRatio: 0,
        timeImprovement: 0,
        accuracyChange: 0,
        count: 0,
      }
    }

    // Process user data
    validUsers.forEach((user) => {
      const group = Number(user.testGroup)
      if (!groupData[group]) return

      const phase1 = user.results.phase1
      const phase2 = user.results.phase2

      groupData[group].normalReadingTime += Number(phase1.readingTime) || 0
      groupData[group].speedReadingTime += Number(phase2.readingTime) || 0
      groupData[group].normalMistakeRatio += Number(phase1.mistakeRatio) || 0
      groupData[group].speedMistakeRatio += Number(phase2.mistakeRatio) || 0
      groupData[group].count++
    })

    // Calculate averages and improvements
    Object.keys(groupData).forEach((group) => {
      const data = groupData[group]
      if (data.count > 0) {
        data.normalReadingTime /= data.count
        data.speedReadingTime /= data.count
        data.normalMistakeRatio /= data.count
        data.speedMistakeRatio /= data.count
        data.timeImprovement = ((data.normalReadingTime - data.speedReadingTime) / data.normalReadingTime) * 100
        data.accuracyChange = ((data.normalMistakeRatio - data.speedMistakeRatio) / data.normalMistakeRatio) * 100
      }
    })

    return Object.values(groupData).filter((d) => d.count > 0)
  }

  const prepareIndividualImprovementData = () => {
    if (!userData || userData.length === 0) {
      return []
    }

    const validUsers = userData.filter((user) => user.results?.phase1 && user.results?.phase2)

    return validUsers.map((user) => {
      const phase1 = user.results.phase1
      const phase2 = user.results.phase2
      const timeImprovement =
        ((Number(phase1.readingTime) - Number(phase2.readingTime)) / Number(phase1.readingTime)) * 100

      // Handle division by zero for accuracy change
      let accuracyChange = 0
      if (Number(phase1.mistakeRatio) !== 0) {
        accuracyChange =
          ((Number(phase1.mistakeRatio) - Number(phase2.mistakeRatio)) / Number(phase1.mistakeRatio)) * 100
      }

      return {
        nickname: user.nickname,
        testGroup: Number(user.testGroup),
        technique: user.technique,
        normalTime: Number(phase1.readingTime),
        speedTime: Number(phase2.readingTime),
        normalMistakes: Number(phase1.mistakeRatio),
        speedMistakes: Number(phase2.mistakeRatio),
        timeImprovement: isFinite(timeImprovement) ? timeImprovement : 0,
        accuracyChange: isFinite(accuracyChange) ? accuracyChange : 0,
      }
    })
  }

  const prepareAverageTimeData = () => {
    if (!userData || userData.length === 0) {
      return []
    }

    const validUsers = userData.filter((user) => user.results?.phase1 && user.results?.phase2)

    if (validUsers.length === 0) {
      return []
    }

    const avgNormalTime = validUsers.reduce((acc, u) => acc + u.results.phase1.readingTime, 0) / validUsers.length
    const avgSpeedTime = validUsers.reduce((acc, u) => acc + u.results.phase2.readingTime, 0) / validUsers.length

    return [
      {
        name: "Lesezeit",
        "Normales Lesen": avgNormalTime,
        Schnelllesen: avgSpeedTime,
      },
    ]
  }

  const prepareAverageErrorData = () => {
    if (!userData || userData.length === 0) {
      return []
    }

    const validUsers = userData.filter((user) => user.results?.phase1 && user.results?.phase2)

    if (validUsers.length === 0) {
      return []
    }

    const avgNormalError = validUsers.reduce((acc, u) => acc + u.results.phase1.mistakeRatio, 0) / validUsers.length
    const avgSpeedError = validUsers.reduce((acc, u) => acc + u.results.phase2.mistakeRatio, 0) / validUsers.length

    return [
      {
        name: "Fehlerquote",
        "Normales Lesen": avgNormalError,
        Schnelllesen: avgSpeedError,
      },
    ]
  }

  useEffect(() => {
    if (dataReady) {
      setTimeVsMistakeData(prepareTimeVsMistakeData())
      setTestGroupData(prepareTestGroupData())
      setIndividualData(prepareIndividualImprovementData())
      setAvgTimeData(prepareAverageTimeData())
      setAvgErrorData(prepareAverageErrorData())
    }
  }, [dataReady, userData, results])

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-800 text-lg">Authentifizierung wird überprüft...</p>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="text-center text-2xl">Admin Dashboard</CardTitle>
            <CardDescription className="text-blue-100 text-center">
              Melden Sie sich mit Ihren Admin-Anmeldedaten an
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="Passwort eingeben"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="border-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {loginError && <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">{loginError}</div>}
            <Button
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={authLoading || !email || !password}
            >
              {authLoading ? "Wird angemeldet..." : "Anmelden"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Only prepare data when it's ready
  // const timeVsMistakeData = dataReady ? prepareTimeVsMistakeData() : []
  // const testGroupData = dataReady ? prepareTestGroupData() : []
  // const individualData = dataReady ? prepareIndividualImprovementData() : []
  // const avgTimeData = dataReady ? prepareAverageTimeData() : []
  // const avgErrorData = dataReady ? prepareAverageErrorData() : []

  // Add this useEffect to log when data is prepared
  useEffect(() => {
    if (dataReady) {
      console.log("Chart data prepared:", {
        timeVsMistakeData: timeVsMistakeData.length,
        testGroupData: testGroupData.length,
        individualData: individualData.length,
        avgTimeData: avgTimeData.length,
        avgErrorData: avgErrorData.length,
      })
      console.log("Sample timeVsMistakeData:", timeVsMistakeData.slice(0, 2))
      console.log("Sample testGroupData:", testGroupData.slice(0, 2))
    }
  }, [dataReady, userData, results, timeVsMistakeData, testGroupData, individualData, avgTimeData, avgErrorData])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-blue-800">Lesestudie Ergebnisse</h1>
              <p className="text-gray-600 mb-6">Administrationsbereich für die Analyse der Studienergebnisse</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Angemeldet als: {user?.email}</span>
              <Button onClick={handleLogout} variant="outline" size="sm" className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Abmelden
              </Button>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
            <div className="flex gap-2">
              <Button onClick={fetchData} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? "Wird geladen..." : "Daten aktualisieren"}
              </Button>
              <Button
                onClick={downloadCSV}
                disabled={userData.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV herunterladen
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={exportAllChartsAsPDF}
                disabled={userData.length === 0 || exportingCharts}
                className="bg-red-600 hover:bg-red-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                {exportingCharts ? "Exportiere..." : "Alle Diagramme als PDF"}
              </Button>
            </div>
          </div>
        </div>
        {userData.length > 0 ? (
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-blue-100 p-1 rounded-lg">
              <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-blue-700">
                Übersicht
              </TabsTrigger>
              <TabsTrigger
                value="techniques"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-700"
              >
                Technikvergleich
              </TabsTrigger>
              <TabsTrigger
                value="individual"
                className="data-[state=active]:bg-white data-[state=active]:text-blue-700"
              >
                Einzelergebnisse
              </TabsTrigger>
              <TabsTrigger value="raw" className="data-[state=active]:bg-white data-[state=active]:text-blue-700">
                Rohdaten
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Lesezeit vs. Fehlerquote</CardTitle>
                      <CardDescription className="text-blue-100">
                        Vergleich von normalem Lesen und Schnelllesen bei allen Teilnehmern
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-white border-white hover:bg-white hover:text-blue-600"
                        onClick={() => exportChartAsImage(scatterChartRef, "lesezeit_vs_fehlerquote")}
                      >
                        <FileImage className="h-4 w-4 mr-1" />
                        PNG
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-white border-white hover:bg-white hover:text-blue-600"
                        onClick={() => exportChartAsSVG(scatterChartRef, "lesezeit_vs_fehlerquote")}
                      >
                        <FileImage className="h-4 w-4 mr-1" />
                        SVG
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div ref={scatterChartRef} className="h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          dataKey="readingTime"
                          name="Lesezeit"
                          label={{ value: "Lesezeit (Sekunden)", position: "bottom", offset: 20 }}
                        />
                        <YAxis
                          type="number"
                          dataKey="mistakeRatio"
                          name="Fehlerquote"
                          label={{ value: "Fehlerquote", angle: -90, position: "insideLeft" }}
                        />
                        <ZAxis range={[60, 60]} />
                        <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                        <Legend
                          layout="horizontal"
                          verticalAlign="top"
                          align="center"
                          wrapperStyle={{ paddingBottom: "20px" }}
                        />
                        <Scatter
                          name="Normales Lesen"
                          data={timeVsMistakeData.filter((d) => d.type === "Normales Lesen")}
                          fill="#4f46e5"
                        />
                        <Scatter
                          name="Schnelllesen"
                          data={timeVsMistakeData.filter((d) => d.type === "Schnelllesen")}
                          fill="#10b981"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-0 shadow-lg overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Durchschnittliche Lesezeit</CardTitle>
                        <CardDescription className="text-blue-100">Normales Lesen vs. Schnelllesen</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-white border-white hover:bg-white hover:text-blue-600"
                          onClick={() => exportChartAsImage(avgTimeChartRef, "durchschnittliche_lesezeit")}
                        >
                          <FileImage className="h-4 w-4 mr-1" />
                          PNG
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-white border-white hover:bg-white hover:text-blue-600"
                          onClick={() => exportChartAsSVG(avgTimeChartRef, "durchschnittliche_lesezeit")}
                        >
                          <FileImage className="h-4 w-4 mr-1" />
                          SVG
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div ref={avgTimeChartRef} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={avgTimeData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" label={{ value: "Zeit (Sekunden)", position: "bottom", offset: 0 }} />
                          <YAxis type="category" dataKey="name" width={80} />
                          <Tooltip formatter={(value) => [`${Number(value).toFixed(1)} s`, ""]} />
                          <Legend
                            layout="horizontal"
                            verticalAlign="top"
                            align="center"
                            wrapperStyle={{ paddingBottom: "20px" }}
                          />
                          <Bar dataKey="Normales Lesen" fill="#4f46e5" />
                          <Bar dataKey="Schnelllesen" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg overflow-hidden">
                  <CardHeader
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white
                    "
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Durchschnittliche Fehlerquote</CardTitle>
                        <CardDescription className="text-blue-100">Normales Lesen vs. Schnelllesen</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-white border-white hover:bg-white hover:text-blue-600"
                          onClick={() => exportChartAsImage(avgErrorChartRef, "durchschnittliche_fehlerquote")}
                        >
                          <FileImage className="h-4 w-4 mr-1" />
                          PNG
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-white border-white hover:bg-white hover:text-blue-600"
                          onClick={() => exportChartAsSVG(avgErrorChartRef, "durchschnittliche_fehlerquote")}
                        >
                          <FileImage className="h-4 w-4 mr-1" />
                          SVG
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div ref={avgErrorChartRef} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={avgErrorData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" label={{ value: "Fehlerquote", position: "bottom", offset: 0 }} />
                          <YAxis type="category" dataKey="name" width={80} />
                          <Tooltip formatter={(value) => [`${(Number(value) * 100).toFixed(1)}%`, ""]} />
                          <Legend
                            layout="horizontal"
                            verticalAlign="top"
                            align="center"
                            wrapperStyle={{ paddingBottom: "20px" }}
                          />
                          <Bar dataKey="Normales Lesen" fill="#4f46e5" />
                          <Bar dataKey="Schnelllesen" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="techniques" className="space-y-6">
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Vergleich der Schnelllesetechniken</CardTitle>
                      <CardDescription className="text-blue-100">
                        Vergleich der Wirksamkeit verschiedener Schnelllesetechniken
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-white border-white hover:bg-white hover:text-blue-600"
                        onClick={() => exportChartAsImage(techniqueComparisonRef, "technikvergleich")}
                      >
                        <FileImage className="h-4 w-4 mr-1" />
                        PNG
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-white border-white hover:bg-white hover:text-blue-600"
                        onClick={() => exportChartAsSVG(techniqueComparisonRef, "technikvergleich")}
                      >
                        <FileImage className="h-4 w-4 mr-1" />
                        SVG
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div ref={techniqueComparisonRef} className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={testGroupData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="technique"
                          tick={{ fontSize: 12 }}
                          height={60}
                          tickFormatter={(value) => {
                            // Wrap long technique names
                            if (value.length > 15) {
                              return value.substring(0, 15) + "..."
                            }
                            return value
                          }}
                        />
                        <YAxis label={{ value: "Verbesserung (%)", angle: -90, position: "insideLeft" }} />
                        <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, ""]} />
                        <Legend
                          layout="horizontal"
                          verticalAlign="top"
                          align="center"
                          wrapperStyle={{ paddingBottom: "20px" }}
                        />
                        <Bar dataKey="timeImprovement" name="Lesegeschwindigkeitsverbesserung (%)" fill="#10b981" />
                        <Bar dataKey="accuracyChange" name="Genauigkeitsänderung (%)" fill="#4f46e5" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-0 shadow-lg overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Durchschnittliche Lesezeit nach Technik</CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-white border-white hover:bg-white hover:text-blue-600"
                          onClick={() => exportChartAsImage(timeByTechniqueRef, "lesezeit_nach_technik")}
                        >
                          <FileImage className="h-4 w-4 mr-1" />
                          PNG
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-white border-white hover:bg-white hover:text-blue-600"
                          onClick={() => exportChartAsSVG(timeByTechniqueRef, "lesezeit_nach_technik")}
                        >
                          <FileImage className="h-4 w-4 mr-1" />
                          SVG
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div ref={timeByTechniqueRef} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={testGroupData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="technique"
                            tick={{ fontSize: 12 }}
                            height={60}
                            tickFormatter={(value) => {
                              // Wrap long technique names
                              if (value.length > 15) {
                                return value.substring(0, 15) + "..."
                              }
                              return value
                            }}
                          />
                          <YAxis label={{ value: "Zeit (Sekunden)", angle: -90, position: "insideLeft" }} />
                          <Tooltip formatter={(value) => [`${Number(value).toFixed(1)} s`, ""]} />
                          <Legend
                            layout="horizontal"
                            verticalAlign="top"
                            align="center"
                            wrapperStyle={{ paddingBottom: "20px" }}
                          />
                          <Bar dataKey="normalReadingTime" name="Normales Lesen" fill="#4f46e5" />
                          <Bar dataKey="speedReadingTime" name="Schnelllesen" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Durchschnittliche Fehlerquote nach Technik</CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-white border-white hover:bg-white hover:text-blue-600"
                          onClick={() => exportChartAsImage(errorByTechniqueRef, "fehlerquote_nach_technik")}
                        >
                          <FileImage className="h-4 w-4 mr-1" />
                          PNG
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-white border-white hover:bg-white hover:text-blue-600"
                          onClick={() => exportChartAsSVG(errorByTechniqueRef, "fehlerquote_nach_technik")}
                        >
                          <FileImage className="h-4 w-4 mr-1" />
                          SVG
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div ref={errorByTechniqueRef} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={testGroupData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="technique"
                            tick={{ fontSize: 12 }}
                            height={60}
                            tickFormatter={(value) => {
                              // Wrap long technique names
                              if (value.length > 15) {
                                return value.substring(0, 15) + "..."
                              }
                              return value
                            }}
                          />
                          <YAxis label={{ value: "Fehlerquote", angle: -90, position: "insideLeft" }} />
                          <Tooltip formatter={(value) => [`${(Number(value) * 100).toFixed(1)}%`, ""]} />
                          <Legend
                            layout="horizontal"
                            verticalAlign="top"
                            align="center"
                            wrapperStyle={{ paddingBottom: "20px" }}
                          />
                          <Bar dataKey="normalMistakeRatio" name="Normales Lesen" fill="#4f46e5" />
                          <Bar dataKey="speedMistakeRatio" name="Schnelllesen" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="individual" className="space-y-6">
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Individuelle Verbesserung</CardTitle>
                      <CardDescription className="text-blue-100">
                        Zeitverbesserung vs. Genauigkeitsänderung für jeden Teilnehmer
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-white border-white hover:bg-white hover:text-blue-600"
                        onClick={() => exportChartAsImage(individualImprovementRef, "individuelle_verbesserung")}
                      >
                        <FileImage className="h-4 w-4 mr-1" />
                        PNG
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-white border-white hover:bg-white hover:text-blue-600"
                        onClick={() => exportChartAsSVG(individualImprovementRef, "individuelle_verbesserung")}
                      >
                        <FileImage className="h-4 w-4 mr-1" />
                        SVG
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div ref={individualImprovementRef} className="h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 30 }}>
                        <CartesianGrid />
                        <XAxis
                          type="number"
                          dataKey="timeImprovement"
                          name="Zeitverbesserung"
                          label={{ value: "Zeitverbesserung (%)", position: "bottom", offset: 20 }}
                        />
                        <YAxis
                          type="number"
                          dataKey="accuracyChange"
                          name="Genauigkeitsänderung"
                          label={{ value: "Genauigkeitsänderung (%)", angle: -90, position: "insideLeft" }}
                        />
                        <Tooltip
                          formatter={(value, name, payload: Payload[]) => [Number(value).toFixed(2) + "%", name]}
                          labelFormatter={(value, name, payload: Payload[]) =>
                            `Teilnehmer: ${payload[0]?.payload?.nickname || "Unknown"}`
                          }
                          cursor={{ strokeDasharray: "3 3" }}
                        />
                        <Legend
                          layout="horizontal"
                          verticalAlign="top"
                          align="center"
                          wrapperStyle={{ paddingBottom: "20px" }}
                        />
                        <Scatter
                          name="Gruppe 1 (Skimming)"
                          data={individualData.filter((d) => d.testGroup === 1)}
                          fill="#4f46e5"
                        />
                        <Scatter
                          name="Gruppe 2 (Zeiger)"
                          data={individualData.filter((d) => d.testGroup === 2)}
                          fill="#10b981"
                        />
                        <Scatter
                          name="Gruppe 3 (Subvokalisierung)"
                          data={individualData.filter((d) => d.testGroup === 3)}
                          fill="#f59e0b"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="raw">
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <CardTitle>Benutzerdaten</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-blue-50">
                          <th className="px-4 py-3 text-left text-sm font-medium text-blue-800">Spitzname</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-blue-800">Testgruppe</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-blue-800">Technik</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-blue-800">Phase 1 Zeit</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-blue-800">Phase 1 Punkte</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-blue-800">Phase 2 Zeit</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-blue-800">Phase 2 Punkte</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-blue-800">Zeitverbesserung</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-blue-800">
                            Genauigkeitsänderung
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {userData
                          .filter((user) => user.results?.phase1 && user.results?.phase2)
                          .map((user) => {
                            const phase1 = user.results.phase1
                            const phase2 = user.results.phase2
                            const timeImprovement =
                              ((phase1.readingTime - phase2.readingTime) / phase1.readingTime) * 100
                            const accuracyChange =
                              ((phase1.mistakeRatio - phase2.mistakeRatio) / phase1.mistakeRatio) * 100

                            return (
                              <tr key={user.id} className="hover:bg-blue-50">
                                <td className="px-4 py-3 text-sm">{user.nickname}</td>
                                <td className="px-4 py-3 text-sm">{user.testGroup}</td>
                                <td className="px-4 py-3 text-sm">{user.technique}</td>
                                <td className="px-4 py-3 text-sm">{phase1.readingTime.toFixed(1)}s</td>
                                <td className="px-4 py-3 text-sm">{phase1.score}/10</td>
                                <td className="px-4 py-3 text-sm">{phase2.readingTime.toFixed(1)}s</td>
                                <td className="px-4 py-3 text-sm">{phase2.score}/10</td>
                                <td className="px-4 py-3 text-sm font-medium text-green-600">
                                  {timeImprovement.toFixed(1)}%
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-blue-600">
                                  {accuracyChange.toFixed(1)}%
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-500 text-lg">
              Keine Ergebnisse gefunden. Starten Sie die Studie, um Daten zu sammeln.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
