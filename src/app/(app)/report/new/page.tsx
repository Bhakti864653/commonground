import { ReportWizard } from "@/components/report-flow/ReportWizard";

/**
 * `?type=report|proposal` lets a shortcut (e.g. the home page's "Report a problem" card, or
 * the Reports/Proposals nav items) skip straight past step 1's own choice.
 */
export default async function NewReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const typeParam = typeof params.type === "string" ? params.type : undefined;
  const initialType = typeParam === "report" || typeParam === "proposal" ? typeParam : null;

  return <ReportWizard initialType={initialType} />;
}
