"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@excalidraw/excalidraw/components/Dialog";
import { FilledButton } from "@excalidraw/excalidraw/components/FilledButton";
import { TextField } from "@excalidraw/excalidraw/components/TextField";
import {
  copyIcon,
  LinkIcon,
  playerPlayIcon,
  playerStopFilledIcon,
  share as shareIcon,
} from "@excalidraw/excalidraw/components/icons";
import { useCopyStatus } from "@excalidraw/excalidraw/hooks/useCopiedIndicator";
import { t } from "@excalidraw/excalidraw/i18n";

import type { CollabAPI } from "@/collab/CollabController";

type ShareDialogType = "share" | "collaborationOnly";

export type ShareDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  collabAPI: CollabAPI | null;
  onExportToBackend: () => Promise<{ url: string } | { errorMessage: string }>;
  type?: ShareDialogType;
};

export function ShareDialog({
  isOpen,
  onClose,
  collabAPI,
  onExportToBackend,
  type = "share",
}: ShareDialogProps) {
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const { onCopy, copyStatus } = useCopyStatus();

  useEffect(() => {
    if (!isOpen) {
      setShareLink(null);
      setShareError(null);
    }
  }, [isOpen]);

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    onCopy();
    ref.current?.select();
  };

  const isShareSupported = typeof navigator !== "undefined" && "share" in navigator;

  const activeRoomLink = collabAPI?.getActiveRoomLink() || null;

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog onCloseRequest={onClose} title={t("labels.share")}>
      <div className="flex flex-col gap-4">
        {collabAPI && activeRoomLink ? (
          <>
            <TextField
              defaultValue={collabAPI.getUsername()}
              placeholder="Your name"
              label="Your name"
              onChange={collabAPI.setUsername}
            />
            <div className="flex flex-col gap-2">
              <TextField ref={ref} label="Link" readonly fullWidth value={activeRoomLink} />
              <div className="flex gap-2">
                {isShareSupported && (
                  <FilledButton
                    size="large"
                    variant="icon"
                    label="Share"
                    icon={shareIcon}
                    onClick={async () => {
                      try {
                        // @ts-ignore
                        await navigator.share({
                          title: t("roomDialog.shareTitle"),
                          text: t("roomDialog.shareTitle"),
                          url: activeRoomLink,
                        });
                      } catch {
                        // ignore
                      }
                    }}
                  />
                )}
                <FilledButton
                  size="large"
                  label={t("buttons.copyLink")}
                  icon={copyIcon}
                  status={copyStatus}
                  onClick={() => copyLink(activeRoomLink)}
                />
              </div>
            </div>
            <FilledButton
              size="large"
              variant="outlined"
              color="danger"
              label={t("roomDialog.button_stopSession")}
              icon={playerStopFilledIcon}
              onClick={() => {
                collabAPI.stopCollaboration();
                onClose();
              }}
            />
          </>
        ) : (
          <>
            {collabAPI && (
              <FilledButton
                size="large"
                label={t("roomDialog.button_startSession")}
                icon={playerPlayIcon}
                onClick={() => collabAPI.startCollaboration(null)}
              />
            )}
            {type === "share" && (
              <FilledButton
                size="large"
                label={t("exportDialog.link_button")}
                icon={LinkIcon}
                onClick={async () => {
                  const result = await onExportToBackend();
                  if ("errorMessage" in result) {
                    setShareError(result.errorMessage);
                  } else {
                    setShareError(null);
                    setShareLink(result.url);
                  }
                }}
              />
            )}
            {shareLink && (
              <div className="flex flex-col gap-2">
                <TextField ref={ref} label="Link" readonly fullWidth value={shareLink} />
                <FilledButton
                  size="large"
                  label={t("buttons.copyLink")}
                  icon={copyIcon}
                  status={copyStatus}
                  onClick={() => copyLink(shareLink)}
                />
              </div>
            )}
            {shareError && (
              <div className="text-sm text-red-600">{shareError}</div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
