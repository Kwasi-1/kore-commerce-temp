import * as React from "react";
import {
  Download,
  Share2,
  Trash2,
  Maximize2,
  X,
  FileText,
  FileImage,
  File,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface FilePreviewerFile {
  id: string;
  name: string;
  type: "image" | "pdf" | "document" | "video";
  url: string;
  size?: string;
  uploadedAt?: string;
}

interface FilePreviewerProps {
  file: FilePreviewerFile;
  onDownload?: (file: FilePreviewerFile) => void;
  onShare?: (file: FilePreviewerFile) => void;
  onDelete?: (file: FilePreviewerFile) => void;
  onFullScreen?: (file: FilePreviewerFile) => void;
  onClose?: () => void;
  showActionBar?: boolean;
  actionBarPosition?: "top" | "bottom";
  className?: string;
}

export function FilePreviewer({
  file,
  onDownload,
  onShare,
  onDelete,
  onFullScreen,
  onClose,
  showActionBar = true,
  actionBarPosition = "bottom",
  className,
}: FilePreviewerProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const getFileIcon = () => {
    switch (file.type) {
      case "image":
        return <FileImage className="h-12 w-12 text-muted-foreground" />;
      case "pdf":
        return <FileText className="h-12 w-12 text-red-500" />;
      case "document":
        return <FileText className="h-12 w-12 text-blue-500" />;
      default:
        return <File className="h-12 w-12 text-muted-foreground" />;
    }
  };

  const renderPreview = () => {
    switch (file.type) {
      case "image":
        return (
          <img
            src={file.url}
            alt={file.name}
            className="h-full w-full object-contain"
          />
        );
      case "pdf":
        return (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gray-50">
            {getFileIcon()}
            <p className="mt-4 text-sm font-medium text-foreground">
              {file.name}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">PDF Document</p>
          </div>
        );
      case "document":
        return (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gray-50">
            {getFileIcon()}
            <p className="mt-4 text-sm font-medium text-foreground">
              {file.name}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Document</p>
          </div>
        );
      default:
        return (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gray-50">
            {getFileIcon()}
            <p className="mt-4 text-sm font-medium text-foreground">
              {file.name}
            </p>
          </div>
        );
    }
  };

  const actionBar = showActionBar && (
    <div
      className={cn(
        "absolute left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg border bg-white/95 p-1 shadow-lg backdrop-blur-sm transition-all duration-200",
        actionBarPosition === "top" ? "top-4" : "bottom-4",
        isHovered ? "opacity-100" : "opacity-0",
      )}
    >
      {onDownload && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => onDownload(file)}
          title="Download"
        >
          <Download className="h-4 w-4" />
        </Button>
      )}
      {onShare && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => onShare(file)}
          title="Share"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      )}
      {onFullScreen && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => onFullScreen(file)}
          title="Full Screen"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      )}
      {onDelete && (
        <>
          <div className="mx-1 h-6 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(file)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden rounded-lg border bg-white",
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Close Button */}
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-white/95 shadow-md backdrop-blur-sm transition-opacity duration-200 hover:bg-white",
            isHovered ? "opacity-100" : "opacity-0",
          )}
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {/* Preview Area */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {renderPreview()}
        {actionBar}
      </div>

      {/* File Info Footer */}
      <div className="border-t bg-gray-50 px-4 py-3">
        <p className="truncate text-sm font-medium text-foreground">
          {file.name}
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {file.size && <span>{file.size}</span>}
          {file.size && file.uploadedAt && <span>â€¢</span>}
          {file.uploadedAt && <span>{file.uploadedAt}</span>}
        </div>
      </div>
    </div>
  );
}
