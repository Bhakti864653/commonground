import { Suspense, type ReactNode } from "react";
import { getCurrentModerator, signAdminToken } from "@/lib/admin/auth";
import { googleConfig } from "@/lib/admin/google";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * This whole route tree reads the auth cookie and fetches moderator-only data — it must never
 * be attempted as a static/prerendered page. Without this, `next build` tries to prerender
 * `/admin` at build time (no request, no cookie), the child page's own data fetch throws
 * "Admin authentication required," and the build fails outright instead of just marking the
 * route dynamic. `force-dynamic` opts the whole subtree out of that attempt entirely — this is
 * the direct fix for the build failure, not just a performance tweak.
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const moderator = await getCurrentModerator();
  if (!moderator) {
    return (
      // useSearchParams (the "why sign-in failed" message) needs a Suspense boundary.
      <Suspense>
        <AdminLogin googleEnabled={googleConfig() !== null} codeEnabled={signAdminToken() !== null} />
      </Suspense>
    );
  }
  return <AdminShell moderator={moderator}>{children}</AdminShell>;
}
