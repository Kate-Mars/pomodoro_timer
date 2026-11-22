/** Логотип: собственный воксельный «островок» 16×16 + название пиксельным шрифтом. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden shapeRendering="crispEdges">
      <rect x="2" y="5" width="12" height="3" fill="#7fb55a" />
      <rect x="2" y="8" width="12" height="2" fill="#86593a" />
      <rect x="4" y="10" width="8" height="2" fill="#6e4a31" />
      <rect x="6" y="12" width="4" height="2" fill="#62676d" />
      <rect x="9" y="1" width="3" height="3" fill="#4e8f37" />
      <rect x="10" y="4" width="1" height="1" fill="#6b4a2b" />
      <rect x="4" y="3" width="3" height="2" fill="#b48451" />
      <rect x="4" y="2" width="3" height="1" fill="#7c3f2b" />
      <rect x="5" y="4" width="1" height="1" fill="#f2c35b" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="pixel-label text-[11px] text-foreground">Остров</span>
    </span>
  );
}
