"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";

type FormData = {
  full_name: string;
  preferred_name: string;
  email: string;
  street: string;
  apt: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  home_phone: string;
  dob: string;
  gender: string;
  ssn_last5: string | null;
  alien_reg: string | null;
  non_alien_reg: string | null;
};

export default function UpdateProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noSSN, setNoSSN] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resetStatus, setResetStatus] = useState<"idle" | "sent" | "error">("idle");

  const [formData, setFormData] = useState<FormData>({
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
        ssn_last5: profile?.ssn_last5 ?? "",
        alien_reg: profile?.alien_reg ?? "",
        non_alien_reg: profile?.non_alien_reg ?? "",
      });

      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((f) => ({ ...f, [name]: value }));
  };

  const handleResetPassword = async () => {
    if (resetStatus !== "idle") return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setResetStatus("error");
      setTimeout(() => setResetStatus("idle"), 10000);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });

    setResetStatus(error ? "error" : "sent");
    setTimeout(() => setResetStatus("idle"), 10000);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMsg("No user session found.");
      setSaving(false);
      return;
    }

    const updatableFields: FormData = structuredClone(formData);

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

    const { error } = await supabase.from("profiles").upsert({
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

    // ✅ Stay on profile page
    setSaving(false);
    setErrorMsg("Profile saved successfully!");
  };

  const cancelBtnClasses =
    "px-4 py-2 bg-gray-300 text-[#001f40] rounded hover:bg-gray-400 w-full sm:w-auto";
  const saveBtnClasses = (saving: boolean) =>
    `px-4 py-2 rounded text-white font-semibold w-full sm:w-auto ${
      saving ? "bg-gray-400" : "bg-[#ca5608] hover:bg-[#b24b06]"
    }`;

  return (
    <main className="flex flex-col min-h-screen bg-white">
      <header className="h-4" />

      {/* Heading row with title, reset link, and desktop buttons */}
      <section className="px-6 pt-6 w-full max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        <div className="flex flex-col items-start">
          <h1 className="text-2xl font-bold text-[#001f40]">Update Your Profile</h1>
          <p
            className={`text-sm underline cursor-pointer mt-1 ${
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
        </div>

     {/* Desktop-only buttons in header */}
            <div className="flex justify-end gap-[10px] hidden sm:flex">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className={cancelBtnClasses}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={(e) => handleSave(e)}
                className={saveBtnClasses(saving)}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
      </section>

      <form
        onSubmit={handleSave}
        className={`flex-1 p-6 w-full max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${
          saving ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        {/* Inputs */}
        <Input label="Full Legal Name" name="full_name" value={formData.full_name} onChange={handleChange} required />
        <Input label="Preferred Name" name="preferred_name" value={formData.preferred_name} onChange={handleChange} />
        <Input label="Email Address" name="email" value={formData.email ?? ""} disabled />

        <Input label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleChange} />
        <Input label="Gender" name="gender" value={formData.gender} onChange={handleChange} />
        <Input label="Home Telephone" name="home_phone" value={formData.home_phone} onChange={handleChange} />

        <Input label="Street Address" name="street" value={formData.street} onChange={handleChange} />
        <Input label="Apt / Suite #" name="apt" value={formData.apt} onChange={handleChange} />
        <Input label="State" name="state" value={formData.state} onChange={handleChange} />

        <Input label="City" name="city" value={formData.city} onChange={handleChange} />
        <Input label="Country" name="country" value={formData.country} onChange={handleChange} />
        <Input label="Zip / Postal Code" name="zip" value={formData.zip} onChange={handleChange} />

        {/* Identification section */}
        <div className="col-span-full grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
          {/* Col 1: Checkbox always visible */}
          <div className="flex items-center">
            <label className="text-sm font-semibold text-[#001f40] flex items-center gap-2">
              <input
                type="checkbox"
                checked={noSSN}
                onChange={(e) => setNoSSN(e.target.checked)}
              />
              I do not have a Social Security Number
            </label>
          </div>

          {/* Col 2 + Col 3: Conditional fields */}
          {!noSSN ? (
            // Show SSN field spanning cols 2+3 when not checked
            <div className="sm:col-span-2">
              <Input
                label="Social Security Number (Last 5 Digits)"
                name="ssn_last5"
                value={formData.ssn_last5 ?? ""}
                onChange={handleChange}
              />
            </div>
          ) : (
            <>
              <Input
                label="Alien Registration Number"
                name="alien_reg"
                value={formData.alien_reg ?? ""}
                onChange={handleChange}
              />
              <Input
                label="Non-Alien Registration Number"
                name="non_alien_reg"
                value={formData.non_alien_reg ?? ""}
                onChange={handleChange}
              />
            </>
          )}
        </div>

       {errorMsg && (
          <p
            className={`text-center col-span-full ${
              errorMsg.includes("successfully")
                ? "text-[#ca5608]" // brand orange for success
                : "text-red-600"   // red for errors
            }`}
          >
            {errorMsg}
          </p>
        )}

        {/* Mobile-only Save/Cancel buttons below the form */}
        <div className="col-span-full block sm:hidden mt-6">
          <div className="flex flex-col gap-3">
           <button
              type="button"
              onClick={() => window.location.reload()}
              className={cancelBtnClasses}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className={saveBtnClasses(saving)}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
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
    <div className="flex flex-col w-full">
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
        className={`border-0 border-b border-[#001f40] bg-transparent focus:outline-none text-[#001f40] text-[14px] pb-1 w-full ${
          disabled ? "opacity-70" : ""
        }`}
      />
    </div>
  );
}