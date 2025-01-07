import React from 'react'
import LinkPreview from './LinkPreview'
import { extractUrls } from '../utils/urlUtils'
import MarkdownContent from './MarkdownContent'
import AttachmentPreview from './AttachmentPreview'

interface Attachment {
  type: 'file' | 'image';
  name?: string;
  fileType?: string;
  path: string;
  src?: string;
}

interface Message {
  content: string;
  attachments?: Attachment[];
  experimental_attachments?: Array<{
    name: string;
    contentType: string;
    url: string;
  }>;
}

interface UserMessageProps {
  message: Message;
}

export default function UserMessage({ message }: UserMessageProps) {
  // Process all attachments (both direct and experimental)
  const allAttachments: Attachment[] = [];
  
  // Add direct attachments
  if (message.attachments) {
    allAttachments.push(...message.attachments);
  }
  
  // Process experimental attachments
  if (message.experimental_attachments) {
    message.experimental_attachments.forEach(exp => {
      const isImage = exp.contentType.startsWith('image/');
      const exists = allAttachments.some(att => 
        (att.type === 'image' && att.src === exp.url) || 
        (att.type === 'file' && att.name === exp.name)
      );
      
      if (!exists) {
        if (isImage) {
          allAttachments.push({
            type: 'image',
            src: exp.url,
            path: exp.url,
            fileType: exp.contentType
          });
        } else {
          allAttachments.push({
            type: 'file',
            name: exp.name,
            fileType: exp.contentType,
            path: exp.url.startsWith('file://') ? exp.url.slice(7) : exp.url
          });
        }
      }
    });
  }
  
  // Extract URLs and filter content
  const urls = extractUrls(message.content, []);
  const displayContent = message.content
    .split('\n')
    .filter(line => 
      !line.startsWith('file://') && 
      !line.startsWith('data:image/') &&
      !line.match(/^\[\/\\].*$/)
    )
    .join('\n');
  
  const hasTextContent = displayContent.trim().length > 0;

  return (
    <div className="flex justify-end mb-[16px] w-full">
      <div className="flex-col max-w-[85%]">
        {/* Attachment previews first */}
        {allAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {allAttachments.map((attachment, index) => (
              <AttachmentPreview
                key={index}
                type={attachment.type}
                displayMode="message"
                fileName={attachment.name || ''}
                fileType={attachment.fileType}
                src={attachment.src}
              />
            ))}
          </div>
        )}
        {/* Message bubble below attachments */}
        {hasTextContent && (
          <div className="flex bg-user-bubble dark:bg-user-bubble-dark text-goose-text-light dark:text-goose-text-light-dark rounded-2xl p-4">
            <MarkdownContent
              content={displayContent}
              className="text-white"
            />
          </div>
        )}
        {urls.length > 0 && (
          <div className="flex flex-wrap mt-2">
            {urls.map((url, index) => (
              <LinkPreview key={index} url={url} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}