"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getDemoGuideAction } from "@/lib/demo-guide/actions";
import { setGuideState, useGuideState } from "@/lib/demo-guide/store";
import type { DemoStep } from "@/lib/demo-guide/steps";

/**
 * The moderator's demo guide: one step at a time, with a glowing outline on the exact button.
 * Renders nothing unless the guide was started on this browser AND the server confirms a
 * signed-in moderator (getDemoGuideAction returns null for anyone else, so visitors never
 * receive the steps). Started from "Start demo" on /admin/pipeline, which runs Reset demo first.
 */
export function DemoGuide() {
  const state = useGuideState();
  const pathname = usePathname();
  const router = useRouter();
  const [steps, setSteps] = useState<DemoStep[] | null>(null);
  const [minimized, setMinimized] = useState(false);

  // Ask the server for the steps only once a guide is active (so visitors never even ask).
  useEffect(() => {
    if (!state.active || steps) return;
    let cancelled = false;
    getDemoGuideAction()
      .then((result) => {
        if (!cancelled) setSteps(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [state.active, steps]);

  const step = steps ? steps[Math.min(Math.max(state.step, 1), steps.length) - 1] : undefined;
  const onPage = !!step?.href && pathname === step.href.split("?")[0];

  // Outline the element this step is about. Some appear only after an action (an AI draft), so
  // keep looking; scroll to it once.
  useEffect(() => {
    if (!state.active || !step?.target || !onPage) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let current: Element | null = null;
    let scrolled = false;
    const tick = () => {
      const found = document.querySelector(`[data-demo="${step.target}"]`);
      if (found === current) return;
      current?.classList.remove("demo-highlight");
      current = found;
      if (!found) return;
      found.classList.add("demo-highlight");
      if (!scrolled) {
        found.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
        scrolled = true;
      }
    };
    tick();
    const timer = window.setInterval(tick, 700);
    return () => {
      window.clearInterval(timer);
      current?.classList.remove("demo-highlight");
    };
  }, [state.active, step?.target, onPage, pathname]);

  // While the guide is open, leave room at the bottom so anything can scroll above the panel.
  useEffect(() => {
    if (!state.active || !steps) return;
    const previous = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "55vh";
    return () => {
      document.body.style.paddingBottom = previous;
    };
  }, [state.active, steps]);

  if (!state.active || !steps || !step) return null;
  const go = (n: number) => setGuideState({ active: true, step: Math.min(Math.max(n, 1), steps.length) });
  const last = step.n === steps.length;

  return (
    <aside
      aria-label="Demo guide"
      className="fixed inset-x-2 bottom-[5.5rem] z-[70] max-h-[42vh] overflow-y-auto rounded-2xl border-2 border-[#f5c542] bg-surface p-4 text-sm text-ink shadow-2xl md:inset-x-auto md:bottom-4 md:right-4 md:max-h-[50vh] md:w-[24rem]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate">
          Demo guide · Step {step.n} of {steps.length}
          <span className="block font-semibold normal-case tracking-normal">{step.side}</span>
        </p>
        <button type="button" onClick={() => setMinimized((m) => !m)} className="shrink-0 rounded-md border border-ink/15 px-2 py-1 text-xs font-medium">
          {minimized ? "Show" : "Hide"}
        </button>
      </div>
      {!minimized && (
        <>
          <h2 className="mt-2 font-sans text-base font-bold tracking-normal">{step.title}</h2>
          <p className="mt-1 text-xs text-slate">
            Where: <span className="font-semibold text-ink">{step.where}</span>
            {step.href && !onPage && <span className="ml-1 text-coral">(you’re not there yet)</span>}
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            {step.click.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <p className="mt-3 rounded-lg bg-mint/50 p-2 italic">Say: “{step.say}”</p>
        </>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={step.n === 1} onClick={() => go(step.n - 1)} className="rounded-md border border-ink/15 px-3 py-1.5 font-medium disabled:opacity-40">
          Back
        </button>
        {step.href && !onPage && (
          <button type="button" onClick={() => router.push(step.href!)} className="rounded-md border border-teal px-3 py-1.5 font-semibold text-teal">
            Take me there
          </button>
        )}
        <button
          type="button"
          onClick={() => (last ? setGuideState({ active: false, step: 1 }) : go(step.n + 1))}
          className="rounded-md bg-teal px-3 py-1.5 font-semibold text-cream"
        >
          {last ? "Finish" : "Next"}
        </button>
        <button type="button" onClick={() => setGuideState({ active: false, step: step.n })} className="ml-auto rounded-md px-2 py-1.5 text-xs font-medium text-slate underline">
          Exit guide
        </button>
      </div>
    </aside>
  );
}
