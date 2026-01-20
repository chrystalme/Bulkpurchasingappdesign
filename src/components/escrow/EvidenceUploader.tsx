import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Upload, Image, Video, FileText, X } from 'lucide-react';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

interface UploadedFile {
  id: string;
  name: string;
  type: 'photo' | 'video' | 'document';
  url: string;
  description: string;
}

interface EvidenceUploaderProps {
  onUpload?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  allowedTypes?: ('photo' | 'video' | 'document')[];
  required?: boolean;
  className?: string;
}

export function EvidenceUploader({
  onUpload,
  maxFiles = 5,
  allowedTypes = ['photo', 'video', 'document'],
  required = false,
  className = '',
}: EvidenceUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [description, setDescription] = useState('');

  const handleFileAdd = (type: 'photo' | 'video' | 'document') => {
    if (files.length >= maxFiles) return;

    const newFile: UploadedFile = {
      id: `file-${Date.now()}`,
      name: `${type}-${files.length + 1}.${type === 'photo' ? 'jpg' : type === 'video' ? 'mp4' : 'pdf'}`,
      type,
      url: 'https://via.placeholder.com/400x300',
      description: description || `${type} evidence`,
    };

    const updatedFiles = [...files, newFile];
    setFiles(updatedFiles);
    if (onUpload) onUpload(updatedFiles);
    setDescription('');
  };

  const handleRemove = (id: string) => {
    const updatedFiles = files.filter((f) => f.id !== id);
    setFiles(updatedFiles);
    if (onUpload) onUpload(updatedFiles);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'photo':
        return Image;
      case 'video':
        return Video;
      case 'document':
        return FileText;
      default:
        return Upload;
    }
  };

  return (
    <div className={className}>
      <Card className="p-4 border-2 border-dashed border-gray-200">
        <div className="space-y-4">
          <div className="text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-1">Upload Evidence {required && <span className="text-[#FB7185]">*</span>}</p>
            <p className="text-xs text-gray-500">
              {files.length}/{maxFiles} files uploaded
            </p>
          </div>

          <div>
            <Label htmlFor="evidence-description" className="text-sm text-gray-700">
              Description (optional)
            </Label>
            <Textarea
              id="evidence-description"
              placeholder="Describe the evidence you're uploading..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 h-20"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {allowedTypes.includes('photo') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleFileAdd('photo')}
                disabled={files.length >= maxFiles}
                className="flex-1"
              >
                <Image className="w-4 h-4 mr-2" />
                Add Photo
              </Button>
            )}
            {allowedTypes.includes('video') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleFileAdd('video')}
                disabled={files.length >= maxFiles}
                className="flex-1"
              >
                <Video className="w-4 h-4 mr-2" />
                Add Video
              </Button>
            )}
            {allowedTypes.includes('document') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleFileAdd('document')}
                disabled={files.length >= maxFiles}
                className="flex-1"
              >
                <FileText className="w-4 h-4 mr-2" />
                Add Document
              </Button>
            )}
          </div>
        </div>
      </Card>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Uploaded Files</h4>
          {files.map((file) => {
            const Icon = getIcon(file.type);
            return (
              <Card key={file.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-shrink-0 w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500 truncate">{file.description}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(file.id)}
                    className="flex-shrink-0"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
