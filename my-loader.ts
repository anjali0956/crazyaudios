export default function myImageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (src.startsWith("http")) {
    return `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`;
  }
  return src;
}