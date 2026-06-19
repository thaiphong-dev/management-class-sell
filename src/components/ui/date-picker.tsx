import * as React from "react"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DatePickerProps {
  value: string // Format: YYYY-MM-DD
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4",
  "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8",
  "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
]

const DAYS_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]

export function DatePicker({
  value,
  onChange,
  placeholder = "Chọn ngày",
  className,
  disabled = false
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const [viewDate, setViewDate] = React.useState(() => {
    if (value) {
      const parsed = new Date(value)
      if (!isNaN(parsed.getTime())) return parsed
    }
    return new Date()
  })

  // Sync with value prop
  React.useEffect(() => {
    if (value) {
      const parsed = new Date(value)
      if (!isNaN(parsed.getTime())) {
        setViewDate(parsed)
      }
    }
  }, [value])

  // Close when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  // Year options: current year minus 80 to current year plus 10
  const currentYear = new Date().getFullYear()
  const years = React.useMemo(() => {
    const arr = []
    for (let y = currentYear + 5; y >= currentYear - 80; y--) {
      arr.push(y)
    }
    return arr
  }, [currentYear])

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1))
  }

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setViewDate(new Date(parseInt(e.target.value), month, 1))
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setViewDate(new Date(year, parseInt(e.target.value), 1))
  }

  const handleSelectDay = (day: number, targetMonth: number, targetYear: number) => {
    const selectedDate = new Date(targetYear, targetMonth, day)
    // Format as YYYY-MM-DD manually keeping local timezone date
    const yyyy = selectedDate.getFullYear()
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const dd = String(selectedDate.getDate()).padStart(2, '0')
    onChange(`${yyyy}-${mm}-${dd}`)
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange("")
    setIsOpen(false)
  }

  const handleToday = () => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    onChange(`${yyyy}-${mm}-${dd}`)
    setIsOpen(false)
  }

  // Calendar logic
  const startDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7
  const totalDays = new Date(year, month + 1, 0).getDate()
  const prevMonthTotalDays = new Date(year, month, 0).getDate()

  const cells = []

  // Previous month cells padding
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    cells.push({
      day: prevMonthTotalDays - i,
      month: month === 0 ? 11 : month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false
    })
  }

  // Current month cells
  for (let i = 1; i <= totalDays; i++) {
    cells.push({
      day: i,
      month,
      year,
      isCurrentMonth: true
    })
  }

  // Next month cells padding
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) {
    cells.push({
      day: i,
      month: month === 11 ? 0 : month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false
    })
  }

  // Format date for trigger display (DD/MM/YYYY)
  const displayValue = React.useMemo(() => {
    if (!value) return ""
    const parts = value.split("-")
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return value
  }, [value])

  const isSelected = (day: number, cellMonth: number, cellYear: number) => {
    if (!value) return false
    const parts = value.split("-")
    return (
      parseInt(parts[2]) === day &&
      parseInt(parts[1]) - 1 === cellMonth &&
      parseInt(parts[0]) === cellYear
    )
  }

  const isToday = (day: number, cellMonth: number, cellYear: number) => {
    const today = new Date()
    return (
      today.getDate() === day &&
      today.getMonth() === cellMonth &&
      today.getFullYear() === cellYear
    )
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm cursor-pointer select-none transition-all hover:bg-gray-50 focus-within:ring-2 focus-within:ring-red-500/50",
          disabled && "cursor-not-allowed opacity-50 bg-gray-50",
          className
        )}
      >
        <span className={cn("font-medium", !value ? "text-gray-400" : "text-gray-800")}>
          {displayValue || placeholder}
        </span>
        <div className="flex items-center gap-1.5">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-650 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <CalendarIcon className="h-4.5 w-4.5 text-gray-400 flex-shrink-0" />
        </div>
      </div>

      {/* Visually hidden native input for E2E testing and native form submission */}
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
        tabIndex={-1}
      />

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl border border-gray-200 shadow-xl z-[999] p-4 font-sans select-none animate-in fade-in-50 zoom-in-95 duration-100 origin-top-left">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>

            {/* Quick dropdown selectors */}
            <div className="flex items-center gap-1.5">
              <select
                value={month}
                onChange={handleMonthChange}
                className="bg-transparent text-xs font-bold text-gray-800 border-none outline-none focus:ring-0 cursor-pointer hover:text-red-600 transition-colors"
              >
                {MONTHS.map((m, idx) => (
                  <option key={idx} value={idx}>{m}</option>
                ))}
              </select>

              <select
                value={year}
                onChange={handleYearChange}
                className="bg-transparent text-xs font-bold text-gray-800 border-none outline-none focus:ring-0 cursor-pointer hover:text-red-600 transition-colors"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <ChevronRight className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center py-2 text-[10px] font-bold text-gray-400 tracking-wider">
            {DAYS_SHORT.map(d => (
              <span key={d}>{d}</span>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1 mt-1">
            {cells.map((cell, idx) => {
              const selected = isSelected(cell.day, cell.month, cell.year)
              const today = isToday(cell.day, cell.month, cell.year)
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(cell.day, cell.month, cell.year)}
                  className={cn(
                    "h-8 w-8 text-xs font-semibold rounded-lg flex items-center justify-center transition-all",
                    !cell.isCurrentMonth && "text-gray-300 hover:bg-gray-50",
                    cell.isCurrentMonth && "text-gray-700 hover:bg-gray-100",
                    today && "border border-red-500 text-red-600 font-bold",
                    selected && "bg-red-600 text-white hover:bg-red-700 border-none font-extrabold shadow-sm"
                  )}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-3">
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] font-bold text-gray-500 hover:text-red-650 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
            >
              Xóa
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="text-[11px] font-bold text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
            >
              Hôm nay
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
