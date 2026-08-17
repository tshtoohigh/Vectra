import React, { useEffect } from 'react';
import LandingNav_F1 from '../components/landing/LandingNav_F1.jsx';
import Hero_F1 from '../components/landing/Hero_F1.jsx';
import ProblemSolution_F1 from '../components/landing/ProblemSolution_F1.jsx';
import Features_F1 from '../components/landing/Features_F1.jsx';
import PriorityCalculator_F1 from '../components/landing/PriorityCalculator_F1.jsx';
import HowItWorks_F1 from '../components/landing/HowItWorks_F1.jsx';
import Testimonials_F1 from '../components/landing/Testimonials_F1.jsx';
import Faq_F1 from '../components/landing/Faq_F1.jsx';
import Footer_F1 from '../components/landing/Footer_F1.jsx';

export default function LandingPage_F1() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <LandingNav_F1 />
      <main>
        <Hero_F1 />
        <ProblemSolution_F1 />
        <Features_F1 />
        <PriorityCalculator_F1 />
        <HowItWorks_F1 />
        <Testimonials_F1 />
        <Faq_F1 />
      </main>
      <Footer_F1 />
    </div>
  );
}
