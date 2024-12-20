import React from 'react';
import MarkdownContent from './MarkdownContent';
import { Message } from '../ai-sdk-fork/useChat';
import { Attachment } from './AttachmentPreview';
import AttachmentPreview from './AttachmentPreview';

interface MessageWithAttachments extends Message {
  attachments?: Attachment[];
  experimental_attachments?: Array<{
    name: string;
    contentType: string;
    url: string;
  }>;
}

export default function UserMessage({ message }: { message: MessageWithAttachments }) {
  console.log('UserMessage received:', {
    content: message.content,
    attachments: message.attachments,
    experimental: message.experimental_attachments
  });

  // Convert all possible attachment formats to our Attachment type
  const allAttachments: Attachment[] = [];

  // Add direct attachments first
  if (message.attachments) {
    allAttachments.push(...message.attachments);
  }

  // Add experimental attachments if they don't already exist
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
            path: exp.url.startsWith('file://') ? exp.url.slice(7) : exp.url
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

  console.log('UserMessage: Final attachments:', allAttachments);

  return (
    <div className="flex justify-end mb-[16px]">
      <div className="flex flex-col items-end max-w-[90%]">
        {allAttachments.length > 0 && (
          <div className="mb-2">
            <AttachmentPreview
              attachments={allAttachments}
              mode="message"
            />
          </div>
        )}
        
        {message.content && (
          <div className="inline-flex bg-user-bubble dark:bg-user-bubble-dark text-goose-text-light dark:text-goose-text-light-dark rounded-2xl p-4">
            <MarkdownContent
              content={message.content}
              className="text-white"
            />
          </div>
        )}
      </div>
    </div>
  );
}