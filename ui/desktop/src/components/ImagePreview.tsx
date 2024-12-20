import React from 'react';

interface ImagePreviewProps {
  imageData?: string | null;
  onRemove?: () => void;
  mode?: 'preview' | 'message';
  adaptiveHeight?: boolean;
}

export default function ImagePreview({ imageData, onRemove, mode = 'preview', adaptiveHeight = false }: ImagePreviewProps) {
  console.log('ImagePreview - mode:', mode);
  console.log('ImagePreview - hasImageData:', !!imageData);
  console.log('ImagePreview - imageDataLength:', imageData?.length);
  console.log('ImagePreview - imageDataStart:', imageData?.substring(0, 100));
  console.log('ImagePreview - isBase64:', imageData?.startsWith('data:image/'));
  console.log('ImagePreview - adaptiveHeight:', adaptiveHeight);

  if (!imageData) {
    console.log('ImagePreview: No image data provided');
    return null;
  }
  
  const isMessageMode = mode === 'message';
  
  return (
    <div 
      className={`
        ${isMessageMode ? 'w-[300px]' : adaptiveHeight ? 'w-[54px] h-[54px]' : 'w-[120px] h-[120px]'}
        rounded-[12px] overflow-hidden bg-gray-100 dark:bg-gray-700 ring-1 ring-black/5 dark:ring-white/5 relative
        ${isMessageMode ? 'min-h-[100px] max-h-[300px]' : ''}
      `}
    >
      <img
        src={imageData}
        alt="Preview"
        className="w-full h-full object-cover"
        style={{
          maxHeight: isMessageMode ? '300px' : undefined,
        }}
        onError={(e) => {
          console.error('ImagePreview: Image loading failed:', {
            error: e,
            imageDataLength: imageData?.length || 0,
            isBase64: imageData?.startsWith('data:image/'),
            mode
          });
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
  );
}