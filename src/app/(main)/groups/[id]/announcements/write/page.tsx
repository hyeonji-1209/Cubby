"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  ArrowLeft,
  Pin,
  Eye,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  File,
  Loader2,
} from "lucide-react";
import { Announcement, AnnouncementAttachment } from "@/types";

interface WriteAnnouncementPageProps {
  params: { id: string };
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.hancom.hwp",
  "application/haansofthwp",
];

export default function WriteAnnouncementPage({ params }: WriteAnnouncementPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isInstructorOnly, setIsInstructorOnly] = useState(false);
  const [attachments, setAttachments] = useState<AnnouncementAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!editId);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editId) {
      loadAnnouncement(editId);
    }
  }, [editId]);

  const loadAnnouncement = async (id: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      const announcement = data as Announcement;
      setTitle(announcement.title);
      setContent(announcement.content);
      setIsPinned(announcement.is_pinned);
      setIsInstructorOnly(announcement.is_instructor_only || false);
      setAttachments(announcement.attachments || []);
    }
    setIsLoading(false);
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name}은(는) 10MB를 초과합니다.`);
        continue;
      }

      setUploadingFiles(prev => [...prev, file.name]);

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${params.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error } = await supabase.storage
          .from("announcements")
          .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from("announcements")
          .getPublicUrl(fileName);

        const newAttachment: AnnouncementAttachment = {
          id: Date.now().toString(),
          name: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size,
        };

        setAttachments(prev => [...prev, newAttachment]);
      } catch (error) {
        console.error("File upload error:", error);
        alert(`${file.name} 업로드에 실패했습니다.`);
      } finally {
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    await uploadFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragging to false if leaving the drop zone overlay
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const removeAttachment = async (attachment: AnnouncementAttachment) => {
    // Extract path from URL
    const urlParts = attachment.url.split("/announcements/");
    if (urlParts.length > 1) {
      const supabase = createClient();
      await supabase.storage.from("announcements").remove([urlParts[1]]);
    }
    setAttachments(prev => prev.filter(a => a.id !== attachment.id));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const announcementData = {
      title: title.trim(),
      content: content.trim(),
      is_pinned: isPinned,
      is_instructor_only: isInstructorOnly,
      attachments,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editId) {
        const { error } = await supabase
          .from("announcements")
          .update(announcementData)
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("announcements").insert({
          ...announcementData,
          group_id: params.id,
          author_id: user?.id,
        });
        if (error) throw error;
      }
      router.push(`/groups/${params.id}/announcements`);
    } catch (error) {
      console.error("Announcement save error:", error);
      alert("공지사항 저장에 실패했습니다. 권한을 확인해주세요.");
      setIsSubmitting(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (type.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">
            {editId ? "공지 수정" : "공지 작성"}
          </h1>
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : editId ? (
            "수정"
          ) : (
            "등록"
          )}
        </Button>
      </div>

      {/* Content - Full Height */}
      <div
        className="flex-1 flex flex-col p-4 gap-3 overflow-hidden relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
      >
        {/* Title */}
        <Input
          placeholder="제목을 입력하세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-base font-medium h-11 shrink-0 border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
        />

        {/* Options Row */}
        <div className="flex items-center gap-3 shrink-0 py-1">
          <label className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors
            ${isPinned ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:bg-muted/80"}
          `}>
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="sr-only"
            />
            <Pin className="h-3.5 w-3.5" />
            고정
          </label>
          <label className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors
            ${isInstructorOnly ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-muted text-muted-foreground hover:bg-muted/80"}
          `}>
            <input
              type="checkbox"
              checked={isInstructorOnly}
              onChange={(e) => setIsInstructorOnly(e.target.checked)}
              className="sr-only"
            />
            <Eye className="h-3.5 w-3.5" />
            강사전용
          </label>

          <div className="flex-1" />

          {/* File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-primary/50 text-primary hover:bg-primary/10 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            파일 첨부
            {attachments.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {attachments.length}
              </span>
            )}
          </button>
        </div>

        {/* Attached Files */}
        {(uploadingFiles.length > 0 || attachments.length > 0) && (
          <div className="flex flex-wrap gap-1.5 shrink-0">
            {uploadingFiles.map((name) => (
              <div
                key={name}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 text-xs"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="truncate max-w-[120px]">{name}</span>
              </div>
            ))}
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-card text-xs hover:bg-muted/50 transition-colors"
              >
                {getFileIcon(attachment.type)}
                <span className="truncate max-w-[120px]">{attachment.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment)}
                  className="opacity-50 hover:opacity-100 hover:text-destructive transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.hwp"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Editor */}
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="내용을 입력하세요"
          className="flex-1 min-h-0"
        />

        {/* Drag Overlay - covers entire content area */}
        {isDragging && (
          <div
            ref={dropZoneRef}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm z-20"
          >
            <div className="flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-dashed border-primary bg-primary/5">
              <Upload className="h-12 w-12 text-primary" />
              <div className="text-center">
                <p className="text-base font-medium text-primary">파일을 여기에 놓으세요</p>
                <p className="text-sm text-muted-foreground mt-1">이미지, PDF, Word, Excel, HWP (최대 10MB)</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
