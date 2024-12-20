import React from 'react';

interface ImagePreviewProps {
  imageData?: string | null;
  onRemove?: () => void;
  mode?: 'preview' | 'message';
  adaptiveHeight?: boolean;
}

export default function ImagePreview({ imageData, onRemove, mode = 'preview', adaptiveHeight = false }: ImagePreviewProps) {
  if (!imageData) return null;
  
  const isMessageMode = mode === 'message';
  
  return (
    <div className={`${isMessageMode ? 'w-[300px]' : adaptiveHeight ? 'w-[54px] h-[54px]' : 'w-[120px] h-[120px]'} rounded-[12px] overflow-hidden bg-gray-100 dark:bg-gray-700 ring-1 ring-black/5 dark:ring-white/5 relative`}>
      <div className="w-full h-full relative">
        <img
          src={imageData}
          alt="Preview"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            maxHeight: isMessageMode ? '300px' : undefined,
            imageRendering: 'auto',
            transform: 'translate3d(0,0,0)',
            backfaceVisibility: 'hidden',
            WebkitFontSmoothing: 'antialiased',
          }}
        />
        {onRemove && (
          <button
            onClick={onRemove}
            className="absolute top-[6px] right-[6px] w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(143, 142, 147, 0.9)',
            }}
          >
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}