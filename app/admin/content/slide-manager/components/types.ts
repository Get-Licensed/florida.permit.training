// types.ts — FINAL & FULLY SYNCED WITH DATABASE + FRONTEND LOGIC

export interface Lesson {
  id: number;
  title: string;
  duration: number | null;
  thumbnail: string | null;
  created_at: string;
  module_id: string;               // uuid
  sort_order: number | null;
}

export interface Slide {
  id: string;                      // uuid
  lesson_id: number;
  module_id: string | null;
  image_path: string | null;
  order_index: number;
  created_at: string;

  // optional because it's NOT part of your DB schema
  caption_ids?: string[] | null;
}

export interface Caption {
  id: string;                      // uuid
  slide_id: string;                // uuid FK → lesson_slides
  caption: string;
  seconds: number;
  line_index: number;

  // --- AUDIO URLs (nullable in DB) ---
  published_audio_url_a: string | null;
  published_audio_url_d: string | null;
  published_audio_url_j: string | null;
  published_audio_url_o: string | null;

  // --- HASHES (nullable in DB) ---
  caption_hash_a: string | null;
  caption_hash_d: string | null;
  caption_hash_j: string | null;
  caption_hash_o: string | null;

  // DB sets this — may be missing when creating new captions in FE
  updated_at?: string | null;

  // LOCAL-ONLY FIELD — not stored in DB
  // Used to *force* hash regeneration when resetting audio
  forcedHash?: string | null;
}
