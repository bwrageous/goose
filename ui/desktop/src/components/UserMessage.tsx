import React from 'react'
import LinkPreview from './LinkPreview'
import { extractUrls } from '../utils/urlUtils'
import MarkdownContent from './MarkdownContent'
import AttachmentPreview from './AttachmentPreview'

interface Attachment {
  type: 'file';
  name: string;
  fileType: string;
  path: string;
}

interface Message {
  content: string;
  attachments?: Attachment[];
}

interface UserMessageProps {
  message: Message;
}

export default function UserMessage({ message }: UserMessageProps) {
  // Extract URLs which explicitly contain the http:// or https:// protocol
  const urls = extractUrls(message.content, []);
  
  // Filter out file:// paths from displayed content
  const displayContent = message.content
    .split('\n')
    .filter(line => !line.startsWith('file://'))
    .join('\n');
  
  const hasTextContent = displayContent.trim().length > 0;

  return (
    <div className="flex justify-end mb-[16px] w-full">
      <div className="flex-col max-w-[85%]">
        {/* File preview tiles first */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.attachments.map((attachment, index) => (
              <AttachmentPreview
                key={index}
                type={attachment.type}
                displayMode="message"
                fileName={attachment.name}
                fileType={attachment.fileType}
                path={attachment.path}
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