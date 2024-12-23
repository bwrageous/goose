import { getImageData, compressImage } from './imageUtils';

interface ImageData {
  preview: string;     // Uncompressed for preview
  base64: string;      // Compressed for analysis
  contentType: string;
}

/**
 * Shared utility for handling images from different sources
 * This utility maintains compatibility with both the existing
 * attachment structure and screen capture functionality
 */
export class SharedImageProcessor {
  /**
   * Process a pasted image from clipboard
   * @param blob - The image blob from clipboard
   * @returns Promise<ImageData>
   */
  static async processPastedImage(blob: Blob): Promise<ImageData> {
    try {
      // Get the preview data first (uncompressed for display)
      const preview = await getImageData(blob);
      if (!preview) {
        throw new Error('Failed to get preview data');
      }

      // For analysis, use the same data format
      // This ensures consistent base64 format for saving
      const base64Match = preview.match(/^data:image\/\w+;base64,(.+)$/);
      const base64Data = base64Match ? base64Match[1] : preview;

      return {
        preview: preview,          // Keep full data URL for preview
        base64: base64Data,       // Use raw base64 for saving
        contentType: blob.type || 'image/png'
      };
    } catch (error) {
      console.error('Error processing pasted image:', error);
      throw error;
    }
  }

  /**
   * Process a captured screen image
   * @param imageData - Base64 image data from screen capture
   * @returns Promise<ImageData>
   */
  static async processScreenCapture(imageData: string): Promise<ImageData> {
    // Screen captures are already in the correct format
    const preview = `data:image/png;base64,${imageData}`;
    return {
      preview,           // Add data URL prefix for preview
      base64: imageData, // Keep raw base64 for saving
      contentType: 'image/png'
    };
  }

  /**
   * Process an image file
   * @param file - Image file
   * @returns Promise<ImageData>
   */
  static async processImageFile(file: File): Promise<ImageData> {
    try {
      // Get the preview data first (uncompressed for display)
      const preview = await getImageData(file);
      if (!preview) {
        throw new Error('Failed to get preview data');
      }

      // For analysis, use the same data format
      const base64Match = preview.match(/^data:image\/\w+;base64,(.+)$/);
      const base64Data = base64Match ? base64Match[1] : preview;

      return {
        preview: preview,          // Keep full data URL for preview
        base64: base64Data,       // Use raw base64 for saving
        contentType: file.type || 'image/png'
      };
    } catch (error) {
      console.error('Error processing image file:', error);
      throw error;
    }
  }

  /**
   * Create an attachment object that maintains compatibility
   * with both Input.tsx and UserMessage.tsx
   * @param imageData - Processed image data
   * @param filePath - Path to the saved temporary file
   * @returns Attachment object with correct structure for preview
   */
  static createAttachment(imageData: ImageData, filePath: string) {
    if (!imageData.preview) {
      throw new Error('Preview data is required for attachment');
    }

    return {
      type: 'image' as const,
      src: imageData.preview,  // Use full data URL for preview
      path: filePath,         // Use path for file reference
      fileType: imageData.contentType
    };
  }
}