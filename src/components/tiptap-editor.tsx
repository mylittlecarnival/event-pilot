'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { useEffect } from 'react'
import clsx from 'clsx'

interface TiptapEditorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  name?: string
}

export function TiptapEditor({
  value = '',
  onChange,
  placeholder = 'Start typing...',
  className,
  name
}: TiptapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Disable features we don't want
        heading: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
        codeBlock: false,
        strike: false
      }),
      Underline,
      Placeholder.configure({
        placeholder
      })
    ],
    content: value,
    editorProps: {
      attributes: {
        class: clsx(
          'prose prose-sm max-w-none focus:outline-none',
          'min-h-[100px] px-3 py-2',
          '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2',
          '[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2',
          '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1',
          '[&_p]:my-2',
          '[&_ul]:list-disc [&_ul]:ml-4 [&_ul]:my-2',
          '[&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:my-2',
          '[&_blockquote]:border-l-4 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-2',
          '[&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono',
          '[&_pre]:bg-zinc-100 [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:my-2',
          '[&_hr]:border-zinc-200 [&_hr]:my-4',
          'dark:[&_code]:bg-zinc-800 dark:[&_pre]:bg-zinc-800 dark:[&_blockquote]:border-zinc-600'
        )
      }
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange?.(html)
    }
  })

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) {
    return null
  }

  return (
    <div className={className}>
      {/* Toolbar */}
      <div className="border border-zinc-300 dark:border-zinc-700 rounded-t-lg bg-zinc-50 dark:bg-zinc-900 px-2 py-1.5 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={clsx(
            'px-2 py-1 text-sm font-medium rounded transition-colors',
            editor.isActive('bold')
              ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          Bold
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={clsx(
            'px-2 py-1 text-sm font-medium rounded transition-colors',
            editor.isActive('italic')
              ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          Italic
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={!editor.can().chain().focus().toggleUnderline().run()}
          className={clsx(
            'px-2 py-1 text-sm font-medium rounded transition-colors',
            editor.isActive('underline')
              ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          Underline
        </button>
        <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={clsx(
            'px-2 py-1 text-sm font-medium rounded transition-colors',
            editor.isActive('bulletList')
              ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          )}
        >
          Bullet List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={clsx(
            'px-2 py-1 text-sm font-medium rounded transition-colors',
            editor.isActive('orderedList')
              ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          )}
        >
          Numbered List
        </button>
      </div>

      {/* Editor */}
      <div className="border border-t-0 border-zinc-300 dark:border-zinc-700 rounded-b-lg bg-white dark:bg-zinc-950">
        <EditorContent editor={editor} />
      </div>

      {/* Hidden input to store the HTML value for form submission */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={editor.getHTML()}
        />
      )}
    </div>
  )
}
