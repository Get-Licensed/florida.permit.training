// types.ts — FINAL & FULLY SYNCED WITH DATABASE

export interface Lesson {
  id: number;                 
  title: string;
  duration: number | null;
  thumbnail: string | null;
  created_at: string;
  module_id: string;          // uuid
  sort_order: number | null;
}

export interface Slide {
  id: string;                 // uuid
  lesson_id: number;
  module_id: string | null;
  image_path: string | null;
  order_index: number;
  created_at: string;
  caption_ids?: string[] | null; // optional
}

export interface Caption {
  id: string;                 // uuid
  slide_id: string;           // uuid FK → lesson_slides
  caption: string;
  seconds: number;
  line_index: number;

  // --- AUDIO URLs ---
  published_audio_url_a: string | null;   // Voice A
  published_audio_url_d: string | null;   // Voice D
  published_audio_url_j: string | null;   // Voice J
  published_audio_url_o: string | null;   // Voice O

  // --- HASHES ---
  caption_hash_a: string | null;
  caption_hash_d: string | null;
  caption_hash_j: string | null;
  caption_hash_o: string | null;

  updated_at?: string | null;
}
