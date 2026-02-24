export type ContentType = "text" | "audio" | "video";
export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface Language {
  code: string;
  name: string;
  flag: string;
}

export interface Job {
  job_id: string;
  status: JobStatus;
  content_type: ContentType;
  source_language: string | null;
  target_languages: string[];
  progress: number;
  current_step: string;
  created_at: string;
  results: Record<string, ResultFiles> | null;
}

export interface ResultFiles {
  video_file?: string;
  audio_file?: string;
  text_file?: string;
  subtitle_file?: string;
  preview?: string;
  transcript?: string[];
}

export interface ProgressUpdate {
  job_id: string;
  progress: number;
  step: string;
  detail: string;
}
