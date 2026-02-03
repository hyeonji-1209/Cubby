"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Copy, Check, RefreshCw, Loader2 } from "lucide-react";
import { generateInviteCode } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface InviteCodeSectionProps {
  groupId: string;
  inviteCode: string;
  codeType: 'one_time' | 'expiry';
  isUsed: boolean;
  expiryDate?: string;
}

export function InviteCodeSection({
  groupId,
  inviteCode,
  codeType,
  isUsed,
  expiryDate,
}: InviteCodeSectionProps) {
  const [code, setCode] = useState(inviteCode);
  const [currentIsUsed, setCurrentIsUsed] = useState(isUsed);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const isExpired = codeType === 'expiry' && expiryDate && new Date(expiryDate) < new Date();
  const isInvalid = (codeType === 'one_time' && currentIsUsed) || isExpired;

  const handleCopy = async () => {
    if (isInvalid) return;

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleRegenerate = async () => {
    setIsGenerating(true);

    try {
      const supabase = createClient();
      const newCode = generateInviteCode();

      const { data: group } = await supabase
        .from("groups")
        .select("settings")
        .eq("id", groupId)
        .single();

      const currentSettings = group?.settings || {};

      await supabase
        .from("groups")
        .update({
          invite_code: newCode,
          settings: {
            ...currentSettings,
            invite_code_used: false,
          }
        })
        .eq("id", groupId);

      setCode(newCode);
      setCurrentIsUsed(false);
    } catch (err) {
      console.error("Failed to regenerate:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusText = () => {
    if (isExpired) return "만료됨";
    if (codeType === 'one_time' && currentIsUsed) return "사용됨";
    if (codeType === 'expiry' && expiryDate) {
      return `~${new Date(expiryDate).toLocaleDateString("ko-KR")}`;
    }
    return "단발성";
  };

  return (
    <div className="p-4 rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-muted-foreground">초대 코드</p>
        <span className={cn(
          "text-[10px] px-1.5 py-0.5 rounded",
          isInvalid
            ? "bg-destructive/10 text-destructive"
            : "bg-primary/10 text-primary"
        )}>
          {getStatusText()}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <code className={cn(
          "flex-1 text-xl font-mono font-bold tracking-widest",
          isInvalid && "line-through text-muted-foreground"
        )}>
          {code}
        </code>

        <div className="flex items-center">
          {!isInvalid && (
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-background transition-colors"
              title="복사"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )}

          <button
            onClick={handleRegenerate}
            disabled={isGenerating}
            className="p-2 rounded-lg hover:bg-background transition-colors disabled:opacity-50"
            title="새 코드 생성"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
