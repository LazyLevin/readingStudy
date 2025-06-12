"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Progress } from "@/components/ui/progress"
import { Clock, BookOpen, Brain, Target } from "lucide-react"
import { collection, doc, setDoc, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Reading passages and questions
const passages = [
  {
    title: "The Science of Sleep",
    text: `Sleep is one of the most fundamental biological processes, yet it remains one of the most mysterious aspects of human existence. During sleep, our brains undergo remarkable transformations that are essential for memory consolidation, emotional regulation, and physical restoration.

The sleep cycle consists of several distinct stages, each serving unique functions. Non-REM sleep, which comprises about 75% of our total sleep time, is divided into three stages. Stage 1 is the lightest phase, where we transition from wakefulness to sleep. Stage 2 represents the majority of our sleep time, characterized by sleep spindles and K-complexes that help maintain sleep and process memories. Stage 3, also known as deep sleep or slow-wave sleep, is crucial for physical restoration and immune system strengthening.

REM (Rapid Eye Movement) sleep, accounting for the remaining 25% of sleep, is when most vivid dreaming occurs. During this stage, brain activity resembles that of wakefulness, and this phase is critical for emotional processing and creative problem-solving. The brain consolidates procedural memories and integrates new information with existing knowledge.

Research has shown that sleep deprivation can have severe consequences on cognitive function, emotional stability, and physical health. Chronic sleep loss is linked to increased risk of obesity, diabetes, cardiovascular disease, and mental health disorders. The recommended sleep duration for adults is 7-9 hours per night, though individual needs may vary.

Modern lifestyle factors such as artificial light exposure, irregular schedules, and electronic device usage can significantly disrupt natural sleep patterns. Understanding the importance of sleep hygiene and maintaining consistent sleep schedules can dramatically improve both sleep quality and overall well-being.`,
    questions: [
      {
        question: "What percentage of total sleep time does Non-REM sleep comprise?",
        options: ["50%", "65%", "75%", "85%"],
        correct: 2,
      },
      {
        question: "Which sleep stage is characterized by sleep spindles and K-complexes?",
        options: ["Stage 1", "Stage 2", "Stage 3", "REM sleep"],
        correct: 1,
      },
      {
        question: "What is Stage 3 sleep also known as?",
        options: ["Light sleep", "Dream sleep", "Deep sleep", "Transition sleep"],
        correct: 2,
      },
      {
        question: "During which sleep stage does most vivid dreaming occur?",
        options: ["Stage 1", "Stage 2", "Stage 3", "REM sleep"],
        correct: 3,
      },
      {
        question: "What percentage of sleep does REM sleep account for?",
        options: ["15%", "25%", "35%", "45%"],
        correct: 1,
      },
      {
        question: "Which of the following is NOT mentioned as a consequence of sleep deprivation?",
        options: ["Obesity", "Diabetes", "Hair loss", "Mental health disorders"],
        correct: 2,
      },
      {
        question: "What is the recommended sleep duration for adults?",
        options: ["5-7 hours", "6-8 hours", "7-9 hours", "8-10 hours"],
        correct: 2,
      },
      {
        question: "REM sleep is critical for which of the following?",
        options: ["Physical restoration", "Immune system strengthening", "Emotional processing", "All of the above"],
        correct: 2,
      },
      {
        question: "Which modern lifestyle factor is NOT mentioned as disrupting sleep patterns?",
        options: ["Artificial light exposure", "Irregular schedules", "Electronic device usage", "Exercise"],
        correct: 3,
      },
      {
        question: "What does the brain do during REM sleep regarding memories?",
        options: [
          "Deletes unnecessary memories",
          "Consolidates procedural memories",
          "Creates false memories",
          "Stops memory processing",
        ],
        correct: 1,
      },
    ],
  },
  {
    title: "The Future of Renewable Energy",
    text: `The global transition to renewable energy represents one of the most significant technological and economic shifts of the 21st century. As concerns about climate change intensify and fossil fuel reserves dwindle, nations worldwide are investing heavily in sustainable energy solutions that promise to reshape our energy landscape.

Solar power has emerged as a frontrunner in the renewable energy race. Photovoltaic technology has experienced dramatic cost reductions over the past decade, with solar panel prices dropping by more than 80% since 2010. This cost decline, combined with improved efficiency rates now exceeding 22% for commercial panels, has made solar energy competitive with traditional fossil fuels in many regions. Large-scale solar installations, known as solar farms, can now generate electricity at costs below $0.05 per kilowatt-hour in optimal locations.

Wind energy has similarly transformed from an experimental technology to a mainstream power source. Modern wind turbines can generate up to 15 megawatts of power each, with offshore installations offering even greater potential due to stronger and more consistent wind patterns. Countries like Denmark and Scotland have achieved remarkable milestones, with wind power occasionally supplying over 100% of their electricity needs during peak conditions.

Energy storage technology represents the critical missing piece in the renewable energy puzzle. Battery technology, particularly lithium-ion systems, has advanced rapidly, with costs falling by 90% over the past decade. Grid-scale battery installations can now store excess renewable energy during peak production periods and release it when demand is high or when renewable sources are unavailable.

The integration of artificial intelligence and smart grid technology is revolutionizing energy distribution and management. AI algorithms can predict energy demand patterns, optimize renewable energy production, and automatically balance supply and demand across vast electrical networks. This technological convergence is creating more resilient and efficient energy systems that can adapt to the variable nature of renewable sources.

Despite these advances, challenges remain. The intermittent nature of solar and wind power requires continued investment in storage solutions and grid infrastructure. Additionally, the transition must be managed carefully to ensure energy security and affordability for all consumers while supporting workers in traditional energy industries.`,
    questions: [
      {
        question: "By what percentage have solar panel prices dropped since 2010?",
        options: ["60%", "70%", "80%", "90%"],
        correct: 2,
      },
      {
        question: "What is the current efficiency rate for commercial solar panels?",
        options: ["Exceeding 18%", "Exceeding 20%", "Exceeding 22%", "Exceeding 25%"],
        correct: 2,
      },
      {
        question: "What is the electricity generation cost for solar farms in optimal locations?",
        options: ["Below $0.03/kWh", "Below $0.05/kWh", "Below $0.07/kWh", "Below $0.10/kWh"],
        correct: 1,
      },
      {
        question: "How much power can modern wind turbines generate?",
        options: ["Up to 10 MW", "Up to 12 MW", "Up to 15 MW", "Up to 20 MW"],
        correct: 2,
      },
      {
        question: "Which countries are mentioned as achieving over 100% wind power supply?",
        options: ["Germany and Netherlands", "Denmark and Scotland", "Norway and Sweden", "Ireland and Iceland"],
        correct: 1,
      },
      {
        question: "By what percentage have lithium-ion battery costs fallen over the past decade?",
        options: ["70%", "80%", "90%", "95%"],
        correct: 2,
      },
      {
        question: "What technology is described as the 'critical missing piece' in renewable energy?",
        options: ["Smart grids", "Energy storage", "AI algorithms", "Wind turbines"],
        correct: 1,
      },
      {
        question: "What can AI algorithms do in energy management?",
        options: [
          "Only predict demand",
          "Only optimize production",
          "Only balance supply and demand",
          "All of the above",
        ],
        correct: 3,
      },
      {
        question: "What is mentioned as a major challenge for renewable energy?",
        options: ["High costs", "Intermittent nature", "Lack of technology", "Government regulations"],
        correct: 1,
      },
      {
        question: "What must be considered during the energy transition?",
        options: [
          "Only environmental impact",
          "Only economic factors",
          "Energy security and affordability",
          "Only technological advancement",
        ],
        correct: 2,
      },
    ],
  },
]

// Speed reading techniques by group
const speedReadingTechniquesByGroup = {
  1: {
    name: "Skimming Technique",
    description:
      "Focus on reading the first and last sentences of each paragraph, along with headings and keywords. This allows you to grasp the main ideas quickly without getting bogged down in details. Practice identifying topic sentences and key concepts to improve your skimming efficiency.",
  },
  2: {
    name: "Pointer Technique",
    description:
      "Use your finger or a pen to guide your eyes along the text as you read. This helps maintain focus and prevents your eyes from wandering or re-reading the same lines. Move your pointer slightly faster than your comfortable reading pace to naturally increase your speed.",
  },
  3: {
    name: "Minimize Subvocalization",
    description:
      "Reduce the habit of 'hearing' words in your head as you read, which limits your reading speed to your speaking pace. Try humming quietly or occupying your inner voice with counting while reading. This technique takes practice but can significantly increase reading speed.",
  },
}

// Generate a unique session ID
const generateSessionId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

export default function ReadingStudyApp() {
  const [step, setStep] = useState(0)
  const [nickname, setNickname] = useState("")
  const [currentPhase, setCurrentPhase] = useState(0)
  const [isReading, setIsReading] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const [readingTimes, setReadingTimes] = useState<number[]>([])
  const [currentAnswers, setCurrentAnswers] = useState<string[]>([])
  const [scores, setScores] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [testGroup, setTestGroup] = useState<number>(0)
  const [sessionId, setSessionId] = useState<string>("")

  // Assign test group on component mount
  useEffect(() => {
    // Randomly assign to group 1, 2, or 3
    const group = Math.floor(Math.random() * 3) + 1
    setTestGroup(group)
    setSessionId(generateSessionId())
  }, [])

  const steps = [
    "Enter Nickname",
    "Instructions",
    "Reading Phase 1",
    "Questions Phase 1",
    "Speed Reading Tips",
    "Reading Phase 2",
    "Questions Phase 2",
    "Complete",
  ]

  const saveResults = async (phase: number, readingTime: number, score: number) => {
    try {
      const timestamp = new Date()
      const mistakeRatio = (passages[phase].questions.length - score) / passages[phase].questions.length
      const technique = phase === 1 ? speedReadingTechniquesByGroup[testGroup].name : "Normal Reading"

      // Create a user document if it's the first phase
      if (phase === 0) {
        // Create a document in the users collection
        await setDoc(doc(db, "users", sessionId), {
          nickname,
          testGroup,
          technique: speedReadingTechniquesByGroup[testGroup].name,
          createdAt: timestamp,
        })
      }

      // Add the phase result to the user's results subcollection
      await setDoc(doc(db, "users", sessionId, "results", `phase${phase + 1}`), {
        phase: phase + 1,
        readingTime,
        score,
        totalQuestions: passages[phase].questions.length,
        mistakeRatio,
        technique,
        timestamp,
      })

      // Also add to the technique-specific collection for easier querying
      const techniqueCollectionName = `technique_${testGroup}`
      await addDoc(collection(db, techniqueCollectionName), {
        sessionId,
        nickname,
        phase: phase + 1,
        readingTime,
        score,
        totalQuestions: passages[phase].questions.length,
        mistakeRatio,
        timestamp,
      })

      // Add to the combined results collection for backward compatibility
      await addDoc(collection(db, "reading_study_results"), {
        sessionId,
        nickname,
        phase: phase + 1,
        readingTime,
        score,
        totalQuestions: passages[phase].questions.length,
        timestamp,
        testGroup,
        mistakeRatio,
        technique,
      })
    } catch (error) {
      console.error("Error saving results:", error)
    }
  }

  const startReading = () => {
    setIsReading(true)
    setStartTime(Date.now())
  }

  const stopReading = () => {
    const endTime = Date.now()
    const readingTime = (endTime - startTime) / 1000
    setReadingTimes([...readingTimes, readingTime])
    setIsReading(false)
    setStep(step + 1)
  }

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    const newAnswers = [...currentAnswers]
    newAnswers[questionIndex] = answer
    setCurrentAnswers(newAnswers)
  }

  const submitAnswers = async () => {
    setIsSubmitting(true)

    try {
      const correctAnswers = passages[currentPhase].questions.filter(
        (q, index) => Number.parseInt(currentAnswers[index]) === q.correct,
      ).length

      const newScores = [...scores, correctAnswers]
      setScores(newScores)

      await saveResults(currentPhase, readingTimes[currentPhase], correctAnswers)

      setCurrentAnswers([])

      if (currentPhase === 0) {
        setStep(step + 1) // Go to speed reading tips
      } else {
        setStep(step + 1) // Go to completion
      }
    } catch (error) {
      console.error("Error submitting answers:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const startNextPhase = () => {
    setCurrentPhase(1)
    setStep(step + 1)
  }

  const renderNicknameEntry = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <BookOpen className="h-6 w-6" />
          Reading Study
        </CardTitle>
        <CardDescription>Welcome to our reading comprehension study</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nickname">Enter a nickname (can be anonymous)</Label>
          <Input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g., Reader123"
          />
        </div>
        <Button onClick={() => setStep(1)} className="w-full" disabled={!nickname.trim()}>
          Continue
        </Button>
      </CardContent>
    </Card>
  )

  const renderInstructions = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Target className="h-6 w-6" />
          Study Instructions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center space-y-4">
          <p className="text-lg">You'll now read two texts and answer questions. Please read normally.</p>
          <p className="text-muted-foreground">
            After reading, you'll answer some multiple-choice questions about the content. No need to rush. The app will
            track the time you spend reading.
          </p>
        </div>
        <Button onClick={() => setStep(2)} className="w-full" size="lg">
          Start Timer
        </Button>
      </CardContent>
    </Card>
  )

  const renderReading = () => (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {passages[currentPhase].title}
          </CardTitle>
          {isReading && (
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              Reading...
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isReading ? (
          <div className="text-center">
            <Button onClick={startReading} size="lg">
              Start Timer
            </Button>
          </div>
        ) : (
          <>
            <div className="prose max-w-none text-justify leading-relaxed">
              {passages[currentPhase].text.split("\n\n").map((paragraph, index) => (
                <p key={index} className="mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
            <div className="text-center pt-6 border-t">
              <Button onClick={stopReading} size="lg" variant="destructive">
                Stop Timer
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )

  const renderQuestions = () => (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Comprehension Questions</CardTitle>
        <CardDescription>Answer the following questions about the text you just read</CardDescription>
        <Progress value={(currentAnswers.filter((a) => a).length / passages[currentPhase].questions.length) * 100} />
      </CardHeader>
      <CardContent className="space-y-6">
        {passages[currentPhase].questions.map((q, index) => (
          <div key={index} className="space-y-3">
            <h3 className="font-medium">
              {index + 1}. {q.question}
            </h3>
            <RadioGroup value={currentAnswers[index] || ""} onValueChange={(value) => handleAnswerChange(index, value)}>
              {q.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center space-x-2">
                  <RadioGroupItem value={optionIndex.toString()} id={`q${index}-${optionIndex}`} />
                  <Label htmlFor={`q${index}-${optionIndex}`} className="cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
        <Button
          onClick={submitAnswers}
          className="w-full"
          size="lg"
          disabled={currentAnswers.filter((a) => a).length !== passages[currentPhase].questions.length || isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Answers"}
        </Button>
      </CardContent>
    </Card>
  )

  const renderSpeedReadingTips = () => {
    // Get the technique for this user's test group
    const technique = speedReadingTechniquesByGroup[testGroup]

    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Brain className="h-6 w-6" />
            Speed Reading Technique
          </CardTitle>
          <CardDescription>Learn this technique to improve your reading speed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{technique.name}</h3>
            <p className="text-muted-foreground">{technique.description}</p>
          </div>
          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Now let's try the second reading passage. Apply this technique to see if it improves your reading speed!
            </p>
            <Button onClick={startNextPhase} size="lg">
              Continue to Phase 2
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderCompletion = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Study Complete!</CardTitle>
        <CardDescription>Thank you for participating in our reading study</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <h3 className="font-semibold">Phase 1</h3>
            <p className="text-2xl font-bold text-blue-600">{readingTimes[0]?.toFixed(1)}s</p>
            <p className="text-sm text-muted-foreground">Reading Time</p>
            <p className="text-lg font-semibold">{scores[0]}/10</p>
            <p className="text-sm text-muted-foreground">Correct Answers</p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <h3 className="font-semibold">Phase 2</h3>
            <p className="text-2xl font-bold text-green-600">{readingTimes[1]?.toFixed(1)}s</p>
            <p className="text-sm text-muted-foreground">Reading Time</p>
            <p className="text-lg font-semibold">{scores[1]}/10</p>
            <p className="text-sm text-muted-foreground">Correct Answers</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground">Your results have been saved. Thank you for your participation!</p>
          
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              {steps.map((stepName, index) => (
                <div key={index} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      index <= step ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 ${index < step ? "bg-blue-600" : "bg-gray-200"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
          <h1 className="text-center text-sm font-medium text-muted-foreground">{steps[step]}</h1>
        </div>

        <div className="transition-all duration-500 ease-in-out">
          {step === 0 && renderNicknameEntry()}
          {step === 1 && renderInstructions()}
          {(step === 2 || step === 5) && renderReading()}
          {(step === 3 || step === 6) && renderQuestions()}
          {step === 4 && renderSpeedReadingTips()}
          {step === 7 && renderCompletion()}
        </div>
      </div>
    </div>
  )
}
