import { getCaseByCaseNumber } from "@/lib/store/case-store";
import { getCommunityById } from "@/data/communities";
import { CaseView } from "@/components/case/CaseView";
import { CaseNotFound } from "@/components/case/CaseNotFound";

export default async function CasePage({
  params,
  searchParams,
}: {
  params: Promise<{ caseNumber: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { caseNumber } = await params;
  const { new: isNewParam } = await searchParams;

  const foundCase = getCaseByCaseNumber(caseNumber);
  const community = foundCase ? getCommunityById(foundCase.communityId) : undefined;
  const category = community?.categories.find((c) => c.id === foundCase?.categoryId);

  if (!foundCase || !community || !category) {
    return <CaseNotFound caseNumber={caseNumber} />;
  }

  return (
    <CaseView
      caseData={foundCase}
      category={category}
      communityDisplayName={community.displayName}
      isNew={isNewParam === "1"}
    />
  );
}
