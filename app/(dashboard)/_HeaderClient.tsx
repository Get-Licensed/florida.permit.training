// app\(dashboard)\_HeaderClient.tsx
// deno-lint-ignore-file no-sloppy-imports
"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";
import _Link from "next/link";
import Cropper from "react-easy-crop";

const INPUT_CLASS =
  "appearance-none w-full border border-[#001f40] \
   px-3 py-1.5 sm:py-2.5 \
   text-[14px] sm:text-[15px] \
   rounded-md bg-white text-[#001f40] \
   placeholder:text-[#001f40]/50 \
   focus:outline-none focus:ring-2 focus:ring-[#001f40]/30";
const CANCEL_BUTTON_CLASS =
  "px-4 py-2 rounded-md border border-[#001f40]/30 bg-white text-[#001f40] hover:bg-[#001f40]/5 transition";
const SAVE_BUTTON_CLASS =
  "px-4 py-2 rounded-md bg-[#ca5608] text-white font-semibold hover:bg-[#a14505] transition";
const GLASS_MODAL =
  "bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl shadow-[0_12px_40px_rgba(0,31,64,0.25)]";

type EditField = "name" | "address" | "phone" | "dob" | null;
type ProfileRow = {
  id: string;
  full_name: string | null;
  preferred_name: string | null;
  avatar_url: string | null;
  street: string | null;
  apt: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  home_phone: string | null;
  dob: string | null;
};

export default function HeaderClient() {
  const router = useRouter();
  const nameRef = useRef<HTMLDivElement | null>(null);

  const [fullName, setFullName] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [draft, setDraft] = useState<any>({});
  const [namePulse, setNamePulse] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [editField, setEditField] = useState<EditField>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileEditOpen, setMobileEditOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);


  const [saving, setSaving] = useState(false);

  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (avatarModalOpen) setAvatarModalOpen(false);
        if (editField) setEditField(null);
        if (mobileEditOpen) setMobileEditOpen(false);
      }
    };

    if (avatarModalOpen || editField || mobileEditOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }

    return undefined;
  }, [avatarModalOpen, editField, mobileEditOpen]);

async function getCroppedCompressedBlob(
  imageSrc: string,
  crop: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise(res => (image.onload = res));

  const MAX_SIZE = 256;
  const canvas = document.createElement("canvas");
  canvas.width = MAX_SIZE;
  canvas.height = MAX_SIZE;

  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    MAX_SIZE,
    MAX_SIZE
  );

  let quality = 0.9;

  return new Promise((resolve) => {
    function attempt() {
      canvas.toBlob(
        (blob) => {
          if (!blob) return;

          // ≤ 200 KB → accept
          if (blob.size <= 200 * 1024 || quality <= 0.6) {
            resolve(blob);
          } else {
            quality -= 0.1;
            attempt();
          }
        },
        "image/jpeg", // JPEG compresses far better than PNG
        quality
      );
    }

    attempt();
  });
}

function AvatarCropper({
  file,
  onCancel,
  onSave,
  uploading,
}: {
  file: File;
  onCancel: () => void;
  onSave: (blob: Blob) => void;
  uploading: boolean;
}) {
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  return (
    <>
    <div className="relative w-full aspect-[46/44] bg-black rounded-lg overflow-hidden">
        <Cropper
          image={URL.createObjectURL(file)}
          crop={crop}
          zoom={zoom}
          aspect={46 / 44}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
        />
      </div>

      <input
        type="range"
        min={1}
        max={3}
        step={0.01}
        value={zoom}
        onChange={(e) => setZoom(Number(e.target.value))}
        className="w-full mt-4"
      />

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          className={CANCEL_BUTTON_CLASS}
          onClick={onCancel}
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={uploading || !croppedAreaPixels}
          className={`${SAVE_BUTTON_CLASS} ${
            uploading || !croppedAreaPixels ? "opacity-80 cursor-not-allowed" : ""
          }`}
          onClick={async () => {
            const blob = await getCroppedCompressedBlob(
              URL.createObjectURL(file),
              croppedAreaPixels
            );
            onSave(blob);
          }}
        >
          {uploading ? "Saving…" : "Save"}
        </button>
      </div>
    </>
  );
}

  async function upsertProfile(update: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .upsert({ id: user.id, ...update }, { onConflict: "id" });

    setProfile((p: any) => ({ ...p, ...update }));
  }

  useEffect(() => {
  if (isMobile && mobileEditOpen) {
    setPreviewOpen(false);
  }
}, [isMobile, mobileEditOpen]);


