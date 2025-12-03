"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { ReactSortable } from "react-sortablejs";
import { Trash2, ChevronUp, ChevronDown } from "lucide-react";

type Module = {
  id: string;
  title: string;
  sort_order: number;
};

export default function ReorderModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deleteModuleId, setDeleteModuleId] = useState<string | null>(null);
  const [deleteModuleTitle, setDeleteModuleTitle] = useState("");

  /* LOAD */
  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("modules")
      .select("id, title, sort_order")
      .order("sort_order", { ascending: true });

    setModules(data ?? []);
  }

  /* DRAG REORDER */
  function handleDrag(newList: Module[]) {
    setModules(
      newList.map((m, idx) => ({
        ...m,
        sort_order: idx + 1,
      }))
    );
  }

  /* MOVE UP */
  function moveUp(id: string) {
    setModules((prev) => {
      const index = prev.findIndex((m) => m.id === id);
      if (index <= 0) return prev;

      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];

      return arr.map((m, idx) => ({ ...m, sort_order: idx + 1 }));
    });
  }

  /* MOVE DOWN */
  function moveDown(id: string) {
    setModules((prev) => {
      const index = prev.findIndex((m) => m.id === id);
      if (index === -1 || index === prev.length - 1) return prev;

      const arr = [...prev];
      [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];

      return arr.map((m, idx) => ({ ...m, sort_order: idx + 1 }));
    });
  }

  /* SAVE ORDER */
  async function saveFinal() {
    setSaving(true);

    const payload = modules.map((m, idx) => ({
      id: m.id,
      sort_order: idx + 1,
      title: m.title,
    }));

    const { error } = await supabase
      .from("modules")
      .upsert(payload, { onConflict: "id" });

    setSaving(false);
    setShowWarning(false);

    if (error) {
      console.error(error);
      alert("❌ Failed to update order");
      return;
    }

    load();
  }

  /* DELETE MODULE */
  async function deleteModule() {
    if (!deleteModuleId) return;

    try {
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id")
        .eq("module_id", deleteModuleId);

      if (lessons?.length) {
        const ids = lessons.map((l) => l.id);
        await supabase.from("lesson_slides").delete().in("lesson_id", ids);
        await supabase.from("lessons").delete().in("id", ids);
      }

      await supabase.from("modules").delete().eq("id", deleteModuleId);

      setDeleteModuleId(null);
      load();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to delete module");
    }
  }

  /* UI */
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-[#001f40] mb-4">
        Reorder Modules
      </h1>
      <p className="text-sm text-gray-700 mb-4">
  <span className="font-semibold text-red-700">Warning:</span> Changing the
  order of modules will immediately adjust the sequence in which students
  experience the course. This may affect pacing, lesson progression, and
  overall course flow. Review your changes carefully before saving.
  <br /><br />
  <span className="font-semibold">Important:</span> Changes made here are not
  applied until you click <em>Save Order</em> below. If you leave or close this
  screen without saving, your new module order will be lost.
</p>

      <table className="w-full border text-sm rounded overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 w-24 text-center">Module</th>
            <th className="p-2">Name</th>
            <th className="p-2 w-24 text-center"></th>
          </tr>
        </thead>

        <ReactSortable
          tag="tbody"
          list={modules}
          setList={handleDrag}
          animation={200}
        >
          {modules.map((m, idx) => (
            <tr
              key={m.id}
              className="border-t hover:bg-gray-50 cursor-grab active:cursor-grabbing"
            >
              {/* MODULE BADGE */}
              <td className="p-2 text-center">
                <span
                  className="
                    text-[11px]
                    px-3
                    py-[2px]
                    rounded-full
                    font-semibold
                    bg-[#ca5608]
                    text-white
                  "
                >                  
                {m.sort_order}
                </span>
              </td>

              {/* TITLE + drag icon */}
              <td className="p-2 flex items-center gap-2">
                <span className="text-gray-400">⋮⋮</span>
                {m.title}
              </td>

              {/* MOVE + DELETE */}
              <td className="p-2 text-right w-24">
                <div className="inline-flex items-center gap-2">

                  <ChevronUp
                    size={16}
                    className={`cursor-pointer ${
                      idx === 0
                        ? "text-gray-300"
                        : "text-[#001f40] hover:text-[#003266]"
                    }`}
                    onClick={() => idx > 0 && moveUp(m.id)}
                  />

                  <ChevronDown
                    size={16}
                    className={`cursor-pointer ${
                      idx === modules.length - 1
                        ? "text-gray-300"
                        : "text-[#001f40] hover:text-[#003266]"
                    }`}
                    onClick={() => idx < modules.length - 1 && moveDown(m.id)}
                  />

                  <Trash2
                    size={16}
                    className="text-red-500 hover:text-red-700 cursor-pointer"
                    onClick={() => {
                      setDeleteModuleId(m.id);
                      setDeleteModuleTitle(m.title);
                    }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </ReactSortable>
      </table>

      {/* FOOTER BUTTONS */}
      <div className="flex justify-end gap-3 mt-5">
        <button
          className="px-3 py-1 border rounded cursor-pointer"
          onClick={() => history.back()}
        >
          Cancel
        </button>
        <button
          className="px-4 py-1.5 bg-[#ca5608] text-white rounded cursor-pointer"
          onClick={() => setShowWarning(true)}
        >
          Save Order
        </button>
      </div>

      {/* SAVE WARNING MODAL */}
      {showWarning && (
        <WarningModal
          saving={saving}
          onClose={() => setShowWarning(false)}
          onConfirm={saveFinal}
        />
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteModuleId && (
        <DeleteModuleModal
          title={deleteModuleTitle}
          onClose={() => setDeleteModuleId(null)}
          onConfirm={deleteModule}
        />
      )}
    </div>
  );
}

/* DELETE MODAL */
function DeleteModuleModal({
  title,
  onClose,
  onConfirm,
}: {
  title: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1600] cursor-pointer">
      <div className="bg-white p-6 rounded-lg w-[380px] shadow-lg cursor-default">
        <h3 className="text-lg font-bold text-red-700 mb-3">Delete Module?</h3>

        <p className="text-sm text-gray-800 mb-3">
          Deleting <strong>{title}</strong> will permanently delete:
        </p>

        <ul className="list-disc pl-6 text-sm text-gray-700 mb-3">
          <li>All lessons in this module</li>
          <li>All slides in those lessons</li>
        </ul>

        <p className="text-sm text-red-600 font-semibold">
          This action cannot be undone.
        </p>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-800 cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* SAVE WARNING MODAL */
function WarningModal({
  saving,
  onClose,
  onConfirm,
}: {
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1500] cursor-pointer">
      <div className="bg-white p-6 rounded-lg w-[350px] shadow-lg cursor-default">
        <h3 className="text-lg font-semibold text-red-600 mb-2">Warning!</h3>

        <p className="text-sm text-gray-700 mb-4">
          Changing module order affects course flow. Proceed with caution.
        </p>

        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1 border rounded text-sm cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1 bg-[#ca5608] text-white rounded text-sm cursor-pointer"
            disabled={saving}
            onClick={onConfirm}
          >
            {saving ? "Saving…" : "Yes, Update Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
