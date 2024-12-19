import React from 'react';
import MarkdownContent from './MarkdownContent';
import { Message } from '../ai-sdk-fork/useChat';
import { Attachment } from './AttachmentPreview';
import AttachmentPreview from './AttachmentPreview';

interface MessageWithAttachments extends Message {
  image?: {
    preview: string;
    compressed: string;
    path?: string;
  };
  attachments?: Attachment[];
  experimental_attachments?: Array<{
    name: string;
    contentType: string;
    url: string;
  }>;
}

export default function UserMessage({ message }: { message: MessageWithAttachments }) {
  // Debug logging for incoming message data
  console.log('UserMessage received:', {
    hasImage: !!message.image,
    attachmentsCount: message.attachments?.length,
    experimentalAttachmentsCount: message.experimental_attachments?.length,
    imagePreview: message.image?.preview?.slice(0, 50),
    attachments: message.attachments?.map(att => ({
      type: att.type,
      ...(att.type === 'image' ? { srcStart: att.src?.slice(0, 50) } : { name: att.name })
    })),
    experimental: message.experimental_attachments?.map(att => ({
      name: att.name,
      contentType: att.contentType,
      urlStart: att.url.slice(0, 50)
    }))
  });

  // Convert all possible attachment formats to our Attachment type
  const allAttachments: Attachment[] = [];
  
  // Create a map to store base64 data from direct attachments
  const base64Map = new Map<string, string>();
  
  // First, collect base64 data from direct attachments
  if (message.attachments) {
    message.attachments.forEach(attachment => {
      if (attachment.type === 'image' && attachment.src) {
        // Store base64 data by both path and src
        if (attachment.path) {
          base64Map.set(attachment.path, attachment.src);
        }
        base64Map.set(attachment.src, attachment.src);

        // Also add directly to allAttachments
        allAttachments.push({
          type: 'image',
          src: attachment.src,
        });
      } else if (attachment.type === 'file') {
        allAttachments.push({
          type: 'file',
          name: attachment.name || 'Unknown file',
          fileType: attachment.fileType || 'Unknown type',
        });
      }
    });
  }

  // Handle legacy image format if we don't already have an image
  if (message.image?.preview && !allAttachments.some(att => att.type === 'image')) {
    console.log('Adding legacy image:', message.image.preview.slice(0, 50));
    allAttachments.push({
      type: 'image',
      src: message.image.preview,
    });
  }

  // Handle experimental_attachments
  if (message.experimental_attachments) {
    message.experimental_attachments.forEach(attachment => {
      const isImage = attachment.contentType.startsWith('image/');
      console.log('Processing experimental attachment:', {
        isImage,
        contentType: attachment.contentType,
        urlStart: attachment.url.slice(0, 50)
      });

      if (isImage) {
        // For images, check if we already have this image in allAttachments
        const existingImage = allAttachments.find(att => 
          att.type === 'image' && (
            att.src === attachment.url ||
            att.src === attachment.url.replace('file://', '') ||
            att.src === `data:${attachment.contentType};base64,${attachment.url}`
          )
        );

        if (!existingImage) {
          // Try to find base64 data in our map
          const base64Data = base64Map.get(attachment.url) || base64Map.get(attachment.url.replace('file://', ''));
          
          if (base64Data) {
            // Use the base64 data we found
            console.log('Using base64 data for image:', base64Data.slice(0, 50));
            allAttachments.push({
              type: 'image',
              src: base64Data,
            });
          } else {
            // If no base64 data found, use the URL directly
            const url = attachment.url.startsWith('file://')
              ? attachment.url.slice(7) // Remove file:// prefix
              : attachment.url;

            console.log('Using URL directly for image:', url.slice(0, 50));
            allAttachments.push({
              type: 'image',
              src: url.startsWith('data:') 
                ? url 
                : `data:${attachment.contentType};base64,${url}`,
            });
          }
        }
      } else {
        // For files, only add if we don't already have this file
        if (!allAttachments.some(att => 
          att.type === 'file' && 
          att.name === attachment.name
        )) {
          console.log('Adding experimental file:', attachment.name);
          allAttachments.push({
            type: 'file',
            name: attachment.name || 'Unknown file',
            fileType: attachment.contentType || 'Unknown type',
          });
        }
      }
    });
  }

  // Debug log final attachments
  console.log('Final allAttachments:', allAttachments.map(att => ({
    type: att.type,
    ...(att.type === 'image' ? { srcStart: att.src.slice(0, 50) } : { name: att.name })
  })));

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