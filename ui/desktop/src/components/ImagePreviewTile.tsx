import React from 'react';

interface ImagePreviewTileProps {
  src: string;
  displayMode: 'input' | 'message';
  onRemove?: () => void;
  adaptiveHeight?: boolean;
}

const ImagePreviewTile: React.FC<ImagePreviewTileProps> = ({ 
  src, 
  displayMode, 
  onRemove, 
  adaptiveHeight = false 
}) => {
  const isMessageMode = displayMode === 'message';
  
  return (
    <div 
      className={`
        ${isMessageMode ? 'w-[200px]' : adaptiveHeight ? 'w-[54px] h-[54px]' : 'w-[120px] h-[120px]'}
        rounded-[12px] overflow-hidden bg-gray-100 dark:bg-gray-700 ring-1 ring-black/5 dark:ring-white/5 relative
        ${isMessageMode ? 'min-h-[100px] max-h-[200px]' : ''}
      `}
    >
      <img
        src={src}
        alt="Preview"
        className="w-full h-full object-cover"
        style={{
          maxHeight: isMessageMode ? '200px' : undefined,
        }}
        onError={(e) => {
          console.error('ImagePreview: Image loading failed');
          e.currentTarget.style.display = 'none';
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
};

export default ImagePreviewTile;