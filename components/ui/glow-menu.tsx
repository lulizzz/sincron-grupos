"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface GlowMenuProps {
  items: Array<{
    icon: LucideIcon
    label: string
    href: string
    gradient: string
    iconColor: string
  }>
  className?: string
}

export function GlowMenu({ items, className }: GlowMenuProps) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const isDark = theme === "dark"

  const itemVariants = {
    initial: { rotateX: 0, opacity: 1 },
    hover: { rotateX: -90, opacity: 0 },
  }

  const backVariants = {
    initial: { rotateX: 90, opacity: 0 },
    hover: { rotateX: 0, opacity: 1 },
  }

  const glowVariants = {
    initial: { opacity: 0, scale: 0.8 },
    hover: {
      opacity: 1,
      scale: 2,
      transition: {
        opacity: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
        scale: { duration: 0.5, type: "spring" as const, stiffness: 300, damping: 25 },
      },
    },
  }

  const sharedTransition = {
    type: "spring" as const,
    stiffness: 100,
    damping: 20,
    duration: 0.5,
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border p-2",
        isDark
          ? "bg-gray-900/80 border-gray-800 backdrop-blur-lg"
          : "bg-white/80 border-gray-200/50 backdrop-blur-lg shadow-lg",
        className
      )}
    >
      {items.map((item, index) => {
        const Icon = item.icon
        return (
          <motion.a
            key={index}
            href={item.href}
            className="relative cursor-pointer"
            style={{ perspective: "600px" }}
            whileHover="hover"
            initial="initial"
          >
            {/* Glow Effect */}
            <motion.div
              className={cn(
                "absolute inset-0 -z-10 rounded-2xl blur-xl",
                item.gradient
              )}
              variants={glowVariants}
            />

            {/* Front Face */}
            <motion.div
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 transition-colors",
                isDark
                  ? "bg-gray-800/50 text-gray-200"
                  : "bg-gray-100/80 text-gray-700"
              )}
              variants={itemVariants}
              transition={sharedTransition}
              style={{
                transformStyle: "preserve-3d",
                transformOrigin: "center bottom",
              }}
            >
              <Icon className={cn("h-5 w-5", item.iconColor)} />
              <span className="text-sm font-medium">{item.label}</span>
            </motion.div>

            {/* Back Face */}
            <motion.div
              className={cn(
                "absolute inset-0 flex items-center gap-2 rounded-xl px-4 py-2",
                item.gradient,
                "text-white"
              )}
              variants={backVariants}
              transition={sharedTransition}
              style={{
                transformStyle: "preserve-3d",
                transformOrigin: "center top",
                rotateX: 90,
              }}
            >
              <Icon className="h-5 w-5 text-white" />
              <span className="text-sm font-medium">{item.label}</span>
            </motion.div>
          </motion.a>
        )
      })}
    </div>
  )
}
