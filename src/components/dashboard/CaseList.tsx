import { CaseCard } from "./CaseCard";
import type { Language } from "@/lib/i18n/dictionary";
import type { PublicCase } from "@/lib/schema/report";
import type { CommunityConfig } from "@/lib/schema/community";

export function CaseList({
  cases,
  community,
  language,
  emptyMessage,
}: {
  cases: PublicCase[];
  community: CommunityConfig;
  language: Language;
  emptyMessage: string;
}) {
  if (cases.length === 0) {
    return <p className="text-sm text-slate">{emptyMessage}</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {cases.map((c) => {
        const category = community.categories.find((cat) => cat.id === c.categoryId);
        if (!category) return null;
        return <CaseCard key={c.id} caseItem={c} category={category} language={language} />;
      })}
    </div>
  );
}
