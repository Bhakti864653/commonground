import { LandingPage } from "@/components/landing/LandingPage";

/**
 * The public introduction. It sits outside the (app) route group, so it never gets the app
 * shell's sidebar or bottom navigation; the community dashboard lives at /home.
 */
export default function IntroductionPage() {
  return <LandingPage />;
}
