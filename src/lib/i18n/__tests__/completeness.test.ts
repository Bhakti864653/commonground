import { describe, expect, it } from "vitest";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { EXPERIENCE } from "@/lib/i18n/experience";
import { FIELD } from "@/lib/i18n/field-notes";
import { LANDING } from "@/lib/i18n/landing";
import { INFO } from "@/lib/i18n/community-info";
import { LANGUAGE_CODES, dateLocale, htmlLang, isLanguage } from "@/lib/i18n/languages";
import { REMOVAL_REASON_LABELS, STATUS_LABELS, VERIFICATION_LABELS } from "@/lib/schema/report";
import { COMMUNITIES } from "@/data/communities";
import { CATEGORY_PRESETS } from "@/data/communities/category-presets";
import { consentTextOf, labelOf, noteOf } from "@/lib/i18n/labels";

type Entry = { path: string; value: Record<string, unknown> };

/** Every object in a text table that has an `es` key is one translatable piece of text. */
function collect(node: unknown, path: string, out: Entry[]) {
  if (Array.isArray(node)) {
    node.forEach((child, i) => collect(child, `${path}[${i}]`, out));
  } else if (node && typeof node === "object") {
    const record = node as Record<string, unknown>;
    if (typeof record.es === "string") out.push({ path, value: record });
    else for (const [key, child] of Object.entries(record)) collect(child, `${path}.${key}`, out);
  }
}

const entries: Entry[] = [];
collect(UI_STRINGS, "UI_STRINGS", entries);
collect(EXPERIENCE, "EXPERIENCE", entries);
collect(FIELD, "FIELD", entries);
collect(STATUS_LABELS, "STATUS_LABELS", entries);
collect(VERIFICATION_LABELS, "VERIFICATION_LABELS", entries);
collect(REMOVAL_REASON_LABELS, "REMOVAL_REASON_LABELS", entries);
collect(LANDING, "LANDING", entries);
collect(INFO, "INFO", entries);

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("interface text", () => {
  it("covers a meaningful amount of text", () => {
    expect(entries.length).toBeGreaterThan(400);
  });

  it("exists in every language, never blank", () => {
    const missing = entries.flatMap(({ path, value }) =>
      LANGUAGE_CODES.filter((lang) => typeof value[lang] !== "string" || !(value[lang] as string).trim()).map(
        (lang) => `${path}.${lang}`,
      ),
    );
    expect(missing).toEqual([]);
  });

  it("keeps the same {placeholders} in every language", () => {
    const mismatched = entries.flatMap(({ path, value }) =>
      LANGUAGE_CODES.filter((lang) => placeholders(value[lang] as string).join() !== placeholders(value.en as string).join()).map(
        (lang) => `${path}.${lang}`,
      ),
    );
    expect(mismatched).toEqual([]);
  });
});

describe("community data", () => {
  it("names every built-in area and category in every language", () => {
    for (const community of COMMUNITIES) {
      for (const item of [...community.areas, ...community.categories]) {
        for (const lang of LANGUAGE_CODES) {
          expect(labelOf(item, lang), `${community.id}/${item.id}/${lang}`).toBeTruthy();
        }
        expect(item.labels?.pt && item.labels?.fr && item.labels?.zh && item.labels?.hi && item.labels?.it, `${community.id}/${item.id}`).toBeTruthy();
      }
      for (const lang of LANGUAGE_CODES) {
        expect(consentTextOf(community.privacy, lang)).toBeTruthy();
      }
      expect(community.privacy.consentTexts?.zh && community.privacy.consentTexts?.hi && community.privacy.consentTexts?.it).toBeTruthy();
    }
  });

  it("names every built-in official contact in every language", () => {
    for (const community of COMMUNITIES) {
      for (const contact of community.officialContacts) {
        expect(contact.nameEs && contact.labels?.pt && contact.labels?.fr && contact.labels?.zh && contact.labels?.hi && contact.labels?.it, contact.id).toBeTruthy();
      }
    }
  });

  it("translates every category preset a moderator can pick", () => {
    for (const preset of CATEGORY_PRESETS) {
      expect(preset.labels.pt && preset.labels.fr && preset.labels.zh && preset.labels.hi && preset.labels.it, preset.id).toBeTruthy();
    }
  });
});

describe("helpers", () => {
  it("labelOf falls back to English for a missing translation", () => {
    expect(labelOf({ label: "North", labelEs: "Norte" }, "zh")).toBe("North");
    expect(labelOf({ label: "North", labelEs: "Norte", labels: { zh: "北" } }, "zh")).toBe("北");
    expect(labelOf({ label: "North", labelEs: "Norte" }, "es")).toBe("Norte");
    expect(labelOf(undefined, "fr")).toBeUndefined();
  });

  it("noteOf prefers the reader's language, then English, then Spanish", () => {
    expect(noteOf({ note: "Updated", noteEs: "Actualizado", notes: { fr: "Mis à jour" } }, "fr")).toBe("Mis à jour");
    expect(noteOf({ note: "Updated", noteEs: "Actualizado" }, "pt")).toBe("Updated");
    expect(noteOf({ noteEs: "Actualizado" }, "zh")).toBe("Actualizado");
  });

  it("knows each language's html lang and date locale", () => {
    expect(htmlLang("zh")).toBe("zh-Hans");
    expect(htmlLang("hi")).toBe("hi");
    expect(dateLocale("it")).toBe("it-IT");
    expect(dateLocale("pt")).toBe("pt-BR");
    expect(isLanguage("fr")).toBe(true);
    expect(isLanguage("de")).toBe(false);
  });
});
