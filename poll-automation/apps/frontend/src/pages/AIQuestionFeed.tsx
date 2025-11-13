"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X, Edit3, Clock, Settings, Play, Loader2 } from "lucide-react"
import DashboardLayout from "../components/DashboardLayout"
import GlassCard from "../components/GlassCard"
import AIControlPanel from "../components/AIControlPanel"

const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:3000"
const POLL_STORAGE_KEY = "activePollSession"
const sanitizeRoomCode = (code: string) => code.replace(/[^A-Z0-9]/g, "").toUpperCase()
const formatRoomCode = (code: string) => {
  const normalized = sanitizeRoomCode(code)
  if (normalized.length <= 3) {
    return normalized
  }
  return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}`
}

interface AIQuestion {
  id: string
  question: string
  options: string[]
  correct: number | null
  difficulty: "Easy" | "Medium" | "Hard"
  tags: string[]
  confidence: number
  status: "pending" | "approved" | "rejected"
  timeEstimate: string
}

const AIQuestionFeed = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [questionsPerPoll, setQuestionsPerPoll] = useState(5); // Default value, update as needed

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      setIsScrolled(scrollTop > 100) // Show settings icon after scrolling 100px
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const [activeRoomCode, setActiveRoomCode] = useState("")
  const [questions, setQuestions] = useState<AIQuestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [autoLaunch, setAutoLaunch] = useState(false)
  const [timerEnabled, setTimerEnabled] = useState(true)
  const [defaultTimer, setDefaultTimer] = useState(30)
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(POLL_STORAGE_KEY)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.roomCode) {
          setActiveRoomCode(formatRoomCode(data.roomCode))
        }
      } catch {
      }
    }
  }, [])

  useEffect(() => {
    const sanitizedCode = sanitizeRoomCode(activeRoomCode)
    if (!sanitizedCode) {
      setQuestions([])
      return
    }

    const fetchQuestions = async () => {
      setIsLoading(true)
      setLoadError("")
      try {
        const response = await fetch(`${API_BASE_URL}/api/rooms/${sanitizedCode}/questions?status=all`)
        if (!response.ok) {
          throw new Error("Failed to load questions")
        }
        const data = await response.json()
        const aiQuestions: AIQuestion[] = Array.isArray(data.questions)
          ? data.questions
              .filter((item: any) => item && item.source === "ai")
              .map((item: any, index: number) => ({
                id: String(item._id ?? item.id ?? index),
                question: typeof item.text === "string" ? item.text : "",
                options: Array.isArray(item.options) ? item.options : [],
                correct: typeof item.correctAnswerIndex === "number" ? item.correctAnswerIndex : null,
                difficulty: item.difficulty === "Easy" || item.difficulty === "Hard" ? item.difficulty : "Medium",
                tags: Array.isArray(item.metadata?.tags) ? item.metadata.tags : [],
                confidence: typeof item.metadata?.confidence === "number" ? Math.round(item.metadata.confidence) : 0,
                status:
                  item.status === "approved" || item.status === "rejected" || item.status === "pending"
                    ? item.status
                    : "pending",
                timeEstimate: `${typeof item.timeLimit === "number" ? item.timeLimit : 30}s`,
              }))
          : []
        setQuestions(aiQuestions)
      } catch {
        setLoadError("Unable to load AI questions for this room.")
        setQuestions([])
      } finally {
        setIsLoading(false)
      }
    }

    void fetchQuestions()
  }, [activeRoomCode, refreshKey])

  const handleApprove = async (id: string) => {
    const sanitizedCode = sanitizeRoomCode(activeRoomCode)
    if (!sanitizedCode) {
      setLoadError("Room code required to approve questions.")
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms/${sanitizedCode}/questions/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      })
      if (!response.ok) {
        throw new Error("Failed to update status")
      }
      setLoadError("")
      setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, status: "approved" } : q)))
    } catch {
      setLoadError("Failed to update question status.")
    }
  }

  const handleReject = async (id: string) => {
    const sanitizedCode = sanitizeRoomCode(activeRoomCode)
    if (!sanitizedCode) {
      setLoadError("Room code required to reject questions.")
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms/${sanitizedCode}/questions/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      })
      if (!response.ok) {
        throw new Error("Failed to update status")
      }
      setLoadError("")
      setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, status: "rejected" } : q)))
    } catch {
      setLoadError("Failed to update question status.")
    }
  }

  const handleEdit = (id: string) => {
    setSelectedQuestion(id)
    setIsEditMode(true)
  }

  const handleLaunch = async (id: string) => {
    await handleApprove(id)
  }

  const handleRegenerate = async () => {
    const sanitizedCode = sanitizeRoomCode(activeRoomCode)
    if (!sanitizedCode) {
      setLoadError("Room code required to generate AI questions.")
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms/${sanitizedCode}/questions/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: [
            {
              question: "Auto-generated review question",
              options: ["Option A", "Option B", "Option C", "Option D"],
              correctAnswerIndex: 0,
              difficulty: "Medium",
              timeLimit: defaultTimer,
              status: "pending",
              confidence: Math.floor(Math.random() * 21) + 70,
            },
          ],
        }),
      })
      if (!response.ok) {
        throw new Error("Failed to generate")
      }
      setLoadError("")
      setRefreshKey((prev) => prev + 1)
    } catch {
      setLoadError("Failed to generate AI questions.")
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "text-green-400 bg-green-500/20 border-green-500/30"
      case "Medium":
        return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30"
      case "Hard":
        return "text-red-400 bg-red-500/20 border-red-500/30"
      default:
        return "text-gray-400 bg-gray-500/20 border-gray-500/30"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "text-green-400 bg-green-500/20 border-green-500/30"
      case "rejected":
        return "text-red-400 bg-red-500/20 border-red-500/30"
      case "pending":
        return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30"
      default:
        return "text-gray-400 bg-gray-500/20 border-gray-500/30"
    }
  }

  const filteredQuestions = questions
  const sanitizedActiveCode = sanitizeRoomCode(activeRoomCode)

  return (
<DashboardLayout>
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="space-y-6 overflow-x-hidden"
  >
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">AI Question Feed</h1>
        <p className="text-gray-400">Review and manage AI-generated questions</p>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
        <div className="bg-primary-500/20 text-primary-400 px-3 py-1 rounded-full text-sm font-medium">
          {filteredQuestions.filter((q) => q.status === "pending").length} Pending
        </div>
        {!isScrolled && (
          <motion.button
            onClick={() => setIsControlPanelOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg border border-primary-500/30 hover:bg-primary-500/30 transition-colors duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <Settings className="w-4 h-4" />
            <span>AI Config</span>
          </motion.button>
        )}
      </div>
    </div>

    <GlassCard className="p-4 bg-gray-800/50 border border-gray-700/50">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="w-full sm:w-1/2">
          <label className="block text-sm font-medium text-gray-300 mb-2">Active Room Code</label>
          <input
            type="text"
            value={activeRoomCode}
            onChange={(e) => setActiveRoomCode(formatRoomCode(e.target.value))}
            placeholder="ABC-123"
            maxLength={7}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
          <p className="text-xs text-gray-400 mt-2">Link this feed to an active room to synchronize AI questions.</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setRefreshKey((prev) => prev + 1)}
            disabled={!sanitizedActiveCode || isLoading}
            className={`px-4 py-2 rounded-lg font-semibold text-white ${sanitizedActiveCode && !isLoading ? "bg-primary-500 hover:bg-primary-600" : "bg-gray-600 cursor-not-allowed"}`}
          >
            Refresh Questions
          </motion.button>
        </div>
      </div>
      {!sanitizedActiveCode && (
        <p className="text-sm text-yellow-400 mt-2">No room code linked. Enter a code to load AI questions.</p>
      )}
      {loadError && (
        <p className="text-sm text-red-400 mt-2">{loadError}</p>
      )}
    </GlassCard>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Auto-Launch Settings */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Auto-Launch Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">Enable Auto-Launch</label>
                <button
                  onClick={() => setAutoLaunch(!autoLaunch)}
                  className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ${autoLaunch ? "bg-primary-500" : "bg-gray-600"
                    }`}
                >
                  <span
                    className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ${autoLaunch ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">Timer Enabled</label>
                <button
                  onClick={() => setTimerEnabled(!timerEnabled)}
                  className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ${timerEnabled ? "bg-primary-500" : "bg-gray-600"
                    }`}
                >
                  <span
                    className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ${timerEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>
{timerEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Default Timer: {defaultTimer}s</label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={defaultTimer}
                  onChange={(e) => setDefaultTimer(Number.parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              )}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">Stop Generating More Questions</label>
                <button
                  className="px-4 py-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-200"
                >
                  STOP
                </button>
              </div>
            </div>
          </GlassCard>

          {/* Quick Stats */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Total Questions</span>
                <span className="text-white font-medium">{questions.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Approved</span>
                <span className="text-green-400 font-medium">
                  {questions.filter((q) => q.status === "approved").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Pending</span>
                <span className="text-yellow-400 font-medium">
                  {questions.filter((q) => q.status === "pending").length}
                </span>
              </div>
            </div>
          </GlassCard>
        </div>

{/* Question Queue */}
    <GlassCard className="p-6">
      <h3 className="text-xl font-bold text-white mb-6">Question Queue</h3>
      <div className="mb-4">
    <span className="text-primary-400 font-semibold text-lg">
      Questions Per Poll: {questionsPerPoll}
    </span>
  </div>
      <div className="space-y-4">
        <AnimatePresence>
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-center py-10 text-gray-300"
            >
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading AI questions...
            </motion.div>
          )}
          {!isLoading && !sanitizedActiveCode && (
            <motion.div
              key="no-code"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-8 text-yellow-300"
            >
              Enter a room code to view AI generated questions.
            </motion.div>
          )}
          {!isLoading && sanitizedActiveCode && filteredQuestions.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-8 text-gray-300"
            >
              No AI questions available yet. Configure auto-generation or add new prompts.
            </motion.div>
          )}
          {!isLoading && sanitizedActiveCode &&
            filteredQuestions.map((question, index) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 rounded-lg border border-white/10 p-6 hover:border-white/20 transition-colors duration-200"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(question.difficulty)}`}
                      >
                        {question.difficulty}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(question.status)}`}
                      >
                        {question.status}
                      </span>
                      <div className="flex items-center space-x-1 text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs">{question.timeEstimate}</span>
                      </div>
                    </div>
                    <h4 className="text-lg font-medium text-white mb-3">{question.question}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                      {question.options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className={`p-2 rounded-lg text-sm ${optionIndex === question.correct
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-white/5 text-gray-300 border border-gray-600"
                            }`}
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {question.tags.map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-row flex-wrap items-center gap-2 md:ml-4">
                    {question.status === "pending" && (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleApprove(question.id)}
                          className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors duration-200"
                        >
                          <Check className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleReject(question.id)}
                          className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors duration-200"
                        >
                          <X className="w-4 h-4" />
                        </motion.button>
                      </>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEdit(question.id)}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors duration-200"
                    >
                      <Edit3 className="w-4 h-4" />
                    </motion.button>
                    {question.status === "approved" && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleLaunch(question.id)}
                        className="p-2 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors duration-200"
                      >
                        <Play className="w-4 h-4" />
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </GlassCard>
    {/* Regenerate Questions Button */}
    <div className="flex flex-col sm:flex-row justify-start mt-4">
      <motion.button
        onClick={handleRegenerate}
        disabled={!sanitizedActiveCode || isLoading}
        whileHover={{ scale: !sanitizedActiveCode || isLoading ? 1 : 1.05 }}
        whileTap={{ scale: !sanitizedActiveCode || isLoading ? 1 : 0.95 }}
        className={`px-5 py-2.5 border text-sm font-semibold rounded-lg shadow-md transition-all duration-200 ${sanitizedActiveCode && !isLoading ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30" : "bg-gray-600/40 text-gray-300 border-gray-700 cursor-not-allowed"}`}
      >
        🔁 Regenerate Questions
      </motion.button>
    </div>
  </motion.div>
  <AIControlPanel
    isOpen={isControlPanelOpen}
    onToggle={() => setIsControlPanelOpen(!isControlPanelOpen)}
    showFloatingButton={isScrolled}
    setQuestionsPerPoll={setQuestionsPerPoll} 
    questionsPerPoll={questionsPerPoll}
  />
</DashboardLayout>
  )
}

export default AIQuestionFeed
