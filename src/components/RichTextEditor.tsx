import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline as UnderlineIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { Extension } from '@tiptap/core';

// Custom extension for keyboard shortcuts
const ListShortcuts = Extension.create({
  name: 'listShortcuts',

  addKeyboardShortcuts() {
    return {
      // Ctrl+Shift+L for bullet list
      'Mod-Shift-l': () => {
        this.editor.chain().focus().toggleBulletList().run();
        return true;
      },
      // Ctrl+Shift+O for ordered list
      'Mod-Shift-o': () => {
        this.editor.chain().focus().toggleOrderedList().run();
        return true;
      },
    };
  },
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showToolbar?: boolean;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = '',
  className,
  showToolbar = true,
  minHeight = '36px',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      ListShortcuts,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none',
          'min-h-[36px] px-3 py-2 text-sm',
          '[&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0 [&_li]:m-0',
          '[&_ul]:list-disc [&_ul]:pl-5',
          '[&_ol]:list-decimal [&_ol]:pl-5',
        ),
      },
      // Auto-capitalize first letter in list items
      handleTextInput: (view, from, to, text) => {
        const { state } = view;
        const $from = state.doc.resolve(from);
        
        // Check if we're in a list item and this is the first character
        const parentNode = $from.parent;
        if (parentNode.type.name === 'paragraph') {
          const grandparent = $from.node(-1);
          if (grandparent && grandparent.type.name === 'listItem') {
            // If the paragraph is empty and we're typing a lowercase letter, capitalize it
            if (parentNode.textContent.length === 0 && /^[a-z]$/.test(text)) {
              view.dispatch(
                state.tr.insertText(text.toUpperCase(), from, to)
              );
              return true;
            }
          }
        }
        
        return false;
      },
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-1">
      {showToolbar && (
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0", editor.isActive('bold') && "bg-muted")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0", editor.isActive('italic') && "bg-muted")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-7 w-7 p-0", editor.isActive('underline') && "bg-muted")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="w-4 h-4" />
          </Button>
        </div>
      )}
      <div 
        className={cn(
          "rounded-md border border-input bg-background ring-offset-background",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          className
        )}
        style={{ minHeight }}
      >
        <EditorContent editor={editor} className="text-foreground" />
      </div>
    </div>
  );
}