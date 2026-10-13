import { notFound } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getCaseForAdmin } from "@/lib/store/admin-actions";
import { getCommunity as getCommunityById } from "@/lib/store/community-store";
import { ModerationPanel } from "@/components/admin/ModerationPanel";
import { PipelinePanel, PipelineTools } from "@/components/admin/pipeline/PipelinePanel";
import { getCasePipelineForAdmin } from "@/lib/pipeline/actions";
import { REFERRAL_OFFICES } from "@/data/referral-offices";

// The agents (several Groq calls) run inside this page's server actions.
export const maxDuration = 120;

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
  const community = await getCommunityById(foundCase.communityId);
  const category = community?.categories.find((cat) => cat.id === foundCase.categoryId);
  const pipeline = await getCasePipelineForAdmin(foundCase.publicCaseNumber);
  const offices = REFERRAL_OFFICES.map((o) => ({ id: o.id, name: o.name }));

  return (
    <ModerationPanel
      caseData={foundCase}
      communityDisplayName={community?.displayName ?? foundCase.communityId}
      categoryLabel={category ? category.label : foundCase.categoryId}
      contacts={community?.officialContacts ?? []}
      pipeline={
        pipeline && (
          <PipelinePanel
            key="pipeline"
            caseNumber={foundCase.publicCaseNumber}
            stage={pipeline.stage}
            state={pipeline.state}
            proposals={pipeline.proposals}
            outbox={pipeline.outbox}
            audit={pipeline.audit}
            officeReferrals={pipeline.officeReferrals}
            officeNotes={pipeline.officeNotes}
            offices={offices}
            closed={foundCase.status === "closed"}
            isDuplicate={!!foundCase.isDuplicateOf}
          />
        )
      }
      pipelineTools={
        pipeline && (
          <PipelineTools
            key="pipeline-tools"
            caseNumber={foundCase.publicCaseNumber}
            state={pipeline.state}
            proposals={pipeline.proposals}
            outbox={pipeline.outbox}
            offices={offices}
          />
        )
      }
    />
  );
}
