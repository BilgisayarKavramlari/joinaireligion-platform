export type LessonTextBlock = {
  type: "heading" | "paragraph" | "list-item";
  text: string;
  ordered?: boolean;
};

function paragraphChunks(text: string): string[] {
  if (text.length <= 520) return [text];
  const sentences = text.split(/(?<=[.!?])\s+(?=(?:\*\*)?[\p{Lu}\d])/u).filter(Boolean);
  if (sentences.length < 3) return [text];
  const chunks: string[] = [];
  for (let index = 0; index < sentences.length; index += 2) {
    chunks.push(sentences.slice(index, index + 2).join(" "));
  }
  return chunks;
}

/** Parse the deliberately small Markdown subset used by generated lessons. */
export function lessonTextBlocks(value: string): LessonTextBlock[] {
  const normalized = value
    .replace(/\\r\\n?/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/([.!?])\s+(?=\*\*[^*\n]{2,90}\*\*)/g, "$1\n")
    .replace(/(^|\n)(\*\*[^*\n]{2,90}\*\*)\s+/g, "$1$2\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  if (!normalized) return [];

  return normalized.split(/\n+/).flatMap<LessonTextBlock>((rawLine): LessonTextBlock[] => {
    const line = rawLine.trim();
    if (!line) return [];
    const markdownHeading = line.match(/^#{1,3}\s+(.+)$/);
    const boldHeading = line.match(/^\*\*([^*]+)\*\*[:.]?$/);
    if (markdownHeading) return [{ type: "heading" as const, text: markdownHeading[1].trim() }];
    if (boldHeading) return [{ type: "heading" as const, text: boldHeading[1].trim() }];

    const unordered = line.match(/^[-*•]\s+(.+)$/);
    if (unordered) return [{ type: "list-item" as const, text: unordered[1].trim(), ordered: false }];
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) return [{ type: "list-item" as const, text: ordered[1].trim(), ordered: true }];

    return paragraphChunks(line).map((text) => ({ type: "paragraph" as const, text }));
  });
}
