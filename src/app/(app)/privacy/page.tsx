"use client";

import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/i18n/legal";

export default function PrivacyPage() {
  return <LegalPage doc={LEGAL.privacy} />;
}
