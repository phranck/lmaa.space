import "@mdxeditor/editor/style.css";
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  ListsToggle,
  MDXEditor,
  Separator,
  StrikeThroughSupSubToggles,
  UndoRedo,
  codeBlockPlugin,
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  toolbarPlugin,
} from "@mdxeditor/editor";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

/**
 * Lightweight MDXEditor wrapper for editing richtext block content.
 * Loaded lazily via React.lazy to keep the main bundle lean.
 *
 * @param props - Controlled markdown value and change handler.
 * @returns Toolbar + content-editable markdown editor.
 */
export function RichTextEditor({ value, onChange, rows }: RichTextEditorProps) {
  const minHeight = `${(rows ?? 8) * 1.5}rem`;
  return (
    <div className="rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] overflow-hidden text-sm">
      <MDXEditor
        key={value === "" ? "empty" : undefined}
        markdown={value}
        onChange={onChange}
        plugins={[
          headingsPlugin({ allowedHeadingLevels: [2, 3] }),
          listsPlugin(),
          quotePlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
          markdownShortcutPlugin(),
          toolbarPlugin({
            toolbarContents: () => (
              <>
                <UndoRedo />
                <Separator />
                <BlockTypeSelect />
                <Separator />
                <BoldItalicUnderlineToggles />
                <StrikeThroughSupSubToggles />
                <Separator />
                <ListsToggle />
                <Separator />
                <CreateLink />
                <CodeToggle />
              </>
            ),
          }),
        ]}
        contentEditableClassName="prose prose-sm max-w-none px-3 py-2 focus:outline-none"
        contentEditableStyle={{ minHeight }}
      />
    </div>
  );
}
