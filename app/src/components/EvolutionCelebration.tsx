import { useCallback, useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

import type { Beast, EvolutionStage } from "../data/beasts"
import { stageNames } from "../utils/evolution"

export interface EvolutionEvent {
  studentName: string
  beast: Beast
  oldStage: EvolutionStage
  newStage: EvolutionStage
}

interface EvolutionCelebrationProps {
  queue: EvolutionEvent[]
  onComplete: () => void
}

type Phase = "flash" | "reveal" | "text" | "hold" | "exit"

const PHASES: Phase[] = ["flash", "reveal", "text", "hold", "exit"]

const PHASE_DURATIONS: Record<Phase, number> = {
  flash: 400,
  reveal: 1400,
  text: 1200,
  hold: 1000,
  exit: 500,
}

const PARTICLE_EMOJIS = ["\u2728", "\u2B50", "\uD83C\uDF1F", "\uD83D\uDCAB"]

const generateParticles = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100 - 50,
    y: Math.random() * 100 - 50,
    scale: 0.5 + Math.random() * 1,
    duration: 1 + Math.random() * 1.5,
    delay: Math.random() * 0.5,
    emoji: PARTICLE_EMOJIS[Math.floor(Math.random() * PARTICLE_EMOJIS.length)],
  }))

const EvolutionCelebration = ({ queue, onComplete }: EvolutionCelebrationProps) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>("flash")
  const particles = useMemo(() => generateParticles(20), [])

  const current = queue[currentIndex] as EvolutionEvent | undefined

  const handleComplete = useCallback(() => {
    onComplete()
  }, [onComplete])

  // 1. Phase progression
  useEffect(() => {
    if (!current) {
      handleComplete()
      return
    }

    const phaseIndex = PHASES.indexOf(phase)
    const timer = window.setTimeout(() => {
      if (phaseIndex < PHASES.length - 1) {
        setPhase(PHASES[phaseIndex + 1])
      } else if (currentIndex < queue.length - 1) {
        setCurrentIndex((prev) => prev + 1)
        setPhase("flash")
      } else {
        handleComplete()
      }
    }, PHASE_DURATIONS[phase])

    return () => window.clearTimeout(timer)
  }, [phase, currentIndex, current, queue.length, handleComplete])

  if (!current) return null

  const newImage = current.beast.images[current.newStage]
  const newStageName = stageNames[current.newStage]

  const showFlash = phase === "flash"
  const showBeast = phase !== "flash" && phase !== "exit"
  const showText = phase === "text" || phase === "hold"

  return (
    <AnimatePresence>
      {phase !== "exit" && (
        <motion.div
          key={`evo-${currentIndex}`}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleComplete}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-gray-900/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />

          {/* Flash */}
          {showFlash && (
            <motion.div
              className="absolute inset-0 bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.9, 0] }}
              transition={{ duration: 0.4, times: [0, 0.3, 1] }}
            />
          )}

          {/* Glow ring */}
          {showBeast && (
            <motion.div
              className="absolute h-96 w-96 md:h-[28rem] md:w-[28rem] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(249,115,22,0.35) 0%, rgba(249,115,22,0.1) 50%, transparent 70%)",
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 1.2], opacity: [0, 0.8, 0.6] }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          )}

          {/* Particles */}
          {showBeast &&
            particles.map((p) => (
              <motion.div
                key={p.id}
                className="pointer-events-none absolute text-2xl"
                initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  x: [0, p.x * 3],
                  y: [0, p.y * 3 - 40],
                  scale: [0, p.scale, 0],
                }}
                transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
              >
                {p.emoji}
              </motion.div>
            ))}

          {/* Beast image */}
          {showBeast && (
            <motion.div
              className="relative z-10 flex flex-col items-center"
              initial={{ scale: 0, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <motion.img
                src={newImage}
                alt={current.beast.name}
                className="h-72 w-72 object-contain sm:h-80 sm:w-80 md:h-96 md:w-96"
                animate={{
                  filter: [
                    "drop-shadow(0 0 20px rgba(249,115,22,0.6))",
                    "drop-shadow(0 0 40px rgba(249,115,22,0.8))",
                    "drop-shadow(0 0 20px rgba(249,115,22,0.6))",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          )}

          {/* Text */}
          {showText && (
            <motion.div
              className="absolute z-20 flex flex-col items-center gap-2"
              style={{ bottom: "22%" }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <motion.p
                className="text-4xl font-bold text-white md:text-5xl"
                style={{ textShadow: "0 2px 20px rgba(249,115,22,0.8)" }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                已升级!
              </motion.p>
              <p className="text-lg font-medium text-white/90">
                {current.studentName} 的 {current.beast.name}
              </p>
              <motion.p
                className="mt-1 rounded-full bg-primary/90 px-5 py-1.5 text-base font-bold text-white shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.3 }}
              >
                进化为 {newStageName}形态
              </motion.p>
            </motion.div>
          )}

          {/* Progress dots (multiple evolutions) */}
          {queue.length > 1 && (
            <div className="absolute bottom-8 z-20 flex gap-2">
              {queue.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                    i <= currentIndex ? "bg-primary" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Skip button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleComplete()
            }}
            className="absolute right-6 top-6 z-20 rounded-full bg-white/20 px-4 py-1.5 text-sm text-white/80 backdrop-blur transition hover:bg-white/30"
          >
            跳过
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default EvolutionCelebration
