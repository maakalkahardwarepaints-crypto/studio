"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const isDarkMode = theme === "dark"

  const handleThemeChange = (checked: boolean) => {
    setTheme(checked ? "dark" : "light")
  }

  return (
    <div className="flex items-center space-x-4">
       <Label htmlFor="dark-mode-toggle" className="flex items-center gap-2 text-base">
        {isDarkMode ? <Moon className="text-primary"/> : <Sun className="text-primary"/>}
        <span>Night Mode</span>
      </Label>
      <Switch
        id="dark-mode-toggle"
        checked={isDarkMode}
        onCheckedChange={handleThemeChange}
        aria-label="Toggle dark mode"
      />
    </div>
  )
}
