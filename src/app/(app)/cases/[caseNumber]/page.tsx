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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- deliberately omitting the field
  const { managementToken: _managementToken, ...publicCase } = foundCase;

  return (
    <CaseView
      caseData={publicCase}
      category={category}
      communityDisplayName={community.displayName}
      isNew={isNewParam === "1"}
      managementToken={validManagementToken}
    />
  );
}
