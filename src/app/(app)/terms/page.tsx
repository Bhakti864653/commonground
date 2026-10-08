"use client";

import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/i18n/legal";

export default function TermsPage() {
  return <LegalPage doc={LEGAL.terms} />;
}
