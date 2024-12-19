import React from 'react';
import ImagePreview from './ImagePreview';
import FilePreviewTile from './FilePreviewTile';

export interface Attachment {
  type: 'image' | 'file';
  src?: string;
  name?: string;
  fileType?: string;
  path?: string;
}

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove?: (index: number) => void;
  mode?: 'preview' | 'message';
}

export default function AttachmentPreview({ attachments, onRemove, mode = 'preview' }: AttachmentPreviewProps) {
  // Check if we have both image and file attachments
  const hasImages = attachments.some(att => att.type === 'image');
  const hasFiles = attachments.some(att => att.type === 'file');
  const hasMixedTypes = hasImages && hasFiles;

  return (
    <div className="flex flex-wrap gap-2 pb-4">
      {attachments.map((attachment, index) => (
        <div key={index}>
          {attachment.type === 'image' ? (
            <ImagePreview
              imageData={attachment.src}
              onRemove={onRemove ? () => onRemove(index) : undefined}
              mode={mode}
              adaptiveHeight={hasMixedTypes}
            />
          ) : (
            <FilePreviewTile
              name={attachment.name || 'Unknown file'}
              fileType={attachment.fileType || ''}
              onRemove={onRemove ? () => onRemove(index) : () => {}}
            />
          )}
        </div>
      ))}
    </div>
  );
}