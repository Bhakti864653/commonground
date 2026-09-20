import { notFound } from "next/navigation";
import { getCaseForAdmin } from "@/lib/store/admin-actions";
import { getCommunityById } from "@/data/communities";
import { ModerationPanel } from "@/components/admin/ModerationPanel";

export default async function AdminCasePage({
  params,
}: {
  params: Promise<{ caseNumber: string }>;
}) {
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
