// src/utils/imageUtils.ts

// CHANGE THIS IP if your backend computer's IP changes
export const BACKEND_IP = '192.168.1.68'; 

export const getAccessibleImageUrl = (url: string) => {
  if (!url) return '';
  
  const backendBase = `http://${BACKEND_IP}:8000`;

  // 1. Handle relative paths (e.g. "/media/img.jpg")
  if (url.startsWith('/')) {
    return `${backendBase}${url}`;
  }

  // 2. Handle localhost/127.0.0.1 replacement
  if (url.includes('127.0.0.1:8000')) {
    return url.replace('127.0.0.1:8000', `${BACKEND_IP}:8000`);
  }
  if (url.includes('localhost:8000')) {
    return url.replace('localhost:8000', `${BACKEND_IP}:8000`);
  }

  return url;
};