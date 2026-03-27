export type ShareResourceType = "cv" | "job_description";
export type CVShareViewMode = "shell";

export interface ShareInfo {
  public_url: string;
  token?: string | null;
  is_shared: boolean;
  created_at?: string | null;
  view_mode?: CVShareViewMode | null;
}

export interface ShareViewRecord {
  viewer_ip?: string | null;
  user_agent?: string | null;
  referer?: string | null;
  viewed_at?: string | null;
}

export interface ShareAnalytics {
  total_views: number;
  unique_ips: number;
  recent_views: ShareViewRecord[];
}

export interface PublicCVData {
  id: string;
  original_filename: string;
  parsed_data?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  view_mode: CVShareViewMode;
  resource_type: "cv";
}

export interface PublicJobDescriptionData {
  id: string;
  title?: string | null;
  company?: string | null;
  location?: string | null;
  content: string;
  source_url?: string | null;
  requirements?: unknown;
  created_at: string;
  updated_at: string;
  resource_type: "job_description";
}
