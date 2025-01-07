import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';
import ImagePreviewTile from './ImagePreviewTile';

// Utility function for class name merging
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AttachmentPreviewProps {
  type: 'file' | 'image';
  displayMode: 'input' | 'message';
  fileName: string;
  fileType?: string;
  onRemove?: () => void;
  src?: string; // For images
  adaptiveHeight?: boolean;
}

const FilePreviewTile: React.FC<{
  fileName: string;
  fileType: string;
  displayMode: 'input' | 'message';
  onRemove?: () => void;
}> = ({ fileName, fileType, displayMode, onRemove }) => {
  const containerClasses = cn(
    'flex items-center h-[54px] px-3 rounded-[12px]',
    'ring-1 ring-black/5 dark:ring-white/5',
    'bg-gray-100 dark:bg-gray-700',
    'relative',
    displayMode === 'input' ? 'w-[200px]' : 'w-[300px]'
  );

  return (
    <div className={containerClasses}>
      {/* File Icon */}
      <div className="flex-shrink-0">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          className="text-gray-400 dark:text-gray-500"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>

      {/* File Info */}
      <div className="ml-3 flex-1 min-w-0">
        <div className="text-xs font-medium truncate">
          {fileName}
        </div>
        <div className="text-xs truncate text-gray-500 dark:text-gray-400">
          {fileType}
        </div>
      </div>

      {/* Close Button - Only shown in input mode */}
      {displayMode === 'input' && onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-[8px] right-[8px] w-5 h-5 rounded-full bg-[rgba(143,142,147,0.9)] flex items-center justify-center"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3 h-3"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
};

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  type,
  displayMode,
  fileName,
  fileType = '',
  onRemove,
  src,
  adaptiveHeight = false
}) => {
  if (type === 'file') {
    return (
      <FilePreviewTile
        fileName={fileName}
        fileType={fileType}
        displayMode={displayMode}
        onRemove={onRemove}
      />
    );
  }

  if (type === 'image' && src) {
    return (
      <ImagePreviewTile
        src={src}
        displayMode={displayMode}
        onRemove={onRemove}
        adaptiveHeight={adaptiveHeight}
      />
    );
  }

  return null;
};

export default AttachmentPreview;