import { useCallback, useEffect, useRef, memo, lazy, Suspense } from 'react';
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { useFileStore } from '@/lib/stores/fileStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { Skeleton } from '@/components/ui/Skeleton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { OpenFile } from '@/lib/types';
import type { editor } from 'monaco-editor';
import type * as Monaco from 'monaco-editor';

// Configure Monaco workers for Vite
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker();
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker();
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker();
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

// Configure Monaco to use local package instead of CDN
loader.config({ monaco });

// Editor Loading Skeleton
function EditorSkeleton() {
  return (
    <div className="h-full bg-[#0a0a0f] p-4 relative">
      <div className="flex gap-4">
        <div className="flex flex-col gap-2 w-8">
          {Array.from({ length: 20 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-6" />
          ))}
        </div>
        <div className="flex-1 space-y-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-4"
              style={{ width: (Math.random() * 40 + 30) + '%' }}
            />
          ))}
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <span className="text-sm text-gray-400">Loading editor...</span>
        </div>
      </div>
    </div>
  );
}

// Lazy load Monaco Editor - Vite handles code splitting
const Editor = lazy(() => import('@monaco-editor/react'));

interface MonacoEditorProps {
  file: OpenFile;
}

function MonacoEditorComponent({ file }: MonacoEditorProps) {
  const { updateFileContent, saveFile, scrollToLine, setScrollToLine } = useFileStore();
  const {
    editorFontSize,
    editorTabSize,
    editorWordWrap,
    editorMinimap,
    editorLineNumbers,
  } = useSettingsStore();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);

  const handleEditorDidMount = useCallback(
    (editorInstance: editor.IStandaloneCodeEditor, monacoInstance: typeof Monaco) => {
      editorRef.current = editorInstance;
      monacoRef.current = monacoInstance;

      // Define and set dark theme
      monacoInstance.editor.defineTheme('devflow-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#0a0a0f',
          'editor.foreground': '#d4d4d4',
          'editorLineNumber.foreground': '#5a5a5a',
          'editorLineNumber.activeForeground': '#c6c6c6',
          'editor.selectionBackground': '#264f78',
          'editor.lineHighlightBackground': '#1a1a24',
          'editorCursor.foreground': '#a855f7',
          'editorWhitespace.foreground': '#3a3a3a',
          'editorGutter.background': '#0a0a0f',
        },
      });
      monacoInstance.editor.setTheme('devflow-dark');

      // Add save command (Cmd/Ctrl + S)
      editorInstance.addCommand(
        monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
        () => {
          saveFile(file.path);
        }
      );

      // Focus the editor
      editorInstance.focus();
    },
    [file.path, saveFile]
  );

  // Scroll to specific line when requested
  useEffect(() => {
    if (scrollToLine && editorRef.current && monacoRef.current) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;

      // Set cursor position to the line
      editor.setPosition({ lineNumber: scrollToLine, column: 1 });

      // Reveal the line in the center of the viewport
      editor.revealLineInCenter(scrollToLine);

      // Add a highlight decoration
      const decorations = editor.deltaDecorations([], [
        {
          range: new monaco.Range(scrollToLine, 1, scrollToLine, 1),
          options: {
            isWholeLine: true,
            className: 'highlight-line-animation',
            linesDecorationsClassName: 'highlight-line-margin',
          },
        },
      ]);

      // Remove decoration after animation
      setTimeout(() => {
        editor.deltaDecorations(decorations, []);
      }, 2000);

      // Clear the scrollToLine state
      setScrollToLine(null);
    }
  }, [scrollToLine, setScrollToLine]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        updateFileContent(file.path, value);
      }
    },
    [file.path, updateFileContent]
  );

  // Focus editor when file changes
  useEffect(() => {
    editorRef.current?.focus();
  }, [file.path]);

  return (
    <Suspense fallback={<EditorSkeleton />}>
      <Editor
        height="100%"
        language={file.language}
        value={file.content}
        theme="vs-dark"
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
          fontSize: editorFontSize,
          fontFamily: 'JetBrains Mono, Fira Code, Menlo, Monaco, monospace',
          minimap: { enabled: editorMinimap },
          wordWrap: editorWordWrap ? 'on' : 'off',
          lineNumbers: editorLineNumbers ? 'on' : 'off',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: editorTabSize,
          insertSpaces: true,
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          guides: {
            indentation: true,
            bracketPairs: true,
          },
          padding: { top: 16, bottom: 16 },
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
        }}
      />
    </Suspense>
  );
}

// Memoize to prevent unnecessary re-renders
export const MonacoEditor = memo(MonacoEditorComponent, (prevProps, nextProps) => {
  return (
    prevProps.file.path === nextProps.file.path &&
    prevProps.file.language === nextProps.file.language
  );
});
