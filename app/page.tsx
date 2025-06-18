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
    title: "Die Geschichte von Asoka",
    text: `Asoka war ein indischer König, der vor mehr als 2.000 Jahren lebte. Er ist auch heute noch berühmt, 
    weil er versuchte, den Lehren Buddhas zu folgen. Er wollte ein guter König sein. Er 
    wollte, dass sein Volk aufhörte, sich gegenseitig zu bekämpfen und zu töten, und in Frieden und 
    Glück lebte. Allerdings hatte Asoka nicht immer diese Ziele verfolgt.
    Als Asoka König wurde, dachte er nicht an die Lehren Buddhas. Er wollte, dass sein 
    Land größer und stärker wurde, also begann er, gegen andere Länder zu kämpfen. Asoka war ein 
    guter Kämpfer. Seine Armee war groß und seine Soldaten waren ebenfalls gute Kämpfer. Er kämpfte und 
    gewann viele Kriege, und langsam wurde sein Land größer. Natürlich starben viele Menschen in 
    diesen Kriegen, aber Asoka dachte nicht darüber nach.
    Acht Jahre nachdem Asoka König geworden war, schickte er seine Armee nach Kalinga, einem anderen 
    Land in Indien. Asokas Armee tötete über 100.000 Menschen in Kalinga. Als Asoka davon erfuhr, 
    tat es ihm leid und er erinnerte sich an die Lehre Buddhas. Buddhisten dürfen 
    nicht töten. Sie dürfen nicht kämpfen. Sie müssen friedlich leben.
    Nach dem Krieg in Kalinga, in dem so viele Menschen gestorben waren, veränderte sich Asoka. Er wurde ein 
    anderer Mensch und begann, über sein Volk nachzudenken und darüber, wie er ihr Leben verbessern könnte. 
    Er baute Straßen und pflanzte entlang dieser Straßen Bäume. Die Menschen konnten unter den Bäumen Halt machen, um sich auszuruhen, wenn es heiß war, und sie konnten die Früchte der Bäume essen. Asoka baute 
    Häuser für Reisende, in denen die Menschen sich ausruhen und schlafen konnten, ohne dafür zu bezahlen. Er interessierte sich auch 
    für Medizin. Er baute Pflanzen an, um Medikamente herzustellen, die er seinem Volk gab.
    Er gab auch Tieren Medikamente. Er wollte nicht, dass Menschen oder Tiere krank waren. Nach 
    dem Krieg in Kalinga wurde Asoka ein guter Buddhist und er wollte, dass sein Volk auch gute 
    Buddhisten werden. Er forderte sein Volk auf, die Lehren Buddhas zu studieren. Buddha lehrte, dass 
    Menschen weder Menschen noch Tiere töten sollten, also forderte er sein Volk auf, Gemüse zu essen und 
    kein Fleisch.
    Asoka schuf neue Gesetze für sein Volk. Er schrieb die Gesetze auf Stein und auf Eisenstücke. 
    Er stellte diese Steine und Eisenstücke an verschiedenen Orten in seinem Land auf, damit die Menschen, wenn sie sie lesen, die Gesetze des Landes kennen und versuchen, sie zu befolgen. 
     
     Heute, nach 2.000 Jahren, können wir noch immer viele dieser Steine und Eisenstücke sehen und Asokas Gesetze lesen, sodass wir viel über ihn wissen. Wir wissen, dass er ein großer indischer König war, der  
     den Lehren Buddhas folgte. Wir wissen, dass auch sein Volk den Lehren Buddhas folgte. 
     Wir wissen, dass sein Land sehr groß war, dass es keine Kriege gab und die Menschen 
     in Frieden lebten und glücklich waren. Seine Schriften finden wir im Norden Indiens und auch im 
     im Süden Indiens.
     Asoka war fast 40 Jahre lang König, aber nach seinem Tod blieb das Land nicht friedlich. 
     Der neue König war nicht so gut wie Asoka, und das große Land Asokas zerfiel in mehrere kleine Länder, die oft gegeneinander kämpften. Die Menschen begannen wieder, sich gegenseitig zu töten, und sie vergaßen die Lehren Buddhas.
     `,
    questions: [
      {
        question: "Asoka ist berühmt, weil",
        options: [
          "er in Indien lebte.",
          "er den Lehren Buddhas folgte.",
          "er gut im Kämpfen war.",
          "sein Land groß war.",
        ],
        correct: 1,
      },
      {
        question: "Als Asoka König wurde,",
        options: [
          "folgte er den Lehren Buddhas.",
          "mochte er das Kämpfen nicht.",
          "begann er einen Krieg.",
          "wollte er friedlich leben.",
        ],
        correct: 2,
      },
      {
        question: "In Kalinga hat Asokas Armee",
        options: [
          "den Krieg verloren.",
          "viele Menschen getötet.",
          "nicht kämpfen wollen.",
          "sind Buddhisten geworden.",
        ],
        correct: 1,
      },
      {
        question: "Asoka wurde ein guter Buddhist, als",
        options: [
          "er König wurde.",
          "er über all das Töten nachdachte.",
          "er begann, gegen andere Länder zu kämpfen.",
          "er wollte, dass sein Land größer wird.",
        ],
        correct: 1,
      },
      {
        question: "Als Asoka aufhörte, in Kalinga zu kämpfen,",
        options: [
          "war er nicht glücklich darüber, friedlich zu sein.",
          "wollte er einen neuen Krieg beginnen.",
          "vergaß er Buddha.",
          "dachte er an sein Volk.",
        ],
        correct: 3,
      },
      {
        question: "Asoka baute Pflanzen für Medizin an, weil",
        options: [
          "er seinem Volk helfen wollte.",
          "er sehr krank war.",
          "er die Medizin verkaufen wollte.",
          "er nach dem Krieg kein König mehr war.",
        ],
        correct: 0,
      },
      {
        question: "Asoka sagte seinem Volk, es solle kein Fleisch essen, weil",
        options: [
          "Menschen krank werden, wenn sie Fleisch essen.",
          "Fleisch sehr teuer war.",
          "er das Fleisch den Tieren gab.",
          "ein Buddhist nicht töten darf.",
        ],
        correct: 3,
      },
      {
        question: "Jeder kannte Asokas Gesetze, weil",
        options: [
          "sie überall in seinem Land ausgehängt waren.",
          "sie in den Schulen gelehrt wurden.",
          "sie von Gott stammten.",
          "sie neu waren.",
        ],
        correct: 0,
      },
      {
        question: "Wir wissen viel über Asoka, weil",
        options: [
          "Buddha über ihn lehrte.",
          "er viele Bücher geschrieben hat.",
          "wir seine Gesetze lesen können.",
          "die Menschen ihn nicht mochten.",
        ],
        correct: 2,
      },
      {
        question: "Nach Asokas Tod",
        options: [
          "wurde sein Land größer.",
          "waren die Menschen glücklich.",
          "gab es viele Kriege.",
          "folgten die Menschen weiterhin den Lehren Buddhas.",
        ],
        correct: 2,
      },
    ],
  },
  {
    title: "Die Geschichte von Rabindranath Tagore",
    text: `Rabindranath Tagore war einer der berühmtesten indischen Schriftsteller des 20. Jahrhunderts. Er 
verfasste Tausende von Gedichten, Geschichten und Liedern sowohl in seiner Muttersprache Bengali als auch in 
Englisch. Seine Werke sind bis heute weit verbreitet und seine Bücher sind in vielen anderen 
Sprachen. Tagore wurde jedoch erst im Alter von 51 Jahren weltweit für seine Werke bekannt, als er 
begann, seine Gedichte auf Englisch zu schreiben.
Tagore wurde 1861 in Kalkutta, Indien, in eine wohlhabende Familie geboren. Schon in jungen Jahren 
interessierte er sich für Lesen, Schreiben und Musik. Sein erstes Gedichtband schrieb er im Alter von nur 17 Jahren. Er beobachtete gerne die Dinge um ihn herum: die  
Gedichte, als er erst 17 Jahre alt war. Er beobachtete gerne die Dinge um ihn herum: die 
Bäume, die Vögel, den Himmel, die Blumen und das Gras. All diese Dinge waren für ihn wunderschön. 
Er interessierte sich für Gott und dafür, wie Menschen ihr Leben bestmöglich leben können.
Als er alt genug war, um zur Schule zu gehen, schickte ihn sein Vater auf eine Schule in seiner Stadt, aber 
es gefiel ihm dort nicht. Er mochte weder den Unterricht noch die Art und Weise, wie seine Lehrer unterrichteten, 
und so verließ er die Schule nach kurzer Zeit wieder. Sein Vater suchte ihm daraufhin einen Lehrer, und 
zusammen lernten sie zu Hause. Später schickte sein Vater ihn nach England, um Jura zu studieren. 
Tagore wollte jedoch kein Jura studieren und kehrte vor Abschluss seines Studiums nach Indien zurück. 
1901 gründete Tagore eine Schule außerhalb von Kalkutta. Seine Schule unterschied sich von anderen 
Schulen, weil die Lehrer dort auf eine andere Art und Weise unterrichteten. Die Schüler mussten 
Fragen stellen, und die Lehrer beantworteten sie. Auf diese Weise brachte Tagore den Schülern 
das Denken bei. Sowohl die Schüler als auch die Lehrer mochten diese Art des Unterrichts. Einige von 
Tagores Schüler waren reich, andere waren arm, aber alle Schüler mussten zusammenleben. 
Sie lebten zusammen, lernten zusammen und spielten zusammen. In Tagores Schule war alles kostenlos. 
Die Schüler mussten weder für den Unterricht noch für das Essen bezahlen, also musste Tagore Geld für seine Schule auftreiben. Er verwendete sein eigenes Geld aus seiner schriftstellerischen Tätigkeit
und etwas Geld von seinem Vater. Neben seiner Arbeit an seiner Schule schrieb er weiter und 
wurde zu einem großen Denker und einer führenden Persönlichkeit in seinem Land. Ein Großteil seines Denkens basierte 
auf den alten indischen Ideen von vor Tausenden von Jahren.
Tagore reiste nach Europa und in die Vereinigten Staaten von Amerika, wo er an 
Universitäten lehrte. Er sprach über Indien und die indische Bevölkerung, über seine Schriften und seine Ideen und 
er sprach auch über seine Schule. Viele der Menschen, die er traf, interessierten sich für seine Schule 
und schickten ihm Geld, damit die Schule weiterbestehen konnte.
Tagore schrieb weiter und gewann 1913 den Nobelpreis. Er erhielt diesen Preis, 
weil er in diesem Jahr als der beste Schriftsteller der Welt angesehen wurde. 1921 wurde Tagores
wurde seine Schule zur Universität, und Studenten aus aller Welt kamen, um dort zu studieren. Im 
Alter von 68 Jahren wurde er Maler.
Tagore verbrachte den größten Teil seines Lebens damit, die Ideen des Ostens und des Westens zu vereinen. Er starb 1941 
im Alter von 80.`,
    questions: [
      {
        question: "Tagore wurde geboren in",
        options: ["den Vereinigten Staaten von Amerika.", "Indien.", "Europa.", "England."],
        correct: 1,
      },
      {
        question: "Tagore schrieb Bücher und Gedichte in",
        options: ["Englisch und Bengali.", "Englisch.", "vielen Sprachen.", "Bengali."],
        correct: 0,
      },
      {
        question: "Tagore mochte die Schule nicht, weil",
        options: [
          "er dort keine Freunde hatte.",
          "der Unterricht zu schwierig war.",
          "ihm die Art des Unterrichts nicht gefiel.",
          "er kein Interesse am Lernen hatte.",
        ],
        correct: 2,
      },
      {
        question: "Tagore beendete sein Studium in England nicht, weil",
        options: [
          "er nicht klug genug war.",
          "er bei seinen Eltern sein wollte.",
          "er nicht gut in Englisch war.",
          "er seinen Unterricht nicht mochte.",
        ],
        correct: 3,
      },
      {
        question: "Als Tagore aus England zurückkam,",
        options: [
          "gründete er eine Schule.",
          "lernte er zu Hause mit einem Lehrer.",
          "begann er zu malen.",
          "schrieb er sein erstes Gedichtband.",
        ],
        correct: 0,
      },
      {
        question: "Tagores Unterrichtsmethode war anders, weil",
        options: [
          "die Schüler nur Bücher lasen.",
          "es keinen Lehrer gab.",
          "die Schüler beim Lernen nicht nachdenken mussten.",
          "der Lehrer nur die Fragen der Schüler beantwortete.",
        ],
        correct: 3,
      },
      {
        question: "Die Schüler in Tagores Schule",
        options: [
          "mussten viel Geld bezahlen.",
          "lebten in der Schule.",
          "mussten nur für ihr Essen bezahlen.",
          "reisten in viele verschiedene Länder.",
        ],
        correct: 1,
      },
      {
        question: "Tagore ging nach Europa, weil",
        options: [
          "er sehr krank war.",
          "er gebeten wurde, an Universitäten zu lehren.",
          "er Indien nicht mochte.",
          "in Indien Krieg herrschte.",
        ],
        correct: 1,
      },
      {
        question: "Tagore gewann den Nobelpreis, weil",
        options: [
          "er ein guter Maler war.",
          "er ein berühmter Mann war.",
          "er ein guter Schriftsteller war.",
          "er ein guter Lehrer war.",
        ],
        correct: 2,
      },
      {
        question: "Tagore verkaufte seine Schriften, um",
        options: ["reich zu werden.", "für seine Schule.", "berühmt zu werden.", "seinen Eltern zu helfen."],
        correct: 1,
      },
    ],
  },
]

