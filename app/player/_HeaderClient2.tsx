// app\(dashboard)\_HeaderClient2.tsx
// deno-lint-ignore-file no-sloppy-imports
"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";
import _Link from "next/link";
import Cropper from "react-easy-crop";

type EditField = "address" | "phone" | "dob" | null;
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

export default function PlayerHeader() {
  const router = useRouter();
  const nameRef = useRef<HTMLDivElement | null>(null);

  const [fullName, setFullName] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [draft, setDraft] = useState<any>({});
  const [namePulse, setNamePulse] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [editField, setEditField] = useState<EditField>(null);

  const [saving, setSaving] = useState(false);

  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);


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
          className="
            px-4 py-2 rounded-md
            border border-gray-300
            bg-white text-[#001f40]
            hover:bg-gray-100 transition
          "
          onClick={onCancel}
        >
          Cancel
        </button>

        <button
          disabled={uploading || !croppedAreaPixels}
          className={`
            px-4 py-2 rounded-md
            flex items-center gap-2
            bg-[#ca5608] text-white
            hover:bg-[#a14505]
            transition
            ${uploading ? "opacity-80 cursor-not-allowed" : ""}
          `}
          onClick={async () => {
            const blob = await getCroppedCompressedBlob(
              URL.createObjectURL(file),
              croppedAreaPixels
            );
            onSave(blob);
          }}
        >
          {uploading ? "Saving…" : "Save Photo"}
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
    setFullName(data.full_name || data.preferred_name || "Your Profile");
    setProfile(data);
    setDraft(data);
  }

  loadProfile();
}, []);

async function submitProfile() {
  if (saving) return;
  setSaving(true);
  try {
    await upsertProfile(draft);
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
  className="
    fixed
    top-0 left-0 right-0
    z-[500]
    h-16
    flex
    items-center
    bg-transparent
    pointer-events-auto
    text-white
    [&_*]:text-white
  "
      onClick={() => {
        setPreviewOpen(v => {
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
      ${namePulse ? "scale-105 text-[#ca5608]" : "scale-100"}
    `}
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

{previewOpen && profile && (
  <div
    className="
      absolute left-full top-1/2 -translate-y-1/2
      ml-6 px-4 py-3 z-50
      min-w-[1120px]
      translate-x-[15%]

    "
    onClick={(e) => e.stopPropagation()}
  >
<div
  className="
    grid
    grid-cols-4
    gap-x-16
    gap-y-2
    pr-4
    w-full
    bg-transparent
    text-white
    items-end
  "
>
      {/* ADDRESS */}
      <div
        className="text-md cursor-pointer hover:text-[#ca5608] truncate"
        onClick={() => setEditField('address')}
      >
        {profile.street ? (
          <>
            {profile.street}
            {profile.apt ? `, ${profile.apt}` : ''}{' '}
            {profile.city}, {profile.state} {profile.zip}
          </>
        ) : (
          <span className="text-md text-gray-400 italic">Add address</span>
        )}
      </div>

      {/* PHONE */}
      <div
        className="cursor-pointer hover:text-[#ca5608] flex justify-center"
        onClick={() => setEditField('phone')}
      >
        <div className="text-md text-center w-full">
          {profile.home_phone ? (
            formatUSPhone(profile.home_phone)
          ) : (
            <span className="text-md text-gray-400 italic">Add phone</span>
          )}
        </div>
      </div>

      {/* DOB */}
      <div
        className="cursor-pointer hover:text-[#ca5608] flex justify-center"
        onClick={() => setEditField('dob')}
      >
        <div className="text-md text-center w-full">
          {profile.dob ? (
            <>
              <span className="text-md font-semibold mr-1">Birthday:</span>
              {formatDOB(profile.dob)}
            </>
          ) : (
            <span className="text-md text-gray-400 italic">Add birthday</span>
          )}
        </div>
      </div>

      {/* LOG OUT */}
      <button
        className="
          text-md font-semibold
          text-[#001f40]
          hover:text-[#ca5608]
          transition
          justify-self-end
        "
        onClick={async () => {
          setPreviewOpen(false);
          await supabase.auth.signOut();
          router.replace('/');
        }}
      >
        Log Out
      </button>
    </div>
  </div>
)}
    </div>

      </div>
  </div>
        </header>
        {/* REMOVE or gate this 

<div className="h-px bg-gray-200 shadow-sm w-full" />*/}

{/* AVATAR UPLOAD MODAL */}
{avatarModalOpen && (
  <div
    className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center"
    onClick={() => setAvatarModalOpen(false)}
  >
    <div
      className="bg-white rounded-xl shadow-xl w-[360px] max-w-[90vw] p-6"
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
        {editField && (
          <div
            className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center"
            onClick={() => setEditField(null)}
          >
            <div
              className="bg-white rounded-xl shadow-xl w-[420px] max-w-[90vw] p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-[#001f40] mb-4">
                Edit {editField === "dob" ? "Birthday" : editField}
              </h2>

              {editField === "address" && (
                <div className="flex flex-col gap-2">
                  {["street", "apt", "city", "state", "zip"].map((k) => (
                    <input
                      key={k}
                      className="border px-2 py-1 text-[#001f40]"
                      placeholder={k.toUpperCase()}
                      value={draft[k] || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, [k]: e.target.value })
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
                  className="border w-full px-2 py-1 text-[#001f40]"
                  value={formatUSPhone(draft.home_phone)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      home_phone: e.target.value.replace(/\D/g, "")
                    })
                  }
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      await upsertProfile(draft);
                      setEditField(null);
                    }
                  }}
                />
              )}

              {editField === "dob" && (
                <input
                  type="date"
                  autoFocus
                  className="border w-full px-2 py-1 text-[#001f40]"
                  value={draft.dob || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, dob: e.target.value })
                  }
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      await upsertProfile(draft);
                      setEditField(null);
                    }
                  }}
                />
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  className="
                    px-4 py-2 rounded-md
                    border border-gray-300
                    bg-white text-[#001f40]
                    hover:bg-gray-100 transition
                  "
                  onClick={() => {
                    setDraft(profile);
                    setEditField(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className={`
                    px-4 py-2 rounded-md
                    flex items-center justify-center gap-2
                    bg-[#ca5608] text-white
                    hover:bg-[#a14505]
                    transition
                    ${saving ? "opacity-80 cursor-not-allowed" : ""}
                  `}
                  onClick={submitProfile}
                >
                  {saving ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
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
