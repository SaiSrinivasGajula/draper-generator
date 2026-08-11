import fs from "node:fs/promises";
import PptxGenJS from "pptxgenjs";
import { imageSize } from "image-size";
import { resolveStoragePath } from "./storage";
import { lookImagePath } from "./lookImage";
import type { Customer, GeneratedLook, OutfitItem } from "./types";

const SLIDE_W = 13.33;
const SLIDE_H = 7.5;
const CREAM = "F1ECE1";
const INK = "141414";
const MAROON = "5A2E20";
const MAX_PER_SLIDE = 4;

type LookWithOutfit = GeneratedLook & { outfits: OutfitItem[] };

function groupByCategory(looks: LookWithOutfit[]): { label: string; looks: LookWithOutfit[] }[] {
  const order: string[] = [];
  const groups = new Map<string, LookWithOutfit[]>();

  for (const look of looks) {
    const label = look.outfits.find((o) => o.category?.trim())?.category?.trim() || "Looks";
    if (!groups.has(label)) {
      groups.set(label, []);
      order.push(label);
    }
    groups.get(label)!.push(look);
  }

  return order.map((label) => ({ label, looks: groups.get(label)! }));
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function imageDimensions(absolutePath: string): Promise<{ width: number; height: number }> {
  const buffer = await fs.readFile(absolutePath);
  const { width, height } = imageSize(buffer);
  return { width: width || 1, height: height || 1 };
}

export async function buildLookbookPpt(
  customer: Customer,
  looks: LookWithOutfit[]
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "DRAPER", width: SLIDE_W, height: SLIDE_H });
  pptx.layout = "DRAPER";

  // Cover slide
  const cover = pptx.addSlide();
  cover.background = { color: CREAM };
  cover.addText("OUTFIT\nSTYLING", {
    x: 5.8,
    y: 1.7,
    w: 7.1,
    h: 2.4,
    align: "right",
    fontFace: "Arial Black",
    fontSize: 54,
    bold: true,
    color: INK,
    lineSpacing: 50,
  });
  cover.addText("DRAPER SOCIETY", {
    x: 5.8,
    y: 4.05,
    w: 7.1,
    h: 0.4,
    align: "right",
    fontFace: "Arial",
    fontSize: 14,
    color: "6B6B6B",
    charSpacing: 2,
  });
  cover.addText([
    { text: "CLIENT NAME:\n", options: { bold: true } },
    { text: customer.name.toUpperCase(), options: { bold: true } },
  ], {
    x: 0.7,
    y: 6.5,
    w: 5,
    h: 0.7,
    fontFace: "Arial",
    fontSize: 12,
    color: INK,
  });

  const groups = groupByCategory(looks);

  for (const group of groups) {
    const slides = chunk(group.looks, MAX_PER_SLIDE);
    for (const slideLooks of slides) {
      const slide = pptx.addSlide();
      slide.background = { color: "FFFFFF" };

      slide.addText(customer.name.split(" ")[0], {
        x: 0.4,
        y: 0.25,
        w: 3,
        h: 0.4,
        fontFace: "Arial",
        fontSize: 12,
        bold: true,
        color: INK,
      });

      slide.addText(group.label, {
        x: SLIDE_W - 0.9,
        y: 0.4,
        w: SLIDE_H - 0.8,
        h: 0.9,
        rotate: 270,
        fontFace: "Arial Black",
        fontSize: 34,
        bold: true,
        color: MAROON,
        align: "left",
        valign: "middle",
      });

      const usableW = SLIDE_W - 1.6;
      const slotW = usableW / slideLooks.length;
      const maxImgH = 5.6;
      const imgTop = 1.0;

      for (let i = 0; i < slideLooks.length; i++) {
        const look = slideLooks[i];
        const imagePath = lookImagePath(look);
        if (!imagePath) continue;
        const absPath = resolveStoragePath(imagePath);
        const { width, height } = await imageDimensions(absPath);
        const aspect = width / height;

        let h = maxImgH;
        let w = h * aspect;
        const maxW = slotW - 0.3;
        if (w > maxW) {
          w = maxW;
          h = w / aspect;
        }

        const slotX = 0.7 + i * slotW;
        const x = slotX + (slotW - w) / 2;
        const y = imgTop + (maxImgH - h);

        const primaryUrl = look.outfits.find((o) => o.source_url)?.source_url;
        const hyperlink = primaryUrl ? { hyperlink: { url: primaryUrl, tooltip: "Buy this outfit" } } : {};

        slide.addImage({ path: absPath, x, y, w, h, ...hyperlink });

        const sourceLabel = look.outfits
          .map((o) => o.source_site)
          .filter((s): s is string => !!s)
          .join(" + ");
        if (sourceLabel) {
          slide.addText(sourceLabel.toUpperCase(), {
            x: slotX,
            y: y + h + 0.05,
            w: slotW,
            h: 0.3,
            align: "center",
            fontFace: "Arial",
            fontSize: 10,
            bold: true,
            color: INK,
            hyperlink: primaryUrl ? { url: primaryUrl, tooltip: "Buy this outfit" } : undefined,
          });
        }
      }
    }
  }

  const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return buffer;
}
