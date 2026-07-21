import React from 'react';
import { ShieldCheck, Info, HeartPulse, Sparkles, Scale, AlertTriangle } from 'lucide-react';

export default function AboutDisclaimer() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 p-1 sm:p-4">
      {/* Hero Header */}
      <div className="text-center space-y-4 py-6">
        <h1 className="text-3xl font-light tracking-tight text-[#FAF9F6] sm:text-4xl font-serif" id="about-heading">
          About & Safety Disclaimer
        </h1>
        <p className="text-base text-[#FAF9F6]/60 max-w-2xl mx-auto font-serif">
          Learn about our local-first architecture, the science of customized planning, and physical safety guidelines.
        </p>
      </div>

      {/* Grid: Vision & Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Local-First Privacy */}
        <div className="bg-[#161616] p-6 rounded-none border border-[#2A2A2A] space-y-4" id="privacy-card">
          <div className="h-12 w-12 rounded-none bg-[#111111] border border-[#2A2A2A] flex items-center justify-center text-[#C5FF4A]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-light text-[#FAF9F6] font-serif">100% Local & Private</h2>
          <p className="text-[#FAF9F6]/70 text-sm leading-relaxed font-serif">
            Your physical stats, goal profiles, injury history, and training schedules are saved <strong className="text-[#C5FF4A] font-bold">only inside your browser's local sandbox</strong>. 
          </p>
          <p className="text-[#FAF9F6]/60 text-xs leading-relaxed font-serif">
            No remote servers, no user accounts, and no backend data warehouses are used. Your physical profile never leaves your personal device.
          </p>
        </div>

        {/* Card 2: Designed for Beginners (No Signup/Fees) */}
        <div className="bg-[#161616] p-6 rounded-none border border-[#2A2A2A] space-y-4" id="no-signup-card">
          <div className="h-12 w-12 rounded-none bg-[#111111] border border-[#2A2A2A] flex items-center justify-center text-[#C5FF4A]">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-light text-[#FAF9F6] font-serif">Zero Signup, No Fees</h2>
          <p className="text-[#FAF9F6]/70 text-sm leading-relaxed font-serif">
            Most fitness apps lock simple guides behind complex forms, aggressive signups, or heavy subscription paywalls. WORKOUT.OS is built to provide <strong className="text-[#C5FF4A] font-bold">unrestricted, high-quality direction</strong> for beginners starting their journey.
          </p>
          <p className="text-[#FAF9F6]/60 text-xs leading-relaxed font-serif">
            Get clear, custom guidance immediately without worrying about hidden subscriptions, invasive emails, or tracking profiles.
          </p>
        </div>
      </div>

      {/* Safety Section */}
      <div className="bg-[#1a1111] rounded-none border border-red-950 p-6 sm:p-8 space-y-6" id="safety-section">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-7 w-7 text-rose-400 flex-shrink-0" />
          <h2 className="text-xl font-light text-rose-300 font-serif">Safety & Medical Disclaimer</h2>
        </div>
        
        <div className="space-y-4 text-rose-200 text-sm leading-relaxed font-serif">
          <p className="font-bold">
            Please read the following guidelines carefully before embarking on any training routine:
          </p>
          <p>
            The training routines, exercise descriptions, and nutritional/health calculations provided by this application are automatically generated based on general statistical guidelines. They are intended for <strong className="text-rose-300">educational and informational purposes only</strong> and do not constitute professional medical, clinical, or physical therapy advice.
          </p>
          <p>
            Always consult with a qualified physician or healthcare provider before initiating any new workout program, particularly if you have active injuries, chronic pain, pre-existing cardiovascular conditions, or physical movement restrictions.
          </p>
          <p className="bg-[#111111] p-4 rounded-none border border-red-950 font-bold text-rose-400 italic">
            "Participation in any athletic exercise activities, stretches, or strength programs is undertaken entirely at your own physical risk. The developers of this system disclaim any liability for accidental injury or physical strain incurred during these activities."
          </p>
        </div>
      </div>

      {/* Accordion/FAQ Details */}
      <div className="space-y-4">
        <h2 className="text-xl font-light text-[#FAF9F6] font-serif">Frequently Asked Questions</h2>

        <div className="space-y-3">
          <div className="bg-[#161616] p-5 rounded-none border border-[#2A2A2A] space-y-2">
            <h3 className="font-light text-[#FAF9F6] font-serif flex items-center gap-2">
              <Info className="h-4 w-4 text-[#C5FF4A]" />
              How do I back up my generated workout plans?
            </h3>
            <p className="text-sm text-[#FAF9F6]/70 leading-relaxed font-serif">
              Navigate to the <strong className="text-[#C5FF4A] font-bold">My Plans</strong> page, click the plan you wish to back up, and choose "Export JSON" or "Export PDF". You can save the JSON file to your device and import it on any device to restore your plans!
            </p>
          </div>

          <div className="bg-[#161616] p-5 rounded-none border border-[#2A2A2A] space-y-2">
            <h3 className="font-light text-[#FAF9F6] font-serif flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-[#C5FF4A]" />
              How is injury-aware replacement handled?
            </h3>
            <p className="text-sm text-[#FAF9F6]/70 leading-relaxed font-serif">
              When you specify joint pain (e.g., knee or shoulder discomfort), the system maps your physical condition against an internal exercise restriction registry. High-impact compound exercises are replaced with safer, machine-based, or horizontal-load alternatives that target the same muscle groups with minimal stress.
            </p>
          </div>

          <div className="bg-[#161616] p-5 rounded-none border border-[#2A2A2A] space-y-2">
            <h3 className="font-light text-[#FAF9F6] font-serif flex items-center gap-2">
              <Scale className="h-4 w-4 text-[#C5FF4A]" />
              Are the nutrition calculations accurate?
            </h3>
            <p className="text-sm text-[#FAF9F6]/70 leading-relaxed font-serif">
              The calculations use the Harris-Benedict equation for BMR and apply basic multipliers for activity. These are mathematical estimations and do not account for metabolic disorders, body composition nuances, or medical history. Treat them as initial benchmarks and adjust based on real-world weight trends.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
