"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  Trophy,
  CheckCircle,
  X,
  ArrowRight,
  Zap,
  Target,
  Award,
  TrendingUp,
  Star,
  Timer,
  Brain,
  Lightbulb,
  Loader2,
  Clock,
} from "lucide-react"
import GlassCard from "../GlassCard"
import { useCopyProtection } from "../../hooks/useCopyProtection"

interface Question {
  id: string
  question: string
  options: string[]
  timeLimit: number
  points: number
  difficulty: "Easy" | "Medium" | "Hard"
  category: string
  correctAnswer: number
}

interface PollQuestionsPageProps {
  roomCode?: string
  onComplete?: () => void
}

const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:3000"

const sanitizeRoomCode = (code: string) => code.replace(/[^A-Z0-9]/g, "").toUpperCase()

const formatRoomCode = (code: string) => {
  const normalized = sanitizeRoomCode(code)
  if (normalized.length <= 3) {
    return normalized
  }
  return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}`
}

const PollQuestionsPage: React.FC<PollQuestionsPageProps> = ({ roomCode, onComplete }) => {
  useCopyProtection(true)
  const location = useLocation()
  const navigate = useNavigate()
  const locationState = location.state as { roomCode?: string; roomInfo?: any; pollTitle?: string } | undefined
  const resolvedRoomCode = locationState?.roomCode || roomCode || ""
  const sanitizedRoomCode = sanitizeRoomCode(resolvedRoomCode)
  const [displayRoomCode, setDisplayRoomCode] = useState(formatRoomCode(resolvedRoomCode))
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [streak, setStreak] = useState(0)
  const [totalParticipants, setTotalParticipants] = useState<number>(locationState?.roomInfo?.participants ?? 47)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [pollTitle, setPollTitle] = useState(locationState?.pollTitle || "Interactive Poll")
  // Auto-refresh tick used to re-fetch while there are no questions yet
  const [refreshTick, setRefreshTick] = useState(0)

  const currentQuestion = questions[currentQuestionIndex] ?? null
  const totalQuestions = questions.length
  const isLastQuestion = totalQuestions > 0 ? currentQuestionIndex === totalQuestions - 1 : true
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0
  const hasCorrectAnswer = currentQuestion ? typeof currentQuestion.correctAnswer === "number" && currentQuestion.correctAnswer >= 0 : false
  const questionKey = isLoading ? "loading" : loadError ? "error" : currentQuestion?.id ?? `question-${currentQuestionIndex}`

  useEffect(() => {
    if (!sanitizedRoomCode) {
      setLoadError("Room code not provided. Returning to join page.")
      setIsLoading(false)
      const timeout = setTimeout(() => {
        navigate("/student/join-poll")
      }, 2000)
      return () => clearTimeout(timeout)
    }

    setDisplayRoomCode(formatRoomCode(sanitizedRoomCode))

    let isMounted = true

    const fetchQuestions = async () => {
      setIsLoading(true)
      setLoadError("")
      try {
        const response = await fetch(`${API_BASE_URL}/api/rooms/${sanitizedRoomCode}/questions?status=approved`)
        if (!response.ok) {
          throw new Error("Failed to load questions")
        }
        const data = await response.json()
        if (!isMounted) {
          return
        }
        const mapped: Question[] = Array.isArray(data.questions)
          ? data.questions
              .map((item: any, index: number) => ({
                id: String(item._id ?? index),
                question: typeof item.text === "string" ? item.text : "",
                options: Array.isArray(item.options) ? item.options : [],
                timeLimit: typeof item.timeLimit === "number" ? item.timeLimit : 30,
                points: typeof item.points === "number" ? item.points : 100,
                difficulty: item.difficulty === "Easy" || item.difficulty === "Hard" ? item.difficulty : "Medium",
                category: typeof item.category === "string" ? item.category : "General",
                correctAnswer: typeof item.correctAnswerIndex === "number" ? item.correctAnswerIndex : -1,
              }))
              .filter((item) => item.question && item.options.length > 0)
          : []

        setQuestions(mapped)
        setCurrentQuestionIndex(0)
        setSelectedAnswer(null)
        setIsAnswered(false)
        setShowResult(false)
        setTimeLeft(mapped[0]?.timeLimit ?? 0)
        setAnsweredCount(0)
        if (typeof data.participants === "number") {
          setTotalParticipants(data.participants)
        }
        if (typeof data.roomName === "string" && data.roomName.trim()) {
          setPollTitle(data.roomName)
        }
        if (mapped.length === 0) {
          setLoadError("No questions available yet. Please wait for your instructor.")
        }
      } catch {
        if (!isMounted) {
          return
        }
        setQuestions([])
        setCurrentQuestionIndex(0)
        setSelectedAnswer(null)
        setIsAnswered(false)
        setShowResult(false)
        setTimeLeft(0)
        setAnsweredCount(0)
        setLoadError("Unable to load questions for this room.")
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void fetchQuestions()

    return () => {
      isMounted = false
    }
  }, [sanitizedRoomCode, navigate, refreshTick])

  // Auto-refresh every 4s until at least one question is available
  useEffect(() => {
    if (!sanitizedRoomCode) return
    if (questions.length > 0) return

    const id = setInterval(() => setRefreshTick((t) => t + 1), 4000)
    return () => clearInterval(id)
  }, [sanitizedRoomCode, questions.length])

  useEffect(() => {
    if (!currentQuestion) {
      return
    }
    if (timeLeft > 0 && !isAnswered) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
    if (timeLeft === 0 && !isAnswered && currentQuestion) {
      handleTimeUp()
    }
  }, [timeLeft, isAnswered, currentQuestion])

  const handleTimeUp = () => {
    if (!currentQuestion) {
      return
    }
    setIsAnswered(true)
    setShowResult(true)
    setStreak(0)
    setTimeout(() => {
      nextQuestion()
    }, 3000)
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (isAnswered || !currentQuestion) {
      return
    }

    setSelectedAnswer(answerIndex)
    setIsAnswered(true)
    setShowResult(true)

    if (totalParticipants > 0) {
      const simulated = Math.min(totalParticipants, Math.max(1, Math.floor(Math.random() * totalParticipants) + 1))
      setAnsweredCount(simulated)
    } else {
      setAnsweredCount(0)
    }

    const hasCorrectAnswer = typeof currentQuestion.correctAnswer === "number" && currentQuestion.correctAnswer >= 0
    const isCorrect = hasCorrectAnswer && answerIndex === currentQuestion.correctAnswer
    if (isCorrect) {
      const baseTime = currentQuestion.timeLimit > 0 ? currentQuestion.timeLimit : 1
      const timeBonus = Math.floor((timeLeft / baseTime) * 50)
      const totalPoints = currentQuestion.points + timeBonus
      setScore((prev) => prev + totalPoints)
      setStreak((prev) => prev + 1)
    } else {
      setStreak(0)
    }

    setTimeout(() => {
      nextQuestion()
    }, 3000)
  }

  const nextQuestion = () => {
    if (!questions.length) {
      return
    }

    if (isLastQuestion) {
      onComplete?.()
      return
    }

    const nextIndex = currentQuestionIndex + 1
    const next = questions[nextIndex]
    setCurrentQuestionIndex(nextIndex)
    setSelectedAnswer(null)
    setIsAnswered(false)
    setShowResult(false)
    setTimeLeft(next?.timeLimit ?? 0)
    setAnsweredCount(0)
  }

  // --- getDifficultyColor ---
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "from-green-500 to-emerald-500"
      case "Medium":
        return "from-yellow-500 to-orange-500"
      case "Hard":
        return "from-red-500 to-pink-500"
      default:
        return "from-gray-500 to-gray-600"
    }
  }

  // --- getTimerColor ---
  const getTimerColor = () => {
    if (timeLeft <= 5) return "text-red-400 animate-pulse"
    if (timeLeft <= 10) return "text-yellow-400"
    return "text-green-400"
  }

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary-500/20 to-secondary-500/20 border border-primary-500/30 rounded-full px-6 py-2 mb-4">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-400 font-medium">Live Session Active</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">{pollTitle}</h1>
        <p className="text-gray-400 truncate max-w-md mx-auto">{displayRoomCode}</p>
      </motion.div>

      {/* Stats Bar */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 text-primary-400 mb-1">
                <Trophy className="w-4 h-4" />
                <span className="text-2xl font-bold text-white">{score}</span>
              </div>
              <p className="text-xs text-gray-400">Total Score</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 text-yellow-400 mb-1">
                <Zap className="w-4 h-4" />
                <span className="text-2xl font-bold text-white">{streak}</span>
              </div>
              <p className="text-xs text-gray-400">Streak</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 text-blue-400 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-2xl font-bold text-white">{totalParticipants}</span>
              </div>
              <p className="text-xs text-gray-400">Participants</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 text-green-400 mb-1">
                <Target className="w-4 h-4" />
                <span className="text-2xl font-bold text-white">{Math.round(progress)}%</span>
              </div>
              <p className="text-xs text-gray-400">Progress</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={questionKey}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          <GlassCard className="p-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-4 right-4">
                <Brain className="w-32 h-32 text-white" />
              </div>
            </div>

            <div className="relative z-10">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-white">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p className="text-gray-300">Loading questions...</p>
                </div>
              ) : loadError ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-red-400">
                  <X className="w-10 h-10 mb-3" />
                  <p className="text-base">{loadError}</p>
                </div>
              ) : !currentQuestion ? (
                <div className="flex flex-col items-center justify-center py-16 text-white">
                  <Clock className="w-10 h-10 mb-3 text-primary-400" />
                  <p className="text-base text-gray-300">Waiting for new questions from your instructor.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className={`flex items-center space-x-2 ${getTimerColor()}`}>
                        <Timer className="w-6 h-6" />
                        <span className="font-bold text-3xl">{timeLeft}</span>
                        <span className="text-sm">sec</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div
                        className={`px-3 py-1 rounded-full bg-gradient-to-r ${getDifficultyColor(currentQuestion.difficulty)} text-white text-sm font-medium`}
                      >
                        {currentQuestion.difficulty}
                      </div>
                      <div className="px-3 py-1 rounded-full bg-white/10 text-gray-300 text-sm">
                        {currentQuestion.category}
                      </div>
                      <div className="flex items-center space-x-1 text-yellow-400">
                        <Star className="w-4 h-4" />
                        <span className="font-bold">{currentQuestion.points}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center mb-8">
                    <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary-500/20 to-secondary-500/20 border border-primary-500/30 rounded-full px-4 py-2 mb-4">
                      <Lightbulb className="w-4 h-4 text-primary-400" />
                      <span className="text-primary-400 font-medium">
                        Question {currentQuestionIndex + 1} of {totalQuestions}
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">{currentQuestion.question}</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {currentQuestion.options.map((option, index) => {
                      const optionLabel = String.fromCharCode(65 + (index % 26))
                      const isSelected = selectedAnswer === index
                      const isCorrect = showResult && hasCorrectAnswer && index === currentQuestion.correctAnswer
                      const isWrong = showResult && hasCorrectAnswer && isSelected && !isCorrect

                      return (
                        <motion.button
                          key={index}
                          onClick={() => handleAnswerSelect(index)}
                          disabled={isAnswered}
                          whileHover={!isAnswered ? { scale: 1.02, y: -2 } : {}}
                          whileTap={!isAnswered ? { scale: 0.98 } : {}}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`
                            group relative p-6 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden
                            ${
                              isCorrect
                                ? "bg-green-500/20 border-green-500 shadow-lg shadow-green-500/20"
                                : isWrong
                                  ? "bg-red-500/20 border-red-500 shadow-lg shadow-red-500/20"
                                  : isSelected
                                    ? "bg-primary-500/20 border-primary-500 shadow-lg shadow-primary-500/20"
                                    : "bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30 hover:shadow-lg"
                            }
                            ${isAnswered ? "cursor-not-allowed" : "cursor-pointer"}
                          `}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                          <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div
                                className={`
                                w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg
                                ${
                                  isCorrect
                                    ? "bg-green-500 text-white"
                                    : isWrong
                                      ? "bg-red-500 text-white"
                                      : isSelected
                                        ? "bg-primary-500 text-white"
                                        : "bg-white/10 text-gray-300 group-hover:bg-white/20"
                                }
                              `}
                              >
                                {optionLabel}
                              </div>
                              <span
                                className={`
                                font-medium text-lg
                                ${
                                  isCorrect
                                    ? "text-green-400"
                                    : isWrong
                                      ? "text-red-400"
                                      : isSelected
                                        ? "text-primary-400"
                                        : "text-white"
                                }
                              `}
                              >
                                {option}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              {showResult && isCorrect && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="flex items-center space-x-1 text-green-400"
                                >
                                  <CheckCircle className="w-6 h-6" />
                                  <span className="font-bold">Correct!</span>
                                </motion.div>
                              )}
                              {showResult && isWrong && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="flex items-center space-x-1 text-red-400"
                                >
                                  <X className="w-6 h-6" />
                                  <span className="font-bold">Wrong</span>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>

                  {showResult && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                      <GlassCard className="p-4 bg-white/5">
                        <div className="flex items-center justify-center space-x-6 text-sm">
                          <div className="flex items-center space-x-2 text-gray-400">
                            <Users className="w-4 h-4" />
                            <span>
                              {answeredCount}/{totalParticipants} answered
                            </span>
                          </div>
                          {hasCorrectAnswer && selectedAnswer === currentQuestion.correctAnswer && (
                            <div className="flex items-center space-x-2 text-green-400">
                              <TrendingUp className="w-4 h-4" />
                              <span>
                                +{currentQuestion.points + Math.floor((timeLeft / (currentQuestion.timeLimit > 0 ? currentQuestion.timeLimit : 1)) * 50)} points
                              </span>
                            </div>
                          )}
                          {streak > 1 && (
                            <div className="flex items-center space-x-2 text-yellow-400">
                              <Zap className="w-4 h-4" />
                              <span>{streak} streak!</span>
                            </div>
                          )}
                        </div>
                      </GlassCard>
                    </motion.div>
                  )}

                  {isLastQuestion && isAnswered && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 text-center">
                      <button
                        onClick={() => onComplete?.()}
                        className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-bold text-lg rounded-2xl hover:from-primary-600 hover:to-secondary-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        <Award className="w-6 h-6" />
                        <span>View Final Results</span>
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </motion.div>
                  )}
                </>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default PollQuestionsPage
