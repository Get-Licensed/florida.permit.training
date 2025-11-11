"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";

const BRAND_BLUE = "#001f40";
const BRAND_ORANGE = "#ca5608";

export default function UpdateProfilePage() {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noSSN, setNoSSN] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resetStatus, setResetStatus] = useState<"idle" | "sent" | "error">("idle");

  const [formData, setFormData] = useState({
    full_name: "",
    preferred_name: "",
    email: "",
    street: "",
    apt: "",
    city: "",
    state: "",
    country: "",
    zip: "",
    home_phone: "",
    dob: "",
    gender: "",
    ssn_last5: "",
    alien_reg: "",
    non_alien_reg: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/sign-in");
        return;
      }

      const meta = user.user_metadata || {};
      const email = user.email || "";

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Fetch profile error:", error);
        setLoading(false);
        return;
      }

      setFormData({
        full_name: profile?.full_name || meta.full_name || "",
        preferred_name: profile?.preferred_name || "",
        email,
        street: profile?.street || "",
        apt: profile?.apt || "",
        city: profile?.city || "",
        state: profile?.state || "",
        country: profile?.country || "",
        zip: profile?.zip || "",
        home_phone: profile?.home_phone || "",
        dob: profile?.dob || meta.dob || "",
        gender: profile?.gender || "",
        ssn_last5: profile?.ssn_last5 || "",
        alien_reg: profile?.alien_reg || "",
        non_alien_reg: profile?.non_alien_reg || "",
      });

      setLoading(false);
    };
    fetchProfile();
  }, [router]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((f) => ({ ...f, [name]: value }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/sign-in");
  };

  const handleResetPassword = async () => {
    if (resetStatus !== "idle") return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      setResetStatus("error");
      setTimeout(() => setResetStatus("idle"), 10000);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });

    if (error) {
      console.error("Reset password error:", error);
      setResetStatus("error");
    } else {
      setResetStatus("sent");
    }

    setTimeout(() => setResetStatus("idle"), 10000);
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMsg("No user session found.");
      setSaving(false);
      return;
    }

    const { email, ...updatableFields } = formData;

    if (noSSN) {
      updatableFields.ssn_last5 = null;
    } else {
      updatableFields.alien_reg = null;
      updatableFields.non_alien_reg = null;
    }

    const { error: metaErr } = await supabase.auth.updateUser({
      data: {
        full_name: formData.full_name,
        dob: formData.dob,
      },
    });

    if (metaErr) {
      console.error(metaErr);
      setErrorMsg("Failed to update user metadata.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        ...updatableFields,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Profile update error:", error);
      setErrorMsg("Error saving profile.");
      setSaving(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* HEADER WITH MENU BUTTON ONLY */}
      <header className="h-4" />

      {/* PAGE TITLE AND RESET LINK */}
      <section className="px-8 pt-6 max-w-6xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-[#001f40] mb-2">Update Your Profile</h1>
        <p
          className={`text-sm underline cursor-pointer mb-6 inline-block ${
            resetStatus === "sent"
              ? "text-green-600"
              : resetStatus === "error"
              ? "text-red-600"
              : "text-[#001f40] hover:text-[#ca5608]"
          }`}
          onClick={handleResetPassword}
        >
          {resetStatus === "sent"
            ? "✅ Password reset sent to your email"
            : resetStatus === "error"
            ? "⚠️ Please wait 10 seconds before retrying"
            : "Reset your password"}
        </p>
      </section>

      <form
        onSubmit={handleSave}
        className={`flex-1 p-8 max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${
          saving ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <Input label="Full Legal Name" name="full_name" value={formData.full_name} onChange={handleChange} required />
        <Input label="Preferred Name" name="preferred_name" value={formData.preferred_name} onChange={handleChange} />
        <Input label="Email Address" name="email" value={formData.email} disabled />
        <Input label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleChange} />
        <Input label="Gender" name="gender" value={formData.gender} onChange={handleChange} />
        <Input label="Street Address" name="street" value={formData.street} onChange={handleChange} />
        <Input label="Apt / Suite #" name="apt" value={formData.apt} onChange={handleChange} />
        <Input label="City" name="city" value={formData.city} onChange={handleChange} />
        <Input label="State / Province" name="state" value={formData.state} onChange={handleChange} />
        <Input label="Country" name="country" value={formData.country} onChange={handleChange} />
        <Input label="Zip / Postal Code" name="zip" value={formData.zip} onChange={handleChange} />
        <Input label="Home Telephone" name="home_phone" value={formData.home_phone} onChange={handleChange} />

        <div className="col-span-3">
          <label className="text-sm font-semibold text-[#001f40] mb-1 flex items-center gap-2">
            <input type="checkbox" checked={noSSN} onChange={(e) => setNoSSN(e.target.checked)} />
            I do not have a Social Security Number
          </label>
        </div>

        <div className="col-span-3 flex flex-wrap gap-6 items-start">
          {!noSSN ? (
            <Input label="Social Security Number (Last 5 Digits)" name="ssn_last5" value={formData.ssn_last5} onChange={handleChange} />
          ) : (
            <>
              <Input label="Alien Registration Number" name="alien_reg" value={formData.alien_reg} onChange={handleChange} />
              <Input label="Non-Alien Registration Number" name="non_alien_reg" value={formData.non_alien_reg} onChange={handleChange} />
            </>
                   )}
        </div>

        {errorMsg && (
          <p className="text-red-600 text-center col-span-3">{errorMsg}</p>
        )}

        <div className="col-span-3 flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={() => router.push("/course")}
            className="px-6 py-2 bg-gray-300 text-[#001f40] rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`px-6 py-2 rounded text-white font-semibold ${
              saving ? "bg-gray-400" : "bg-[#ca5608] hover:bg-[#b24b06]"
            }`}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </main>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
  type = "text",
  disabled = false,
  required = false,
}: any) {
  return (
    <div className="flex flex-col flex-1 min-w-[260px]">
      <label className="text-sm font-semibold text-[#001f40] mb-1">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`border-0 border-b border-[#001f40] bg-transparent focus:outline-none text-[#001f40] text-[14px] pb-1 ${
          disabled ? "opacity-70" : ""
        }`}
      />
    </div>
  );
}

function MenuLink({
  label,
  href,
  onClick,
}: {
  label: string;
  href: string;
  onClick?: () => void;
}) {
  const isActive =
    typeof window !== "undefined" && window.location.pathname === href;

  return (
    <li>
      <a
        href={href}
        onClick={onClick}
        className={`cursor-pointer hover:text-[#ca5608] ${
          isActive ? "text-[#ca5608] font-bold underline" : ""
        }`}
      >
        {label}
      </a>
    </li>
  );
}