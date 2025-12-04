// types.ts — FINAL, matches your DB exactly

export interface Lesson {
  id: number;             // bigint in DB → number in TS
  title: string;
  duration: number | null;
  thumbnail: string | null;
  created_at: string;
  module_id: string;       // uuid
  sort_order: number | null;
}

export interface Slide {
  id: string;
  lesson_id: number;
  module_id: string | null;
  image_path: string | null;
  order_index: number;
  created_at: string;
  caption_ids: string[] | null;
}

export interface Caption {
  id: string;
  slide_id: string;
  caption: string;
  seconds: number;
  line_index: number;

  published_audio_url_d: string | null;
  caption_hash_d: string | null;

  published_audio_url_a: string | null;
  caption_hash_a: string | null;

  published_audio_url_j: string | null;
  caption_hash_j: string | null;

  updated_at?: string | null;  // keep if exists in DB
}
