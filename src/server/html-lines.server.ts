// Converteix una pàgina web en línies de text ordenades (amb el nivell dels títols), per llegir-ne la carta.
import { NodeType, parse, type HTMLElement, type Node as HNode, type TextNode } from "node-html-parser";
import type { MenuLine } from "@/lib/menu-import";

const SKIP = new Set(["script", "style", "noscript", "svg", "template", "iframe", "select", "option", "button", "input", "textarea", "nav", "footer"]);
const BLOCK = new Set(["address", "article", "aside", "blockquote", "dd", "div", "dl", "dt", "fieldset", "figcaption", "figure", "form", "header", "hr", "li", "main", "ol", "p", "pre", "section", "table", "tbody", "td", "th", "tr", "ul"]);

export type PageText = { title: string; lines: MenuLine[]; links: { href: string; text: string }[] };

export function htmlToLines(html: string): PageText {
  const root = parse(html, { blockTextElements: { script: false, style: false, noscript: false } });
  const lines: MenuLine[] = [];
  const links: { href: string; text: string }[] = [];
  let buf = "";
  let level: number | undefined;

  const flush = () => {
    const text = buf.replace(/\s+/g, " ").trim();
    if (text) lines.push(level ? { text, level } : { text });
    buf = "";
  };

  const walk = (node: HNode) => {
    if (node.nodeType === NodeType.TEXT_NODE) { buf += (node as TextNode).text; return; }
    if (node.nodeType !== NodeType.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName?.toLowerCase() ?? "";
    if (SKIP.has(tag)) return;
    if (tag === "br") { flush(); return; }
    if (tag === "a") {
      const href = el.getAttribute("href");
      if (href) links.push({ href, text: el.text.replace(/\s+/g, " ").trim() });
    }
    const heading = /^h([1-6])$/.exec(tag);
    if (heading) {
      flush();
      const previous = level;
      level = Number(heading[1]);
      el.childNodes.forEach(walk);
      flush();
      level = previous;
      return;
    }
    const block = BLOCK.has(tag);
    if (block) flush();
    el.childNodes.forEach(walk);
    if (block) flush();
  };

  // Els enllaços es recullen de tota la pàgina (inclosos els menús), però el text no.
  root.querySelectorAll("a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href) links.push({ href, text: a.text.replace(/\s+/g, " ").trim() });
  });
  const linksFromWholePage = links.splice(0);
  root.childNodes.forEach(walk);
  links.splice(0);
  return { title: root.querySelector("title")?.text.replace(/\s+/g, " ").trim() ?? "", lines, links: linksFromWholePage };
}
