import React from 'react';

interface FilePreviewTileProps {
  name: string;
  fileType: string;
  onRemove: () => void;
}

export default function FilePreviewTile({ name, fileType, onRemove }: FilePreviewTileProps) {
  return (
    <div className="w-[200px] h-[54px] rounded-xl bg-gray-100 dark:bg-gray-700 ring-1 ring-black/5 dark:ring-white/5 relative flex items-center px-3">
      {/* File Icon */}
      <svg
        className="w-6 h-6 text-gray-500 dark:text-gray-400 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
      
      {/* File Info */}
      <div className="ml-3 flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
          {name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {fileType}
        </p>
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="absolute top-[8px] right-[8px] w-5 h-5 rounded-full flex items-center justify-center"
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
    </div>
  );
}