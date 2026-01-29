/**
 * components/campaigns/EmailEditor.tsx
 * Mini éditeur WYSIWYG pour emails (Starter)
 * Fonctionnalités: gras, italique, titres, listes, liens + preview + HTML
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Eye,
  Code,
  Undo,
  Type,
  Image,
  Loader2
} from 'lucide-react';
import { apiClient } from '../../api/client';

interface EmailEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

type EditorMode = 'wysiwyg' | 'html' | 'preview';

export function EmailEditor({ value, onChange, placeholder }: EmailEditorProps) {
  const [mode, setMode] = useState<EditorMode>('wysiwyg');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Exécuter une commande d'édition
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    // Mettre à jour la valeur
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // Upload d'image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation côté client
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      setUploadError('Image trop volumineuse (max 2MB)');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Format non supporté. Utilisez PNG, JPG, WebP ou GIF.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/campaigns/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.message || 'Erreur upload');
      }

      // Insérer l'image dans l'éditeur
      const imgHtml = `<img src="${data.url}" alt="Logo" style="max-width: 200px; height: auto; margin: 10px 0;" />`;
      execCommand('insertHTML', imgHtml);

    } catch (err: any) {
      console.error('[EmailEditor] Erreur upload:', err);
      setUploadError(err.message || 'Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Toolbar buttons
  const toolbarButtons = [
    { icon: Bold, command: 'bold', title: 'Gras (Ctrl+B)' },
    { icon: Italic, command: 'italic', title: 'Italique (Ctrl+I)' },
    { icon: Type, command: 'removeFormat', title: 'Supprimer formatage' },
    { type: 'separator' },
    { icon: Heading1, command: 'formatBlock', value: 'h1', title: 'Titre 1' },
    { icon: Heading2, command: 'formatBlock', value: 'h2', title: 'Titre 2' },
    { type: 'separator' },
    { icon: List, command: 'insertUnorderedList', title: 'Liste à puces' },
    { icon: ListOrdered, command: 'insertOrderedList', title: 'Liste numérotée' },
    { type: 'separator' },
    { icon: LinkIcon, action: 'link', title: 'Insérer un lien' },
    { icon: Image, action: 'image', title: 'Insérer une image/logo' },
    { icon: Undo, command: 'undo', title: 'Annuler' },
  ];

  // Insérer un lien
  const insertLink = () => {
    if (linkUrl) {
      const text = linkText || linkUrl;
      const html = `<a href="${linkUrl}" target="_blank" style="color: #0091ff;">${text}</a>`;
      execCommand('insertHTML', html);
    }
    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
  };

  // Gérer le contenu éditable
  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Gérer le paste pour nettoyer le HTML
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    execCommand('insertText', text);
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-200 flex-wrap">
        {/* Mode tabs */}
        <div className="flex items-center gap-1 mr-3 pr-3 border-r border-gray-300">
          <button
            type="button"
            onClick={() => setMode('wysiwyg')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              mode === 'wysiwyg'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            Éditeur
          </button>
          <button
            type="button"
            onClick={() => setMode('html')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
              mode === 'html'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Code className="w-3 h-3" />
            HTML
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
              mode === 'preview'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Eye className="w-3 h-3" />
            Aperçu
          </button>
        </div>

        {/* Format buttons (only in WYSIWYG mode) */}
        {mode === 'wysiwyg' && (
          <>
            {toolbarButtons.map((btn, idx) => {
              if (btn.type === 'separator') {
                return <div key={idx} className="w-px h-6 bg-gray-300 mx-1" />;
              }
              const Icon = btn.icon!;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (btn.action === 'link') {
                      setShowLinkModal(true);
                    } else if (btn.action === 'image') {
                      fileInputRef.current?.click();
                    } else if (btn.command) {
                      execCommand(btn.command, btn.value);
                    }
                  }}
                  disabled={btn.action === 'image' && isUploading}
                  className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors disabled:opacity-50"
                  title={btn.title}
                >
                  {btn.action === 'image' && isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Editor content */}
      <div className="min-h-[200px]">
        {mode === 'wysiwyg' && (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onPaste={handlePaste}
            className="p-4 min-h-[200px] focus:outline-none text-gray-900 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: value }}
            data-placeholder={placeholder}
            style={{
              minHeight: '200px',
            }}
          />
        )}

        {mode === 'html' && (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-4 min-h-[200px] font-mono text-sm bg-white text-black focus:outline-none resize-none border-0"
            placeholder="<p>Votre HTML ici...</p>"
            style={{ color: '#000000' }}
          />
        )}

        {mode === 'preview' && (
          <div className="p-4 min-h-[200px] bg-white">
            <div className="max-w-xl mx-auto border border-gray-200 rounded-lg p-6 shadow-sm">
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: value || '<p class="text-gray-400">Aperçu vide</p>' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Link modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Insérer un lien</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL du lien
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://exemple.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Texte du lien (optionnel)
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Cliquez ici"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkUrl('');
                  setLinkText('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={insertLink}
                disabled={!linkUrl}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 transition-colors"
              >
                Insérer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-red-700 text-sm flex items-center justify-between">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Variables helper */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          <span className="font-medium">Variables :</span>{' '}
          <code className="bg-gray-200 px-1 rounded">{'{{firstName}}'}</code>{' '}
          <code className="bg-gray-200 px-1 rounded">{'{{lastName}}'}</code>{' '}
          <code className="bg-gray-200 px-1 rounded">{'{{email}}'}</code>{' '}
          <code className="bg-gray-200 px-1 rounded">{'{{company}}'}</code>
        </p>
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
}
