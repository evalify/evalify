import { FC } from 'react';
import {
  MDXEditor, MDXEditorMethods, UndoRedo, BoldItalicUnderlineToggles,
  headingsPlugin, listsPlugin, quotePlugin, thematicBreakPlugin,
  markdownShortcutPlugin, toolbarPlugin, EditorRef
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

interface MDXEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editorRef?: EditorRef;
}

export const MarkdownEditor: FC<MDXEditorProps> = ({
  content,
  onChange,
  placeholder,
  editorRef
}) => {
  return (
    <MDXEditor
      ref={editorRef}
      markdown={content}
      onChange={onChange}
      placeholder={placeholder}
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <UndoRedo />
              <BoldItalicUnderlineToggles />
            </>
          )
        })
      ]}
      className="mdxeditor"
    />
  );
};
