import React, { useState, useRef } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [preview, setPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [cloudinaryUrl, setCloudinaryUrl] = useState(null);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current.classList.remove('drag-over');
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type.startsWith('image/') || droppedFile.type.startsWith('video/'))) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current.classList.remove('drag-over');
  };

  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setOriginalSize(selectedFile.size);
    setPreview(URL.createObjectURL(selectedFile));
    setStatus('');
    setProgress(0);
    setDownloadUrl(null);
    setCompressedSize(0);
  };

  const uploadToCloudinary = async (file) => {
    setStatus('Uploading to Cloudinary...');
    setProgress(25);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
      const endpoint = file.type.startsWith('image/')
        ? `${API_URL}/api/v1/upload/imageUpload`
        : `${API_URL}/api/v1/upload/videoUpload`;

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setProgress(50);
      return result;
    } catch (error) {
      throw new Error('Failed to upload to Cloudinary: ' + error.message);
    }
  };

  const generateCompressedUrl = (cloudinaryUrl, isVideo = false) => {
    if (!cloudinaryUrl) return null;

    // Extract public ID from Cloudinary URL
    const urlParts = cloudinaryUrl.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    const publicIdWithExt = urlParts.slice(uploadIndex + 1).join('/');
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ""); // Remove extension

    // Build compressed URL with Cloudinary transformations
    const baseUrl = urlParts.slice(0, uploadIndex + 1).join('/');
    
    if (isVideo) {
      // Video compression: reduce quality and convert to MP4
      return `${baseUrl}/q_auto:low,f_mp4,c_scale,w_1280/${publicId}.mp4`;
    } else {
      // Image compression: reduce quality, auto format, and resize
      return `${baseUrl}/q_auto:low,f_auto,c_scale,w_1920/${publicId}`;
    }
  };

  const downloadFromUrl = async (url, filename) => {
    setStatus('Downloading compressed file...');
    setProgress(80);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      setCompressedSize(blob.size);
      setProgress(95);
      
      return blob;
    } catch (error) {
      throw new Error('Failed to download compressed file: ' + error.message);
    }
  };

  const handleCompress = async () => {
    if (!file) return;
    
    setProcessing(true);
    setProgress(0);
    
    try {
      // Upload original file to Cloudinary
      const uploadResult = await uploadToCloudinary(file);
      const originalCloudinaryUrl = uploadResult.imageUrl || uploadResult.videoUrl;
      setCloudinaryUrl(originalCloudinaryUrl);
      
      setStatus('Generating compressed version...');
      setProgress(60);
      
      // Generate compressed URL using Cloudinary transformations
      const isVideo = file.type.startsWith('video/');
      const compressedUrl = generateCompressedUrl(originalCloudinaryUrl, isVideo);
      
      setProgress(70);
      
      // Download the compressed file
      const compressedBlob = await downloadFromUrl(compressedUrl, file.name);
      
      // Create download URL
      const url = URL.createObjectURL(compressedBlob);
      setDownloadUrl(url);
      
      setStatus('Compression complete!');
      setProgress(100);
      
    } catch (error) {
      setStatus('Error: ' + error.message);
      console.error('Compression error:', error);
    }
    
    setProcessing(false);
  };

  const downloadFile = () => {
    if (downloadUrl && file) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `compressed_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const resetApp = () => {
    setFile(null);
    setPreview(null);
    setOriginalSize(0);
    setCompressedSize(0);
    setProgress(0);
    setStatus('');
    setDownloadUrl(null);
    setCloudinaryUrl(null);
    setProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <div className="logo">
            <h1>File Compressor</h1>
          </div>
          <p className="subtitle">Reduce file sizes for images and videos</p>
        </div>

        {!file ? (
          <div 
            ref={dropZoneRef}
            className="drop-zone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-icon">📁</div>
            <h3>Drop files here to compress</h3>
            <p>or click to select files</p>
            <div className="supported-formats">
              <span>Images: JPG, PNG, GIF</span>
              <span>Videos: MP4, MOV, AVI</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          <div className="file-preview">
            <div className="preview-container">
              {file.type.startsWith('image/') ? (
                <img src={preview} alt="preview" className="preview-media" />
              ) : (
                <video src={preview} controls className="preview-media" />
              )}
              <div className="file-info">
                <h3>{file.name}</h3>
                <div className="size-info">
                  <div className="size-item">
                    <span className="label">Original size:</span>
                    <span className="value">{formatFileSize(originalSize)}</span>
                  </div>
                  {compressedSize > 0 && (
                    <div className="size-item">
                      <span className="label">Compressed size:</span>
                      <span className="value compressed">{formatFileSize(compressedSize)}</span>
                    </div>
                  )}
                  {compressedSize > 0 && (
                    <div className="savings">
                      {Math.round(((originalSize - compressedSize) / originalSize) * 100)}% reduction
                    </div>
                  )}
                </div>
              </div>
            </div>

            {processing && (
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="status">{status}</p>
              </div>
            )}

            <div className="actions">
              {!processing && !downloadUrl && (
                <button className="btn btn-primary" onClick={handleCompress}>
                  Compress {file.type.startsWith('image/') ? 'Image' : 'Video'}
                </button>
              )}
              
              {downloadUrl && (
                <button className="btn btn-success" onClick={downloadFile}>
                  Download Compressed File
                </button>
              )}
              
              <button className="btn" onClick={resetApp}>
                Choose Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
