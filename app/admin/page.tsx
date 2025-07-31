"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
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
} from "recharts"
import {
  Users,
  Clock,
  Target,
  TrendingUp,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  BarChart3,
  PieChartIcon,
  ScatterChartIcon as Scatter3D,
} from "lucide-react"
import { collection, getDocs, query, orderBy, addDoc } from "@firebase/firestore"
import { db, isFirebaseAvailable, mockData, logAnalyticsEvent } from "@/lib/firebase"
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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export default function AdminDashboard() {
  const [participants, setParticipants] = useState<ParticipantData[]>([])
  const [loading, setLoading] = useState(true)
  const [firebaseStatus, setFirebaseStatus] = useState<"checking" | "available" | "unavailable">("checking")
  const [selectedChart, setSelectedChart] = useState<"bar" | "scatter" | "pie">("bar")
  const [isRefreshing, setIsRefreshing] = useState(false)

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
    checkFirebaseAndLoadData()
  }, [])

  const checkFirebaseAndLoadData = async () => {
    setLoading(true)

    try {
      if (isFirebaseAvailable()) {
        setFirebaseStatus("available")
        await loadParticipantData()
      } else {
        setFirebaseStatus("unavailable")
        loadMockData()
      }
    } catch (error) {
      console.error("Error checking Firebase:", error)
      setFirebaseStatus("unavailable")
      loadMockData()
    } finally {
      setLoading(false)
    }
  }

  const loadParticipantData = async () => {
    try {
      const resultsQuery = query(collection(db, "reading_study_results"), orderBy("timestamp", "desc"))
      const querySnapshot = await getDocs(resultsQuery)

      const participantMap = new Map<string, Partial<ParticipantData>>()

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const sessionId = data.sessionId

        if (!participantMap.has(sessionId)) {
          participantMap.set(sessionId, {
            id: sessionId,
            nickname: data.nickname,
            testGroup: data.testGroup,
            technique: data.technique,
            timestamp: data.timestamp?.toDate() || new Date(),
          })
        }

        const participant = participantMap.get(sessionId)!

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

      const completeParticipants = Array.from(participantMap.values())
        .filter((p) => p.phase1Time !== undefined && p.phase2Time !== undefined)
        .map((p) => ({
          ...p,
          improvement: p.phase1Time && p.phase2Time ? ((p.phase1Time - p.phase2Time) / p.phase1Time) * 100 : 0,
        })) as ParticipantData[]

      setParticipants(completeParticipants)

      logAnalyticsEvent("admin_data_loaded", {
        participant_count: completeParticipants.length,
        firebase_connected: true,
      })
    } catch (error) {
      console.error("Error loading participant data:", error)
      toast({
        title: "Error",
        description: "Failed to load participant data from Firebase",
        variant: "destructive",
      })
    }
  }

  const loadMockData = () => {
    const mockParticipants: ParticipantData[] = mockData.participants.map((p, index) => ({
      id: p.id,
      nickname: p.name,
      testGroup: p.technique === "speed_reading" ? Math.floor(Math.random() * 3) + 1 : 4,
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

    setParticipants(mockParticipants)

    logAnalyticsEvent("admin_data_loaded", {
      participant_count: mockParticipants.length,
      firebase_connected: false,
    })
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await checkFirebaseAndLoadData()
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

    try {
      const phase1Time = Number.parseFloat(manualEntry.phase1Time)
      const phase1Score = Number.parseInt(manualEntry.phase1Score)
      const phase2Time = Number.parseFloat(manualEntry.phase2Time)
      const phase2Score = Number.parseInt(manualEntry.phase2Score)

      const sessionId = `manual_${Date.now()}`
      const timestamp = new Date()
      const technique = manualEntry.testGroup <= 3 ? "Speed Reading" : "Normal Reading"

      // Add phase 1 result
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

      // Add phase 2 result
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

      // Reset form
      setManualEntry({
        nickname: "",
        testGroup: 1,
        phase1Time: "",
        phase1Score: "",
        phase2Time: "",
        phase2Score: "",
      })

      // Refresh data
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
      "Nickname,Test Group,Technique,Phase 1 Time,Phase 1 Score,Phase 2 Time,Phase 2 Score,Improvement %,Timestamp",
      ...participants.map(
        (p) =>
          `${p.nickname},${p.testGroup},${p.technique},${p.phase1Time},${p.phase1Score},${p.phase2Time},${p.phase2Score},${p.improvement.toFixed(2)},${p.timestamp.toISOString()}`,
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
    speedReadingParticipants: participants.filter((p) => p.testGroup <= 3).length,
    normalReadingParticipants: participants.filter((p) => p.testGroup === 4).length,
  }

  // Prepare chart data
  const chartData: ChartData[] = participants.map((p, index) => ({
    name: p.nickname || `Participant ${index + 1}`,
    phase1Time: p.phase1Time,
    phase2Time: p.phase2Time,
    phase1Score: p.phase1Score,
    phase2Score: p.phase2Score,
    improvement: p.improvement,
  }))

  const pieData = [
    { name: "Group 1 (Skimming)", value: participants.filter((p) => p.testGroup === 1).length },
    { name: "Group 2 (Pointer)", value: participants.filter((p) => p.testGroup === 2).length },
    { name: "Group 3 (Subvocalization)", value: participants.filter((p) => p.testGroup === 3).length },
    { name: "Group 4 (Normal)", value: participants.filter((p) => p.testGroup === 4).length },
  ].filter((item) => item.value > 0)

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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reading Study Dashboard</h1>
            <p className="text-gray-600">Analytics and participant management</p>
          </div>
          <div className="flex items-center gap-3">
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
            <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={exportData} disabled={participants.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
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
                {stats.speedReadingParticipants} speed reading, {stats.normalReadingParticipants} normal
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
              <CardTitle className="text-sm font-medium">Avg Phase 1 Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {participants.length > 0
                  ? (participants.reduce((sum, p) => sum + p.phase1Time, 0) / participants.length).toFixed(1)
                  : 0}
                s
              </div>
              <p className="text-xs text-muted-foreground">Initial reading speed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Phase 2 Time</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {participants.length > 0
                  ? (participants.reduce((sum, p) => sum + p.phase2Time, 0) / participants.length).toFixed(1)
                  : 0}
                s
              </div>
              <p className="text-xs text-muted-foreground">After technique training</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="data-entry">Data Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            {/* Chart Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Data Visualization</CardTitle>
                <CardDescription>Choose how to view the participant data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={selectedChart === "bar" ? "default" : "outline"}
                    onClick={() => setSelectedChart("bar")}
                    size="sm"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Bar Chart
                  </Button>
                  <Button
                    variant={selectedChart === "scatter" ? "default" : "outline"}
                    onClick={() => setSelectedChart("scatter")}
                    size="sm"
                  >
                    <Scatter3D className="h-4 w-4 mr-2" />
                    Scatter Plot
                  </Button>
                  <Button
                    variant={selectedChart === "pie" ? "default" : "outline"}
                    onClick={() => setSelectedChart("pie")}
                    size="sm"
                  >
                    <PieChartIcon className="h-4 w-4 mr-2" />
                    Pie Chart
                  </Button>
                </div>

                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    {selectedChart === "bar" && (
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="phase1Time" fill="#8884d8" name="Phase 1 Time (s)" />
                        <Bar dataKey="phase2Time" fill="#82ca9d" name="Phase 2 Time (s)" />
                      </BarChart>
                    )}

                    {selectedChart === "scatter" && (
                      <ScatterChart data={chartData}>
                        <CartesianGrid />
                        <XAxis dataKey="phase1Time" name="Phase 1 Time" unit="s" />
                        <YAxis dataKey="phase2Time" name="Phase 2 Time" unit="s" />
                        <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                        <Scatter name="Participants" data={chartData} fill="#8884d8" />
                      </ScatterChart>
                    )}

                    {selectedChart === "pie" && (
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
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
          </TabsContent>

          <TabsContent value="participants" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Participant Data</CardTitle>
                <CardDescription>Detailed results from all study participants</CardDescription>
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No participant data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {participants.map((participant) => (
                      <div key={participant.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{participant.nickname}</h3>
                          <Badge variant="outline">Group {participant.testGroup}</Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Phase 1 Time</p>
                            <p className="font-medium">{participant.phase1Time.toFixed(1)}s</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Phase 1 Score</p>
                            <p className="font-medium">{participant.phase1Score}/10</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Phase 2 Time</p>
                            <p className="font-medium">{participant.phase2Time.toFixed(1)}s</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Phase 2 Score</p>
                            <p className="font-medium">{participant.phase2Score}/10</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Improvement</span>
                              <span>{participant.improvement.toFixed(1)}%</span>
                            </div>
                            <Progress value={Math.max(0, Math.min(100, participant.improvement))} className="h-2" />
                          </div>
                          <div className="text-xs text-gray-500">{participant.timestamp.toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data-entry" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Manual Data Entry</CardTitle>
                <CardDescription>Add participant data manually for testing or offline entries</CardDescription>
              </CardHeader>
              <CardContent>
                {firebaseStatus === "unavailable" ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Manual data entry requires Firebase connection. Please configure Firebase to use this feature.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nickname">Participant Nickname</Label>
                        <Input
                          id="nickname"
                          value={manualEntry.nickname}
                          onChange={(e) => setManualEntry((prev) => ({ ...prev, nickname: e.target.value }))}
                          placeholder="Enter nickname"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="testGroup">Test Group</Label>
                        <select
                          id="testGroup"
                          value={manualEntry.testGroup}
                          onChange={(e) =>
                            setManualEntry((prev) => ({ ...prev, testGroup: Number.parseInt(e.target.value) }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value={1}>Group 1 - Skimming</option>
                          <option value={2}>Group 2 - Pointer</option>
                          <option value={3}>Group 3 - Subvocalization</option>
                          <option value={4}>Group 4 - Normal Reading</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phase1Time">Phase 1 Time (seconds)</Label>
                        <Input
                          id="phase1Time"
                          type="number"
                          step="0.1"
                          value={manualEntry.phase1Time}
                          onChange={(e) => setManualEntry((prev) => ({ ...prev, phase1Time: e.target.value }))}
                          placeholder="120.5"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phase1Score">Phase 1 Score (0-10)</Label>
                        <Input
                          id="phase1Score"
                          type="number"
                          min="0"
                          max="10"
                          value={manualEntry.phase1Score}
                          onChange={(e) => setManualEntry((prev) => ({ ...prev, phase1Score: e.target.value }))}
                          placeholder="8"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phase2Time">Phase 2 Time (seconds)</Label>
                        <Input
                          id="phase2Time"
                          type="number"
                          step="0.1"
                          value={manualEntry.phase2Time}
                          onChange={(e) => setManualEntry((prev) => ({ ...prev, phase2Time: e.target.value }))}
                          placeholder="95.2"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phase2Score">Phase 2 Score (0-10)</Label>
                        <Input
                          id="phase2Score"
                          type="number"
                          min="0"
                          max="10"
                          value={manualEntry.phase2Score}
                          onChange={(e) => setManualEntry((prev) => ({ ...prev, phase2Score: e.target.value }))}
                          placeholder="9"
                          required
                        />
                      </div>
                    </div>

                    <Separator />

                    <Button type="submit" className="w-full">
                      Add Participant Data
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Toaster />
    </div>
  )
}
