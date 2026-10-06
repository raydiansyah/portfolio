export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_activity: {
        Row: {
          action: string
          actor_id: string | null
          entity: string
          entity_id: string | null
          id: string
          occurred_at: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          occurred_at?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          occurred_at?: string
        }
        Relationships: []
      }
      experiences: {
        Row: {
          created_at: string
          end_year: number | null
          id: string
          is_published: boolean
          location: string | null
          order_index: number
          organization: string
          role: string
          stack: string[]
          start_year: number
          summary: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_year?: number | null
          id?: string
          is_published?: boolean
          location?: string | null
          order_index?: number
          organization: string
          role: string
          stack?: string[]
          start_year: number
          summary?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_year?: number | null
          id?: string
          is_published?: boolean
          location?: string | null
          order_index?: number
          organization?: string
          role?: string
          stack?: string[]
          start_year?: number
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      keahlian: {
        Row: {
          dibuat_pada: string
          diperbarui_pada: string
          id: string
          kategori: string
          nama: string
          status_tampil: boolean
          urutan: number
        }
        Insert: {
          dibuat_pada?: string
          diperbarui_pada?: string
          id?: string
          kategori?: string
          nama: string
          status_tampil?: boolean
          urutan?: number
        }
        Update: {
          dibuat_pada?: string
          diperbarui_pada?: string
          id?: string
          kategori?: string
          nama?: string
          status_tampil?: boolean
          urutan?: number
        }
        Relationships: []
      }
      langganan: {
        Row: {
          created_by: string | null
          dibuat_pada: string
          email: string
          id: string
          status: string
        }
        Insert: {
          created_by?: string | null
          dibuat_pada?: string
          email: string
          id?: string
          status?: string
        }
        Update: {
          created_by?: string | null
          dibuat_pada?: string
          email?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      material: {
        Row: {
          cover_url: string | null
          kategori: Database["public"]["Enums"]["slide_module"]
          urutan: number
          akses_berakhir_pada: string | null
          akses_kode: string | null
          created_by: string
          deskripsi: string
          dibuat_pada: string
          diperbarui_pada: string
          id: string
          judul: string
          slug: string
          status_tampil: boolean
        }
        Insert: {
          cover_url?: string | null
          kategori?: Database["public"]["Enums"]["slide_module"]
          urutan?: number
          akses_berakhir_pada?: string | null
          akses_kode?: string | null
          created_by: string
          deskripsi?: string
          dibuat_pada?: string
          diperbarui_pada?: string
          id?: string
          judul: string
          slug: string
          status_tampil?: boolean
        }
        Update: {
          cover_url?: string | null
          kategori?: Database["public"]["Enums"]["slide_module"]
          urutan?: number
          akses_berakhir_pada?: string | null
          akses_kode?: string | null
          created_by?: string
          deskripsi?: string
          dibuat_pada?: string
          diperbarui_pada?: string
          id?: string
          judul?: string
          slug?: string
          status_tampil?: boolean
        }
        Relationships: []
      }
      pengalaman: {
        Row: {
          dibuat_pada: string
          diperbarui_pada: string
          id: string
          judul: string
          periode: string
          ringkasan: string
          stack: string
          status_tampil: boolean
          urutan: number
        }
        Insert: {
          dibuat_pada?: string
          diperbarui_pada?: string
          id?: string
          judul: string
          periode: string
          ringkasan: string
          stack: string
          status_tampil?: boolean
          urutan?: number
        }
        Update: {
          dibuat_pada?: string
          diperbarui_pada?: string
          id?: string
          judul?: string
          periode?: string
          ringkasan?: string
          stack?: string
          status_tampil?: boolean
          urutan?: number
        }
        Relationships: []
      }
      pesan_kontak: {
        Row: {
          dibalas_pada: string | null
          penting: boolean
          dibuat_pada: string
          email: string
          id: string
          jenis_layanan: string | null
          nama: string
          perkiraan_anggaran: string
          pesan: string
          status: string
          telepon: string | null
        }
        Insert: {
          dibalas_pada?: string | null
          penting?: boolean
          dibuat_pada?: string
          email: string
          id?: string
          jenis_layanan?: string | null
          nama: string
          perkiraan_anggaran?: string
          pesan: string
          status?: string
          telepon?: string | null
        }
        Update: {
          dibalas_pada?: string | null
          penting?: boolean
          dibuat_pada?: string
          email?: string
          id?: string
          jenis_layanan?: string | null
          nama?: string
          perkiraan_anggaran?: string
          pesan?: string
          status?: string
          telepon?: string | null
        }
        Relationships: []
      }
      portfolio_click: {
        Row: {
          clicked_at: string
          id: string
          portfolio_id: string
        }
        Insert: {
          clicked_at?: string
          id?: string
          portfolio_id: string
        }
        Update: {
          clicked_at?: string
          id?: string
          portfolio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_click_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portofolio"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          category: string
          created_at: string
          description: string | null
          featured: boolean
          id: string
          live_url: string | null
          order_index: number
          published_at: string | null
          repo_url: string | null
          slug: string
          status: Database["public"]["Enums"]["publish_status"]
          summary: string | null
          tech_stack: string[]
          thumbnail_url: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          live_url?: string | null
          order_index?: number
          published_at?: string | null
          repo_url?: string | null
          slug: string
          status?: Database["public"]["Enums"]["publish_status"]
          summary?: string | null
          tech_stack?: string[]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          live_url?: string | null
          order_index?: number
          published_at?: string | null
          repo_url?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["publish_status"]
          summary?: string | null
          tech_stack?: string[]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      portofolio: {
        Row: {
          created_by: string | null
          durasi: string | null
          galeri: string[]
          id: string
          judul: string
          kategori: Database["public"]["Enums"]["portfolio_category"]
          ringkasan: string
          slug: string
          solusi: string | null
          status_tampil: boolean
          tanggal: string
          tantangan: string | null
          teknologi: string[]
          tujuan: string | null
          url_demo: string | null
          url_gambar: string | null
        }
        Insert: {
          created_by?: string | null
          durasi?: string | null
          galeri?: string[]
          id?: string
          judul: string
          kategori: Database["public"]["Enums"]["portfolio_category"]
          ringkasan: string
          slug: string
          solusi?: string | null
          status_tampil?: boolean
          tanggal?: string
          tantangan?: string | null
          teknologi?: string[]
          tujuan?: string | null
          url_demo?: string | null
          url_gambar?: string | null
        }
        Update: {
          created_by?: string | null
          durasi?: string | null
          galeri?: string[]
          id?: string
          judul?: string
          kategori?: Database["public"]["Enums"]["portfolio_category"]
          ringkasan?: string
          slug?: string
          solusi?: string | null
          status_tampil?: boolean
          tanggal?: string
          tantangan?: string | null
          teknologi?: string[]
          tujuan?: string | null
          url_demo?: string | null
          url_gambar?: string | null
        }
        Relationships: []
      }
      profil_situs: {
        Row: {
          diperbarui_pada: string
          id: number
          judul: string
          label: string
          ringkasan: string
          status_tampil: boolean
          toolkit: string[]
          url_cv: string | null
          url_github: string | null
          url_instagram: string | null
          url_linkedin: string | null
        }
        Insert: {
          diperbarui_pada?: string
          id?: number
          judul: string
          label: string
          ringkasan: string
          status_tampil?: boolean
          toolkit?: string[]
          url_cv?: string | null
          url_github?: string | null
          url_instagram?: string | null
          url_linkedin?: string | null
        }
        Update: {
          diperbarui_pada?: string
          id?: number
          judul?: string
          label?: string
          ringkasan?: string
          status_tampil?: boolean
          toolkit?: string[]
          url_cv?: string | null
          url_github?: string | null
          url_instagram?: string | null
          url_linkedin?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          email: string | null
          full_name: string
          headline: string | null
          id: string
          location: string | null
          phone: string | null
          social_links: Json
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          email?: string | null
          full_name: string
          headline?: string | null
          id: string
          location?: string | null
          phone?: string | null
          social_links?: Json
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          email?: string | null
          full_name?: string
          headline?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          social_links?: Json
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          name: string
          order_index: number
          price_label: string | null
          tier: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
          price_label?: string | null
          tier?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          price_label?: string | null
          tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          favicon_url: string | null
          id: number
          legal_address: string | null
          legal_email: string | null
          legal_entity_name: string | null
          legal_entity_type: string | null
          legal_registration_number: string | null
          logo_url: string | null
          privacy_md: string | null
          site_name: string
          terms_md: string | null
          updated_at: string
        }
        Insert: {
          favicon_url?: string | null
          id?: number
          legal_address?: string | null
          legal_email?: string | null
          legal_entity_name?: string | null
          legal_entity_type?: string | null
          legal_registration_number?: string | null
          logo_url?: string | null
          privacy_md?: string | null
          site_name?: string
          terms_md?: string | null
          updated_at?: string
        }
        Update: {
          favicon_url?: string | null
          id?: number
          legal_address?: string | null
          legal_email?: string | null
          legal_entity_name?: string | null
          legal_entity_type?: string | null
          legal_registration_number?: string | null
          logo_url?: string | null
          privacy_md?: string | null
          site_name?: string
          terms_md?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          category: Database["public"]["Enums"]["skill_category"]
          created_at: string
          icon_url: string | null
          id: string
          level: number
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["skill_category"]
          created_at?: string
          icon_url?: string | null
          id?: string
          level?: number
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["skill_category"]
          created_at?: string
          icon_url?: string | null
          id?: string
          level?: number
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      slide_access_logs: {
        Row: {
          accessed_at: string
          id: string
          ip_hash: string | null
          referrer: string | null
          slide_id: string
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string
          id?: string
          ip_hash?: string | null
          referrer?: string | null
          slide_id: string
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string
          id?: string
          ip_hash?: string | null
          referrer?: string | null
          slide_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slide_access_logs_slide_id_fkey"
            columns: ["slide_id"]
            isOneToOne: false
            referencedRelation: "slide_presentasi"
            referencedColumns: ["id"]
          },
        ]
      }
      slide_presentasi: {
        Row: {
          deskripsi: string | null
          izinkan_unduh: boolean
          jumlah_halaman: number | null
          outline: Json
          presenter: string | null
          created_by: string
          dibuat_pada: string
          id: string
          judul: string
          material_id: string | null
          mime_type: string
          slug: string
          status_tampil: boolean
          storage_path: string
          urutan: number
        }
        Insert: {
          deskripsi?: string | null
          izinkan_unduh?: boolean
          jumlah_halaman?: number | null
          outline?: Json
          presenter?: string | null
          created_by: string
          dibuat_pada?: string
          id?: string
          judul: string
          material_id?: string | null
          mime_type: string
          slug: string
          status_tampil?: boolean
          storage_path: string
          urutan?: number
        }
        Update: {
          deskripsi?: string | null
          izinkan_unduh?: boolean
          jumlah_halaman?: number | null
          outline?: Json
          presenter?: string | null
          created_by?: string
          dibuat_pada?: string
          id?: string
          judul?: string
          material_id?: string | null
          mime_type?: string
          slug?: string
          status_tampil?: boolean
          storage_path?: string
          urutan?: number
        }
        Relationships: [
          {
            foreignKeyName: "slide_presentasi_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material"
            referencedColumns: ["id"]
          },
        ]
      }
      testimoni: {
        Row: {
          created_by: string | null
          id: string
          jabatan: string | null
          kutipan: string
          nama: string
          status_tampil: boolean
          tanggal: string
        }
        Insert: {
          created_by?: string | null
          id?: string
          jabatan?: string | null
          kutipan: string
          nama: string
          status_tampil?: boolean
          tanggal?: string
        }
        Update: {
          created_by?: string | null
          id?: string
          jabatan?: string | null
          kutipan?: string
          nama?: string
          status_tampil?: boolean
          tanggal?: string
        }
        Relationships: []
      }
    }
    Views: {
      portfolio_click_daily: {
        Row: {
          click_count: number | null
          clicked_date: string | null
          judul: string | null
          portfolio_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_click_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portofolio"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_public_module: { Args: { p_slug: string }; Returns: Json }
      get_public_slide: { Args: { p_slug: string }; Returns: Json }
      increment_portfolio_view: { Args: { p_slug: string }; Returns: undefined }
      submit_contact_as_service: {
        Args: {
          p_body: string
          p_budget: string
          p_email: string
          p_ip: string
          p_name: string
          p_phone: string
          p_service: string
        }
        Returns: string
      }
      verify_slide_access_as_service: {
        Args: {
          p_code: string
          p_ip: string
          p_referrer: string
          p_slug: string
          p_user_agent: string
        }
        Returns: Json
      }
    }
    Enums: {
      inbox_status: "unread" | "read" | "archived"
      portfolio_category: "aplikasi-web" | "website" | "company-profile"
      publish_status: "draft" | "published"
      skill_category:
        | "frontend"
        | "backend"
        | "devops"
        | "design"
        | "teaching"
        | "other"
      slide_file_type: "html" | "pdf" | "ppt"
      slide_module: "materi_kuliah" | "presentasi_klien" | "workshop"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      inbox_status: ["unread", "read", "archived"],
      portfolio_category: ["aplikasi-web", "website", "company-profile"],
      publish_status: ["draft", "published"],
      skill_category: [
        "frontend",
        "backend",
        "devops",
        "design",
        "teaching",
        "other",
      ],
      slide_file_type: ["html", "pdf", "ppt"],
      slide_module: ["materi_kuliah", "presentasi_klien", "workshop"],
    },
  },
} as const
