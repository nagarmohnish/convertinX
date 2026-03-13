export type ContentType = "text" | "audio" | "video" | "document" | "image";
export type JobStatus = "queued" | "processing" | "completed" | "failed";

export type ToolType =
  | "translate_text"
  | "translate_audio"
  | "translate_video"
  | "translate_singing"
  | "tts"
  | "stt"
  | "doc_translate"
  | "image_ocr"
  | "audio_separate";

export interface Language {
  code: string;
  name: string;
  flag: string;
}

export interface Job {
  job_id: string;
  status: JobStatus;
  tool: ToolType;
  content_type: ContentType;
  source_language: string | null;
  target_languages: string[];
  progress: number;
  current_step: string;
  created_at: string;
  results: Record<string, ResultFiles> | null;
  singing_mode?: boolean;
}

export interface ResultFiles {
  video_file?: string;
  audio_file?: string;
  text_file?: string;
  subtitle_file?: string;
  document_file?: string;
  image_file?: string;
  vocals_file?: string;
  instrumental_file?: string;
  drums_file?: string;
  bass_file?: string;
  other_file?: string;
  transcript_file?: string;
  preview?: string;
  transcript?: string[];
  extracted_text?: string;
  translated_text?: string;
}

export interface ProgressUpdate {
  job_id: string;
  progress: number;
  step: string;
  detail: string;
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}
