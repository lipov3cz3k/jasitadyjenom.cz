"use client";

import Link from "next/link";
import { MAX_DESCRIPTION_LENGTH, MAX_PHOTOS } from "@/lib/analysis/schema";
import { PhotoPicker, type PhotoItem } from "./PhotoPicker";
import { ActionBar, inputClass, PrimaryButton, ScreenHeader } from "./ui";

interface Props {
  photos: PhotoItem[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  useAi: boolean;
  onUseAiChange: (value: boolean) => void;
  onContinue: () => void;
}

export function PhotosScreen(props: Props) {
  const { photos, description, useAi } = props;

  return (
    <div>
      <ScreenHeader step={1} title="Vyfoťte auto" />
      <div className="space-y-6">
        <PhotoPicker photos={photos} onAdd={props.onAdd} onRemove={props.onRemove} />

        <label className="block text-sm">
          <span className="font-medium">Co se stalo? (nepovinné)</span>
          <textarea
            className={`${inputClass} min-h-24`}
            value={description}
            maxLength={MAX_DESCRIPTION_LENGTH}
            onChange={(e) => props.onDescriptionChange(e.target.value)}
            placeholder="např. Stojí celý na chodníku před školou, s kočárkem se nedá projít."
          />
          <span className="mt-1 block text-xs text-muted">
            Napište hlavně to, co fotky neukážou – třeba co vám řekl řidič.
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0"
            checked={useAi}
            onChange={(e) => props.onUseAiChange(e.target.checked)}
          />
          <span>
            <span className="font-medium">Rozpoznat z fotek a napsat text pomocí AI</span>
            <span className="mt-1 block text-muted">
              Vyčte značku, vůz a druh přestupku a napíše podnět na míru. Pošleme nejvýš {MAX_PHOTOS} fotky (zmenšené,
              bez polohy a metadat) a váš popis modelu Gemini, zpracování probíhá v EU. Vaše jméno, adresu ani místo
              neposíláme.{" "}
              <Link href="/soukromi#ai" className="underline">
                Podrobnosti
              </Link>
            </span>
          </span>
        </label>
      </div>

      <ActionBar>
        <PrimaryButton onClick={props.onContinue} disabled={photos.length === 0}>
          {photos.length === 0 ? "Nejdřív přidejte fotky" : "Pokračovat"}
        </PrimaryButton>
      </ActionBar>
    </div>
  );
}