useEffect(() => {
  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    let { data } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        preferred_name,
        avatar_url,
        street,
        apt,
        city,
        state,
        zip,
        home_phone,
        dob
      `)
      .eq("id", session.user.id)
      .single();

    // 👇 THIS IS WHERE baseProfile GOES
    if (!data) {
      const baseProfile: ProfileRow = {
        id: session.user.id,
        full_name: session.user.user_metadata?.full_name ?? null,
        preferred_name: session.user.user_metadata?.name ?? null,
        avatar_url: null,
        street: null,
        apt: null,
        city: null,
        state: null,
        zip: null,
        home_phone: null,
        dob: null,
      };

      await supabase.from("profiles").insert(baseProfile);
      data = baseProfile;
    }

    // 👇 EXISTING STATE SETTERS (unchanged)
    setFullName(data.full_name || data.preferred_name || "Edit Profile");
    setProfile(data);
    setDraft(data);
  }

  loadProfile();
}, []);

async function submitProfile() {
  if (saving) return;
  setSaving(true);

  try {
    const cleanFullName =
      draft.full_name
        ?.replace(/\s+/g, " ")
        .trim() || null;

    await upsertProfile({
      ...draft,
      full_name: cleanFullName,
    });

    setFullName(
      cleanFullName ||
      draft.preferred_name ||
      "Your Profile"
    );

    setEditField(null);
  } finally {
    setSaving(false);
  }
}

function handleDrop(e: React.DragEvent) {
  e.preventDefault();
  setDragOver(false);

  const file = e.dataTransfer.files?.[0];
  if (!file || !file.type.startsWith("image/")) return;

  setAvatarFile(file);
}

async function cropToSquare(file: File): Promise<Blob> {
  const img = new Image();
  img.src = URL.createObjectURL(file);

  await new Promise(res => (img.onload = res));

  const size = Math.min(img.width, img.height);
  const sx = (img.width - size) / 2;
  const sy = (img.height - size) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, sx, sy, size, size, 0, 0, 256, 256);

  return new Promise((res) =>
    canvas.toBlob((b) => res(b!), "image/png")
  );
}

  async function uploadAvatar(blob: Blob) {
  if (uploading) return; // ✅ only guard we need

  setUploading(true);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const filename = `avatar_${user.id}.png`;

    const { error: uploadError } = await supabase.storage
      .from("Profile")
      .upload(filename, blob, {
        upsert: true,
        contentType: "image/png",
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("Profile")
      .getPublicUrl(filename);

    const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

    const { error: dbError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (dbError) throw dbError;

    setProfile((p: any) => ({
      ...p,
      avatar_url: publicUrl,
    }));

    setAvatarModalOpen(false);
    setAvatarFile(null);
  } catch (err) {
    console.error("Avatar upload failed:", err);
  } finally {
    setUploading(false);
  }
}


  function formatUSPhone(value?: string) {
  if (!value) return "";

  const digits = value.replace(/\D/g, "").replace(/^1/, "");

  if (digits.length <= 3) return digits;
  if (digits.length <= 6)
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

  function formatDOB(value?: string) {
    if (!value) return "—";
    const d = new Date(value);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
      }
    return (
    <>
    
 <header
  className="relative h-16 flex items-center overflow-visible"
  onClick={() => {
    if (isMobile || mobileEditOpen) return;

    setPreviewOpen((v) => {
      const next = !v;
      if (next) {
        setNamePulse(true);
        setTimeout(() => setNamePulse(false), 500);
      }
      return next;
    });
  }}
>

    <div className="flex items-baseline h-16 px-3 py-5 w-full gap-6 pl-[80px]">

  {/* LOGO (absolute, baseline-safe) */}
<div
  className="
    absolute left-3 top-0
    h-20 w-20
    translate-y-[24px]
    cursor-pointer
    z-[40]
  "
  onClick={(e) => {
    e.stopPropagation();
    setAvatarModalOpen(true);
  }}
>
  {/* BASE LOGO */}
  <img
    src="/logo.png"
    alt="Florida Permit Training"
    className="h-20 w-20 block"
    style={{
      filter: `
        drop-shadow(0 0 1px white)
        drop-shadow(0 0 1px white)
        drop-shadow(0 0 1px white)
        drop-shadow(0 0 1px white)
        drop-shadow(0 0 1px white)
        drop-shadow(0 0 1px white)
      `,
    }}
  />

{/* AVATAR OVERLAY */}
{profile?.avatar_url && (
  <img
    key={profile.avatar_url}
    src={`${profile.avatar_url}?t=${Date.now()}`}
    alt="Profile photo"
    className="
      absolute
      top-[4%] left-[48%]
      w-[46%] h-[44%]
      object-cover
      z-20
      border border-[#001f40]
      rounded-[5px]
      bg-white
    "
  />
)}


</div>
  
  <div className="flex items-baseline h-16 px-3 pl-[26px] gap-6 w-full">
    {/* NAME + INLINE PREVIEW */}
    <div ref={nameRef} className="relative select-none">
<div className="flex items-center gap-2">
<div
  className={`
    text-[#001f40] text-lg font-semibold truncate max-w-[260px]
    transition-all duration-500 ease-out
    cursor-pointer hover:text-[#ca5608]
    ${namePulse ? "scale-105 text-[#ca5608]" : "scale-100"}
  `}
onClick={(e) => {
  e.stopPropagation();
  if (isMobile) {
    setMobileEditOpen(true);
  } else {
    setEditField("name");
  }
}}
>
  {fullName}
</div>
  {/* EDIT / CLOSE ICON */}
  <div
    className="
      text-[#001f40]
      hover:text-[#ca5608]
      transition
      flex items-center
    "
  >
    {previewOpen ? (
      /* CLOSE (X) */
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="6" y1="6" x2="18" y2="18" />
        <line x1="18" y1="6" x2="6" y2="18" />
      </svg>
    ) : (
      /* PENCIL */
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zM20.7 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
      </svg>
    )}
  </div>
</div>

{!isMobile && !mobileEditOpen && previewOpen && profile && (
  <div
    className="
      absolute left-full top-1/2 -translate-y-1/2
      ml-4 z-50
      min-w-[720px] max-w-[768px]
    "
    onClick={(e) => e.stopPropagation()}
  >
    {/* GLASS PANEL */}
    <div
      className="
        border border-white/40
        px-6 py-4
      "
    >
      <div
  className="
    flex items-center gap-6
    text-sm text-[#001f40]
    whitespace-nowrap
  "
>
<div className="flex items-center gap-6 flex-1 min-w-0">

        {/* ADDRESS */}
        <div
          className="cursor-pointer hover:text-[#ca5608] truncate"
          onClick={() => setEditField("address")}
        >
          {profile.street ? (
            <>
              {profile.street}
              {profile.apt ? `, ${profile.apt}` : ""}{" "}
              {profile.city}, {profile.state} {profile.zip}
            </>
          ) : (
            <span className="text-gray-400 italic">Add address</span>
          )}
        </div>

        {/* PHONE */}
        <div
          className="cursor-pointer hover:text-[#ca5608] text-center"
          onClick={() => setEditField("phone")}
        >
          {profile.home_phone ? (
            formatUSPhone(profile.home_phone)
          ) : (
            <span className="text-gray-400 italic">Add phone</span>
          )}
        </div>

        {/* DOB */}
        <div
          className="cursor-pointer hover:text-[#ca5608] text-center"
          onClick={() => setEditField("dob")}
        >
          {profile.dob ? (
            <>
              <span className="font-semibold mr-1">Birthday:</span>
              {formatDOB(profile.dob)}
            </>
          ) : (
            <span className="text-gray-400 italic">Add birthday</span>
          )}
        </div>

        {/* LOG OUT — ALWAYS RIGHT */}
        <button
          className="
                    ml-auto
                    font-semibold
                    text-[#001f40]
                    hover:text-[#ca5608]
                    transition
                    flex-shrink-0
                  "
            onClick={async () => {
            setPreviewOpen(false);
            await supabase.auth.signOut();
            router.replace("/");
          }}
        >
          Log Out
        </button>
      </div>
    </div>
  </div>
</div>
)}
    </div>
   </div>
  </div>
        </header>
<div className="h-px bg-gray-200 shadow-sm w-full" />

{/* AVATAR UPLOAD MODAL */}
{avatarModalOpen && (
  <div
    className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center"
    onClick={() => setAvatarModalOpen(false)}
  >
    <div
      className={`${GLASS_MODAL} w-[360px] max-w-[90vw] p-6`}
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-xl font-bold text-[#001f40] mb-4">
        Update Profile Photo
      </h2>

      {/* DROP ZONE */}
      {!avatarFile && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            cursor-pointer
            flex items-center justify-center
            h-[260px]
            border-2 border-dashed
            rounded-lg
            transition
            ${dragOver
              ? "border-[#ca5608] bg-[#ca5608]/10"
              : "border-[#001f40] bg-[#001f40]/5"}
          `}
        >
          <div className="text-center text-[#001f40] text-sm">
            <div className="font-semibold mb-1">
              Drag & drop your photo here
            </div>
            <div>or click to upload</div>
            <div className="text-xs mt-2 opacity-70">
              JPG or PNG · Portrait works best
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setAvatarFile(f);
            }}
          />
        </div>
      )}

      {!avatarFile && (
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            className={CANCEL_BUTTON_CLASS}
            onClick={() => setAvatarModalOpen(false)}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled
            className={`${SAVE_BUTTON_CLASS} opacity-80 cursor-not-allowed`}
          >
            Save
          </button>
        </div>
      )}

      {/* CROPPER */}
      {avatarFile && (
        <AvatarCropper
          file={avatarFile}
          onCancel={() => setAvatarFile(null)}
          onSave={uploadAvatar}
          uploading={uploading}
        />
      )}
    </div>
  </div>
)}

        {/* MODAL */}

        {mobileEditOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center"
          onClick={() => setMobileEditOpen(false)}
        >
          <div
            className={`${GLASS_MODAL} w-[92vw] max-h-[90vh] overflow-y-auto p-5`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-[#001f40] mb-4">
              Edit Profile
            </h2>
      <div className="flex flex-col gap-3">
        <input
          className={INPUT_CLASS}
          placeholder="Full name"
          value={draft.full_name || ""}
          onChange={(e) =>
            setDraft({ ...draft, full_name: e.target.value })
          }
        />

        <input
          className={INPUT_CLASS}
          placeholder="Preferred name"
          value={draft.preferred_name || ""}
          onChange={(e) =>
            setDraft({ ...draft, preferred_name: e.target.value })
          }
        />

        <input
          className={INPUT_CLASS}
          placeholder="Street"
          value={draft.street || ""}
          onChange={(e) =>
            setDraft({ ...draft, street: e.target.value })
          }
        />

        <input
          className={INPUT_CLASS}
          placeholder="Apt / Unit"
          value={draft.apt || ""}
          onChange={(e) =>
            setDraft({ ...draft, apt: e.target.value })
          }
        />

        <input
          className={INPUT_CLASS}
          placeholder="City"
          value={draft.city || ""}
          onChange={(e) =>
            setDraft({ ...draft, city: e.target.value })
          }
        />

        <input
          className={INPUT_CLASS}
          placeholder="State"
          value={draft.state || ""}
          onChange={(e) =>
            setDraft({ ...draft, state: e.target.value })
          }
        />

        <input
          className={INPUT_CLASS}
          placeholder="ZIP"
          value={draft.zip || ""}
          onChange={(e) =>
            setDraft({ ...draft, zip: e.target.value })
          }
        />

        <input
          className={INPUT_CLASS}
          placeholder="Phone"
          value={formatUSPhone(draft.home_phone)}
          onChange={(e) =>
            setDraft({
              ...draft,
              home_phone: e.target.value.replace(/\D/g, ""),
            })
          }
        />

        <input
          type="date"
          className={`
            ${INPUT_CLASS}
            text-[#001f40]/60
            [&:not(:valid)]:text-[#001f40]/50
            [&:valid]:text-[#001f40]
          `}
          value={draft.dob || ""}
          onChange={(e) => setDraft({ ...draft, dob: e.target.value })}
        />

              </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                className={CANCEL_BUTTON_CLASS}
                onClick={() => {
                  setDraft(profile);
                  setMobileEditOpen(false);
                }}
              >
                Cancel
              </button>

              <button
                className={SAVE_BUTTON_CLASS}
                onClick={async () => {
                  await submitProfile();
                  setMobileEditOpen(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

        {editField && (
          <div
            className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center"
            onClick={() => setEditField(null)}
          >
              <div
            className={`${GLASS_MODAL} w-[420px] max-w-[90vw] p-6`}
            onClick={(e) => e.stopPropagation()}
          >
              <h2 className="text-xl font-bold text-[#001f40] mb-4">
                Edit {editField === "dob" ? "birthday" : editField}
              </h2>
                            {/* NAME */}
              {editField === "name" && (
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitProfile();
                  }}
                >
                <input
                autoFocus
                className={INPUT_CLASS}
                placeholder="Full name"
                value={draft.full_name || ""}
                onChange={(e) =>
                  setDraft({ ...draft, full_name: e.target.value })
                }
                onKeyDownCapture={(e) => {
                  e.stopPropagation();
                  (e.nativeEvent as any).stopImmediatePropagation?.();
                }}
              />

                  <input
                    className={INPUT_CLASS}
                    placeholder="Preferred name (optional)"
                    value={draft.preferred_name || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, preferred_name: e.target.value })
                    }
                  />
                </form>
              )}

         {editField === "address" && (
            <div className="flex flex-col gap-2">
              {[
                { key: "street", label: "Street" },
                { key: "apt", label: "Apt / Unit" },
                { key: "city", label: "City" },
                { key: "state", label: "State" },
                { key: "zip", label: "ZIP" },
              ].map(({ key, label }) => (
                <input
                  key={key}
                  className={INPUT_CLASS}
                  placeholder={label}
                  value={draft[key] || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitProfile();
                    }
                  }}
                />
              ))}
                </div>
              )}

              {editField === "phone" && (
                <input
                  autoFocus
                  className={INPUT_CLASS}
                  value={formatUSPhone(draft.home_phone)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      home_phone: e.target.value.replace(/\D/g, "")
                    })
                  }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitProfile();
                }
              }}
                />
              )}

              {editField === "dob" && (
                <input
                  type="date"
                  autoFocus
                  className={INPUT_CLASS}
                  value={draft.dob || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, dob: e.target.value })
                  }
                 onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitProfile();
                  }
                }}
                />
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  className={CANCEL_BUTTON_CLASS}
                  onClick={() => {
                    setDraft(profile);
                    setEditField(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className={`${SAVE_BUTTON_CLASS} ${
                    saving ? "opacity-80 cursor-not-allowed" : ""
                  }`}
                  onClick={submitProfile}
                >
                  {saving ? (
                    <>
                      <svg
                        className="inline-block animate-spin h-4 w-4 text-white mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-30"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-80"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4l-3 3H4z"
                        />
                      </svg>
                      Saving…
                    </>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
