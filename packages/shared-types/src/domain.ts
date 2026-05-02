// Custom domain types — grows as we build
// Database types will be generated here via: supabase gen types typescript

export type PipelineStage =
  | 'new'
  | 'qualified'
  | 'visit_scheduled'
  | 'visit_done'
  | 'proposal'
  | 'cpcv'
  | 'escritura'
  | 'lost'

export type LeadScore = 'Hot' | 'Warm' | 'Cold' | 'Time-waster'

export type Language = 'pt' | 'en' | 'fr'
