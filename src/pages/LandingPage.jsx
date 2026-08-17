import React, { useEffect } from 'react';
import LandingNav from '../components/landing/LandingNav.jsx';
import Hero from '../components/landing/Hero.jsx';
import SocialProof from '../components/landing/SocialProof.jsx';
import Features from '../components/landing/Features.jsx';
import HowItWorks from '../components/landing/HowItWorks.jsx';
import AiSpotlight from '../components/landing/AiSpotlight.jsx';
import AwsArchitecture from '../components/landing/AwsArchitecture.jsx';
import Testimonials from '../components/landing/Testimonials.jsx';
import Faq from '../components/landing/Faq.jsx';
import FinalCta from '../components/landing/FinalCta.jsx';
import LandingFooter from '../components/landing/LandingFooter.jsx';

export default function LandingPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <LandingNav />
      <main>
        <Hero />
        <SocialProof />
        <Features />
        <HowItWorks />
        <AiSpotlight />
        <AwsArchitecture />
        <Testimonials />
        <Faq />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
