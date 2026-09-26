"use client";

import { useRef, useState } from "react";

interface Props {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  label?: string;
}

export default function PhotoPicker({ onFiles, multiple = false, label = "גררו תמונה לכאן או לחצו לבחירה" }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (list: FileList | null) => {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    <div
      className={`dropzone${dragging ? " dragging" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handle(e.dataTransfer.files);
      }}
    >
      <span className="dropzone-icon" aria-hidden>
        📷
      </span>
      <span>{label}</span>
      <input
        ref={input}
        type="file"
        accept="image/*,.heic,.heif"
        multiple={multiple}
        hidden
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
