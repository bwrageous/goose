import React from 'react';
import MarkdownContent from './MarkdownContent';
import { Message } from '../ai-sdk-fork/useChat';
import { Attachment } from './AttachmentPreview';
import AttachmentPreview from './AttachmentPreview';

interface MessageWithAttachments extends Omit<Message, 'experimental_attachments'> {
  attachments?: Attachment[];
  experimental_attachments?: Array<{
    name: string;
    contentType: string;
    url: string;
  }>;
}

export default function UserMessage({ message }: { message: MessageWithAttachments }) {
  console.log('UserMessage received - content:', message.content);
  console.log('UserMessage received - attachments:', message.attachments?.map(att => ({
    type: att.type,
    srcLength: att.src?.length,
    srcStart: att.src?.substring(0, 100),
    isBase64: att.src?.startsWith('data:image/'),
    path: att.path
  })));

  const allAttachments: Attachment[] = [];

  if (message.attachments) {
    allAttachments.push(...message.attachments);
    console.log('UserMessage: Added direct attachments:', message.attachments.map(att => ({
      type: att.type,
      srcLength: att.src?.length,
      srcStart: att.src?.substring(0, 100),
      isBase64: att.src?.startsWith('data:image/'),
      path: att.path
    })));
  }

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
          console.log('UserMessage: Added experimental image:', {
            urlLength: exp.url?.length,
            urlStart: exp.url?.substring(0, 100),
            isBase64: exp.url?.startsWith('data:image/'),
            path: exp.url.startsWith('file://') ? exp.url.slice(7) : exp.url
          });
        } else {
          allAttachments.push({
            type: 'file',
            name: exp.name,
            fileType: exp.contentType,
            path: exp.url.startsWith('file://') ? exp.url.slice(7) : exp.url
          });
          console.log('UserMessage: Added experimental file:', {
            name: exp.name,
            contentType: exp.contentType,
            path: exp.url.startsWith('file://') ? exp.url.slice(7) : exp.url
          });
        }
      }
    });
  }

  console.log('UserMessage: Final attachments:', allAttachments.map(att => ({
    type: att.type,
    srcLength: att.src?.length,
    srcStart: att.src?.substring(0, 100),
    isBase64: att.src?.startsWith('data:image/'),
    path: att.path
  })));

  // Filter out the path from the message content if it exists, but keep the original content for server use
  const displayContent = message.content?.split('\n')
    .filter(line => !line.startsWith('file://') && !line.match(/^[/\\].*$/))
    .join('\n');

  // Keep the original message content for server use
  const serverContent = message.content;

  return (
    <div className="flex justify-end mb-[16px]">
      <div className="flex flex-col items-end pt-4">
        {allAttachments.length > 0 && (
          <div className="mb-2">
            <AttachmentPreview
              attachments={allAttachments}
              mode="message"
            />
          </div>
        )}
        
        {displayContent && displayContent.trim() !== '' && (
          <div className="inline-flex bg-user-bubble dark:bg-user-bubble-dark text-goose-text-light dark:text-goose-text-light-dark rounded-2xl p-4">
            <MarkdownContent
              content={displayContent}
              className="text-white"
            />
          </div>
        )}
      </div>
    </div>
  );
}