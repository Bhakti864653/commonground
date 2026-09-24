"use client";

import { useCommunity } from "@/lib/community/context";
import { useLanguage } from "@/lib/i18n/context";
import { FIELD } from "@/lib/i18n/field-notes";
import { fill } from "@/lib/i18n/experience";
import { usePlaces } from "@/lib/places/context";

/**
 * Shown instead of cases, forms, or the Guide when the picked place (Panama City, or one the
 * visitor added) has no CommonGround community behind it — never sample data in its place.
 */
export function UnconfiguredPlace() {
  const { community } = useCommunity();
  const { language } = useLanguage();
  const { activePlace, setActivePlace } = usePlaces();
  if (activePlace.kind !== "unconfigured") return null;
  const t = FIELD.place;

  return (
    <section className="rounded-[28px] bg-map p-[clamp(24px,4vw,56px)]">
      <p className="cg-caps text-map-text">{FIELD.home.mapCaps[language]}</p>
      <h2 className="mt-4 max-w-3xl text-[clamp(2.2rem,4vw,3.8rem)] text-ink">
        {fill(t.unconfiguredTitle[language], { place: activePlace.name[language] })}
      </h2>
      <p className="mt-4 max-w-xl text-map-text">{t.unconfiguredBody[language]}</p>
      <button
        type="button"
        onClick={() => setActivePlace({ kind: "community" })}
        className="mt-7 inline-flex items-center gap-3 rounded-full bg-lime px-6 py-4 text-[0.8rem] font-extrabold text-[#172b25] hover:bg-lime-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      >
        {fill(t.backTo[language], { community: community.displayName })} <span aria-hidden="true">↗</span>
      </button>
    </section>
  );
}
