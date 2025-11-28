import React from "react";

type Props = {
  title: string;
  active: boolean;
  onClick: () => void;
};

export default function TabButton({ title, active, onClick }: Props) {
  return (
    <button
      className={`px-4 py-2 border-b-2 ${
        active ? "border-orange-600 font-semibold" : "border-transparent"
      }`}
      onClick={onClick}
    >
      {title}
    </button>
  );
}
