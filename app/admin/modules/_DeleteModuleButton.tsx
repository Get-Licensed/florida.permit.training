"use client";

import { useState } from "react";

export default function DeleteModuleButton({ id, title }: any) {
  const [show, setShow] = useState(false);

  async function confirmDelete() {
    await fetch(`/api/admin/modules/${id}`, { method: "DELETE" });
    window.location.reload();
  }

  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="text-red-700 hover:underline"
      >
        Delete
      </button>

      {show && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-md w-96">
            <h3 className="text-lg font-bold text-red-700 mb-2">WARNING!</h3>
            <p className="text-sm text-[#001f40] mb-4">
              Deleting this module will permanently erase all compliant lesson data,
              slide timing records, and narration. This action must be used responsibly.
            </p>
            <p className="text-sm font-semibold mb-4">
              Module: <span className="text-[#001f40]">{title}</span>
            </p>

            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-1 rounded border"
                onClick={() => setShow(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-1 bg-red-700 text-white rounded"
                onClick={confirmDelete}
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
