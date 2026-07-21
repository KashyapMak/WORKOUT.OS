import React, { useState } from 'react';
import { 
  UserProfile, 
  ExperienceLevel, 
  WorkoutEnvironment, 
  BodyArea, 
  Severity 
} from '../types/workout';
import { generateWorkoutPlan } from '../services/workoutGenerator';
import { saveWorkoutPlan } from '../services/storageService';
import { 
  Dumbbell, ArrowRight, ArrowLeft, HeartPulse, User, Check, AlertTriangle, Sparkles 
} from 'lucide-react';

interface WizardProps {
  onPlanGenerated: (planId: string) => void;
}

const ALL_EQUIPMENT = [
  "Bodyweight only", "Resistance bands", "Adjustable dumbbells", "Fixed dumbbells", 
  "Kettlebell", "Barbell", "Weight plates", "Bench", "Pull-up bar", "Squat rack", 
  "Smith machine", "Cable machine", "Leg press machine", "Lat pulldown machine", 
  "Treadmill", "Exercise bike", "Rowing machine", "Yoga mat", "Foam roller"
];

const ALL_GOALS = [
  "Weight Loss", "Fat Loss", "Muscle Gain", "Strength Development", 
  "General Fitness", "Athletic Performance", "Mobility Improvement", 
  "Rehabilitation", "Endurance"
];

const BODY_FOCUS_AREAS = [
  "Full Body", "Upper Body", "Lower Body", "Legs", "Chest", "Back", 
  "Shoulders", "Arms", "Glutes", "Core", "Mobility", "Cardio Endurance"
];

const CARDIO_TYPES = ["None", "Walking", "Running", "Cycling", "Rowing", "HIIT", "LISS cardio"];

