"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Mic, Upload, X } from "lucide-react";
import { UI_STRINGS, type Language } from "@/lib/i18n/dictionary";
import { validateImageMetadata } from "@/lib/privacy/image-validation";
import { detectEmergencyPhrase } from "@/lib/guide/emergency";
import type { ImagePick } from "./types";

/**
 * The photo picker only ever reads File metadata (name/type/size) — the actual file object is
 * discarded, never uploaded or stored anywhere (matches ImageMetadataSchema, which has no
 * bytes/url field, and CLAUDE.md's warning that photos may carry personal information).
 */
export function DescriptionStep({
  description,
  onDescriptionChange,
  image,
  onImageChange,
  language,
}: {
  description: string;
  onDescriptionChange: (value: string) => void;
  image: ImagePick | null;
  onImageChange: (image: ImagePick | null) => void;
  language: Language;
}) {
  const t = UI_STRINGS.reportFlow.descriptionStep;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<"type" | "size" | null>(null);
  // Derived directly from render-available data — no effect needed, this is exactly what
  // React's own guidance calls "you might not need an effect" (see DEVLOG.md for why this
  // repo's lint rule keeps catching the effect-shaped version of this pattern).
  const isEmergency = detectEmergencyPhrase(description);

  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="text-lg font-semibold text-ink">{t.heading[language]}</legend>

      <div>
        <label htmlFor="description" className="text-sm font-medium text-ink">
          {t.descriptionLabel[language]}
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t.descriptionPlaceholder[language]}
          rows={5}
          className="mt-1.5 w-full rounded-md border border-ink/15 bg-cream p-3 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        />
        {isEmergency && (
          <div
            role="alert"
            className="mt-2 flex items-start gap-2 rounded-lg border border-coral/40 bg-coral/10 p-3 text-sm text-ink"
          >
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
            <div>
              <p className="font-semibold text-coral">{t.emergencyWarningTitle[language]}</p>
              <p className="mt-0.5">{t.emergencyWarningBody[language]}</p>
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-ink">{t.photoLabel[language]}</p>
        <p className="mt-1 text-xs text-slate">{t.photoWarning[language]}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const result = validateImageMetadata({ mimeType: file.type, sizeBytes: file.size });
            if (!result.valid) {
              setPhotoError(result.reason);
              e.target.value = "";
              return;
            }
            setPhotoError(null);
            onImageChange({ fileName: file.name, mimeType: file.type, sizeBytes: file.size });
            e.target.value = "";
          }}
        />
        {photoError && (
          <p className="mt-1 text-xs text-coral">
            {photoError === "type" ? t.photoErrorType[language] : t.photoErrorSize[language]}
          </p>
        )}
        {image ? (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-ink/15 bg-mint/30 px-3 py-2 text-sm">
            <span className="truncate text-ink">{image.fileName}</span>
            <button
              type="button"
              onClick={() => onImageChange(null)}
              className="flex shrink-0 items-center gap-1 text-xs font-medium text-coral"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
              {t.photoRemove[language]}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 flex items-center gap-2 rounded-md border border-dashed border-ink/25 px-3 py-2 text-sm font-medium text-teal hover:bg-mint/20"
          >
            <Upload aria-hidden="true" className="h-4 w-4" />
            {t.photoLabel[language]}
          </button>
        )}
      </div>

      <div
        aria-disabled="true"
        className="flex items-center gap-2 rounded-md border border-ink/10 px-3 py-2 text-sm text-slate/70"
      >
        <Mic aria-hidden="true" className="h-4 w-4" />
        {t.voiceNoteLabel[language]}
        <span className="ml-auto text-[11px] font-medium">{UI_STRINGS.comingSoon[language]}</span>
      </div>
    </fieldset>
  );
}
