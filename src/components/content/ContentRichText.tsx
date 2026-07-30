import { Fragment } from "react";

import { contentInlineTokens, contentMarkdownBlocks } from "@/lib/content-markdown";

function InlineContent({ text }: { text: string }) {
  return contentInlineTokens(text).map((token, index) => {
    if (token.type === "strong") return <strong key={index} style={{ color: "var(--gold-light)", fontWeight: 700 }}>{token.text}</strong>;
    if (token.type === "emphasis") return <em key={index}>{token.text}</em>;
    if (token.type === "link") {
      const external = new URL(token.href).hostname !== "joinaireligion.com";
      return (
        <a
          key={index}
          href={token.href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener" : undefined}
          style={{ color: "var(--gold-light)", textDecoration: "underline", textUnderlineOffset: ".2em" }}
        >
          {token.text}
        </a>
      );
    }
    return <Fragment key={index}>{token.text}</Fragment>;
  });
}

export function ContentRichText({ markdown }: { markdown: string }) {
  return (
    <section>
      {contentMarkdownBlocks(markdown).map((block, index) => {
        if (block.type === "heading") {
          const style = { color: "var(--gold-light)", marginTop: "2rem", lineHeight: 1.35 };
          return block.level === 3
            ? <h3 key={index} className="font-sacred" style={style}><InlineContent text={block.text} /></h3>
            : <h2 key={index} className="font-sacred" style={style}><InlineContent text={block.text} /></h2>;
        }
        if (block.type === "quote") {
          return (
            <blockquote key={index} style={{ margin: "1.5rem 0", padding: ".8rem 1.2rem", borderLeft: "3px solid var(--gold)", color: "rgba(237,232,220,.9)", fontSize: "1.08rem", lineHeight: 1.8 }}>
              <InlineContent text={block.text} />
            </blockquote>
          );
        }
        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List key={index} style={{ color: "rgba(237,232,220,.78)", lineHeight: 1.85, paddingLeft: "1.5rem", margin: "1rem 0 1.4rem" }}>
              {block.items.map((item, itemIndex) => <li key={itemIndex} style={{ margin: ".4rem 0" }}><InlineContent text={item} /></li>)}
            </List>
          );
        }
        if (block.type === "rule") return <hr key={index} style={{ border: 0, borderTop: "1px solid var(--border-gold)", margin: "2rem 0" }} />;
        return <p key={index} style={{ lineHeight: 1.9, color: "rgba(237,232,220,.78)" }}><InlineContent text={block.text} /></p>;
      })}
    </section>
  );
}
