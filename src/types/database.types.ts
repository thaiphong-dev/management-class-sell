export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      attendance: {
        Row: {
          id: string
          session_id: string
          student_id: string
          status: 'present' | 'absent' | 'late' | 'excused'
          checked_at: string
          checked_by: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          session_id: string
          student_id: string
          status: 'present' | 'absent' | 'late' | 'excused'
          checked_at?: string
          checked_by?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          student_id?: string
          status?: 'present' | 'absent' | 'late' | 'excused'
          checked_at?: string
          checked_by?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      class_students: {
        Row: {
          id: string
          class_id: string
          student_id: string
          joined_at: string
          status: 'active' | 'inactive' | 'graduated'
        }
        Insert: {
          id?: string
          class_id: string
          student_id: string
          joined_at?: string
          status?: 'active' | 'inactive' | 'graduated'
        }
        Update: {
          id?: string
          class_id?: string
          student_id?: string
          joined_at?: string
          status?: 'active' | 'inactive' | 'graduated'
        }
        Relationships: []
      }
      classes: {
        Row: {
          id: string
          name: string
          coach_id: string | null
          facility_id: string | null
          court_id: string | null
          max_students: number
          skill_level: 'beginner' | 'intermediate' | 'advanced' | 'kids' | 'all' | null
          schedule_days: string[] | null
          schedule_time: string | null
          duration_min: number
          description: string | null
          status: 'active' | 'inactive' | 'full'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          coach_id?: string | null
          facility_id?: string | null
          court_id?: string | null
          max_students?: number
          skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'kids' | 'all' | null
          schedule_days?: string[] | null
          schedule_time?: string | null
          duration_min?: number
          description?: string | null
          status?: 'active' | 'inactive' | 'full'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          coach_id?: string | null
          facility_id?: string | null
          court_id?: string | null
          max_students?: number
          skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'kids' | 'all' | null
          schedule_days?: string[] | null
          schedule_time?: string | null
          duration_min?: number
          description?: string | null
          status?: 'active' | 'inactive' | 'full'
          created_at?: string
        }
        Relationships: []
      }
      coaches: {
        Row: {
          id: string
          user_id: string
          specialty: string | null
          experience_years: number
          bio: string | null
          certifications: string[] | null
          status: 'active' | 'inactive'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          specialty?: string | null
          experience_years?: number
          bio?: string | null
          certifications?: string[] | null
          status?: 'active' | 'inactive'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          specialty?: string | null
          experience_years?: number
          bio?: string | null
          certifications?: string[] | null
          status?: 'active' | 'inactive'
          created_at?: string
        }
        Relationships: []
      }
      courts: {
        Row: {
          id: string
          facility_id: string
          name: string
          court_number: number | null
          status: 'available' | 'maintenance' | 'closed'
          created_at: string
        }
        Insert: {
          id?: string
          facility_id: string
          name: string
          court_number?: number | null
          status?: 'available' | 'maintenance' | 'closed'
          created_at?: string
        }
        Update: {
          id?: string
          facility_id?: string
          name?: string
          court_number?: number | null
          status?: 'available' | 'maintenance' | 'closed'
          created_at?: string
        }
        Relationships: []
      }
      facilities: {
        Row: {
          id: string
          name: string
          address: string | null
          description: string | null
          phone: string | null
          status: 'active' | 'inactive'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          description?: string | null
          phone?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          description?: string | null
          phone?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string | null
          type: 'card_expiring_sessions' | 'card_expiring_days' | 'card_expired' | 'session_cancelled' | 'card_assigned' | 'general' | null
          read_at: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          body?: string | null
          type?: 'card_expiring_sessions' | 'card_expiring_days' | 'card_expired' | 'session_cancelled' | 'card_assigned' | 'general' | null
          read_at?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          body?: string | null
          type?: 'card_expiring_sessions' | 'card_expiring_days' | 'card_expired' | 'session_cancelled' | 'card_assigned' | 'general' | null
          read_at?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      landing_settings: {
        Row: {
          id: string
          hero_title: string
          hero_subtitle: string
          center_intro: string
          contact_phone: string
          contact_email: string
          zalo_url: string
          facebook_url: string
          updated_at: string | null
          bank_id: string
          bank_account: string
          bank_account_name: string
          bank_bin: string
          bank_branch: string | null
        }
        Insert: {
          id?: string
          hero_title?: string
          hero_subtitle?: string
          center_intro?: string
          contact_phone?: string
          contact_email?: string
          zalo_url?: string
          facebook_url?: string
          updated_at?: string | null
          bank_id?: string
          bank_account?: string
          bank_account_name?: string
          bank_bin?: string
          bank_branch?: string | null
        }
        Update: {
          id?: string
          hero_title?: string
          hero_subtitle?: string
          center_intro?: string
          contact_phone?: string
          contact_email?: string
          zalo_url?: string
          facebook_url?: string
          updated_at?: string | null
          bank_id?: string
          bank_account?: string
          bank_account_name?: string
          bank_bin?: string
          bank_branch?: string | null
        }
        Relationships: []
      }
      packages: {
        Row: {
          id: string
          name: string
          package_type: 'session' | 'monthly'
          sessions_count: number | null
          validity_days: number
          price: number
          description: string | null
          is_featured: boolean
          sort_order: number
          status: 'active' | 'inactive'
          coaching_type: 'none' | '1-1' | 'group'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          package_type: 'session' | 'monthly'
          sessions_count?: number | null
          validity_days: number
          price: number
          description?: string | null
          is_featured?: boolean
          sort_order?: number
          status?: 'active' | 'inactive'
          coaching_type?: 'none' | '1-1' | 'group'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          package_type?: 'session' | 'monthly'
          sessions_count?: number | null
          validity_days?: number
          price?: number
          description?: string | null
          is_featured?: boolean
          sort_order?: number
          status?: 'active' | 'inactive'
          coaching_type?: 'none' | '1-1' | 'group'
          created_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          student_id: string
          student_package_id: string
          amount: number
          payment_method: 'cash' | 'transfer' | 'card' | 'other' | null
          status: 'paid' | 'pending' | 'refunded'
          paid_at: string
          received_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          student_package_id: string
          amount: number
          payment_method?: 'cash' | 'transfer' | 'card' | 'other' | null
          status?: 'paid' | 'pending' | 'refunded'
          paid_at?: string
          received_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          student_package_id?: string
          amount?: number
          payment_method?: 'cash' | 'transfer' | 'card' | 'other' | null
          status?: 'paid' | 'pending' | 'refunded'
          paid_at?: string
          received_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          avatar_url: string | null
          role: 'admin' | 'coach' | 'student'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          phone?: string | null
          avatar_url?: string | null
          role: 'admin' | 'coach' | 'student'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'coach' | 'student'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      progress_evaluations: {
        Row: {
          id: string
          student_id: string
          coach_id: string
          session_id: string | null
          overall_score: number | null
          skills: Json | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          coach_id: string
          session_id?: string | null
          overall_score?: number | null
          skills?: Json | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          coach_id?: string
          session_id?: string | null
          overall_score?: number | null
          skills?: Json | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          class_id: string
          court_id: string | null
          scheduled_at: string
          duration_min: number
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          cancel_reason: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          class_id: string
          court_id?: string | null
          scheduled_at: string
          duration_min?: number
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          cancel_reason?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          court_id?: string | null
          scheduled_at?: string
          duration_min?: number
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          cancel_reason?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      student_packages: {
        Row: {
          id: string
          student_id: string
          package_id: string
          purchased_at: string
          activated_at: string | null
          expires_at: string | null
          sessions_total: number | null
          sessions_remaining: number | null
          status: 'pending_activation' | 'active' | 'expired' | 'depleted'
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          package_id: string
          purchased_at?: string
          activated_at?: string | null
          expires_at?: string | null
          sessions_total?: number | null
          sessions_remaining?: number | null
          status?: 'pending_activation' | 'active' | 'expired' | 'depleted'
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          package_id?: string
          purchased_at?: string
          activated_at?: string | null
          expires_at?: string | null
          sessions_total?: number | null
          sessions_remaining?: number | null
          status?: 'pending_activation' | 'active' | 'expired' | 'depleted'
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          id: string
          user_id: string
          skill_level: 'beginner' | 'intermediate' | 'advanced'
          date_of_birth: string | null
          emergency_contact: string | null
          notes: string | null
          status: 'active' | 'inactive'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          skill_level?: 'beginner' | 'intermediate' | 'advanced'
          date_of_birth?: string | null
          emergency_contact?: string | null
          notes?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          skill_level?: 'beginner' | 'intermediate' | 'advanced'
          date_of_birth?: string | null
          emergency_contact?: string | null
          notes?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_student_packages: {
        Row: {
          id: string | null
          student_id: string | null
          package_id: string | null
          purchased_at: string | null
          activated_at: string | null
          expires_at: string | null
          sessions_total: number | null
          sessions_remaining: number | null
          status: string | null
          notes: string | null
          created_by: string | null
          created_at: string | null
          package_name: string | null
          package_type: string | null
          validity_days: number | null
          student_name: string | null
          student_phone: string | null
          alert_level: string | null
          days_remaining: number | null
        }
      }
      monthly_revenue: {
        Row: {
          month: string | null
          payment_count: number | null
          total_revenue: number | null
        }
      }
      sessions_with_details: {
        Row: {
          id: string | null
          class_id: string | null
          court_id: string | null
          scheduled_at: string | null
          duration_min: number | null
          status: string | null
          cancel_reason: string | null
          notes: string | null
          created_by: string | null
          created_at: string | null
          class_name: string | null
          class_skill_level: string | null
          coach_name: string | null
          facility_name: string | null
          court_name: string | null
        }
      }
    }
    Functions: {
      expire_overdue_packages: {
        Args: Record<string, never>
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
