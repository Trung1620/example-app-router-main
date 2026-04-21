"use client";

export default function PrintButton({
  className = "border px-3 py-2",
  label = "In",
}: { className?: string; label?: string }) {
  return (
    <button className={className} onClick={() => window.print()}>
      {label}
    </button>
  );
}
