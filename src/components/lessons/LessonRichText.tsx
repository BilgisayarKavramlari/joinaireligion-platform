import { Fragment } from "react";

import { lessonTextBlocks } from "@/lib/lessons/text-format";

function InlineMarkdown({ text }: { text: string }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => (
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={index} style={{ color: "var(--gold-light)", fontWeight: 700 }}>{part.slice(2, -2)}</strong>
      : <Fragment key={index}>{part}</Fragment>
  ));
}

export default function LessonRichText({ text }: { text: string }) {
  const blocks = lessonTextBlocks(text);

  return (
    <div>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h3 key={index} className="font-sacred" style={{ color: "var(--gold-light)", fontSize: "1.04rem", lineHeight: 1.45, margin: index === 0 ? "0 0 0.7rem" : "1.35rem 0 0.7rem" }}>
              <InlineMarkdown text={block.text} />
            </h3>
          );
        }
        if (block.type === "list-item") {
          return (
            <div key={index} style={{ display: "flex", gap: "0.7rem", color: "rgba(237,232,220,0.78)", lineHeight: 1.8, margin: "0.35rem 0", fontSize: "0.92rem" }}>
              <span aria-hidden="true" style={{ color: "var(--gold)", flexShrink: 0 }}>{block.ordered ? "•" : "✦"}</span>
              <span><InlineMarkdown text={block.text} /></span>
            </div>
          );
        }
        return (
          <p key={index} style={{ color: "rgba(237,232,220,0.78)", lineHeight: 1.85, margin: "0 0 0.9rem", fontSize: "0.92rem" }}>
            <InlineMarkdown text={block.text} />
          </p>
        );
      })}
    </div>
  );
}
