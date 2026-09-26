"use client";

import { useEffect, useState } from "react";
import { ExternalLink, MessageCircle, Phone, Siren } from "lucide-react";
import { useCommunity } from "@/lib/community/context";
import { useLanguage } from "@/lib/i18n/context";
import { INFO } from "@/lib/i18n/community-info";
import { fill } from "@/lib/i18n/experience";
import { dateLocale, type Language } from "@/lib/i18n/languages";
import { labelOf } from "@/lib/i18n/labels";
import { getCommunityInfo, type CommunityInfo } from "@/lib/store/actions";
import type { ContactConfig } from "@/lib/schema/community";
import { canShowAsOfficial, sourceFreshness, type Freshness } from "@/lib/sources/freshness";
import { FreshnessBadge } from "@/components/sources/FreshnessBadge";

const t = INFO.resources;

function formatDate(date: Date, language: Language): string {
  return date.toLocaleDateString(dateLocale(language), { dateStyle: "long", timeZone: "UTC" });
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** Where an entry came from and when it was checked — shown right beside the entry itself. */
function Provenance({
  entry,
  sourceUrl,
  language,
}: {
  entry: { verified: boolean; lastVerifiedAt?: string; verificationNote?: string };
  sourceUrl?: string;
  language: Language;
}) {
  const f = sourceFreshness(entry);
  return (
    <div className="flex flex-col gap-1 text-xs text-slate">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <FreshnessBadge state={f.state} language={language} />
        {f.checkedOn ? (
          <span>{fill(t.lastChecked[language], { date: formatDate(f.checkedOn, language) })}</span>
        ) : (
          <span>{t.notChecked[language]}</span>
        )}
        {f.nextReviewDue && <span>· {fill(t.nextReview[language], { date: formatDate(f.nextReviewDue, language) })}</span>}
      </p>
      {sourceUrl && (
        <p>
          {t.whereFrom[language]}:{" "}
          <a href={sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-ink underline underline-offset-2">
            {hostOf(sourceUrl)}
          </a>
        </p>
      )}
      {entry.verificationNote && <p>{entry.verificationNote}</p>}
    </div>
  );
}

const LEGEND: Freshness[] = ["current", "review_due", "unverified"];

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
      <Provenance entry={contact} sourceUrl={contact.sourceUrl} language={language} />
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
                {/* "Official source" only while the check is current — never for an unverified entry. */}
                <p className="text-xs font-semibold text-ink/80">
                  {canShowAsOfficial(s) ? t.trustOfficial[language] : t.trustCommunity[language]} · {hostOf(s.url)}
                </p>
                <Provenance entry={s} language={language} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="legend-heading" className="rounded-2xl border border-line bg-surface p-5">
        <h2 id="legend-heading" className="text-xl text-ink">{t.legendTitle[language]}</h2>
        <dl className="mt-3 flex flex-col gap-3 text-sm">
          {LEGEND.map((state) => (
            <div key={state} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
              <dt className="shrink-0 sm:w-40">
                <FreshnessBadge state={state} language={language} />
              </dt>
              <dd className="text-slate">{t.freshness[state].explain[language]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
