"use client";

import Image from "next/image";

type ProductImageWithEmblemProps = {
  src: string;
  alt: string;
  emblemSrc?: string;
  emblemAlt?: string;
  emblemSize?: number;
  className?: string;
  emblemClassName?: string;
};

export default function ProductImageWithEmblem({
  src,
  alt,
  emblemSrc = "/emblems/ca-certified.svg",
  emblemAlt = "Crazy Audios emblem",
  emblemSize = 44,
  className = "object-contain",
  emblemClassName = "",
}: ProductImageWithEmblemProps) {
  return (
    <>
      <Image src={src} alt={alt} fill className={className} />
      <Image
        src={emblemSrc}
        alt={emblemAlt}
        width={emblemSize}
        height={emblemSize}
        quality={100}
        className={`absolute top-2 right-2 z-10 pointer-events-none object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)] ${emblemClassName}`}
      />
    </>
  );
}
