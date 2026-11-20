function escapeSvgText(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function splitLines(text: string, maxLength: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, maxLength - 1)}…`;
    return kept;
  }

  return lines;
}

// Neutral generated poster for titles whose artwork failed to load. Long titles wrap instead of overflowing.
export function getPosterFallback(title: string, originalTitle = "", type = "") {
  const titleLines = splitLines(title || "KinoLuma", 16, 4);
  const titleTop = 360 - (titleLines.length - 1) * 22;
  const titleSvg = titleLines
    .map(
      (line, index) =>
        `<text x="250" y="${titleTop + index * 46}" text-anchor="middle" fill="#f4f4f5" font-family="Segoe UI, Arial, sans-serif" font-size="36" font-weight="800">${escapeSvgText(line)}</text>`,
    )
    .join("");
  const originalLine = originalTitle && originalTitle !== title ? splitLines(originalTitle, 30, 1)[0] : "";

  const svg = `
    <svg width="500" height="750" viewBox="0 0 500 750" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(90 80) rotate(55) scale(720)">
          <stop stop-color="#f3b74f" stop-opacity="0.16"/>
          <stop offset="1" stop-color="#f3b74f" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="500" height="750" fill="#141418"/>
      <rect width="500" height="750" fill="url(#g)"/>
      <rect x="22" y="22" width="456" height="706" rx="26" stroke="#2a2a31" stroke-width="2"/>
      ${titleSvg}
      ${originalLine ? `<text x="250" y="${titleTop + titleLines.length * 46 + 14}" text-anchor="middle" fill="#8a8a94" font-family="Segoe UI, Arial, sans-serif" font-size="21" font-weight="600">${escapeSvgText(originalLine)}</text>` : ""}
      <text x="250" y="672" text-anchor="middle" fill="#6b6b74" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="2">${escapeSvgText([type, "KinoLuma"].filter(Boolean).join(" · ").toUpperCase())}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
