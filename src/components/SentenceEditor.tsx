import React, { useEffect, useRef, useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { sanitizeString } from '../utils/inputSanitization';

const PUNCTUATION = ['.', ',', '?', '!', "'", '"'];
const DEFAULT_MAX_LENGTH = 1000;

function toWords(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  return trimmed.split(/\s+/);
}

function toSentence(words: string[]): string {
  return words.filter((word) => word.length > 0).join(' ');
}

type EditorState =
  | { mode: 'edit'; index: number; draft: string }
  | { mode: 'insert'; index: number; draft: string };

interface SentenceEditorProps {
  value: string;
  onChange: (next: string) => void;
  originalValue?: string;
  disabled?: boolean;
  maxLength?: number;
}

export const SentenceEditor: React.FC<SentenceEditorProps> = ({
  value,
  onChange,
  originalValue,
  disabled = false,
  maxLength = DEFAULT_MAX_LENGTH
}) => {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const words = toWords(value);
  const originalWords = toWords(originalValue || '');

  const editorOpen = editor !== null;
  const editorMode = editor?.mode;
  const editorIndex = editor?.index;

  useEffect(() => {
    if (!editorOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editorOpen]);

  useEffect(() => {
    if (!editorMode || editorIndex === undefined) return;

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(focusTimer);
  }, [editorMode, editorIndex]);

  const closeEditor = () => setEditor(null);

  const applyWords = (nextWords: string[]) => {
    const sentence = sanitizeString(toSentence(nextWords));
    if (sentence.length > maxLength) {
      return false;
    }
    onChange(sentence);
    return true;
  };

  const handleDone = () => {
    if (!editor) return;

    const parts = editor.draft.trim().split(/\s+/).filter(Boolean);

    if (editor.mode === 'insert') {
      if (parts.length === 0) {
        closeEditor();
        return;
      }
      const nextWords = [...words.slice(0, editor.index), ...parts, ...words.slice(editor.index)];
      if (applyWords(nextWords)) closeEditor();
      return;
    }

    const nextWords =
      parts.length === 0
        ? words.filter((_, index) => index !== editor.index)
        : [...words.slice(0, editor.index), ...parts, ...words.slice(editor.index + 1)];

    if (applyWords(nextWords)) closeEditor();
  };

  const handleDelete = () => {
    if (!editor) return;
    if (editor.mode === 'insert') {
      closeEditor();
      return;
    }
    if (applyWords(words.filter((_, index) => index !== editor.index))) {
      closeEditor();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleDone();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeEditor();
    }
  };

  const addPunctuation = (mark: string) => {
    setEditor((current) => (current ? { ...current, draft: `${current.draft}${mark}` } : current));
  };

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
        <p className="text-sm text-gray-600 mb-3">
          Tap a word to fix it. Use <span className="font-semibold">+</span> to add a word.
          Type a space in the edit box to split a word.
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          {words.map((word, index) => (
            <React.Fragment key={`${index}-${word}`}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setEditor({ mode: 'insert', index, draft: '' })}
                className="flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-primary-400 hover:text-primary-600 hover:bg-white disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:text-gray-400"
                aria-label={index === 0 ? 'Add a word at the start' : `Add a word before ${word}`}
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setEditor({ mode: 'edit', index, draft: word })}
                className={`min-h-[44px] px-3 py-2 text-lg leading-snug rounded-xl border-2 shadow-sm active:scale-95 disabled:opacity-60 ${
                  originalWords[index] !== undefined && originalWords[index] !== word
                    ? 'border-primary-400 bg-primary-50 text-gray-900 hover:border-primary-500'
                    : 'border-gray-300 bg-white text-gray-900 hover:border-primary-400 hover:bg-primary-50 disabled:hover:border-gray-300 disabled:hover:bg-white'
                }`}
              >
                {word}
              </button>
            </React.Fragment>
          ))}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setEditor({ mode: 'insert', index: words.length, draft: '' })}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-primary-400 hover:text-primary-600 hover:bg-white disabled:opacity-40"
            aria-label="Add a word at the end"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {editor && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center pt-[10vh] sm:pt-0 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close word editor"
            onClick={closeEditor}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="word-editor-title"
            className="relative w-full sm:max-w-lg bg-white rounded-2xl mx-3 sm:mx-0 p-5 shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 id="word-editor-title" className="text-lg font-semibold text-gray-900">
                {editor.mode === 'insert' ? 'Add a word' : 'Edit word'}
              </h4>
              <button
                type="button"
                onClick={closeEditor}
                className="p-2 text-gray-500 hover:text-gray-800"
                aria-label="Cancel"
              >
                <X size={20} />
              </button>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={editor.draft}
              onChange={(event) => {
                if (event.target.value.length <= 200) {
                  setEditor({ ...editor, draft: event.target.value });
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={editor.mode === 'insert' ? 'Type the new word' : 'Fix this word'}
              className="input-field text-xl min-h-[52px]"
              maxLength={200}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              enterKeyHint="done"
            />

            <div className="flex flex-wrap gap-2 mt-3">
              {PUNCTUATION.map((mark) => (
                <button
                  key={mark}
                  type="button"
                  onClick={() => addPunctuation(mark)}
                  className="min-w-[44px] min-h-[44px] px-3 rounded-lg border border-gray-300 bg-gray-50 text-lg font-semibold text-gray-800 hover:bg-white"
                  aria-label={`Add ${mark === '"' ? 'quotation mark' : mark}`}
                >
                  {mark}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Tap a mark to add it to the end of the word. Add a period this way when one is missing.
            </p>

            <div className="flex flex-col-reverse sm:flex-row gap-2 mt-5">
              {editor.mode === 'edit' && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn-secondary flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Delete word
                </button>
              )}
              <button
                type="button"
                onClick={handleDone}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