export default function Wizard({ onPlanGenerated }: WizardProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 11;

  // Form State
  const [age, setAge] = useState<number>(30);
  const [gender, setGender] = useState<string>('Male');
  const [height, setHeight] = useState<number>(175);
  const [weight, setWeight] = useState<number>(75);
  const [bodyFat, setBodyFat] = useState<number | undefined>(undefined);

  const [goals, setGoals] = useState<string[]>(['General Fitness']);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('Beginner');
  const [environment, setEnvironment] = useState<WorkoutEnvironment>('Commercial Gym');
  const [equipment, setEquipment] = useState<string[]>(['Bodyweight only']);
  const [frequency, setFrequency] = useState<number>(3);
  const [durationMonths, setDurationMonths] = useState<number>(3);
  const [bodyFocus, setBodyFocus] = useState<string[]>(['Full Body']);
  
  // Cardio state
  const [cardioType, setCardioType] = useState<string>('None');
  const [cardioFreq, setCardioFreq] = useState<number>(0);
  const [cardioDur, setCardioDur] = useState<number>(15);
  const [cardioIntensity, setCardioIntensity] = useState<'Low' | 'Moderate' | 'High'>('Moderate');

  // Injury state
  const [injuries, setInjuries] = useState<Record<BodyArea, Severity>>({
    'Neck': 'None', 'Shoulder': 'None', 'Elbow': 'None', 'Wrist': 'None',
    'Upper Back': 'None', 'Lower Back': 'None', 'Hip': 'None', 'Knee': 'None', 'Ankle': 'None'
  });
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [restrictedMovements, setRestrictedMovements] = useState<string[]>([]);
  const [newRestrictionInput, setNewRestrictionInput] = useState('');

  // Disclaimer agreement
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [customPlanName, setCustomPlanName] = useState('');

  // Helper selectors
  const toggleGoal = (goal: string) => {
    setGoals(prev => prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]);
  };

  const toggleEquipment = (eq: string) => {
    setEquipment(prev => {
      if (eq === "Bodyweight only") {
        return ["Bodyweight only"];
      }
      
      const hasEq = prev.includes(eq);
      let updated = prev.filter(e => e !== "Bodyweight only");
      
      if (hasEq) {
        updated = updated.filter(e => e !== eq);
      } else {
        updated = [...updated, eq];
      }
      
      return updated.length === 0 ? ["Bodyweight only"] : updated;
    });
  };

  const selectAllEquipment = () => {
    setEquipment(ALL_EQUIPMENT.filter(e => e !== "Bodyweight only"));
  };

  const selectBodyweightOnly = () => {
    setEquipment(["Bodyweight only"]);
  };

  const clearAllEquipment = () => {
    setEquipment(["Bodyweight only"]);
  };

  const toggleFocus = (f: string) => {
    setBodyFocus(prev => prev.includes(f) ? prev.filter(item => item !== f) : [...prev, f]);
  };

  const updateInjury = (area: BodyArea, severity: Severity) => {
    setInjuries(prev => ({ ...prev, [area]: severity }));
  };

  const addRestrictedMovement = () => {
    if (newRestrictionInput.trim()) {
      setRestrictedMovements(prev => [...prev, newRestrictionInput.trim()]);
      setNewRestrictionInput('');
    }
  };

  const removeRestrictedMovement = (index: number) => {
    setRestrictedMovements(prev => prev.filter((_, idx) => idx !== index));
  };

  // Form Validation checks
  const isStepValid = () => {
    if (step === 1) {
      return age >= 12 && age <= 100 && height >= 100 && height <= 250 && weight >= 30 && weight <= 250;
    }
    if (step === 2) {
      return goals.length > 0;
    }
    if (step === 5) {
      return equipment.length > 0;
    }
    if (step === 8) {
      return bodyFocus.length > 0;
    }
    return true;
  };

  const handleNext = () => {
    if (isStepValid() && step < totalSteps) {
      // Auto adjust equipment if bodyweight only environment was selected
      if (step === 4 && environment === 'Home Bodyweight') {
        setEquipment(['Bodyweight only', 'Yoga mat']);
        setStep(6); // Skip equipment selection
        return;
      }
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      if (step === 6 && environment === 'Home Bodyweight') {
        setStep(4); // Skip equipment selection back too
        return;
      }
      setStep(prev => prev - 1);
    }
  };

  const handleGenerate = () => {
    if (!disclaimerChecked) return;

    const userProfile: UserProfile = {
      age, gender, height, weight, bodyFat,
      goals, experienceLevel, environment, equipment,
      frequency, durationMonths, bodyFocus,
      cardio: {
        type: cardioType,
        frequency: cardioType === 'None' ? 0 : cardioFreq,
        duration: cardioDur,
        intensity: cardioIntensity
      },
      injuries,
      additionalNotes,
      restrictedMovements
    };

    const plan = generateWorkoutPlan(userProfile, customPlanName.trim() || undefined);
    saveWorkoutPlan(plan);
    onPlanGenerated(plan.id);
  };

  return (
    <div className="max-w-3xl mx-auto p-1 sm:p-4 space-y-6">
      
      {/* progress board bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[#FAF9F6]/50 font-bold font-mono uppercase tracking-wider">
          <span>Step {step} of {totalSteps}</span>
          <span>{Math.round((step / totalSteps) * 100)}% Complete</span>
        </div>
        <div className="h-2 w-full bg-[#1c1c1c] border border-[#2A2A2A] rounded-none overflow-hidden">
          <div 
            className="h-full bg-[#C5FF4A] transition-all duration-300 rounded-none" 
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Main card box */}
      <div className="bg-[#161616] border border-[#2A2A2A] p-6 sm:p-8 rounded-none shadow-none">
        
        {/* STEP 1: PERSONAL DETAILS */}
        {step === 1 && (
          <div className="space-y-6" id="wizard-step-1">
            <div className="space-y-1">
              <h2 className="text-xl font-light text-[#FAF9F6] font-serif flex items-center gap-2">
                <User className="h-5 w-5 text-[#C5FF4A]" />
                Personal Details
              </h2>
              <p className="text-[#FAF9F6]/60 text-xs sm:text-sm font-serif">Please provide your general metrics to estimate base metabolic variables.</p>
            </div>

            {/* Privacy & Trust Guarantee Banner */}
            <div className="bg-[#111111] border border-[#2A2A2A] p-4 space-y-3" id="trust-guarantee-banner">
              <div className="flex items-center gap-2 text-xs font-mono text-[#C5FF4A] uppercase tracking-wider">
                <span className="inline-block w-2 h-2 rounded-full bg-[#C5FF4A] animate-pulse"></span>
                🔒 Absolute Privacy & Trust Guarantee
              </div>
              <p className="text-[#FAF9F6]/80 text-xs sm:text-sm leading-relaxed font-serif">
                This app is engineered to solve a common frustration: filling out fitness forms only to be hit with aggressive signup requirements or hidden subscription walls.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono text-[#FAF9F6]/50 uppercase tracking-wider pt-1">
                <div>• 100% Client-Side (All data stays on your device)</div>
                <div>• Zero Servers (No account registration required)</div>
                <div>• For Beginners (No subscriptions or paywalls)</div>
                <div>• Ad-Free & Tracker-Free (Your profile is yours alone)</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#FAF9F6]/80 font-mono block uppercase tracking-wider">Age (Years)</label>
                <input 
                  id="wizard-age"
                  type="number" 
                  value={age} 
                  onChange={(e) => setAge(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full p-3 bg-[#111111] border border-[#2A2A2A] rounded-none text-[#FAF9F6] text-sm font-serif focus:outline-none focus:border-[#C5FF4A]"
                />
                {age < 12 && <p className="text-[10px] text-rose-500 font-mono">Min safe training age recommendation is 12.</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#FAF9F6]/80 font-mono block uppercase tracking-wider">Biological Gender</label>
                <select 
                  id="wizard-gender"
                  value={gender} 
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full p-3 bg-[#111111] border border-[#2A2A2A] rounded-none text-[#FAF9F6] text-sm font-serif focus:outline-none focus:border-[#C5FF4A]"
                >
                  <option value="Male" className="bg-[#111111] text-[#FAF9F6]">Male</option>
                  <option value="Female" className="bg-[#111111] text-[#FAF9F6]">Female</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#FAF9F6]/80 font-mono block uppercase tracking-wider">Height (cm)</label>
                <input 
                  id="wizard-height"
                  type="number" 
                  value={height} 
                  onChange={(e) => setHeight(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full p-3 bg-[#111111] border border-[#2A2A2A] rounded-none text-[#FAF9F6] text-sm font-serif focus:outline-none focus:border-[#C5FF4A]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#FAF9F6]/80 font-mono block uppercase tracking-wider">Weight (kg)</label>
                <input 
                  id="wizard-weight"
                  type="number" 
                  value={weight} 
                  onChange={(e) => setWeight(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full p-3 bg-[#111111] border border-[#2A2A2A] rounded-none text-[#FAF9F6] text-sm font-serif focus:outline-none focus:border-[#C5FF4A]"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-[#FAF9F6]/80 font-mono block uppercase tracking-wider">Body Fat Percentage (Optional %)</label>
                <input 
                  id="wizard-bodyfat"
                  type="number" 
                  placeholder="e.g. 15"
                  value={bodyFat || ''} 
                  onChange={(e) => setBodyFat(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full p-3 bg-[#111111] border border-[#2A2A2A] rounded-none text-[#FAF9F6] text-sm font-serif focus:outline-none focus:border-[#C5FF4A]"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: FITNESS GOALS */}
        {step === 2 && (
          <div className="space-y-6" id="wizard-step-2">
            <div className="space-y-1">
              <h2 className="text-xl font-light text-[#FAF9F6] font-serif flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-[#C5FF4A]" />
                Primary Fitness Goals
              </h2>
              <p className="text-[#FAF9F6]/60 text-xs sm:text-sm font-serif">Select one or more targets. The algorithm applies these to refine repetition brackets, volume intensity, and rest buffers.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="goals-checkbox-grid">
              {ALL_GOALS.map(goal => {
                const checked = goals.includes(goal);
                return (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => toggleGoal(goal)}
                    className={`p-4 rounded-none border text-left flex items-center justify-between transition-all cursor-pointer ${
                      checked 
                        ? 'bg-[#C5FF4A] border-[#C5FF4A] text-[#111111] font-bold' 
                        : 'bg-[#111111] border-[#2A2A2A] text-[#FAF9F6] hover:border-[#FAF9F6]/30'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-serif">{goal}</span>
                    <div className={`h-4 w-4 rounded-none flex items-center justify-center border ${
                      checked ? 'bg-[#111111] border-[#111111] text-[#C5FF4A]' : 'border-[#FAF9F6]/20 bg-transparent'
                    }`}>
                      {checked && <Check className="h-2.5 w-2.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: EXPERIENCE LEVEL */}
        {step === 3 && (
          <div className="space-y-6" id="wizard-step-3">
            <div className="space-y-1">
              <h2 className="text-xl font-light text-[#FAF9F6] font-serif">Experience Level</h2>
              <p className="text-[#FAF9F6]/60 text-xs sm:text-sm font-serif">Affects total set volume, initial movement complexity warnings, and rest period guidelines.</p>
            </div>

            <div className="space-y-3">
              {(['Beginner', 'Intermediate', 'Advanced'] as ExperienceLevel[]).map(lvl => {
                const checked = experienceLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setExperienceLevel(lvl)}
                    className={`w-full p-4 rounded-none border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      checked 
                        ? 'bg-[#C5FF4A] border-[#C5FF4A] text-[#111111] font-bold' 
                        : 'bg-[#111111] border-[#2A2A2A] text-[#FAF9F6] hover:border-[#FAF9F6]/30'
                    }`}
                  >
                    <span className="text-sm font-bold font-serif">{lvl}</span>
                    <span className={`text-xs ${checked ? 'text-[#111111]/80' : 'text-[#FAF9F6]/60'} font-serif`}>
                      {lvl === 'Beginner' && 'Focuses on core stability, linear progressions, and learning simple movement patterns safely.'}
                      {lvl === 'Intermediate' && 'Incorporates complex double progressions, moderate volume blocks, and varied accessory sets.'}
                      {lvl === 'Advanced' && 'Applies undulating volume phases, highly periodized lifting cycles, and heavier compound blocks.'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: WORKOUT ENVIRONMENT */}
        {step === 4 && (
          <div className="space-y-6" id="wizard-step-4">
            <div className="space-y-1">
              <h2 className="text-xl font-light text-[#FAF9F6] font-serif">Workout Environment</h2>
              <p className="text-[#FAF9F6]/60 text-xs sm:text-sm font-serif">Where do you intend to train? This filters out exercises requiring specialized commercial gym systems.</p>
            </div>

            <div className="space-y-3">
              {([
                'Home Bodyweight', 
                'Home Limited Equipment', 
                'Home Full Equipment', 
                'Commercial Gym', 
                'Limited Gym'
              ] as WorkoutEnvironment[]).map(env => {
                const checked = environment === env;
                return (
                  <button
                    key={env}
                    type="button"
                    onClick={() => setEnvironment(env)}
                    className={`w-full p-4 rounded-none border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      checked 
                        ? 'bg-[#C5FF4A] border-[#C5FF4A] text-[#111111] font-bold' 
                        : 'bg-[#111111] border-[#2A2A2A] text-[#FAF9F6] hover:border-[#FAF9F6]/30'
                    }`}
                  >
                    <span className="text-sm font-bold font-serif">{env}</span>
                    <span className={`text-xs ${checked ? 'text-[#111111]/80' : 'text-[#FAF9F6]/60'} font-serif`}>
                      {env === 'Home Bodyweight' && 'Requires zero gear. Exercises will focus strictly on body weight and dynamic floor mobility.'}
                      {env === 'Home Limited Equipment' && 'Dumbbells, bench, resistance bands, or adjustable kettlebell set.'}
                      {env === 'Home Full Equipment' && 'Full home gym rack setups, bar systems, and free weight arrays.'}
                      {env === 'Commercial Gym' && 'Includes massive multi-cable systems, specific leg press, and dynamic machines.'}
                      {env === 'Limited Gym' && 'Corporate or hotel-style gym spaces with dumbbells, benches, and standard cable towers.'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 5: EQUIPMENT INVENTORY */}
        {step === 5 && (
          <div className="space-y-6" id="wizard-step-5">
            <div className="space-y-1">
              <h2 className="text-xl font-light text-[#FAF9F6] font-serif">Equipment Inventory</h2>
              <p className="text-[#FAF9F6]/60 text-xs sm:text-sm font-serif">Tick off only the gear you have direct, continuous access to. Exercises that demand unticked gear will be completely excluded.</p>
            </div>

            {/* Equipment Quick Actions */}
            <div className="flex flex-wrap gap-2 pt-1 pb-2">
              <button
                type="button"
                onClick={selectAllEquipment}
                className="px-3 py-1.5 bg-[#111111] hover:bg-[#1a1a1a] border border-[#2A2A2A] hover:border-[#FAF9F6]/30 text-[10px] font-mono uppercase tracking-wider text-[#C5FF4A] transition-all cursor-pointer"
              >
                Full Gym (Select All)
              </button>
              <button
                type="button"
                onClick={selectBodyweightOnly}
                className="px-3 py-1.5 bg-[#111111] hover:bg-[#1a1a1a] border border-[#2A2A2A] hover:border-[#FAF9F6]/30 text-[10px] font-mono uppercase tracking-wider text-[#FAF9F6] transition-all cursor-pointer"
              >
                Bodyweight Only
              </button>
              <button
                type="button"
                onClick={clearAllEquipment}
                className="px-3 py-1.5 bg-[#111111] hover:bg-[#1a1a1a] border border-[#2A2A2A] hover:border-[#FAF9F6]/30 text-[10px] font-mono uppercase tracking-wider text-[#FAF9F6]/50 hover:text-[#FAF9F6]/80 transition-all cursor-pointer"
              >
                Clear Selections
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" id="equipment-checkbox-grid">
              {ALL_EQUIPMENT.map(eq => {
                const checked = equipment.includes(eq);
                return (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => toggleEquipment(eq)}
                    className={`p-3 rounded-none border text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                      checked 
                        ? 'bg-[#C5FF4A] border-[#C5FF4A] text-[#111111] font-bold' 
                        : 'bg-[#111111] border-[#2A2A2A] text-[#FAF9F6] hover:border-[#FAF9F6]/30'
                    }`}
                  >
                    <span className="truncate pr-1 font-serif">{eq}</span>
                    <div className={`h-4 w-4 rounded-none flex items-center justify-center border flex-shrink-0 ${
                      checked ? 'bg-[#111111] border-[#111111] text-[#C5FF4A]' : 'border-[#FAF9F6]/20 bg-transparent'
                    }`}>
                      {checked && <Check className="h-2.5 w-2.5" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] text-[#FAF9F6]/40 font-serif leading-relaxed italic">
              * Note: "Bodyweight only" is an exclusive filter. Selecting any other equipment item will automatically deselect it. Deselecting all equipment defaults back to "Bodyweight only".
            </p>
          </div>
        )}

        {/* STEP 6: TRAINING FREQUENCY */}
        {step === 6 && (
          <div className="space-y-6" id="wizard-step-6">
            <div className="space-y-1">
              <h2 className="text-xl font-light text-[#FAF9F6] font-serif">Weekly Training Frequency</h2>
              <p className="text-[#FAF9F6]/60 text-xs sm:text-sm font-serif">The system designs split routines based on your selection to ensure appropriate recovery pacing between sessions.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[2, 3, 4, 5, 6].map(num => {
                const checked = frequency === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setFrequency(num)}
                    className={`p-5 rounded-none border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      checked 
                        ? 'bg-[#C5FF4A] border-[#C5FF4A] text-[#111111] font-black' 
                        : 'bg-[#111111] border-[#2A2A2A] text-[#FAF9F6] hover:border-[#FAF9F6]/30'
                    }`}
                  >
                    <span className="text-xl font-bold font-serif">{num}</span>
                    <span className="text-[10px] uppercase font-mono tracking-wider opacity-80">Days / Wk</span>
                  </button>
                );
              })}
            </div>

            <div className="bg-[#111111] p-4 border border-[#2A2A2A] text-xs text-[#FAF9F6]/70 space-y-2 font-serif">
              <span className="font-bold block text-[#C5FF4A] uppercase tracking-wider font-mono text-[10px]">Split Structures:</span>
              <p>• <strong>2-3 Days:</strong> Highly effective Full Body sessions with 48h rest breaks.</p>
              <p>• <strong>4 Days:</strong> Balanced Upper / Lower body splits.</p>
              <p>• <strong>5-6 Days:</strong> Push / Pull / Legs systems optimized for higher volume loading.</p>
            </div>
          </div>
        )}

        {/* STEP 7: PROGRAM DURATION */}
        {step === 7 && (
          <div className="space-y-6" id="wizard-step-7">
            <div className="space-y-1">
              <h2 className="text-xl font-light text-[#FAF9F6] font-serif">Program Duration</h2>
              <p className="text-[#FAF9F6]/60 text-xs sm:text-sm font-serif">Longer duration plans automatically configure cyclical phases (e.g. foundational, build, progression, and regular deload breaks).</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 3, 6, 12].map(months => {
                const checked = durationMonths === months;
                return (
                  <button
                    key={months}
                    type="button"
                    onClick={() => setDurationMonths(months)}
                    className={`p-5 rounded-none border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      checked 
                        ? 'bg-[#C5FF4A] border-[#C5FF4A] text-[#111111] font-black' 
                        : 'bg-[#111111] border-[#2A2A2A] text-[#FAF9F6] hover:border-[#FAF9F6]/30'
                    }`}
                  >
                    <span className="text-lg font-bold font-serif">{months}</span>
                    <span className="text-[10px] uppercase font-mono tracking-wider opacity-80">{months === 1 ? 'Month' : 'Months'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 8: BODY FOCUS PREFERENCES */}
        {step === 8 && (
          <div className="space-y-6" id="wizard-step-8">
            <div className="space-y-1">
              <h2 className="text-xl font-light text-[#FAF9F6] font-serif">Body Focus Priorities</h2>
              <p className="text-[#FAF9F6]/60 text-xs sm:text-sm font-serif">Highlight target zones. The algorithm weights exercise selection to prioritize these areas without triggering physical imbalances.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" id="focus-checkbox-grid">
              {BODY_FOCUS_AREAS.map(f => {
                const checked = bodyFocus.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFocus(f)}
                    className={`p-3 rounded-none border text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                      checked 
                        ? 'bg-[#C5FF4A] border-[#C5FF4A] text-[#111111] font-bold' 
                        : 'bg-[#111111] border-[#2A2A2A] text-[#FAF9F6] hover:border-[#FAF9F6]/30'
                    }`}
                  >
                    <span className="font-serif">{f}</span>
                    <div className={`h-4 w-4 rounded-none flex items-center justify-center border ${
                      checked ? 'bg-[#111111] border-[#111111] text-[#C5FF4A]' : 'border-[#FAF9F6]/20 bg-transparent'
                    }`}>
                      {checked && <Check className="h-2 w-2" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 9: CARDIO PREFERENCES */}
        {step === 9 && (
          <div className="space-y-6" id="wizard-step-9">
            <div className="space-y-1">
              <h2 className="text-xl font-light text-[#FAF9F6] font-serif">Cardio Training Preference</h2>
              <p className="text-[#FAF9F6]/60 text-xs sm:text-sm font-serif">Choose how cardiovascular workouts should integrate with your weekly strength schedule.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {CARDIO_TYPES.map(type => {
                const checked = cardioType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setCardioType(type);
                      setCardioFreq(type === 'None' ? 0 : 2);
                    }}
                    className={`p-3 rounded-none border text-center text-xs font-semibold transition-all cursor-pointer ${
                      checked 
                        ? 'bg-[#C5FF4A] border-[#C5FF4A] text-[#111111] font-bold' 
                        : 'bg-[#111111] border-[#2A2A2A] text-[#FAF9F6] hover:border-[#FAF9F6]/30'
                    }`}
                  >
                    <span className="font-mono tracking-wider uppercase">{type}</span>
                  </button>
                );
              })}
            </div>

            {cardioType !== 'None' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#111111] p-4 border border-[#2A2A2A] rounded-none animate-in slide-in-from-top-4 duration-150">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#FAF9F6]/60 uppercase font-mono tracking-wider">Sessions / Week</label>
                  <input
                    id="wizard-cardio-freq"
                    type="number"
                    min="1"
                    max="7"
                    value={cardioFreq}
                    onChange={(e) => setCardioFreq(Math.min(7, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full p-2 bg-[#161616] border border-[#2A2A2A] rounded-none text-xs text-[#FAF9F6] focus:outline-none focus:border-[#C5FF4A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#FAF9F6]/60 uppercase font-mono tracking-wider">Mins / Session</label>
                  <input
                    id="wizard-cardio-dur"
                    type="number"
                    min="5"
                    max="120"
                    value={cardioDur}
                    onChange={(e) => setCardioDur(Math.max(5, parseInt(e.target.value) || 15))}
                    className="w-full p-2 bg-[#161616] border border-[#2A2A2A] rounded-none text-xs text-[#FAF9F6] focus:outline-none focus:border-[#C5FF4A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#FAF9F6]/60 uppercase font-mono tracking-wider">Intensity</label>
                  <select
                    id="wizard-cardio-intensity"
                    value={cardioIntensity}
                    onChange={(e) => setCardioIntensity(e.target.value as 'Low' | 'Moderate' | 'High')}
                    className="w-full p-2 bg-[#161616] border border-[#2A2A2A] rounded-none text-xs text-[#FAF9F6] focus:outline-none focus:border-[#C5FF4A] font-serif"
                  >
                    <option value="Low" className="bg-[#111111]">Low (LISS)</option>
                    <option value="Moderate" className="bg-[#111111]">Moderate (Steady)</option>
                    <option value="High" className="bg-[#111111]">High (HIIT)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 10: INJURY & LIMITATIONS */}
        {step === 10 && (
          <div className="space-y-6" id="wizard-step-10">
            <div className="space-y-1">
              <h2 className="text-xl font-light text-[#FAF9F6] font-serif">Joint Pain & Physical Limitations</h2>
              <p className="text-[#FAF9F6]/60 text-xs sm:text-sm font-serif">Declare joint pain. Moderate or severe issues automatically trigger exercise replacement algorithms (e.g. replacing deep squats with box/glute bridges).</p>
            </div>

            {/* Grid selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border border-[#2A2A2A] p-4 bg-[#111111] rounded-none max-h-[220px] overflow-y-auto">
              {(Object.keys(injuries) as BodyArea[]).map(area => {
                const currentSeverity = injuries[area];
                return (
                  <div key={area} className="space-y-1 bg-[#161616] p-2.5 rounded-none border border-[#2A2A2A]">
                    <span className="text-xs font-bold text-[#FAF9F6]/85 block font-serif">{area}</span>
                    <select
                      id={`wizard-injury-${area.replace(/\s+/g, '_')}`}
                      value={currentSeverity}
                      onChange={(e) => updateInjury(area, e.target.value as Severity)}
                      className="w-full p-1 bg-[#111111] border border-[#2A2A2A] rounded-none text-[10px] text-[#FAF9F6]/85 font-serif focus:outline-none focus:border-[#C5FF4A]"
                    >
                      <option value="None" className="bg-[#111111]">None</option>
                      <option value="Mild" className="bg-[#111111]">Mild Pain</option>
                      <option value="Moderate" className="bg-[#111111]">Moderate Pain</option>
                      <option value="Severe" className="bg-[#111111]">Severe / Limit</option>
                    </select>
                  </div>
                );
              })}
            </div>

            {/* Custom note and restricted terms */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#FAF9F6]/80 font-mono block uppercase tracking-wider">Restricted Movements or Exercises (Custom)</label>
                <div className="flex gap-2">
                  <input
                    id="wizard-add-restriction-val"
                    type="text"
                    placeholder="e.g. Barbell Squats, Deadlifts"
                    value={newRestrictionInput}
                    onChange={(e) => setNewRestrictionInput(e.target.value)}
                    className="flex-1 p-2 bg-[#111111] border border-[#2A2A2A] rounded-none text-xs text-[#FAF9F6] focus:outline-none focus:border-[#C5FF4A]"
                  />
                  <button
                    type="button"
                    onClick={addRestrictedMovement}
                    className="px-3 py-2 bg-[#C5FF4A] text-[#111111] rounded-none text-xs font-bold font-mono uppercase tracking-wider hover:bg-[#b0f530] cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                
                {/* Restricted list pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {restrictedMovements.map((move, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#1c1c1c] border border-[#2A2A2A] text-[10px] text-[#FAF9F6]/90 rounded-none font-mono">
                      {move}
                      <button type="button" onClick={() => removeRestrictedMovement(idx)} className="text-[#C5FF4A] hover:text-white font-bold ml-1">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#FAF9F6]/80 font-mono block uppercase tracking-wider">Additional Injury / Physical Notes</label>
                <textarea
                  id="wizard-additional-notes"
                  placeholder="Provide additional context about past operations, active joint problems, or physio advice."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  className="w-full p-3 bg-[#111111] border border-[#2A2A2A] rounded-none text-xs h-16 resize-none text-[#FAF9F6] focus:outline-none focus:border-[#C5FF4A]"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 11: SUMMARY & MEDICAL DISCLAIMER */}
        {step === 11 && (
          <div className="space-y-6" id="wizard-step-11">
            <div className="space-y-1">
              <h2 className="text-xl font-light text-[#FAF9F6] font-serif flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#C5FF4A]" />
                Plan Customization & Safety Check
              </h2>
              <p className="text-[#FAF9F6]/60 text-xs sm:text-sm font-serif">You are ready to compile your customized physical workout schedule.</p>
            </div>

            {/* Custom plan name input */}
            <div className="space-y-1 bg-[#111111] p-4 border border-[#2A2A2A] rounded-none">
              <label className="text-xs font-bold text-[#FAF9F6]/80 font-mono block uppercase tracking-wider mb-1">Name your custom plan (Optional)</label>
              <input
                id="wizard-custom-plan-name"
                type="text"
                placeholder="e.g. My Gym Push-Pull-Legs v1"
                value={customPlanName}
                onChange={(e) => setCustomPlanName(e.target.value)}
                className="w-full p-2.5 bg-[#161616] border border-[#2A2A2A] rounded-none text-xs text-[#FAF9F6] focus:outline-none focus:border-[#C5FF4A]"
              />
            </div>

            {/* Safety Disclaimer Board */}
            <div className="bg-[#1a1510] border border-amber-900/50 p-5 space-y-4 rounded-none">
              <span className="text-xs font-bold text-[#C5FF4A] flex items-center gap-1 font-mono uppercase tracking-wider">
                <AlertTriangle className="h-4 w-4" />
                Important Safety Disclaimer
              </span>
              <p className="text-[11px] text-[#FAF9F6]/80 leading-relaxed font-serif">
                This workout plan is generated automatically for educational and informational purposes only. It is not medical advice, diagnosis, treatment, or a substitute for professional guidance. Always consult a qualified healthcare professional before beginning any exercise program, especially if you have injuries, pain, medical conditions, or movement limitations. Participation in exercise activities is entirely at your own risk.
              </p>

              {/* Checkbox trigger */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  id="chk-safety-disclaimer"
                  type="checkbox"
                  checked={disclaimerChecked}
                  onChange={(e) => setDisclaimerChecked(e.target.checked)}
                  className="mt-0.5 accent-[#C5FF4A]"
                />
                <span className="text-xs text-[#FAF9F6] font-bold leading-none select-none font-serif">
                  I explicitly acknowledge and agree to this safety disclaimer.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-8 pt-5 border-t border-[#2A2A2A] flex items-center justify-between">
          {step > 1 ? (
            <button
              id="btn-wizard-back"
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1 px-4 py-2 bg-[#111111] hover:bg-[#161616] border border-[#2A2A2A] text-xs font-bold font-mono uppercase tracking-wider text-[#FAF9F6] cursor-pointer transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <button
              id="btn-wizard-next"
              type="button"
              onClick={handleNext}
              disabled={!isStepValid()}
              className="inline-flex items-center gap-1 px-5 py-2.5 bg-[#C5FF4A] hover:bg-[#b0f530] disabled:opacity-30 disabled:hover:bg-[#C5FF4A] rounded-none text-xs font-bold font-mono uppercase tracking-wider text-[#111111] cursor-pointer transition-all"
            >
              Next Step
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              id="btn-wizard-generate"
              type="button"
              onClick={handleGenerate}
              disabled={!disclaimerChecked}
              className="inline-flex items-center gap-1.5 px-6 py-3 bg-[#C5FF4A] hover:bg-[#b0f530] disabled:opacity-30 disabled:hover:bg-[#C5FF4A] rounded-none text-xs font-bold font-mono uppercase tracking-wider text-[#111111] cursor-pointer transition-all"
            >
              Generate My Plan
              <Dumbbell className="h-4 w-4" />
            </button>
          )}
        </div>

      </div>

    </div>
  );
}
