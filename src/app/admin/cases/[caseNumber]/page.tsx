import { notFound } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getCaseForAdmin } from "@/lib/store/admin-actions";
import { getCommunityById } from "@/data/communities";
import { ModerationPanel } from "@/components/admin/ModerationPanel";

export default async function AdminCasePage({
  params,
}: {
  params: Promise<{ caseNumber: string }>;
}) {
  // Same page-level guard as admin/page.tsx — the parent layout's own check can't stop this
  // page from being invoked to produce its `children` value, so it must guard itself before
  // fetching a specific case's (moderator-only) data.
  if (!(await isAdminAuthenticated())) return null;

  const { caseNumber } = await params;
  const foundCase = await getCaseForAdmin(caseNumber);
  if (!foundCase) notFound();
  const community = getCommunityById(foundCase.communityId);
  const category = community?.categories.find((cat) => cat.id === foundCase.categoryId);

  return (
    <ModerationPanel
      caseData={foundCase}
      communityDisplayName={community?.displayName ?? foundCase.communityId}
      categoryLabel={category ? category.label : foundCase.categoryId}
    />
  );
}
