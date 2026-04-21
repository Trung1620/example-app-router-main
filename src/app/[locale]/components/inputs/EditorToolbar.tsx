"use client";

import { Editor } from "@tiptap/react";
import { Bold, Italic, Heading1, Heading2, List, Undo2, Redo2, Quote, Link, Image as ImageIcon } from "lucide-react";
import { uploadFileToFirebase } from "@/utils/uploadFileToFirebase";


interface EditorToolbarProps {
  editor: Editor | null;
}

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mb-2 p-2 border rounded-md bg-gray-50">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${editor.isActive('bold') ? 'bg-gray-300' : ''} p-2 rounded hover:bg-gray-200`}
      >
        <Bold size={18} />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${editor.isActive('italic') ? 'bg-gray-300' : ''} p-2 rounded hover:bg-gray-200`}
      >
        <Italic size={18} />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`${editor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : ''} p-2 rounded hover:bg-gray-200`}
      >
        <Heading1 size={18} />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`${editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : ''} p-2 rounded hover:bg-gray-200`}
      >
        <Heading2 size={18} />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${editor.isActive('bulletList') ? 'bg-gray-300' : ''} p-2 rounded hover:bg-gray-200`}
      >
        <List size={18} />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`${editor.isActive('blockquote') ? 'bg-gray-300' : ''} p-2 rounded hover:bg-gray-200`}
      >
        <Quote size={18} />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        className="p-2 rounded hover:bg-gray-200"
      >
        <Undo2 size={18} />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        className="p-2 rounded hover:bg-gray-200"
      >
        <Redo2 size={18} />
      </button>
      <button
        type="button"
        onClick={() => {
          const url = prompt("Nhập URL:");
          if (url) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          }
        }}
        className="p-2 rounded hover:bg-gray-200"
      >
        <Link size={18} />
      </button>

      {/* Nút chèn Ảnh */}
      <button
        type="button"
        onClick={() => {
          const url = prompt("Nhập URL ảnh:");
          if (url) {
            editor.chain().focus().setImage({ src: url }).run();
          }
        }}
        className="p-2 rounded hover:bg-gray-200"
      >
        <ImageIcon size={18} />
      </button>
      {/* Nút Upload Ảnh Thật */}
      <button
        type="button"
        onClick={async () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';

          input.onchange = async () => {
            const file = input.files?.[0];
            if (file) {
              try {
                const url = await uploadFileToFirebase(file);
                editor.chain().focus().setImage({ src: url }).run();
              } catch (error) {
                console.error("Upload error:", error);
                alert("Upload thất bại");
              }
            }
          };

          input.click();
        }}
        className="p-2 rounded hover:bg-gray-200"
      >
        📤
      </button>

    </div>
  );
}
