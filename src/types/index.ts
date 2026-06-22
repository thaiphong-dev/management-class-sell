import type { Database } from './database.types'

// ─── Row types ───────────────────────────────────────────────────────────────
export type Profile           = Database['public']['Tables']['profiles']['Row']
export type Class             = Database['public']['Tables']['classes']['Row']
export type Session           = Database['public']['Tables']['sessions']['Row']
export type Attendance        = Database['public']['Tables']['attendance']['Row']
export type Package           = Database['public']['Tables']['packages']['Row']
export type StudentPackage    = Database['public']['Tables']['student_packages']['Row']
export type Payment           = Database['public']['Tables']['payments']['Row']
export type Notification      = Database['public']['Tables']['notifications']['Row']
export type Coach             = Database['public']['Tables']['coaches']['Row']
export type Student           = Database['public']['Tables']['students']['Row']
export type Facility          = Database['public']['Tables']['facilities']['Row']
export type Court             = Database['public']['Tables']['courts']['Row']
export type ClassStudent      = Database['public']['Tables']['class_students']['Row']
export type ProgressEval      = Database['public']['Tables']['progress_evaluations']['Row']
export type Assistant         = Database['public']['Tables']['assistants']['Row']
export type CoachAssistantRegistration = Database['public']['Tables']['coach_assistant_registrations']['Row']

// ─── Insert types ─────────────────────────────────────────────────────────────
export type AttendanceInsert  = Database['public']['Tables']['attendance']['Insert']
export type SessionInsert     = Database['public']['Tables']['sessions']['Insert']
export type ClassInsert       = Database['public']['Tables']['classes']['Insert']

// ─── Update types ─────────────────────────────────────────────────────────────
export type ClassUpdate       = Database['public']['Tables']['classes']['Update']

// ─── Enums ────────────────────────────────────────────────────────────────────
export type UserRole               = 'admin' | 'coach' | 'assistant' | 'student' | 'parent'
export type AttendanceStatus       = 'present' | 'absent' | 'late' | 'excused'
export type PackageType            = 'session' | 'monthly'
export type StudentPackageStatus   = 'pending_activation' | 'active' | 'expired' | 'depleted'
export type SessionStatus          = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type PaymentMethod          = 'cash' | 'transfer' | 'card' | 'other'
export type SkillLevel             = 'beginner' | 'intermediate' | 'advanced'

// ─── Joined / extended types ──────────────────────────────────────────────────
export interface ClassWithCoach extends Class {
  coaches: {
    id: string
    profiles: Pick<Profile, 'full_name' | 'avatar_url'>
  } | null
}

export interface StudentPackageWithDetails extends StudentPackage {
  packages: Package
}

export interface SkillScores {
  technique: number
  footwork:  number
  tactics:   number
  fitness:   number
}

// ─── Type guards ──────────────────────────────────────────────────────────────
export function isAdmin(role: string | null | undefined): role is 'admin' {
  return role === 'admin'
}

export function isCoach(role: string | null | undefined): role is 'coach' {
  return role === 'coach'
}

export function isActivePackage(pkg: StudentPackage): pkg is StudentPackage & { status: 'active' } {
  return pkg.status === 'active'
}
