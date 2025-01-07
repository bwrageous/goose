import React from 'react';
import { FileIcon, defaultStyles } from 'react-file-icon';

interface FilePreviewTileProps {
  name: string;
  fileType: string;
  onRemove?: () => void;
  mode?: 'preview' | 'message';
}

export default function FilePreviewTile({ 
  name, 
  fileType, 
  onRemove,
  mode = 'preview'
}: FilePreviewTileProps) {
  const isMessageMode = mode === 'message';
  
  return (
    <div className={`
      flex items-center gap-2 p-2
      ${isMessageMode ? 'w-[300px]' : 'w-[200px]'}
      rounded-[12px] bg-gray-100 dark:bg-gray-700 
      ring-1 ring-black/5 dark:ring-white/5 relative
    `}>
      <div className="w-8 h-8">
        <FileIcon 
          extension={fileType} 
          {...defaultStyles[fileType]}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">
          {name}
        </p>
      </div>
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