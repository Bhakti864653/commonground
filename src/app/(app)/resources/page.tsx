"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, CircleHelp, ExternalLink, MessageCircle, Phone, Siren } from "lucide-react";
import { useCommunity } from "@/lib/community/context";
import { useLanguage } from "@/lib/i18n/context";
import { INFO } from "@/lib/i18n/community-info";
import { fill } from "@/lib/i18n/experience";
import { dateLocale, type Language } from "@/lib/i18n/languages";
import { labelOf } from "@/lib/i18n/labels";
import { getCommunityInfo, type CommunityInfo } from "@/lib/store/actions";
import type { ContactConfig } from "@/lib/schema/community";

const t = INFO.resources;

function formatDate(isoDate: string, language: Language): string {
  // A bare YYYY-MM-DD is a calendar date — read it at noon UTC so no timezone shifts the day.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? new Date(`${isoDate}T12:00:00Z`) : new Date(isoDate);
  return date.toLocaleDateString(dateLocale(language), { dateStyle: "long" });
}

/** Digits only (plus a leading +) for tel: and wa.me links. */
function dialable(phone: string): string {
  return phone.replace(/[^+*0-9]/g, "");
}

const linkClass =
  "inline-flex items-center gap-1.5 font-bold text-ink underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal";

function ContactCard({ contact, language }: { contact: ContactConfig; language: Language }) {
  const name = labelOf({ label: contact.name, labelEs: contact.nameEs, labels: contact.labels }, language);
  const isWhatsApp = contact.channel === "whatsapp";
  return (
    <li className="flex flex-col gap-2 border-t border-line py-4 first:border-t-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-bold text-ink">{name}</p>
        {contact.isEmergencyService && (
          <span className="inline-flex items-center gap-1 rounded-full bg-peach px-2 py-0.5 text-[0.7rem] font-extrabold text-ink">
            <Siren aria-hidden="true" className="h-3 w-3" />
            {t.emergencyTag[language]}
          </span>
        )}
        {contact.verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-status-resolved px-2 py-0.5 text-[0.7rem] font-extrabold text-ink">
            <BadgeCheck aria-hidden="true" className="h-3 w-3" />
            {t.verified[language]}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-status-review px-2 py-0.5 text-[0.7rem] font-extrabold text-ink">
            <CircleHelp aria-hidden="true" className="h-3 w-3" />
            {t.toVerify[language]}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {contact.phone &&
          (isWhatsApp ? (
            <a href={`https://wa.me/${dialable(contact.phone).replace("+", "")}`} target="_blank" rel="noreferrer" className={linkClass}>
              <MessageCircle aria-hidden="true" className="h-4 w-4" />
              {fill(t.whatsapp[language], { phone: contact.phone })}
            </a>
          ) : (
            <a href={`tel:${dialable(contact.phone)}`} className={linkClass}>
              <Phone aria-hidden="true" className="h-4 w-4" />
              {fill(t.call[language], { phone: contact.phone })}
            </a>
          ))}
        {contact.url && (
          <a href={contact.url} target="_blank" rel="noreferrer" className={linkClass}>
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            {t.website[language]}
          </a>
        )}
      </div>
      {(contact.lastVerifiedAt || contact.sourceUrl) && (
        <p className="text-xs text-slate">
          {contact.lastVerifiedAt && fill(t.checkedOn[language], { date: formatDate(contact.lastVerifiedAt, language) })}
          {contact.lastVerifiedAt && contact.sourceUrl && " · "}
          {contact.sourceUrl && (
            <a href={contact.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              {t.sourceLink[language]}: {new URL(contact.sourceUrl).hostname}
            </a>
          )}
        </p>
      )}
    </li>
  );
}

export default function ResourcesPage() {
  const { community } = useCommunity();
  const { language } = useLanguage();
  const [info, setInfo] = useState<CommunityInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCommunityInfo(community.id)
      .then((result) => {
        if (!cancelled) setInfo(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [community.id]);

  // Until the server answers, show the community's own list (it is refreshed on load anyway).
  const current = info?.id === community.id ? info : community;
  const emergency = current.officialContacts.filter((c) => c.isEmergencyService);
  const other = current.officialContacts.filter((c) => !c.isEmergencyService);

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-4">
        <p className="cg-eyebrow">{t.eyebrow[language]}</p>
        <h1 className="text-[clamp(2.6rem,6vw,4.6rem)] text-ink">{t.title[language]}</h1>
        <p className="max-w-2xl text-slate">{fill(t.intro[language], { community: current.displayName })}</p>
        {current.status === "demo" && <p className="text-sm font-bold text-coral">{t.fictionalNote[language]}</p>}
      </header>

      <section aria-labelledby="emergency-heading" className="rounded-[22px] border-2 border-ink bg-surface p-5 md:p-7">
        <h2 id="emergency-heading" className="flex items-center gap-2 text-2xl text-ink md:text-3xl">
          <Siren aria-hidden="true" className="h-6 w-6 shrink-0 text-coral" />
          {t.emergencyHeading[language]}
        </h2>
        <p className="mt-2 text-sm text-ink/80">{t.emergencyBody[language]}</p>
        {emergency.length > 0 && (
          <ul className="mt-3">
            {emergency.map((c) => (
              <ContactCard key={c.id} contact={c} language={language} />
            ))}
          </ul>
        )}
      </section>

      {/* Hidden when every contact is an emergency line (already listed above). */}
      {(other.length > 0 || emergency.length === 0) && (
        <section aria-labelledby="contacts-heading" className="flex flex-col gap-2">
          <h2 id="contacts-heading" className="text-3xl text-ink">{t.contactsHeading[language]}</h2>
          {other.length === 0 ? (
            <p className="text-sm text-slate">{t.noContacts[language]}</p>
          ) : (
            <ul>
              {other.map((c) => (
                <ContactCard key={c.id} contact={c} language={language} />
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-labelledby="sources-heading" className="flex flex-col gap-2">
        <h2 id="sources-heading" className="text-3xl text-ink">{t.sourcesHeading[language]}</h2>
        <p className="text-sm text-slate">{t.sourcesIntro[language]}</p>
        {current.trustedSources.length === 0 ? (
          <p className="text-sm text-slate">{t.noSources[language]}</p>
        ) : (
          <ul>
            {current.trustedSources.map((s) => (
              <li key={s.id} className="flex flex-col gap-1 border-t border-line py-4 first:border-t-0">
                <a href={s.url} target="_blank" rel="noreferrer" className={linkClass}>
                  {s.name}
                  <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" />
                </a>
                <p className="text-xs text-slate">
                  {s.trustLevel === "official_verified" ? t.trustOfficial[language] : t.trustCommunity[language]} ·{" "}
                  {new URL(s.url).hostname} · {fill(t.checkedOn[language], { date: formatDate(s.lastVerifiedAt, language) })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
