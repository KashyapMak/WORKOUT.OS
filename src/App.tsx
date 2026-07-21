import React, { useState } from 'react';
import { 
  Dumbbell, Home as HomeIcon, Sparkles, BookOpen, LineChart, Shield, Menu, X, 
  ArrowRight, HeartPulse, ShieldAlert, CheckCircle, Smartphone, Award, Printer
} from 'lucide-react';
import Wizard from './components/Wizard';
import MyPlans from './components/MyPlans';
import ExerciseLibrary from './components/ExerciseLibrary';
import ProgressTracker from './components/ProgressTracker';
import AboutDisclaimer from './components/AboutDisclaimer';

type ActiveView = 'home' | 'generate' | 'my-plans' | 'library' | 'progress' | 'about';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [freshPlanId, setFreshPlanId] = useState<string | null>(null);

  const navigateTo = (view: ActiveView) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  const handlePlanGenerated = (planId: string) => {
    setFreshPlanId(planId);
    setActiveView('my-plans');
  };

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col font-serif select-none print:bg-white text-[#FAF9F6]">
      
      {/* 1. TOP HEADER NAVIGATION BAR */}
      <header className="bg-[#111111] border-b border-[#2A2A2A] sticky top-0 z-40 print:hidden h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          
          {/* Logo Brand */}
          <button 
            onClick={() => navigateTo('home')} 
            className="flex items-center gap-2.5 text-[#FAF9F6] cursor-pointer hover:opacity-80"
            id="brand-logo"
          >
            <div className="h-8 w-8 border border-[#2A2A2A] bg-[#111111] flex items-center justify-center text-[#C5FF4A] font-mono text-xs font-bold">
              OS
            </div>
            <div className="text-left leading-none font-mono tracking-widest">
              <span className="text-xs sm:text-sm font-bold tracking-[0.2em] uppercase block">WORKOUT.OS</span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-2">
            {[
              { id: 'home', label: 'Home' },
              { id: 'generate', label: 'Generate' },
              { id: 'my-plans', label: 'My Plans' },
              { id: 'library', label: 'Library' },
              { id: 'progress', label: 'Progress' },
              { id: 'about', label: 'About' }
            ].map(item => (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => navigateTo(item.id as ActiveView)}
                className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-all cursor-pointer border ${
                  activeView === item.id 
                    ? 'bg-[#C5FF4A] text-[#111111] border-[#C5FF4A] font-bold' 
                    : 'text-[#FAF9F6]/60 hover:text-[#FAF9F6] border-transparent hover:border-[#2A2A2A]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Mobile Menu Toggle Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="md:hidden p-2 bg-[#161616] border border-[#2A2A2A] rounded-none text-[#FAF9F6] hover:text-[#C5FF4A] cursor-pointer"
            id="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

        </div>
      </header>

      {/* 2. MOBILE DRAWER OVERLAY NAVIGATION */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-y-0 right-0 w-64 bg-[#111111] border-l border-[#2A2A2A] z-50 p-6 flex flex-col gap-6 shadow-2xl animate-in slide-in-from-right duration-150 print:hidden">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#FAF9F6]/40 uppercase tracking-widest">Navigation</span>
            <button onClick={() => setMobileMenuOpen(false)} className="text-[#FAF9F6]/60 hover:text-[#FAF9F6]">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex flex-col gap-2">
            {[
              { id: 'home', label: 'Home', icon: HomeIcon },
              { id: 'generate', label: 'Generate Plan', icon: Sparkles },
              { id: 'my-plans', label: 'My Plans', icon: Dumbbell },
              { id: 'library', label: 'Exercise Library', icon: BookOpen },
              { id: 'progress', label: 'Progress Tracker', icon: LineChart },
              { id: 'about', label: 'About & Safety', icon: Shield },
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id as ActiveView)}
                  className={`w-full p-3 font-mono text-[11px] uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer border ${
                    activeView === item.id 
                      ? 'bg-[#C5FF4A] text-[#111111] border-[#C5FF4A] font-bold' 
                      : 'text-[#FAF9F6]/60 hover:bg-[#161616] hover:text-[#FAF9F6] border-transparent'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* 3. CORE VIEW PAGES PANEL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 print:py-0 print:px-0">
        
        {/* VIEW A: HOME / LANDING PAGE */}
        {activeView === 'home' && (
          <div className="space-y-16 animate-in fade-in duration-150" id="view-home">
            
            {/* Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-6">
              
              {/* Left Column Text */}
              <div className="lg:col-span-7 space-y-6 text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#161616] border border-[#2A2A2A] text-[#C5FF4A] text-[10px] font-mono uppercase tracking-widest">
                  <Sparkles className="h-3 w-3" />
                  100% Client-Side Static App
                </div>
                
                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-light text-[#FAF9F6] tracking-tight leading-[1.05] font-serif">
                  Personalized Training, <br className="hidden sm:inline" />
                  <span className="text-[#C5FF4A] bg-transparent font-normal">100% Offline & Private.</span>
                </h1>

                <p className="text-[#FAF9F6]/80 text-sm sm:text-base leading-relaxed max-w-xl font-serif">
                  Build expert physical splits matched directly to your age, available dumbbells, bands, or bar setups. Features adaptive joint-safe replacement heuristics that automatically steer workouts clear of painful body areas.
                </p>

                {/* Call-to-actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    id="btn-hero-generate"
                    onClick={() => navigateTo('generate')}
                    className="px-6 py-3.5 bg-[#C5FF4A] hover:bg-[#b5f52b] text-[#111111] font-mono font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Generate My Workout Plan
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    id="btn-hero-library"
                    onClick={() => navigateTo('library')}
                    className="px-6 py-3.5 bg-[#111111] hover:bg-[#161616] border border-[#2A2A2A] text-[#FAF9F6] font-mono font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Browse Exercise Library
                    <BookOpen className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Right Column: Visual illustration banner block */}
              <div className="lg:col-span-5 relative">
                <div className="border border-[#2A2A2A] bg-[#161616] p-8 flex flex-col justify-between aspect-square max-w-sm mx-auto">
                  <div className="space-y-4">
                    <div className="h-10 w-10 border border-[#2A2A2A] flex items-center justify-center text-[#C5FF4A] font-mono text-sm bg-[#111111]">
                      OS
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-serif text-xl text-[#FAF9F6] leading-tight font-medium">Expert Training Splits</h3>
                      <p className="text-xs text-[#FAF9F6]/60 font-serif">Deterministic biomechanical rules balance pushing & pulling across target frequencies.</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-6 border-t border-[#2A2A2A]">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#FAF9F6]/80">
                      <CheckCircle className="h-4 w-4 text-[#C5FF4A]" />
                      Joint pain safe replacements
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#FAF9F6]/80">
                      <Smartphone className="h-4 w-4 text-[#C5FF4A]" />
                      Mobile friendly responsive layouts
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#FAF9F6]/80">
                      <Award className="h-4 w-4 text-[#C5FF4A]" />
                      Export clean PDF calendars
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Features Highlights Grid */}
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-light tracking-tight text-[#FAF9F6] font-serif">High-Quality Planning Features</h2>
                <p className="text-[#FAF9F6]/60 text-xs sm:text-sm font-serif">Everything stays inside your browser sandbox on this device. Fully static.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="features-highlights">
                
                {/* Highlight 1 */}
                <div className="bg-[#161616] p-6 border border-[#2A2A2A] space-y-3">
                  <div className="h-10 w-10 border border-[#2A2A2A] flex items-center justify-center text-[#C5FF4A] bg-[#111111]">
                    <Dumbbell className="h-4 w-4" />
                  </div>
                  <h3 className="font-serif text-base text-[#FAF9F6]">Custom Gear Calibration</h3>
                  <p className="text-xs text-[#FAF9F6]/70 leading-relaxed font-serif">
                    Filters the exercise pool dynamically based on available dumbbells, kettlebells, barbells, or bands.
                  </p>
                </div>

                {/* Highlight 2 */}
                <div className="bg-[#161616] p-6 border border-[#2A2A2A] space-y-3">
                  <div className="h-10 w-10 border border-[#2A2A2A] flex items-center justify-center text-[#C5FF4A] bg-[#111111]">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <h3 className="font-serif text-base text-[#FAF9F6]">Joint-Safe Alternator</h3>
                  <p className="text-xs text-[#FAF9F6]/70 leading-relaxed font-serif">
                    Declare shoulder, wrist, knee, or back sensitivity. The generator substitutes high-risk exercises instantly.
                  </p>
                </div>

                {/* Highlight 3 */}
                <div className="bg-[#161616] p-6 border border-[#2A2A2A] space-y-3">
                  <div className="h-10 w-10 border border-[#2A2A2A] flex items-center justify-center text-[#C5FF4A] bg-[#111111]">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <h3 className="font-serif text-base text-[#FAF9F6]">Offline Local Sandbox</h3>
                  <p className="text-xs text-[#FAF9F6]/70 leading-relaxed font-serif">
                    Zero accounts, no clouds, and zero trackers. Data resides securely in on-device LocalStorage.
                  </p>
                </div>

              </div>
            </div>

            {/* Science / Workflow explanation section */}
            <div className="border border-[#2A2A2A] bg-[#161616] text-[#FAF9F6] p-8 sm:p-12 space-y-8">
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-light text-center tracking-tight font-serif">How the Generator Structures Your Plan</h2>
                <p className="text-[#FAF9F6]/60 text-center text-xs sm:text-sm font-serif">Four simple steps from profile metrics to dynamic progression logs.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-center">
                <div className="space-y-3">
                  <div className="h-10 w-10 bg-[#111111] border border-[#2A2A2A] text-[#C5FF4A] flex items-center justify-center font-mono font-bold text-xs mx-auto">01</div>
                  <h4 className="font-mono text-xs uppercase tracking-wider text-[#C5FF4A]">Metrics Profile</h4>
                  <p className="text-[11px] text-[#FAF9F6]/70 font-serif">Specify age, weight, and available gear inventory.</p>
                </div>

                <div className="space-y-3">
                  <div className="h-10 w-10 bg-[#111111] border border-[#2A2A2A] text-[#C5FF4A] flex items-center justify-center font-mono font-bold text-xs mx-auto">02</div>
                  <h4 className="font-mono text-xs uppercase tracking-wider text-[#C5FF4A]">Pain Diagnostics</h4>
                  <p className="text-[11px] text-[#FAF9F6]/70 font-serif">Map active joint discomfort to engage the filter heuristics.</p>
                </div>

                <div className="space-y-3">
                  <div className="h-10 w-10 bg-[#111111] border border-[#2A2A2A] text-[#C5FF4A] flex items-center justify-center font-mono font-bold text-xs mx-auto">03</div>
                  <h4 className="font-mono text-xs uppercase tracking-wider text-[#C5FF4A]">Safety Compile</h4>
                  <p className="text-[11px] text-[#FAF9F6]/70 font-serif">Unlock your customized printable calendar via safety check.</p>
                </div>

                <div className="space-y-3">
                  <div className="h-10 w-10 bg-[#111111] border border-[#2A2A2A] text-[#C5FF4A] flex items-center justify-center font-mono font-bold text-xs mx-auto">04</div>
                  <h4 className="font-mono text-xs uppercase tracking-wider text-[#C5FF4A]">Overload Tracking</h4>
                  <p className="text-[11px] text-[#FAF9F6]/70 font-serif">Check off daily schedules to log trends locally on-device.</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* VIEW B: STEP WIZARD FORM */}
        {activeView === 'generate' && (
          <div className="animate-in fade-in duration-150" id="view-generate">
            <Wizard onPlanGenerated={handlePlanGenerated} />
          </div>
        )}

        {/* VIEW C: MY PLANS MANAGER */}
        {activeView === 'my-plans' && (
          <div className="animate-in fade-in duration-150" id="view-my-plans">
            <MyPlans onNavigateToWizard={() => navigateTo('generate')} />
          </div>
        )}

        {/* VIEW D: EXERCISE LIBRARY */}
        {activeView === 'library' && (
          <div className="animate-in fade-in duration-150" id="view-library">
            <ExerciseLibrary />
          </div>
        )}

        {/* VIEW E: PROGRESS TRACKER */}
        {activeView === 'progress' && (
          <div className="animate-in fade-in duration-150" id="view-progress">
            <ProgressTracker />
          </div>
        )}

        {/* VIEW F: ABOUT & DISCLAIMERS */}
        {activeView === 'about' && (
          <div className="animate-in fade-in duration-150" id="view-about">
            <AboutDisclaimer />
          </div>
        )}

      </main>

      {/* 4. FOOTER CREDITS */}
      <footer className="bg-[#111111] border-t border-[#2A2A2A] py-8 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <p className="text-[10px] font-mono text-[#FAF9F6]/40 uppercase tracking-widest">
            WORKOUT.OS © 2026 • Created by <a href="https://github.com/kashyapMak" target="_blank" rel="noopener noreferrer" className="hover:text-[#C5FF4A] underline decoration-dotted">Kashyap Makadia</a> • LITERA.OS / REV_4.0.2 / Fully Static Sandbox
          </p>
          <p className="text-[9px] font-mono text-[#FAF9F6]/30 uppercase tracking-widest max-w-2xl mx-auto leading-relaxed">
            Image courtesy of <a href="https://github.com/hasaneyldrm/exercises-dataset" target="_blank" rel="noopener noreferrer" className="hover:text-[#C5FF4A] underline decoration-dotted">exercises-dataset</a> & © Gym Visual — <a href="https://gymvisual.com/" target="_blank" rel="noopener noreferrer" className="hover:text-[#C5FF4A] underline decoration-dotted">gymvisual.com</a>
          </p>
          <div className="flex items-center justify-center gap-4 text-[10px] font-mono uppercase tracking-wider text-[#FAF9F6]/60">
            <button onClick={() => navigateTo('about')} className="hover:text-[#C5FF4A] cursor-pointer">Safety Disclaimer</button>
            <span className="text-[#2A2A2A]">•</span>
            <button onClick={() => navigateTo('about')} className="hover:text-[#C5FF4A] cursor-pointer">Privacy Policy</button>
            <span className="text-[#2A2A2A]">•</span>
            <button onClick={() => navigateTo('library')} className="hover:text-[#C5FF4A] cursor-pointer">V1.0.0 Stable</button>
          </div>
        </div>
      </footer>

    </div>
  );
}
