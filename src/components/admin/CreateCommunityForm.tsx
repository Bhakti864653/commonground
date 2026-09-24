"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { CATEGORY_PRESETS, type CategoryPresetId } from "@/data/communities/category-presets";
import { adminCreateCommunity } from "@/lib/store/admin-community-actions";

type AreaRow = { labelEs: string; label: string };

const input =
  "w-full rounded-[13px] border border-line bg-paper px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal";

/**
 * Sets up a real community. Validation happens on the server too (`createCommunity`); this
 * form only keeps the obvious limits in view. Areas must be approximate — neighborhoods or
 * sectors, never streets or addresses.
 */
export function CreateCommunityForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("Panamá");
  const [region, setRegion] = useState("");
  const [areas, setAreas] = useState<AreaRow[]>([{ labelEs: "", label: "" }]);
  const [categories, setCategories] = useState<Set<CategoryPresetId>>(new Set(["other"]));
  const [status, setStatus] = useState<{ kind: "idle" | "saving" } | { kind: "error" | "done"; message: string }>({ kind: "idle" });

  function updateArea(i: number, patch: Partial<AreaRow>) {
    setAreas((rows) => rows.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  function toggleCategory(id: CategoryPresetId) {
    if (id === "other") return;
    setCategories((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "saving" });
    const result = await adminCreateCommunity({
      displayName,
      country,
      region,
      areas: areas.filter((a) => a.labelEs.trim() || a.label.trim()),
      categoryIds: [...categories],
    });
    if (!result.ok) {
      setStatus({
        kind: "error",
        message:
          result.error === "duplicate_name"
            ? "A community with that name already exists."
            : "Check the form: a name (2–60 characters), a country, 1–12 areas with both a Spanish and an English name (40 characters max each), and at least one category.",
      });
      return;
    }
    setStatus({ kind: "done", message: `${result.community.displayName} is set up. Residents can now choose it in the place selector.` });
    setDisplayName("");
    setRegion("");
    setAreas([{ labelEs: "", label: "" }]);
    setCategories(new Set(["other"]));
    router.refresh();
  }

  return (
    <section className="rounded-[24px] bg-surface p-6">
      <h2 className="text-2xl text-ink">Set up a community</h2>
      <p className="mt-2 text-sm text-slate">
        Prototype storage: like submissions, a community set up here lives in server memory. It can disappear after a
        restart or redeploy (and on Vercel, a different server instance may not have it) until a database is added.
      </p>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink sm:col-span-3">
            Community name
            <input className={input} value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} required />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Country
            <input className={input} value={country} onChange={(e) => setCountry(e.target.value)} maxLength={60} required />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
            Province or region (optional)
            <input className={input} value={region} onChange={(e) => setRegion(e.target.value)} maxLength={60} />
          </label>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-ink">Approximate areas</legend>
          <p className="text-xs text-slate">Neighborhoods or sectors only — never streets, addresses, or landmarks precise enough to identify a home.</p>
          {areas.map((area, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input
                className={input}
                aria-label={`Area ${i + 1} name in Spanish`}
                placeholder="Nombre en español"
                value={area.labelEs}
                onChange={(e) => updateArea(i, { labelEs: e.target.value })}
                maxLength={40}
              />
              <input
                className={input}
                aria-label={`Area ${i + 1} name in English`}
                placeholder="Name in English"
                value={area.label}
                onChange={(e) => updateArea(i, { label: e.target.value })}
                maxLength={40}
              />
              <button
                type="button"
                onClick={() => setAreas((rows) => rows.filter((_, j) => j !== i))}
                disabled={areas.length === 1}
                aria-label={`Remove area ${i + 1}`}
                className="rounded-full p-2 text-slate hover:bg-mint disabled:opacity-30"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setAreas((rows) => [...rows, { labelEs: "", label: "" }])}
            disabled={areas.length >= 12}
            className="inline-flex w-max items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-mint disabled:opacity-40"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add area
          </button>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-ink">Categories residents can choose</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {CATEGORY_PRESETS.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-teal"
                  checked={categories.has(c.id)}
                  disabled={c.id === "other"}
                  onChange={() => toggleCategory(c.id)}
                />
                {c.label} <span className="text-slate">/ {c.labelEs}</span>
                {c.id === "other" && <span className="text-xs text-slate">(always included)</span>}
              </label>
            ))}
          </div>
        </fieldset>

        <p className="text-xs text-slate">
          New communities start with no official sources or contacts — the Guide says so honestly rather than inventing any.
        </p>

        {status.kind === "error" && (
          <p role="alert" className="text-sm font-semibold text-coral">
            {status.message}
          </p>
        )}
        {status.kind === "done" && (
          <p role="status" className="text-sm font-semibold text-teal">
            {status.message}
          </p>
        )}

        <button
          type="submit"
          disabled={status.kind === "saving"}
          className="w-max rounded-full bg-teal px-5 py-2.5 text-sm font-bold text-cream hover:bg-teal/90 disabled:opacity-50"
        >
          {status.kind === "saving" ? "Setting up…" : "Set up community"}
        </button>
      </form>
    </section>
  );
}