// Speed reading techniques by group
const speedReadingTechniquesByGroup = {
  1: {
    name: "Skimming-Technik",
    description:
      "Konzentrieren Sie sich auf das Lesen der ersten und letzten Sätze jedes Absatzes sowie auf Überschriften und Schlüsselwörter. Dies ermöglicht es Ihnen, die Hauptideen schnell zu erfassen, ohne sich in Details zu verlieren. Üben Sie, Themensätze und Schlüsselkonzepte zu identifizieren, um Ihre Skimming-Effizienz zu verbessern.",
  },
  2: {
    name: "Zeiger-Technik",
    description:
      "Verwenden Sie Ihren Finger oder einen Stift, um Ihre Augen beim Lesen entlang des Textes zu führen. Dies hilft, den Fokus zu bewahren und verhindert, dass Ihre Augen abschweifen oder dieselben Zeilen erneut lesen. Bewegen Sie Ihren Zeiger etwas schneller als Ihr angenehmes Lesetempo, um Ihre Geschwindigkeit auf natürliche Weise zu erhöhen.",
  },
  3: {
    name: "Subvokalisierung minimieren",
    description:
      "Reduzieren Sie die Angewohnheit, Wörter in Ihrem Kopf zu 'hören', während Sie lesen, was Ihre Lesegeschwindigkeit auf Ihr Sprechtempo begrenzt. Versuchen Sie, leise zu summen oder Ihre innere Stimme mit Zählen zu beschäftigen, während Sie lesen. Diese Technik erfordert Übung, kann aber die Lesegeschwindigkeit erheblich steigern.",
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
  const [isLoaded, setIsLoaded] = useState(false)

  // Assign test group on component mount
  useEffect(() => {
    // Randomly assign to group 1, 2, or 3
    const group = Math.floor(Math.random() * 3) + 1
    setTestGroup(group)
    setSessionId(generateSessionId())
    setIsLoaded(true)
  }, [])

  const steps = [
    "Spitzname eingeben",
    "Anleitung",
    "Lesephase 1",
    "Fragen Phase 1",
    "Schnelllesetipps",
    "Lesephase 2",
    "Fragen Phase 2",
    "Abschluss",
  ]

  const saveResults = async (phase: number, readingTime: number, score: number) => {
    try {
      const timestamp = new Date()
      const mistakeRatio = (passages[phase].questions.length - score) / passages[phase].questions.length
      const technique = phase === 1 ? speedReadingTechniquesByGroup[testGroup].name : "Normales Lesen"

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
    <Card className="w-full max-w-md mx-auto shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <BookOpen className="h-7 w-7" />
          Lesestudie
        </CardTitle>
        
        
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="space-y-3">
          <Label htmlFor="nickname" className="text-base">
            Bitte geben Sie einen Namen ein (kann anonym sein)
          </Label>
          <Input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="z.B. Leser123"
            className="h-12 text-base border-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Button
          onClick={() => setStep(1)}
          className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
          disabled={!nickname.trim()}
        >
          Weiter
        </Button>
      </CardContent>
    </Card>
  )

  const renderInstructions = () => (
    <Card className="w-full max-w-2xl mx-auto shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <Target className="h-7 w-7" />
          Studienanleitung
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="text-center space-y-4 py-4">
          <p className="text-xl">Bitte lesen Sie den Text und beantworten Sie die danach gestellten Fragen.</p>
          <p className="text-gray-600">
             Die App wird die Zeit messen, die Sie zum Lesen benötigen. Beantworten Sie bitte nach dem Lesen einige Multiple-Choice-Fragen zum Inhalt.
          </p>
        </div>
        <Button onClick={() => setStep(2)} className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700" size="lg">
          Timer starten
        </Button>
      </CardContent>
    </Card>
  )

  const renderReading = () => (
    <Card className="w-full max-w-4xl mx-auto shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Clock className="h-6 w-6" />
            {passages[currentPhase].title}
          </CardTitle>
          {isReading && (
            <div className="flex items-center gap-2 text-green-300 bg-green-800/30 py-1 px-3 rounded-full">
              <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
              Lesen...
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {!isReading ? (
          <div className="text-center py-12">
            <Button onClick={startReading} size="lg" className="h-12 text-base bg-blue-600 hover:bg-blue-700">
              Timer starten
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
              <Button onClick={stopReading} size="lg" variant="destructive" className="h-12 text-base">
                Timer stoppen
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )

  const renderQuestions = () => (
    <Card className="w-full max-w-3xl mx-auto shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
        <CardTitle className="text-2xl">Verständnisfragen</CardTitle>
        <CardDescription className="text-blue-100">
          Beantworten Sie die folgenden Fragen zum gelesenen Text
        </CardDescription>
        <Progress
          value={(currentAnswers.filter((a) => a).length / passages[currentPhase].questions.length) * 100}
          className="h-2 mt-4"
        />
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {passages[currentPhase].questions.map((q, index) => (
          <div key={index} className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-lg">
              {index + 1}. {q.question}
            </h3>
            <RadioGroup value={currentAnswers[index] || ""} onValueChange={(value) => handleAnswerChange(index, value)}>
              {q.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center space-x-2 py-2">
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
          className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
          size="lg"
          disabled={currentAnswers.filter((a) => a).length !== passages[currentPhase].questions.length || isSubmitting}
        >
          {isSubmitting ? "Wird übermittelt..." : "Antworten abschicken"}
        </Button>
      </CardContent>
    </Card>
  )

  const renderSpeedReadingTips = () => {
    // Get the technique for this user's test group
    const technique = speedReadingTechniquesByGroup[testGroup]

    return (
      <Card className="w-full max-w-3xl mx-auto shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Brain className="h-7 w-7" />
            Schnelllesetechnik
          </CardTitle>
          <CardDescription className="text-blue-100">
            Lernen Sie diese Technik, um Ihre Lesegeschwindigkeit zu verbessern
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="p-6 border-2 border-blue-100 rounded-lg bg-blue-50">
            <h3 className="font-semibold text-xl mb-3 text-blue-800">{technique.name}</h3>
            <p className="text-gray-700 leading-relaxed">{technique.description}</p>
          </div>
          <div className="text-center pt-4">
            <p className="text-gray-600 mb-6">
              Lassen Sie uns nun den zweiten Lesetext versuchen. Wenden Sie diese Technik an, um zu sehen, ob sie Ihre
              Lesegeschwindigkeit verbessert!
            </p>
            <Button onClick={startNextPhase} size="lg" className="h-12 text-base bg-blue-600 hover:bg-blue-700">
              Weiter zu Phase 2
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderCompletion = () => (
    <Card className="w-full max-w-2xl mx-auto shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
        <CardTitle className="text-2xl text-center">Studie abgeschlossen!</CardTitle>
        <CardDescription className="text-blue-100 text-center">
          Vielen Dank für Ihre Teilnahme an unserer Lesestudie
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center p-6 border-2 border-blue-100 rounded-lg bg-blue-50">
            <h3 className="font-semibold text-lg mb-2 text-blue-800">Phase 1</h3>
            <p className="text-3xl font-bold text-blue-600">{readingTimes[0]?.toFixed(1)}s</p>
            <p className="text-sm text-gray-500 mb-4">Lesezeit</p>
            <p className="text-xl font-semibold text-blue-800">{scores[0]}/10</p>
            <p className="text-sm text-gray-500">Richtige Antworten</p>
          </div>
          <div className="text-center p-6 border-2 border-green-100 rounded-lg bg-green-50">
            <h3 className="font-semibold text-lg mb-2 text-green-800">Phase 2</h3>
            <p className="text-3xl font-bold text-green-600">{readingTimes[1]?.toFixed(1)}s</p>
            <p className="text-sm text-gray-500 mb-4">Lesezeit</p>
            <p className="text-xl font-semibold text-green-800">{scores[1]}/10</p>
            <p className="text-sm text-gray-500">Richtige Antworten</p>
          </div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg mt-4">
          <p className="text-gray-600">Ihre Ergebnisse wurden gespeichert. Vielen Dank für Ihre Teilnahme!</p>
        </div>
      </CardContent>
    </Card>
  )

  // If the component hasn't loaded yet, show a loading indicator
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-800 text-lg">Lesestudie wird geladen...</p>
        </div>
      </div>
    )
  }

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
          <h1 className="text-center text-sm font-medium text-blue-800">{steps[step]}</h1>
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
