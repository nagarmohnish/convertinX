import { useState } from "react";

interface UploadResult {
  job_id: string;
  content_type: string;
}

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const submitJob = async (
    file: File,
    targetLanguages: string[],
    sourceLanguage: string | null,
  ): Promise<UploadResult> => {
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("target_languages", JSON.stringify(targetLanguages));
    if (sourceLanguage) {
      formData.append("source_language", sourceLanguage);
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(e.loaded / e.total);
        }
      };

      xhr.onload = () => {
        setUploading(false);
        setUploadProgress(1);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.detail || "Upload failed"));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        setUploading(false);
        reject(new Error("Network error during upload"));
      };

      xhr.open("POST", "/api/upload");
      xhr.send(formData);
    });
  };

  return { submitJob, uploading, uploadProgress };
}
