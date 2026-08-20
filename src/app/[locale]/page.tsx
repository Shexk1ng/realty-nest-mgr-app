// Strona główna serwisu na tych samych tokenach powierzchni co pulpit: hero i sekcja technologii

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { LandingHero } from "@/components/home/landing-hero";
import { HomeTechnologies } from "@/components/home/home-sections";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header overlay />
        <main className="flex-1">
          <LandingHero />
          <HomeTechnologies />
        </main>
        <Footer />
      </div>
    </div>
  );
}
