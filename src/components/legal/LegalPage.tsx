"use client";

import { useLanguage } from "@/lib/i18n/context";
import { CONTACT_EMAIL, LEGAL } from "@/lib/i18n/legal";

type Doc = (typeof LEGAL)["privacy"] | (typeof LEGAL)["terms"];

/** One legal document (privacy policy or terms), laid out like the How it works page. */
export function LegalPage({ doc }: { doc: Doc }) {
  const { language } = useLanguage();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 md:px-8">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink md:text-3xl">{doc.title[language]}</h1>
        <p className="text-slate">{doc.intro[language]}</p>
      </section>

      {doc.sections.map((section) => (
        <section key={section.title.en} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-ink">{section.title[language]}</h2>
          {"body" in section && <p className="text-ink/85">{section.body[language]}</p>}
          {"items" in section && (
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-ink/85">
              {section.items.map((item) => (
                <li key={item.en}>{item[language]}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <p className="border-t border-line pt-5 text-sm text-slate">
        {LEGAL.contactLead[language]}{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-ink underline underline-offset-4">
          {CONTACT_EMAIL}
        </a>
      </p>
    </div>
  );
}
