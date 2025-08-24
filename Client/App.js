import React, { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import './App.css';

const ffmpeg = createFFmpeg({ log: false });

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setMessage('');
  };

  const compressImage = async (imageFile) => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
    };
    return await imageCompression(imageFile, options);
  };

  const compressVideo = async (videoFile) => {
    if (!ffmpeg.isLoaded()) {
      await ffmpeg.load();
    }
    ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoFile));
    await ffmpeg.run(
      '-i', 'input.mp4',
      '-vcodec', 'libx264',
      '-crf', '28',
      '-preset', 'fast',
      '-acodec', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      'output.mp4'
    );
    const data = ffmpeg.FS('readFile', 'output.mp4');
    return new File([data.buffer], 'compressed.mp4', { type: 'video/mp4' });
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setMessage('Compressing...');
    let compressedFile = file;
    try {
      if (file.type.startsWith('image/')) {
        compressedFile = await compressImage(file);
      } else if (file.type.startsWith('video/')) {
        compressedFile = await compressVideo(file);
      }
      setMessage('Uploading...');
      const formData = new FormData();
      formData.append('file', compressedFile);
      const res = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setMessage('Upload successful!');
      } else {
        setMessage('Upload failed.');
      }
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
    setUploading(false);
  };

  return (
    <div className="container">
      <h2>File Upload (Image/Video Compression)</h2>
      <div className="upload-box">
        <input type="file" accept="image/*,video/*" onChange={handleFileChange} disabled={uploading} />
        {preview && (
          file.type.startsWith('image/') ? (
            <img src={preview} alt="preview" className="preview" />
          ) : (
            <video src={preview} controls className="preview" />
          )
        )}
        <button onClick={handleUpload} disabled={!file || uploading}>
          {uploading ? 'Processing...' : 'Compress & Upload'}
        </button>
        {message && <div className="message">{message}</div>}
      </div>
    </div>
  );
}

export default App;
