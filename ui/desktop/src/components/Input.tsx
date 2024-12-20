import React, { useRef, useState, useEffect } from 'react';
import { Button } from './ui/button';
import Send from './ui/Send';
import Stop from './ui/Stop';
import { Paperclip } from 'lucide-react';
import { Attachment } from './AttachmentPreview';
import AttachmentPreview from './AttachmentPreview';
import { getImageData, compressImage } from '../utils/imageUtils';

interface SubmitEventDetail {
  value: string;
  attachments?: Attachment[];
  experimental_attachments?: Array<{
    name: string;
    contentType: string;
    url: string;
  }>;
}

type CustomSubmitEvent = CustomEvent<SubmitEventDetail>;

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
  // Constants for textarea dimensions
  const TEXTAREA = {
    MIN_HEIGHT: 47,
    MAX_HEIGHT: 200,
    PADDING: {
      TOP: 14,
      BOTTOM: 14,
      LEFT: 16,
      RIGHT: 92,
    }
  } as const;

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
        textAreaRef.style.height = 'auto';
        const scrollHeight = textAreaRef.scrollHeight;
        const newHeight = Math.min(Math.max(scrollHeight, TEXTAREA.MIN_HEIGHT), TEXTAREA.MAX_HEIGHT);
        textAreaRef.style.height = `${newHeight}px`;
        textAreaRef.style.overflowY = scrollHeight > TEXTAREA.MAX_HEIGHT ? 'auto' : 'hidden';
      }
    }, [textAreaRef, value]);
  };

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
        console.log('Input: Got image data:', {
          previewLength: previewBase64?.length,
          previewStart: previewBase64?.substring(0, 100),
          isBase64: previewBase64?.startsWith('data:image/')
        });
        
        const compressedBase64 = await compressImage(previewBase64);
        console.log('Input: Compressed image:', {
          compressedLength: compressedBase64?.length,
          compressedStart: compressedBase64?.substring(0, 100),
          isBase64: compressedBase64?.startsWith('data:image/')
        });
        
        let filePath: string | undefined;
        try {
          if (window.electron?.saveTemporaryImage) {
            filePath = await window.electron.saveTemporaryImage(compressedBase64);
            console.log('Input: Saved temp image:', { filePath });
          }
        } catch (error) {
          console.error('Failed to save temp image:', error);
        }
        
        setAttachments(prev => [...prev, {
          type: 'image',
          src: previewBase64,
          path: filePath
        }]);
        console.log('Input: Added image attachment:', {
          type: 'image',
          srcLength: previewBase64?.length,
          srcStart: previewBase64?.substring(0, 100),
          isBase64: previewBase64?.startsWith('data:image/'),
          path: filePath
        });
        break;
      }
    }
  };

  const createSubmitEvent = (value: string, attachments: Attachment[]): CustomSubmitEvent => {
    console.log('Input: Creating submit event:', {
      value,
      attachmentsCount: attachments.length,
      attachments: attachments.map(att => ({
        type: att.type,
        srcLength: att.src?.length,
        srcStart: att.src?.substring(0, 100),
        path: att.path
      }))
    });

    return new CustomEvent<SubmitEventDetail>('submit', {
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
    });
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
      className="flex flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {attachments.length > 0 && (
        <div style={{ paddingLeft: `${TEXTAREA.PADDING.LEFT}px` }}>
          <AttachmentPreview
            attachments={attachments}
            onRemove={removeAttachment}
            mode="preview"
          />
        </div>
      )}
      <form onSubmit={handleSubmitForm} className="relative">
        <div className="relative flex items-start min-h-[47px]">
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
              minHeight: `${TEXTAREA.MIN_HEIGHT}px`,
              maxHeight: `${TEXTAREA.MAX_HEIGHT}px`,
              paddingTop: `${TEXTAREA.PADDING.TOP}px`,
              paddingBottom: `${TEXTAREA.PADDING.BOTTOM}px`,
              paddingLeft: `${TEXTAREA.PADDING.LEFT}px`,
              paddingRight: `${TEXTAREA.PADDING.RIGHT}px`,
            }}
            className={`
              w-full outline-none border-none focus:ring-0 bg-transparent text-14 
              resize-none transition-all duration-200 ease-in-out
              ${disabled ? 'cursor-not-allowed opacity-50' : ''}
            `}
          />
          {/* Fixed position button container */}
          <div 
            className="absolute right-0 flex items-center gap-2"
            style={{
              paddingRight: `${TEXTAREA.PADDING.LEFT}px`,
              height: `${TEXTAREA.MIN_HEIGHT}px`,
              bottom: 0,
            }}
          >
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleFileSelect}
              disabled={disabled}
              className={`
                text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 
                dark:hover:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-800
                ${isDragging ? 'text-indigo-700 dark:text-indigo-200 bg-indigo-100 dark:bg-indigo-800' : ''}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <Paperclip size={20} />
            </Button>
            {isLoading ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onStop}
                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100"
              >
                <Stop size={24} />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                disabled={disabled || (!value.trim() && attachments.length === 0)}
                className={`
                  text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 
                  dark:hover:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-800
                  ${disabled || (!value.trim() && attachments.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <Send size={24} />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}