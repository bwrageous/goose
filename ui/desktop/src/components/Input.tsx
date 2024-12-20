import React, { useRef, useState, useEffect } from 'react';
import { Button } from './ui/button';
import Send from './ui/Send';
import Stop from './ui/Stop';
import { Paperclip } from 'lucide-react';
import { Attachment } from './AttachmentPreview';
import AttachmentPreview from './AttachmentPreview';
import { getImageData, compressImage } from '../utils/imageUtils';

interface CustomSubmitEvent extends CustomEvent {
  detail: {
    value: string;
    attachments?: Attachment[];
    experimental_attachments?: Array<{
      name: string;
      contentType: string;
      url: string;
    }>;
  };
}

interface InputProps {
  handleSubmit: (e: CustomSubmitEvent) => void;
  disabled?: boolean;
  isLoading?: boolean;
  onStop?: () => void;
}

export default function Input({
  handleSubmit,
  disabled = false,
  isLoading = false,
  onStop,
}: InputProps) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textAreaRef.current && !disabled) {
      textAreaRef.current.focus();
    }
  }, [disabled, value]);

  const useAutosizeTextArea = (textAreaRef: HTMLTextAreaElement | null, value: string) => {
    useEffect(() => {
      if (textAreaRef) {
        textAreaRef.style.height = '0px';
        const scrollHeight = textAreaRef.scrollHeight;
        textAreaRef.style.height = Math.min(scrollHeight, maxHeight) + 'px';
      }
    }, [textAreaRef, value]);
  };

  const minHeight = '1rem';
  const maxHeight = 10 * 24;

  useAutosizeTextArea(textAreaRef.current, value);

  const handleChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = evt.target?.value;
    setValue(val);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf('image') === 0) {
        const blob = item.getAsFile();
        if (!blob) continue;

        const previewBase64 = await getImageData(blob);
        const compressedBase64 = await compressImage(previewBase64);
        
        let filePath: string | undefined;
        try {
          if (window.electron?.saveTemporaryImage) {
            filePath = await window.electron.saveTemporaryImage(compressedBase64);
          }
        } catch (error) {
          console.error('Failed to save temp image:', error);
        }
        
        setAttachments(prev => [...prev, {
          type: 'image',
          src: previewBase64,
          path: filePath
        }]);
        break;
      }
    }
  };

  const createSubmitEvent = (value: string, attachments: Attachment[]) => {
    return new CustomEvent('submit', {
      detail: {
        value: value.trim(),
        attachments: attachments.map(attachment => ({
          ...attachment,
          // Ensure we're passing all required fields for both types
          ...(attachment.type === 'image' ? {
            type: 'image',
            src: attachment.src,
            path: attachment.path
          } : {
            type: 'file',
            name: attachment.name,
            fileType: attachment.fileType,
            path: attachment.path
          })
        })),
        experimental_attachments: attachments.map(attachment => {
          if (attachment.type === 'image') {
            return {
              name: 'image',
              contentType: 'image/png',
              url: attachment.src, // Use the base64 data directly for images
            };
          } else {
            return {
              name: attachment.name || 'file',
              contentType: attachment.fileType || 'application/octet-stream',
              url: `file://${attachment.path}`
            };
          }
        })
      }
    }) as CustomSubmitEvent;
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() && attachments.length === 0) return;

    const customEvent = createSubmitEvent(value, attachments);
    handleSubmit(customEvent);
    setValue('');
    setAttachments([]);
  };

  const handleKeyDown = (evt: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (evt.key === 'Enter' && !evt.shiftKey) {
      evt.preventDefault();
      if (value.trim() || attachments.length > 0) {
        const customEvent = createSubmitEvent(value, attachments);
        handleSubmit(customEvent);
        setValue('');
        setAttachments([]);
      }
    }
  };

  const handleFileSelect = async () => {
    try {
      const filePath = await window.electron.selectFileOrDirectory();
      if (!filePath) return;

      const fileName = filePath.split('/').pop() || 'Unknown file';
      const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
      
      if (isImage) {
        try {
          // For images, read the file as a data URL
          const response = await fetch(`file://${filePath}`);
          const blob = await response.blob();
          const file = new File([blob], fileName, { type: `image/${fileExt}` });
          
          const previewUrl = await getImageData(file);
          const compressedBase64 = await compressImage(previewUrl);
          
          let tempFilePath: string | undefined;
          try {
            if (window.electron?.saveTemporaryImage) {
              tempFilePath = await window.electron.saveTemporaryImage(compressedBase64);
            }
          } catch (error) {
            console.error('Failed to save temp image:', error);
          }

          setAttachments(prev => [...prev, {
            type: 'image',
            src: previewUrl,
            path: tempFilePath
          }]);
        } catch (error) {
          console.error('Error handling image file:', error);
          // If image handling fails, fall back to file handling
          setAttachments(prev => [...prev, {
            type: 'file',
            name: fileName,
            fileType: fileExt ? `image/${fileExt}` : 'application/octet-stream',
            path: filePath
          }]);
        }
      } else {
        // For non-image files, just use the file path and extension
        setAttachments(prev => [...prev, {
          type: 'file',
          name: fileName,
          fileType: fileExt ? `application/${fileExt}` : 'application/octet-stream',
          path: filePath
        }]);
      }
      
      textAreaRef.current?.focus();
    } catch (error) {
      console.error('Error selecting file:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const previewUrl = await getImageData(file);
        const compressedBase64 = await compressImage(previewUrl);
        
        let tempFilePath: string | undefined;
        try {
          if (window.electron?.saveTemporaryImage) {
            tempFilePath = await window.electron.saveTemporaryImage(compressedBase64);
          }
        } catch (error) {
          console.error('Failed to save temp image:', error);
        }

        setAttachments(prev => [...prev, {
          type: 'image',
          src: previewUrl,
          path: tempFilePath
        }]);
      } else {
        setAttachments(prev => [...prev, {
          type: 'file',
          name: file.name,
          fileType: file.type || 'Unknown type',
          path: file.path
        }]);
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div 
      className="flex flex-col pl-[16px]"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {attachments.length > 0 && (
        <div>
          <AttachmentPreview
            attachments={attachments}
            onRemove={removeAttachment}
            mode="preview"
          />
        </div>
      )}
      <form onSubmit={handleSubmitForm} className="relative flex h-[57px] pr-[68px] items-center">
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
            overflowY: 'auto',
            paddingTop: '18px',
            paddingBottom: '18px',
          }}
          className={`w-full outline-none border-none focus:ring-0 bg-transparent text-14 resize-none ${
            disabled ? 'cursor-not-allowed opacity-50' : ''
          }`}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleFileSelect}
          disabled={disabled}
          className={`absolute right-[40px] top-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-800 ${
            isDragging ? 'text-indigo-700 dark:text-indigo-200 bg-indigo-100 dark:bg-indigo-800' : ''
          } ${
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