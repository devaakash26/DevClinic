/**
 * Utility functions for handling PDF files and Cloudinary URLs
 */

/**
 * Fixes Cloudinary PDF URLs to ensure they can be properly viewed and downloaded
 * 
 * @param {string} url - The original Cloudinary URL
 * @param {boolean} addCacheBuster - Whether to add a cache-busting parameter (default: true)
 * @returns {string} The fixed URL that should work for PDF viewing and downloading
 */
export const fixCloudinaryPdfUrl = (url) => {
  if (!url) return url;
  
  let fixedUrl = url;
  
  // Make sure we're using raw upload path instead of image
  if (fixedUrl.includes('/image/upload/')) {
    fixedUrl = fixedUrl.replace('/image/upload/', '/raw/upload/');
  }
  
  // Add required flags to bypass security restrictions
  if (fixedUrl.includes('/upload/') && !fixedUrl.includes('fl_attachment')) {
    fixedUrl = fixedUrl.replace('/upload/', '/upload/fl_attachment,fl_no_overflow/');
  }
  
  // Add PDF extension if missing
  if (!fixedUrl.toLowerCase().endsWith('.pdf')) {
    fixedUrl = `${fixedUrl}.pdf`;
  }
  
  // Add a cache-busting parameter to bypass caching issues
  const cacheBuster = `cb=${Date.now()}`;
  fixedUrl = fixedUrl.includes('?') ? `${fixedUrl}&${cacheBuster}` : `${fixedUrl}?${cacheBuster}`;
  
  return fixedUrl;
};

/**
 * Helper to download a PDF from Cloudinary
 * 
 * @param {string} url - The original PDF URL
 * @param {string} fileName - The filename to use for the download
 */
export const downloadPdf = (url, fileName) => {
  if (!url) return;
  
  // Fix the URL
  const downloadUrl = fixCloudinaryPdfUrl(url);
  
  // Ensure the filename has a PDF extension
  let properFileName = fileName || 'document.pdf';
  if (!properFileName.toLowerCase().endsWith('.pdf')) {
    properFileName += '.pdf';
  }
  
  // Force download as a workaround for Cloudinary security restrictions
  try {
    fetch(downloadUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        // Create a blob URL and trigger download
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = properFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      })
      .catch(error => {
        console.error('Error downloading file:', error);
        // Fallback to direct link if fetch fails
        window.open(downloadUrl, '_blank');
      });
  } catch (error) {
    console.error('Error initiating download:', error);
    window.open(downloadUrl, '_blank');
  }
}; 