"use client";

import { useRef } from "react";
import { Modal, type ModalHandle } from "@/components/ui/Modal";

export function StepImageThumb({
  filename,
  alt,
  className = "h-14 w-14",
}: {
  filename: string;
  alt: string;
  className?: string;
}) {
  const modalRef = useRef<ModalHandle>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => modalRef.current?.open()}
        aria-label={`Ingrandisci foto: ${alt}`}
        className="shrink-0 overflow-hidden rounded-lg shadow-sm"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/uploads/${filename}`} alt={alt} className={`${className} object-cover`} />
      </button>
      <Modal ref={modalRef} variant="image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/uploads/${filename}`} alt={alt} className="w-full rounded-xl object-contain" />
      </Modal>
    </>
  );
}
