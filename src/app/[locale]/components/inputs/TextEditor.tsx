"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import EditorToolbar from "./EditorToolbar";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
// ✅ import toolbar

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export default function TextEditor({ value, onChange, label }: TextEditorProps) {
  const [mounted, setMounted] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false, // Nếu muốn click link không bị tự mở tab
      }),
      Image,
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}

      {/* ✅ Thêm Toolbar trước EditorContent */}
      <EditorToolbar editor={editor} />

      <div className="border rounded-md p-3 bg-white min-h-[150px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
