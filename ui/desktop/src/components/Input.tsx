import React, { useRef, useState, useEffect } from 'react';
import { Button } from './ui/button';
import Send from './ui/Send';
import Stop from './ui/Stop';
import { Paperclip } from 'lucide-react';
import AttachmentPreview from './AttachmentPreview';

interface InputProps {
  handleSubmit: (e: CustomEvent<{ value: string; attachments: Attachment[] }>) => void;
  disabled?: boolean;
  isLoading?: boolean;
  onStop?: () => void;
}

interface Attachment {
  type: 'file' | 'image';
  name?: string;
  fileType?: string;
  path: string;
  src?: string;
}

declare global {
  interface Window {
    electron: {
      hideWindow: () => void;
      createChatWindow: (query?: string) => void;
      selectFileOrDirectory: () => Promise<string | null>;
      saveTempImage: (imageData: string) => Promise<string>;
    };
  }
}

export default function Input({
  handleSubmit,
  disabled = false,
  isLoading = false,
  onStop
}: InputProps) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textAreaRef.current && !disabled) {
      textAreaRef.current.focus();
    }
  }, [disabled, value]);

  const useAutosizeTextArea = (textAreaRef: HTMLTextAreaElement | null, value: string) => {
    useEffect(() => {
      if (textAreaRef) {
        textAreaRef.style.height = "0px"; // Reset height
        const scrollHeight = textAreaRef.scrollHeight;
        textAreaRef.style.height = Math.min(scrollHeight, maxHeight) + "px";
      }
    }, [textAreaRef, value]);
  };

  const minHeight = "1rem";
  const maxHeight = 10 * 24;

  useAutosizeTextArea(textAreaRef.current, value);

  const handleChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = evt.target?.value;
    setValue(val);
  };

  const handleKeyDown = (evt: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (evt.key === 'Enter' && !evt.shiftKey) {
      evt.preventDefault();
      if (value.trim() || attachments.length > 0) {
        handleSubmit(new CustomEvent('submit', { 
          detail: { 
            value,
            attachments 
          } 
        }));
        setValue('');
        setAttachments([]);
      }
    }
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() || attachments.length > 0) {
      handleSubmit(new CustomEvent('submit', { 
        detail: { 
          value,
          attachments 
        } 
      }));
      setValue('');
      setAttachments([]);
    }
  };

  const handleFileSelect = async () => {
    const filePath = await window.electron.selectFileOrDirectory();
    if (filePath) {
      const fileName = filePath.split('/').pop() || 'Unknown file';
      const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);

      const newAttachment: Attachment = {
        type: isImage ? 'image' : 'file',
        name: fileName,
        fileType: fileExt,
        path: filePath,
        ...(isImage && { src: `file://${filePath}` })
      };

      setAttachments(prev => [...prev, newAttachment]);
      textAreaRef.current?.focus();
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    // Only handle paste if it's targeting our textarea
    if (e.target !== textAreaRef.current) {
      return;
    }

    const items = Array.from(e.clipboardData.items);
    let handled = false;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        handled = true;
        const blob = item.getAsFile();
        if (!blob) continue;

        const reader = new FileReader();
        reader.onload = async (e) => {
          const imageData = e.target?.result as string;
          try {
            const tempPath = await window.electron.saveTempImage(imageData);
            setAttachments(prev => [...prev, {
              type: 'image',
              name: 'Pasted image',
              fileType: blob.type.split('/')[1] || 'png',
              path: tempPath,
              src: imageData
            }]);
          } catch (error) {
            console.error('Failed to save pasted image:', error);
          }
        };
        reader.readAsDataURL(blob);
      }
    }

    // Only prevent default if we handled an image
    if (handled) {
      e.preventDefault();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const paperclipButton = document.querySelector('.paperclip-button');
    if (paperclipButton) {
      paperclipButton.classList.add('hover:bg-indigo-100', 'dark:hover:bg-indigo-800');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    const paperclipButton = document.querySelector('.paperclip-button');
    if (paperclipButton) {
      paperclipButton.classList.remove('hover:bg-indigo-100', 'dark:hover:bg-indigo-800');
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const paperclipButton = document.querySelector('.paperclip-button');
    if (paperclipButton) {
      paperclipButton.classList.remove('hover:bg-indigo-100', 'dark:hover:bg-indigo-800');
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const filePath = files[0].path;
      if (filePath) {
        const fileName = filePath.split('/').pop() || 'Unknown file';
        const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);

        const newAttachment: Attachment = {
          type: isImage ? 'image' : 'file',
          name: fileName,
          fileType: fileExt,
          path: filePath,
          ...(isImage && { src: `file://${filePath}` })
        };

        setAttachments(prev => [...prev, newAttachment]);
        textAreaRef.current?.focus();
      }
    }
  };

  return (
    <div 
      className="flex flex-col w-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Attachments Preview Area */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-[16px] pt-[16px] mb-2">
          {attachments.map((attachment, index) => (
            <AttachmentPreview
              key={index}
              type={attachment.type}
              displayMode="input"
              fileName={attachment.name || ''}
              fileType={attachment.fileType}
              onRemove={() => handleRemoveAttachment(index)}
              src={attachment.src}
              adaptiveHeight={attachments.length > 1}
            />
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={onFormSubmit} className="flex relative h-auto px-[16px] pr-[68px] py-[1rem]">
        <textarea
          autoFocus
          id="dynamic-textarea"
          placeholder="What should goose do?"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
          ref={textAreaRef}
          rows={1}
          style={{
            minHeight: `${minHeight}px`,
            maxHeight: `${maxHeight}px`,
            overflowY: 'auto'
          }}
          className={`w-full outline-none border-none focus:ring-0 bg-transparent p-0 text-14 resize-none ${
            disabled ? 'cursor-not-allowed opacity-50' : ''
          }`}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleFileSelect}
          disabled={disabled}
          className={`paperclip-button absolute right-[40px] top-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-800 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Paperclip size={20} />
        </Button>
        {isLoading ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onStop}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100"
          >
            <Stop size={24} />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            disabled={disabled || (!value.trim() && attachments.length === 0)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-800 ${
              disabled || (!value.trim() && attachments.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Send size={24} />
          </Button>
        )}
      </form>
    </div>
  );
}