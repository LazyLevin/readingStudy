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
      alert("Incorrect password")
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
      "Nickname",
      "Test Group",
      "Technique",
      "Phase 1 Reading Time (s)",
      "Phase 1 Score",
      "Phase 1 Mistake Ratio",
      "Phase 2 Reading Time (s)",
      "Phase 2 Score",
      "Phase 2 Mistake Ratio",
      "Time Improvement (%)",
      "Accuracy Change (%)",
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
        type: "Normal Reading",
      }))

    const speedReadingData = results
      .filter((r) => r.phase === 2)
      .map((r) => ({
        readingTime: r.readingTime,
        mistakeRatio: r.mistakeRatio || (r.totalQuestions - r.score) / r.totalQuestions,
        type: "Speed Reading",
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
        technique: ["Skimming Technique", "Pointer Technique", "Minimize Subvocalization"][i - 1],
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && authenticate()}
              />
            </div>
            <Button onClick={authenticate} className="w-full">
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Reading Study Results</h1>

      <div className="mb-6 flex justify-between items-center">
        <Button onClick={fetchData} disabled={loading}>
          {loading ? "Loading..." : "Refresh Data"}
        </Button>
        <Button onClick={downloadCSV} disabled={userData.length === 0}>
          Download CSV
        </Button>
      </div>

      {userData.length > 0 ? (
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="techniques">Technique Comparison</TabsTrigger>
            <TabsTrigger value="individual">Individual Results</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reading Time vs. Mistake Ratio</CardTitle>
                <CardDescription>
                  Comparing normal reading vs. speed reading performance across all participants
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid />
                    <XAxis
                      type="number"
                      dataKey="readingTime"
                      name="Reading Time"
                      label={{ value: "Reading Time (seconds)", position: "bottom" }}
                    />
                    <YAxis
                      type="number"
                      dataKey="mistakeRatio"
                      name="Mistake Ratio"
                      label={{ value: "Mistake Ratio", angle: -90, position: "insideLeft" }}
                    />
                    <ZAxis range={[60, 60]} />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                    <Legend />
                    <Scatter
                      name="Normal Reading"
                      data={prepareTimeVsMistakeData().filter((d) => d.type === "Normal Reading")}
                      fill="#8884d8"
                    />
                    <Scatter
                      name="Speed Reading"
                      data={prepareTimeVsMistakeData().filter((d) => d.type === "Speed Reading")}
                      fill="#82ca9d"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Average Reading Time</CardTitle>
                  <CardDescription>Normal vs. Speed Reading</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: "Reading Time",
                          "Normal Reading":
                            userData
                              .filter((u) => u.results?.phase1)
                              .reduce((acc, u) => acc + u.results.phase1.readingTime, 0) /
                            Math.max(1, userData.filter((u) => u.results?.phase1).length),
                          "Speed Reading":
                            userData
                              .filter((u) => u.results?.phase2)
                              .reduce((acc, u) => acc + u.results.phase2.readingTime, 0) /
                            Math.max(1, userData.filter((u) => u.results?.phase2).length),
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis label={{ value: "Time (seconds)", angle: -90, position: "insideLeft" }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Normal Reading" fill="#8884d8" />
                      <Bar dataKey="Speed Reading" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Average Mistake Ratio</CardTitle>
                  <CardDescription>Normal vs. Speed Reading</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: "Mistake Ratio",
                          "Normal Reading":
                            userData
                              .filter((u) => u.results?.phase1)
                              .reduce((acc, u) => acc + u.results.phase1.mistakeRatio, 0) /
                            Math.max(1, userData.filter((u) => u.results?.phase1).length),
                          "Speed Reading":
                            userData
                              .filter((u) => u.results?.phase2)
                              .reduce((acc, u) => acc + u.results.phase2.mistakeRatio, 0) /
                            Math.max(1, userData.filter((u) => u.results?.phase2).length),
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis label={{ value: "Mistake Ratio", angle: -90, position: "insideLeft" }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Normal Reading" fill="#8884d8" />
                      <Bar dataKey="Speed Reading" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="techniques" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Speed Reading Technique Comparison</CardTitle>
                <CardDescription>Comparing effectiveness of different speed reading techniques</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prepareTestGroupData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="technique" />
                    <YAxis label={{ value: "Time Improvement (%)", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="timeImprovement" name="Reading Speed Improvement (%)" fill="#82ca9d" />
                    <Bar dataKey="accuracyChange" name="Accuracy Change (%)" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Average Reading Time by Technique</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={prepareTestGroupData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="technique" />
                      <YAxis label={{ value: "Time (seconds)", angle: -90, position: "insideLeft" }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="normalReadingTime" name="Normal Reading" fill="#8884d8" />
                      <Bar dataKey="speedReadingTime" name="Speed Reading" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Average Mistake Ratio by Technique</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={prepareTestGroupData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="technique" />
                      <YAxis label={{ value: "Mistake Ratio", angle: -90, position: "insideLeft" }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="normalMistakeRatio" name="Normal Reading" fill="#8884d8" />
                      <Bar dataKey="speedMistakeRatio" name="Speed Reading" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="individual" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Individual Improvement</CardTitle>
                <CardDescription>Time improvement vs. accuracy change for each participant</CardDescription>
              </CardHeader>
              <CardContent className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid />
                    <XAxis
                      type="number"
                      dataKey="timeImprovement"
                      name="Time Improvement"
                      label={{ value: "Time Improvement (%)", position: "bottom" }}
                    />
                    <YAxis
                      type="number"
                      dataKey="accuracyChange"
                      name="Accuracy Change"
                      label={{ value: "Accuracy Change (%)", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip
                      formatter={(value, name, payload: Payload[]) => [value.toFixed(2) + "%", name]}
                      labelFormatter={(value, name, payload: Payload[]) =>
                        `Participant: ${payload[0].payload.nickname}`
                      }
                      cursor={{ strokeDasharray: "3 3" }}
                    />
                    <Legend />
                    <Scatter
                      name="Group 1 (Skimming)"
                      data={prepareIndividualImprovementData().filter((d) => d.testGroup === 1)}
                      fill="#8884d8"
                    />
                    <Scatter
                      name="Group 2 (Pointer)"
                      data={prepareIndividualImprovementData().filter((d) => d.testGroup === 2)}
                      fill="#82ca9d"
                    />
                    <Scatter
                      name="Group 3 (Subvocalization)"
                      data={prepareIndividualImprovementData().filter((d) => d.testGroup === 3)}
                      fill="#ffc658"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="raw">
            <Card>
              <CardHeader>
                <CardTitle>User Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border">
                    <thead>
                      <tr>
                        <th className="border px-4 py-2">Nickname</th>
                        <th className="border px-4 py-2">Test Group</th>
                        <th className="border px-4 py-2">Technique</th>
                        <th className="border px-4 py-2">Phase 1 Time</th>
                        <th className="border px-4 py-2">Phase 1 Score</th>
                        <th className="border px-4 py-2">Phase 2 Time</th>
                        <th className="border px-4 py-2">Phase 2 Score</th>
                        <th className="border px-4 py-2">Time Improvement</th>
                        <th className="border px-4 py-2">Accuracy Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userData
                        .filter((user) => user.results?.phase1 && user.results?.phase2)
                        .map((user) => {
                          const phase1 = user.results.phase1
                          const phase2 = user.results.phase2
                          const timeImprovement = ((phase1.readingTime - phase2.readingTime) / phase1.readingTime) * 100
                          const accuracyChange =
                            ((phase1.mistakeRatio - phase2.mistakeRatio) / phase1.mistakeRatio) * 100

                          return (
                            <tr key={user.id}>
                              <td className="border px-4 py-2">{user.nickname}</td>
                              <td className="border px-4 py-2">{user.testGroup}</td>
                              <td className="border px-4 py-2">{user.technique}</td>
                              <td className="border px-4 py-2">{phase1.readingTime.toFixed(1)}s</td>
                              <td className="border px-4 py-2">{phase1.score}/10</td>
                              <td className="border px-4 py-2">{phase2.readingTime.toFixed(1)}s</td>
                              <td className="border px-4 py-2">{phase2.score}/10</td>
                              <td className="border px-4 py-2">{timeImprovement.toFixed(1)}%</td>
                              <td className="border px-4 py-2">{accuracyChange.toFixed(1)}%</td>
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
        <div className="text-center py-8">
          <p className="text-gray-500">No results found. Start the study to collect data.</p>
        </div>
      )}
    </div>
  )
}
