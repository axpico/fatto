"use client";

import { useRef, useState } from "react";
import { Modal, type ModalHandle } from "@/components/ui/Modal";
import { UploadedImage } from "@/components/UploadedImage";

// ponytail: CSS scroll-snap + indice calcolato dallo scroll, nessuna libreria carousel
export function RecipePhotoCarousel({ photos, title }: { photos: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(0);
  const modalRef = useRef<ModalHandle>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = trackRef.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goTo(index: number) {
    const el = trackRef.current;
    el?.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }

  return (
    <>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((filename, index) => (
          <button
            key={filename}
            type="button"
            onClick={() => {
              setZoomed(index);
              modalRef.current?.open();
            }}
            aria-label={`Ingrandisci foto ${index + 1} di ${photos.length}`}
            className="h-full w-full shrink-0 snap-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- served locally via /api/uploads */}
            <img
              src={`/api/uploads/${filename}`}
              alt={`${title} — foto ${index + 1}`}
              loading={index === 0 ? "eager" : "lazy"}
              className={`h-full w-full object-cover ${index === 0 ? "hero-parallax" : ""}`}
            />
          </button>
        ))}
      </div>

      {photos.length > 1 && (
        <div className="absolute right-4 top-4 flex gap-1.5 rounded-full bg-black/40 px-2 py-1.5">
          {photos.map((filename, index) => (
            <button
              key={filename}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Vai alla foto ${index + 1}`}
              aria-current={index === active}
              className={`h-2 w-2 rounded-full transition-colors ${index === active ? "bg-white" : "bg-white/40"}`}
            />
          ))}
        </div>
      )}

      <Modal ref={modalRef} variant="image">
        <UploadedImage filename={photos[zoomed]} alt={`${title} — foto ${zoomed + 1}`} className="w-full rounded-xl object-contain" />
      </Modal>
    </>
  );
}
