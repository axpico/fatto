export function UploadedImage({
  filename,
  alt,
  className,
}: {
  filename: string;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- served locally via /api/uploads, next/image's remote-loader machinery doesn't apply
    <img
      src={`/api/uploads/${filename}`}
      alt={alt}
      className={[className, "img-fade-in"].filter(Boolean).join(" ")}
    />
  );
}
