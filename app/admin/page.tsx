"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
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
  const [password, setPassword] = useState("")
  const [authenticated, setAuthenticated] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [userData, setUserData] = useState<UserData[]>([])
  const [loading, setLoading] = useState(false)

  // Simple password protection - in a real app, use proper authentication
  const adminPassword = "studyadmin123" // Change this to your desired password

  const authenticate = () => {
    if (password === adminPassword) {
      setAuthenticated(true)
      fetchData()
    } else {
      alert("Falsches Passwort")
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch all results from the flat collection for backward compatibility
      const resultsSnapshot = await getDocs(collection(db, "reading_study_results"))
      const resultsData: Result[] = []
      resultsSnapshot.forEach((doc) => {
        resultsData.push({ id: doc.id, ...doc.data() } as Result)
      })
      setResults(resultsData)

      // Fetch user data with their results
      const usersSnapshot = await getDocs(collection(db, "users"))
      const usersData: UserData[] = []

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
          } else if (resultDoc.id === "phase2") {
            userData.results.phase2 = {
              readingTime: resultData.readingTime,
              score: resultData.score,
              mistakeRatio: resultData.mistakeRatio,
            }
          }
        })

        usersData.push(userData)
      }

      setUserData(usersData)
    } catch (error) {
      console.error("Error fetching data:", error)
    }
    setLoading(false)
  }

  const downloadCSV = () => {
    // Create CSV content
    const headers = [
      "Spitzname",
      "Testgruppe",
      "Technik",
      "Phase 1 Lesezeit (s)",
      "Phase 1 Punkte",
      "Phase 1 Fehlerquote",
      "Phase 2 Lesezeit (s)",
      "Phase 2 Punkte",
      "Phase 2 Fehlerquote",
      "Zeitverbesserung (%)",
      "Genauigkeitsänderung (%)",
    ]
    const csvRows = [headers]

    userData
      .filter((user) => user.results?.phase1 && user.results?.phase2)
      .forEach((user) => {
        const phase1 = user.results.phase1
        const phase2 = user.results.phase2
        const timeImprovement = ((phase1.readingTime - phase2.readingTime) / phase1.readingTime) * 100
        const accuracyChange = ((phase1.mistakeRatio - phase2.mistakeRatio) / phase1.mistakeRatio) * 100

        const row = [
          user.nickname,
          user.testGroup,
          user.technique,
          phase1.readingTime.toFixed(1),
          phase1.score,
          phase1.mistakeRatio.toFixed(2),
          phase2.readingTime.toFixed(1),
          phase2.score,
          phase2.mistakeRatio.toFixed(2),
          timeImprovement.toFixed(1),
          accuracyChange.toFixed(1),
        ]
        csvRows.push(row)
      })

    const csvContent = csvRows.map((row) => row.join(",")).join("\n")

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.setAttribute("hidden", "")
    a.setAttribute("href", url)
    a.setAttribute("download", "reading_study_results.csv")
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Prepare data for time vs mistake ratio chart
  const prepareTimeVsMistakeData = () => {
    const normalReadingData = results
      .filter((r) => r.phase === 1)
      .map((r) => ({
        readingTime: r.readingTime,
        mistakeRatio: r.mistakeRatio || (r.totalQuestions - r.score) / r.totalQuestions,
        type: "Normales Lesen",
      }))

    const speedReadingData = results
      .filter((r) => r.phase === 2)
      .map((r) => ({
        readingTime: r.readingTime,
        mistakeRatio: r.mistakeRatio || (r.totalQuestions - r.score) / r.totalQuestions,
        type: "Schnelllesen",
      }))

    return [...normalReadingData, ...speedReadingData]
  }

  // Prepare data for test group comparison
  const prepareTestGroupData = () => {
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
    userData
      .filter((user) => user.results?.phase1 && user.results?.phase2)
      .forEach((user) => {
        const group = user.testGroup
        if (!groupData[group]) return

        const phase1 = user.results.phase1
        const phase2 = user.results.phase2

        groupData[group].normalReadingTime += phase1.readingTime
        groupData[group].speedReadingTime += phase2.readingTime
        groupData[group].normalMistakeRatio += phase1.mistakeRatio
        groupData[group].speedMistakeRatio += phase2.mistakeRatio
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

    return Object.values(groupData)
  }

  // Prepare data for individual improvement
  const prepareIndividualImprovementData = () => {
    return userData
      .filter((user) => user.results?.phase1 && user.results?.phase2)
      .map((user) => {
        const phase1 = user.results.phase1
        const phase2 = user.results.phase2
        const timeImprovement = ((phase1.readingTime - phase2.readingTime) / phase1.readingTime) * 100
        const accuracyChange = ((phase1.mistakeRatio - phase2.mistakeRatio) / phase1.mistakeRatio) * 100

        return {
          nickname: user.nickname,
          testGroup: user.testGroup,
          technique: user.technique,
          normalTime: phase1.readingTime,
          speedTime: phase2.readingTime,
          normalMistakes: phase1.mistakeRatio,
          speedMistakes: phase2.mistakeRatio,
          timeImprovement,
          accuracyChange,
        }
      })
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="text-center text-2xl">Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Admin-Passwort eingeben"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && authenticate()}
                className="border-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button onClick={authenticate} className="w-full bg-blue-600 hover:bg-blue-700">
              Anmelden
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold mb-2 text-blue-800">Lesestudie Ergebnisse</h1>
          <p className="text-gray-600 mb-6">Administrationsbereich für die Analyse der Studienergebnisse</p>

          <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
            <Button onClick={fetchData} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? "Wird geladen..." : "Daten aktualisieren"}
            </Button>
            <Button onClick={downloadCSV} disabled={userData.length === 0} className="bg-green-600 hover:bg-green-700">
              CSV herunterladen
            </Button>
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
                  <CardTitle>Lesezeit vs. Fehlerquote</CardTitle>
                  <CardDescription className="text-blue-100">
                    Vergleich von normalem Lesen und Schnelllesen bei allen Teilnehmern
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[500px]">
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
                          data={prepareTimeVsMistakeData().filter((d) => d.type === "Normales Lesen")}
                          fill="#4f46e5"
                        />
                        <Scatter
                          name="Schnelllesen"
                          data={prepareTimeVsMistakeData().filter((d) => d.type === "Schnelllesen")}
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
                    <CardTitle>Durchschnittliche Lesezeit</CardTitle>
                    <CardDescription className="text-blue-100">Normales Lesen vs. Schnelllesen</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            {
                              name: "Lesezeit",
                              "Normales Lesen":
                                userData
                                  .filter((u) => u.results?.phase1)
                                  .reduce((acc, u) => acc + u.results.phase1.readingTime, 0) /
                                Math.max(1, userData.filter((u) => u.results?.phase1).length),
                              Schnelllesen:
                                userData
                                  .filter((u) => u.results?.phase2)
                                  .reduce((acc, u) => acc + u.results.phase2.readingTime, 0) /
                                Math.max(1, userData.filter((u) => u.results?.phase2).length),
                            },
                          ]}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" label={{ value: "Zeit (Sekunden)", position: "bottom", offset: 0 }} />
                          <YAxis type="category" dataKey="name" width={80} />
                          <Tooltip formatter={(value) => [`${value.toFixed(1)} s`, ""]} />
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
                  <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <CardTitle>Durchschnittliche Fehlerquote</CardTitle>
                    <CardDescription className="text-blue-100">Normales Lesen vs. Schnelllesen</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            {
                              name: "Fehlerquote",
                              "Normales Lesen":
                                userData
                                  .filter((u) => u.results?.phase1)
                                  .reduce((acc, u) => acc + u.results.phase1.mistakeRatio, 0) /
                                Math.max(1, userData.filter((u) => u.results?.phase1).length),
                              Schnelllesen:
                                userData
                                  .filter((u) => u.results?.phase2)
                                  .reduce((acc, u) => acc + u.results.phase2.mistakeRatio, 0) /
                                Math.max(1, userData.filter((u) => u.results?.phase2).length),
                            },
                          ]}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" label={{ value: "Fehlerquote", position: "bottom", offset: 0 }} />
                          <YAxis type="category" dataKey="name" width={80} />
                          <Tooltip formatter={(value) => [`${(value * 100).toFixed(1)}%`, ""]} />
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
                  <CardTitle>Vergleich der Schnelllesetechniken</CardTitle>
                  <CardDescription className="text-blue-100">
                    Vergleich der Wirksamkeit verschiedener Schnelllesetechniken
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={prepareTestGroupData()}>
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
                        <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, ""]} />
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
                    <CardTitle>Durchschnittliche Lesezeit nach Technik</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={prepareTestGroupData()}>
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
                          <Tooltip formatter={(value) => [`${value.toFixed(1)} s`, ""]} />
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
                    <CardTitle>Durchschnittliche Fehlerquote nach Technik</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={prepareTestGroupData()}>
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
                          <Tooltip formatter={(value) => [`${(value * 100).toFixed(1)}%`, ""]} />
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
                  <CardTitle>Individuelle Verbesserung</CardTitle>
                  <CardDescription className="text-blue-100">
                    Zeitverbesserung vs. Genauigkeitsänderung für jeden Teilnehmer
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[500px]">
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
                          formatter={(value, name, payload: Payload[]) => [value.toFixed(2) + "%", name]}
                          labelFormatter={(value, name, payload: Payload[]) =>
                            `Teilnehmer: ${payload[0].payload.nickname}`
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
                          data={prepareIndividualImprovementData().filter((d) => d.testGroup === 1)}
                          fill="#4f46e5"
                        />
                        <Scatter
                          name="Gruppe 2 (Zeiger)"
                          data={prepareIndividualImprovementData().filter((d) => d.testGroup === 2)}
                          fill="#10b981"
                        />
                        <Scatter
                          name="Gruppe 3 (Subvokalisierung)"
                          data={prepareIndividualImprovementData().filter((d) => d.testGroup === 3)}
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
