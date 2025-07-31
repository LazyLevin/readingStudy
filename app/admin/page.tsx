"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from "firebase/auth"
import { collection, getDocs } from "firebase/firestore"
import { auth, db, isFirebaseAvailable, mockData } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { AlertCircle, Download, LogOut, BarChart3, Users, TrendingUp } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js"
import { Scatter, Bar, Pie } from "react-chartjs-2"

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement)

interface Participant {
  id?: string
  name: string
  age: number
  technique: "speed_reading" | "normal_reading"
  preReadingTime: number
  postReadingTime: number
  preErrorRate: number
  postErrorRate: number
  timestamp: Date
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginData, setLoginData] = useState({ email: "", password: "" })
  const [participants, setParticipants] = useState<Participant[]>([])
  const [firebaseStatus, setFirebaseStatus] = useState<"checking" | "available" | "unavailable">("checking")

  useEffect(() => {
    checkFirebaseAndSetupAuth()
  }, [])

  useEffect(() => {
    if (user) {
      loadParticipants()
    }
  }, [user])

  const checkFirebaseAndSetupAuth = async () => {
    try {
      if (isFirebaseAvailable()) {
        setFirebaseStatus("available")
        const unsubscribe = onAuthStateChanged(auth!, (user) => {
          setUser(user)
          setLoading(false)
        })
        return () => unsubscribe()
      } else {
        setFirebaseStatus("unavailable")
        setLoading(false)
        // In demo mode, simulate being logged in
        setUser({ email: "demo@example.com" } as User)
        setParticipants(mockData.participants)
      }
    } catch (error) {
      console.error("Error setting up auth:", error)
      setFirebaseStatus("unavailable")
      setLoading(false)
      setUser({ email: "demo@example.com" } as User)
      setParticipants(mockData.participants)
    }
  }

  const loadParticipants = async () => {
    if (!isFirebaseAvailable()) {
      setParticipants(mockData.participants)
      return
    }

    try {
      const querySnapshot = await getDocs(collection(db!, "participants"))
      const participantData: Participant[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        participantData.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
        } as Participant)
      })
      setParticipants(participantData)
    } catch (error) {
      console.error("Error loading participants:", error)
      setParticipants(mockData.participants)
      toast({
        title: "Error",
        description: "Failed to load data. Using sample data.",
        variant: "destructive",
      })
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isFirebaseAvailable()) {
      toast({
        title: "Demo Mode",
        description: "Logged in with demo credentials",
      })
      setUser({ email: "demo@example.com" } as User)
      return
    }

    try {
      await signInWithEmailAndPassword(auth!, loginData.email, loginData.password)
      toast({
        title: "Success",
        description: "Logged in successfully",
      })
    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "Error",
        description: "Invalid credentials",
        variant: "destructive",
      })
    }
  }

  const handleLogout = async () => {
    if (isFirebaseAvailable()) {
      try {
        await signOut(auth!)
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

  const exportToPNG = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId)
    if (element) {
      const canvas = await html2canvas(element)
      const link = document.createElement("a")
      link.download = `${filename}.png`
      link.href = canvas.toDataURL()
      link.click()
    }
  }

  const exportToPDF = async () => {
    const pdf = new jsPDF("p", "mm", "a4")
    const elements = ["overview-charts", "technique-comparison", "individual-progress"]

    for (let i = 0; i < elements.length; i++) {
      const element = document.getElementById(elements[i])
      if (element) {
        const canvas = await html2canvas(element)
        const imgData = canvas.toDataURL("image/png")

        if (i > 0) pdf.addPage()

        const imgWidth = 190
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight)
      }
    }

    pdf.save("reading-study-report.pdf")
  }

  // Chart data preparation
  const scatterData = {
    datasets: [
      {
        label: "Speed Reading",
        data: participants
          .filter((p) => p.technique === "speed_reading")
          .map((p) => ({
            x: p.preReadingTime,
            y: p.preErrorRate,
          })),
        backgroundColor: "rgba(59, 130, 246, 0.6)",
        borderColor: "rgba(59, 130, 246, 1)",
        pointRadius: 6,
      },
      {
        label: "Normal Reading",
        data: participants
          .filter((p) => p.technique === "normal_reading")
          .map((p) => ({
            x: p.preReadingTime,
            y: p.preErrorRate,
          })),
        backgroundColor: "rgba(239, 68, 68, 0.6)",
        borderColor: "rgba(239, 68, 68, 1)",
        pointRadius: 6,
      },
    ],
  }

  const scatterOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Reading Time vs Error Rate (Pre-Training)",
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: "Reading Time (seconds)",
        },
        grid: {
          display: true,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: "Error Rate (%)",
        },
        grid: {
          display: true,
        },
      },
    },
  }

  const techniqueComparison = {
    labels: ["Speed Reading", "Normal Reading"],
    datasets: [
      {
        label: "Average Time Improvement (%)",
        data: [
          participants
            .filter((p) => p.technique === "speed_reading")
            .reduce((acc, p) => acc + ((p.preReadingTime - p.postReadingTime) / p.preReadingTime) * 100, 0) /
            Math.max(participants.filter((p) => p.technique === "speed_reading").length, 1),
          participants
            .filter((p) => p.technique === "normal_reading")
            .reduce((acc, p) => acc + ((p.preReadingTime - p.postReadingTime) / p.preReadingTime) * 100, 0) /
            Math.max(participants.filter((p) => p.technique === "normal_reading").length, 1),
        ],
        backgroundColor: ["rgba(59, 130, 246, 0.6)", "rgba(239, 68, 68, 0.6)"],
        borderColor: ["rgba(59, 130, 246, 1)", "rgba(239, 68, 68, 1)"],
        borderWidth: 2,
      },
    ],
  }

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Technique Comparison - Average Improvement",
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: "Reading Technique",
        },
        grid: {
          display: true,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: "Improvement (%)",
        },
        grid: {
          display: true,
        },
        beginAtZero: true,
      },
    },
  }

  const progressData = {
    datasets: [
      {
        label: "Individual Progress",
        data: participants.map((p) => ({
          x: ((p.preReadingTime - p.postReadingTime) / p.preReadingTime) * 100,
          y: p.preErrorRate - p.postErrorRate,
        })),
        backgroundColor: participants.map((p) =>
          p.technique === "speed_reading" ? "rgba(59, 130, 246, 0.6)" : "rgba(239, 68, 68, 0.6)",
        ),
        borderColor: participants.map((p) =>
          p.technique === "speed_reading" ? "rgba(59, 130, 246, 1)" : "rgba(239, 68, 68, 1)",
        ),
        pointRadius: 8,
      },
    ],
  }

  const progressOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "Individual Progress: Time Improvement vs Accuracy Improvement",
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: "Time Improvement (%)",
        },
        grid: {
          display: true,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: "Error Rate Reduction (%)",
        },
        grid: {
          display: true,
        },
      },
    },
  }

  const pieData = {
    labels: ["Speed Reading", "Normal Reading"],
    datasets: [
      {
        data: [
          participants.filter((p) => p.technique === "speed_reading").length,
          participants.filter((p) => p.technique === "normal_reading").length,
        ],
        backgroundColor: ["rgba(59, 130, 246, 0.6)", "rgba(239, 68, 68, 0.6)"],
        borderColor: ["rgba(59, 130, 246, 1)", "rgba(239, 68, 68, 1)"],
        borderWidth: 2,
      },
    ],
  }

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Participant Distribution by Technique",
      },
    },
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>
              {firebaseStatus === "unavailable"
                ? "Demo mode - use any credentials"
                : "Enter your credentials to access the dashboard"}
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
                  placeholder="admin@example.com"
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
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Reading Study Data Analysis</p>
            {firebaseStatus === "unavailable" && (
              <Badge variant="secondary" className="mt-2">
                Demo Mode
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={exportToPDF} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{participants.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Speed Reading</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {participants.filter((p) => p.technique === "speed_reading").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Normal Reading</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {participants.filter((p) => p.technique === "normal_reading").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Improvement</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {participants.length > 0
                  ? Math.round(
                      participants.reduce(
                        (acc, p) => acc + ((p.preReadingTime - p.postReadingTime) / p.preReadingTime) * 100,
                        0,
                      ) / participants.length,
                    )
                  : 0}
                %
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="comparison">Technique Comparison</TabsTrigger>
            <TabsTrigger value="data">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div id="overview-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Reading Performance Analysis</CardTitle>
                    <CardDescription>Pre-training reading time vs error rate</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToPNG("scatter-chart", "reading-performance")}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div id="scatter-chart" className="h-80">
                    <Scatter data={scatterData} options={scatterOptions} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Participant Distribution</CardTitle>
                    <CardDescription>Distribution by reading technique</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToPNG("pie-chart", "participant-distribution")}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div id="pie-chart" className="h-80">
                    <Pie data={pieData} options={pieOptions} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <div id="technique-comparison" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Technique Effectiveness</CardTitle>
                    <CardDescription>Average improvement by technique</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => exportToPNG("bar-chart", "technique-comparison")}>
                    <Download className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div id="bar-chart" className="h-80">
                    <Bar data={techniqueComparison} options={barOptions} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Individual Progress</CardTitle>
                    <CardDescription>Time vs accuracy improvement correlation</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToPNG("progress-chart", "individual-progress")}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div id="progress-chart" className="h-80">
                    <Scatter data={progressData} options={progressOptions} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle>Raw Data</CardTitle>
                <CardDescription>Complete participant dataset</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Technique</TableHead>
                        <TableHead>Pre Time (s)</TableHead>
                        <TableHead>Post Time (s)</TableHead>
                        <TableHead>Pre Error (%)</TableHead>
                        <TableHead>Post Error (%)</TableHead>
                        <TableHead>Time Improvement</TableHead>
                        <TableHead>Error Reduction</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants.map((participant, index) => (
                        <TableRow key={participant.id || index}>
                          <TableCell className="font-medium">{participant.name}</TableCell>
                          <TableCell>{participant.age}</TableCell>
                          <TableCell>
                            <Badge variant={participant.technique === "speed_reading" ? "default" : "secondary"}>
                              {participant.technique === "speed_reading" ? "Speed" : "Normal"}
                            </Badge>
                          </TableCell>
                          <TableCell>{participant.preReadingTime}</TableCell>
                          <TableCell>{participant.postReadingTime}</TableCell>
                          <TableCell>{participant.preErrorRate}%</TableCell>
                          <TableCell>{participant.postErrorRate}%</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {Math.round(
                                ((participant.preReadingTime - participant.postReadingTime) /
                                  participant.preReadingTime) *
                                  100,
                              )}
                              %
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{participant.preErrorRate - participant.postErrorRate}%</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Toaster />
    </div>
  )
}
