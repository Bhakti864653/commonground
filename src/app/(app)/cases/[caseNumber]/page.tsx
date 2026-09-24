import { getCaseByCaseNumber } from "@/lib/store/case-store";
import { getCommunity as getCommunityById } from "@/lib/store/community-store";
import { toPublicCase } from "@/lib/schema/report";
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
  const { new: isNewParam, manage: manageParam } = await searchParams;

  const foundCase = getCaseByCaseNumber(caseNumber);
  const community = foundCase ? getCommunityById(foundCase.communityId) : undefined;
  const category = community?.categories.find((c) => c.id === foundCase?.categoryId);

  if (!foundCase || !community || !category) {
    return <CaseNotFound caseNumber={caseNumber} />;
  }

  // Only ever hand the real management token to the client if the visitor's URL already
  // proved it — never serialize the stored secret to the client otherwise.
  const providedToken = typeof manageParam === "string" ? manageParam : undefined;
  const validManagementToken =
    providedToken && providedToken === foundCase.managementToken ? providedToken : null;

  return (
    <CaseView
      caseData={toPublicCase(foundCase)}
      category={category}
      communityDisplayName={community.displayName}
      isNew={isNewParam === "1"}
      managementToken={validManagementToken}
    />
  );
}
