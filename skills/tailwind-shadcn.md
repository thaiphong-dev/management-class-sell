# Skill: Tailwind CSS + shadcn/ui

## shadcn/ui — Cách dùng đúng

```bash
# Thêm component mới
npx shadcn-ui@latest add button dialog table select toast

# KHÔNG sửa file trong src/components/ui/ trực tiếp
# Nếu cần custom → wrap component, không edit gốc
```

## Utility function cn()

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Dùng:
<div className={cn(
  'base px-4 py-2 rounded',
  isActive && 'bg-brand-500 text-white',
  isDisabled && 'opacity-50 cursor-not-allowed',
  className   // forward className prop
)} />
```

## Responsive patterns

```tsx
// Mobile-first
<div className="
  grid grid-cols-1        // mobile: 1 col
  sm:grid-cols-2          // tablet: 2 cols
  lg:grid-cols-4          // desktop: 4 cols
  gap-4
">

// Sidebar visibility
<aside className="
  hidden                  // mobile: ẩn
  lg:flex                 // desktop: hiện
  w-60 flex-shrink-0
">

// Text size
<h1 className="text-xl sm:text-2xl font-bold">
```

## Component variants pattern

```tsx
// Dùng cva() cho component có nhiều variants
import { cva, type VariantProps } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
  {
    variants: {
      status: {
        active:   'bg-green-100 text-green-700',
        expired:  'bg-red-100 text-red-700',
        warning:  'bg-yellow-100 text-yellow-700',
        info:     'bg-blue-100 text-blue-700',
        neutral:  'bg-gray-100 text-gray-600',
      }
    },
    defaultVariants: { status: 'neutral' }
  }
)

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: React.ReactNode
}

export function StatusBadge({ status, children }: BadgeProps) {
  return <span className={badgeVariants({ status })}>{children}</span>
}
```

## Common patterns

```tsx
// Card container
<div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">

// Section title
<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">

// Action button (header)
<Button size="sm" className="rounded-xl">
  <Plus className="w-4 h-4 mr-2" />
  Tạo mới
</Button>

// Input với label
<div className="space-y-1.5">
  <Label className="text-sm font-medium text-gray-700">Tên lớp</Label>
  <Input className="rounded-xl" placeholder="VD: Lớp Cơ bản A" />
</div>

// Progress bar
<div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
  <div
    className="h-full rounded-full bg-gradient-to-r from-brand-400 to-indigo-500"
    style={{ width: `${percent}%` }}
  />
</div>
```

## Animation

```tsx
// Fade in khi mount
<div className="animate-in fade-in duration-200">

// Slide in
<div className="animate-in slide-in-from-bottom-4 duration-300">

// Skeleton loading
<div className="animate-pulse space-y-3">
  <div className="h-4 bg-gray-200 rounded w-3/4" />
  <div className="h-4 bg-gray-200 rounded w-1/2" />
</div>
```

## Dark sidebar colors

```tsx
// Sidebar nav item
const navItemClass = cn(
  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer',
  isActive
    ? 'bg-brand-500/20 border-l-[3px] border-brand-400 text-white'
    : 'text-slate-400 hover:text-white hover:bg-white/8'
)
```
