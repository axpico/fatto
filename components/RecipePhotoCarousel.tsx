"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Modal, type ModalHandle } from "@/components/ui/Modal";
import { UploadedImage } from "@/components/UploadedImage";

const SWIPE_THRESHOLD_PX = 50;

// ponytail: CSS scroll-snap + indice calcolato dallo scroll, nessuna libreria carousel
export function RecipePhotoCarousel({ photos, title }: { photos: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(0);
  const modalRef = useRef<ModalHandle>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const zoomTouchX = useRef<number | null>(null);

  function zoomStep(delta: number) {
    setZoomed((z) => (z + delta + photos.length) % photos.length);
  }

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
        <div className="absolute right-4 top-4 flex rounded-full bg-black/40 px-1">
          {photos.map((filename, index) => (
            // 32px hit area around an 8px dot
            <button
              key={filename}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Vai alla foto ${index + 1}`}
              aria-current={index === active}
              className="flex h-8 w-6 items-center justify-center"
            >
              <span className={`h-2 w-2 rounded-full transition-colors ${index === active ? "bg-white" : "bg-white/40"}`} />
            </button>
          ))}
        </div>
      )}

      <Modal ref={modalRef} variant="image">
        <div
          className="relative"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") zoomStep(-1);
            else if (e.key === "ArrowRight") zoomStep(1);
          }}
          onTouchStart={(e) => {
            zoomTouchX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (zoomTouchX.current === null) return;
            const delta = e.changedTouches[0].clientX - zoomTouchX.current;
            zoomTouchX.current = null;
            if (Math.abs(delta) > SWIPE_THRESHOLD_PX) zoomStep(delta < 0 ? 1 : -1);
          }}
        >
          <UploadedImage filename={photos[zoomed]} alt={`${title} — foto ${zoomed + 1}`} className="w-full rounded-xl object-contain" />
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => zoomStep(-1)}
                aria-label="Foto precedente"
                className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => zoomStep(1)}
                aria-label="Foto successiva"
                className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
