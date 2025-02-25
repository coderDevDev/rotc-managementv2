import HeroSection from '@/components/homepage/HeroSection';
import AboutSection from '@/components/homepage/AboutSection';
import ContactSection from '@/components/homepage/ContactSection';
import AnnouncementsSection from '@/components/homepage/AnnouncementsSection';
import GallerySection from '@/components/homepage/GallerySection';
import CTASection from '@/components/homepage/CTASection';

export default function Homepage() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <AboutSection />
      <AnnouncementsSection />
      <GallerySection />
      <ContactSection />
      <CTASection />
    </main>
  );
}
