"use client";

import { useEffect, useRef, useState } from "react";

export default function ToolbarMenu({
  onDownloadTemplate,
  onImportClick,
  onUploadClick,
  importing,
}: {
  onDownloadTemplate: () => void;
  onImportClick: () => void;
  onUploadClick: () => void;
  importing: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-9 px-3.5 rounded-lg border border-line bg-surface text-ink-soft text-[13px] font-medium hover:bg-paper transition flex items-center gap-1.5"
      >
        More
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-surface border border-line rounded-lg shadow-lg py-1 z-20">
          <button
            onClick={() => {
              onUploadClick();
              setOpen(false);
            }}
            className="w-full text-left px-3.5 py-2.5 text-[13px] text-ink hover:bg-paper"
          >
            Upload to auto-fill
          </button>
          <button
            onClick={() => {
              onImportClick();
              setOpen(false);
            }}
            className="w-full text-left px-3.5 py-2.5 text-[13px] text-ink hover:bg-paper"
          >
            {importing ? "Importing…" : "Import CSV"}
          </button>
          <button
            onClick={() => {
              onDownloadTemplate();
              setOpen(false);
            }}
            className="w-full text-left px-3.5 py-2.5 text-[13px] text-ink-faint hover:bg-paper"
          >
            Download CSV template
          </button>
        </div>
      )}
    </div>
  );
}