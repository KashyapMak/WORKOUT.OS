import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { 
  getSavedPlans, 
  renamePlan, 
  duplicatePlan, 
  deletePlan, 
  restorePlanVersion, 
  deletePlanVersion, 
  savePlanHistory, 
  addWorkoutCompletion,
  saveWorkoutPlan
} from '../services/storageService';
import { EXERCISE_DATABASE } from '../data/exercises';
import { SavedPlanHistory, WorkoutPlan, WorkoutExercise, UserProfile } from '../types/workout';
import { getScheduleForWeek, generateSingleWeekSchedule } from '../services/workoutGenerator';
import { 
  Trash2, Copy, FileText, Download, Upload, CheckCircle2, 
  Heart, Edit2, AlertTriangle, ChevronRight, RefreshCw, Layers,
  Play, Pause, SkipForward, RotateCcw, Timer, Activity, Award, Check, X, ShieldAlert
} from 'lucide-react';
import { ExerciseVisualCoach } from './ExerciseVisualCoach';
import { AnimatedExerciseViewer } from './AnimatedExerciseViewer';

function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const cleaned = timeStr.toLowerCase().trim();
  const secMatch = cleaned.match(/^(\d+)\s*(s|sec|second)/);
  if (secMatch) return parseInt(secMatch[1]);
  
  const minMatch = cleaned.match(/^(\d+)\s*(m|min|minute)/);
  if (minMatch) return parseInt(minMatch[1]) * 60;
  
  if (cleaned.includes('s') || cleaned.includes('sec')) {
    const num = cleaned.match(/\d+/);
    if (num) return parseInt(num[0]);
  }
  if (cleaned.includes('min') || cleaned.includes('m')) {
    const num = cleaned.match(/\d+/);
    if (num) return parseInt(num[0]) * 60;
  }
  return 0;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface MyPlansProps {
  onNavigateToWizard: () => void;
}

export default function MyPlans({ onNavigateToWizard }: MyPlansProps) {
  const [plans, setPlans] = useState<Record<string, SavedPlanHistory>>({});
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number | null>(null);
  const [activeTabDay, setActiveTabDay] = useState<number>(0);
  
  // Edit state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  
  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guided session states
  const [isGuidedActive, setIsGuidedActive] = useState(false);
  const [selectedWorkoutWeek, setSelectedWorkoutWeek] = useState<number>(1);
  const [guidedStep, setGuidedStep] = useState<'warmup' | 'resistance' | 'cardio' | 'cooldown' | 'complete'>('warmup');
  const [guidedStepIndex, setGuidedStepIndex] = useState(0);
  const [guidedSetIndex, setGuidedSetIndex] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
  const [totalCompletedSets, setTotalCompletedSets] = useState(0);

  // Custom confirmation modal states (avoid native confirms which fail in sandbox iframe)
  const [showPlanDeleteConfirm, setShowPlanDeleteConfirm] = useState(false);
  const [showVersionDeleteConfirm, setShowVersionDeleteConfirm] = useState<number | null>(null);
  const [showExitSessionConfirm, setShowExitSessionConfirm] = useState(false);

  // Setup Step timer duration
  const setupStepTimer = (step: 'warmup' | 'resistance' | 'cardio' | 'cooldown' | 'complete', stepIdx: number, setIdx: number, customPlan?: WorkoutPlan) => {
    const currentPlan = customPlan || activePlan;
    if (!currentPlan) return;
    const day = currentPlan.schedule[activeTabDay];
    if (!day) return;

    setIsTimerRunning(false);
    setIsResting(false);

    if (step === 'warmup' && day.warmUp && day.warmUp[stepIdx]) {
      const timeSecs = parseTimeToSeconds(day.warmUp[stepIdx].duration || '');
      setTimeLeft(timeSecs);
    } else if (step === 'resistance' && day.exercises && day.exercises[stepIdx]) {
      const ex = day.exercises[stepIdx];
      const timeSecs = parseTimeToSeconds(ex.reps);
      setTimeLeft(timeSecs);
    } else if (step === 'cardio' && day.cardio) {
      setTimeLeft(day.cardio.duration * 60);
    } else if (step === 'cooldown' && day.coolDown && day.coolDown[stepIdx]) {
      const timeSecs = parseTimeToSeconds(day.coolDown[stepIdx].duration || '');
      setTimeLeft(timeSecs);
    } else {
      setTimeLeft(0);
    }
  };

  // Launch coach handler
  const handleStartGuidedSession = () => {
    if (!activePlan) return;
    const day = activePlan.schedule[activeTabDay];
    if (!day) return;

    setGuidedStep('warmup');
    setGuidedStepIndex(0);
    setGuidedSetIndex(0);
    setTotalElapsedTime(0);
    setTotalCompletedSets(0);
    setIsGuidedActive(true);
    
    // Check if warmUp exists, if not, jump to resistance
    if (!day.warmUp || day.warmUp.length === 0) {
      setGuidedStep('resistance');
      setupStepTimer('resistance', 0, 0, activePlan);
    } else {
      setupStepTimer('warmup', 0, 0, activePlan);
    }
  };

  // Timer end actions
  const handleTimerEnd = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}

    if (isResting) {
      setIsResting(false);
      advanceResistanceSet();
    } else {
      if (guidedStep === 'resistance') {
        handleCompleteSet();
      } else {
        handleNextGuidedStep();
      }
    }
  };

  // Complete resistance exercise set
  const handleCompleteSet = () => {
    if (!activePlan) return;
    const day = activePlan.schedule[activeTabDay];
    const ex = day.exercises[guidedStepIndex];
    if (!ex) return;

    setTotalCompletedSets(prev => prev + 1);

    // Run rest recovery timer if recovery rest is configured and we aren't completely done
    if (ex.restSeconds > 0) {
      setIsResting(true);
      setTimeLeft(ex.restSeconds);
      setIsTimerRunning(true);
    } else {
      advanceResistanceSet();
    }
  };

  // Advance to next resistance set
  const advanceResistanceSet = () => {
    if (!activePlan) return;
    const day = activePlan.schedule[activeTabDay];
    const ex = day.exercises[guidedStepIndex];
    if (!ex) return;

    if (guidedSetIndex < ex.sets - 1) {
      const nextSet = guidedSetIndex + 1;
      setGuidedSetIndex(nextSet);
      setupStepTimer('resistance', guidedStepIndex, nextSet, activePlan);
    } else {
      // Move to next exercise
      if (guidedStepIndex < day.exercises.length - 1) {
        const nextExIdx = guidedStepIndex + 1;
        setGuidedStepIndex(nextExIdx);
        setGuidedSetIndex(0);
        setupStepTimer('resistance', nextExIdx, 0, activePlan);
      } else {
        // Resistance stage fully complete, check for cardio or cooldown
        if (day.cardio) {
          setGuidedStep('cardio');
          setGuidedStepIndex(0);
          setupStepTimer('cardio', 0, 0, activePlan);
        } else if (day.coolDown && day.coolDown.length > 0) {
          setGuidedStep('cooldown');
          setGuidedStepIndex(0);
          setupStepTimer('cooldown', 0, 0, activePlan);
        } else {
          setGuidedStep('complete');
        }
      }
    }
  };

  // Complete active task / stage step manually or skip
  const handleNextGuidedStep = () => {
    if (!activePlan) return;
    const day = activePlan.schedule[activeTabDay];
    if (!day) return;

    if (guidedStep === 'warmup') {
      if (guidedStepIndex < day.warmUp.length - 1) {
        const nextIdx = guidedStepIndex + 1;
        setGuidedStepIndex(nextIdx);
        setupStepTimer('warmup', nextIdx, 0, activePlan);
      } else {
        setGuidedStep('resistance');
        setGuidedStepIndex(0);
        setGuidedSetIndex(0);
        setupStepTimer('resistance', 0, 0, activePlan);
      }
    } else if (guidedStep === 'resistance') {
      // Skip active exercise completely
      if (guidedStepIndex < day.exercises.length - 1) {
        const nextExIdx = guidedStepIndex + 1;
        setGuidedStepIndex(nextExIdx);
        setGuidedSetIndex(0);
        setupStepTimer('resistance', nextExIdx, 0, activePlan);
      } else {
        if (day.cardio) {
          setGuidedStep('cardio');
          setGuidedStepIndex(0);
          setupStepTimer('cardio', 0, 0, activePlan);
        } else if (day.coolDown && day.coolDown.length > 0) {
          setGuidedStep('cooldown');
          setGuidedStepIndex(0);
          setupStepTimer('cooldown', 0, 0, activePlan);
        } else {
          setGuidedStep('complete');
        }
      }
    } else if (guidedStep === 'cardio') {
      if (day.coolDown && day.coolDown.length > 0) {
        setGuidedStep('cooldown');
        setGuidedStepIndex(0);
        setupStepTimer('cooldown', 0, 0, activePlan);
      } else {
        setGuidedStep('complete');
      }
    } else if (guidedStep === 'cooldown') {
      if (guidedStepIndex < day.coolDown.length - 1) {
        const nextIdx = guidedStepIndex + 1;
        setGuidedStepIndex(nextIdx);
        setupStepTimer('cooldown', nextIdx, 0, activePlan);
      } else {
        setGuidedStep('complete');
      }
    }
  };

  // Go back to previous step
  const handlePrevGuidedStep = () => {
    if (!activePlan) return;
    const day = activePlan.schedule[activeTabDay];
    if (!day) return;

    setIsResting(false);

    if (guidedStep === 'warmup') {
      if (guidedStepIndex > 0) {
        const prevIdx = guidedStepIndex - 1;
        setGuidedStepIndex(prevIdx);
        setupStepTimer('warmup', prevIdx, 0, activePlan);
      }
    } else if (guidedStep === 'resistance') {
      if (guidedSetIndex > 0) {
        const prevSet = guidedSetIndex - 1;
        setGuidedSetIndex(prevSet);
        setupStepTimer('resistance', guidedStepIndex, prevSet, activePlan);
      } else if (guidedStepIndex > 0) {
        const prevExIdx = guidedStepIndex - 1;
        const prevEx = day.exercises[prevExIdx];
        setGuidedStepIndex(prevExIdx);
        setGuidedSetIndex(prevEx.sets - 1);
        setupStepTimer('resistance', prevExIdx, prevEx.sets - 1, activePlan);
      } else {
        // Go back to warm-up if exists
        if (day.warmUp && day.warmUp.length > 0) {
          setGuidedStep('warmup');
          const lastWarmIdx = day.warmUp.length - 1;
          setGuidedStepIndex(lastWarmIdx);
          setupStepTimer('warmup', lastWarmIdx, 0, activePlan);
        }
      }
    } else if (guidedStep === 'cardio') {
      setGuidedStep('resistance');
      const lastExIdx = day.exercises.length - 1;
      const lastEx = day.exercises[lastExIdx];
      setGuidedStepIndex(lastExIdx);
      setGuidedSetIndex(lastEx.sets - 1);
      setupStepTimer('resistance', lastExIdx, lastEx.sets - 1, activePlan);
    } else if (guidedStep === 'cooldown') {
      if (guidedStepIndex > 0) {
        const prevIdx = guidedStepIndex - 1;
        setGuidedStepIndex(prevIdx);
        setupStepTimer('cooldown', prevIdx, 0, activePlan);
      } else if (day.cardio) {
        setGuidedStep('cardio');
        setGuidedStepIndex(0);
        setupStepTimer('cardio', 0, 0, activePlan);
      } else {
        setGuidedStep('resistance');
        const lastExIdx = day.exercises.length - 1;
        const lastEx = day.exercises[lastExIdx];
        setGuidedStepIndex(lastExIdx);
        setGuidedSetIndex(lastEx.sets - 1);
        setupStepTimer('resistance', lastExIdx, lastEx.sets - 1, activePlan);
      }
    }
  };

  // Timer tick effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isGuidedActive) {
      interval = setInterval(() => {
        if (guidedStep !== 'complete') {
          setTotalElapsedTime(prev => prev + 1);
        }

        if (isTimerRunning && timeLeft > 0) {
          setTimeLeft(prev => {
            if (prev <= 1) {
              setIsTimerRunning(false);
              setTimeout(() => handleTimerEnd(), 0);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGuidedActive, isTimerRunning, timeLeft, guidedStep, guidedStepIndex, guidedSetIndex, isResting]);

  // Log Guided Completion
  const logGuidedCompletion = () => {
    if (!activePlan) return;
    const day = activePlan.schedule[activeTabDay];
    if (!day) return;
    
    const completionDate = new Date().toISOString().split('T')[0];
    addWorkoutCompletion({
      date: completionDate,
      planId: activePlan.id,
      dayIndex: activeTabDay,
      workoutName: day.workoutName,
      notes: `Guided Workout of Week ${selectedWorkoutWeek} Day ${activeTabDay + 1} completed! Spent ${Math.round(totalElapsedTime / 60)} minutes. Exercises completed: ${day.exercises.length}. Total Sets Completed: ${totalCompletedSets}.`
    });
    
    setIsGuidedActive(false);
    alert(`Logged completion for Week ${selectedWorkoutWeek} ${day.dayName}! Awesome job staying on track!`);
  };

  const loadPlans = () => {
    const list = getSavedPlans();
    setPlans(list);
    
    // Select first plan by default if none selected or if previously selected is missing
    const keys = Object.keys(list);
    if (keys.length > 0 && (!selectedPlanId || !list[selectedPlanId])) {
      setSelectedPlanId(keys[0]);
      setSelectedVersionNum(list[keys[0]].currentVersion);
      setActiveTabDay(0);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  // Selected Plan history object
  const activeHistory = selectedPlanId ? plans[selectedPlanId] : null;
  
  // Active plan version object being viewed
  const activePlan: WorkoutPlan | null = React.useMemo(() => {
    if (!activeHistory) return null;
    const versionNum = selectedVersionNum || activeHistory.currentVersion;
    const versionObj = activeHistory.versions.find(v => v.version === versionNum);
    return versionObj ? versionObj.plan : (activeHistory.versions[activeHistory.versions.length - 1]?.plan || null);
  }, [activeHistory, selectedVersionNum]);

  // Current selected week's periodized mesocycle schedule data
  const currentWeekData = React.useMemo(() => {
    if (!activePlan) return null;
    return getScheduleForWeek(activePlan, selectedWorkoutWeek);
  }, [activePlan, selectedWorkoutWeek]);

  const currentSchedule = currentWeekData?.schedule || activePlan?.schedule || [];

  const handleRename = () => {
    if (selectedPlanId && renameValue.trim()) {
      renamePlan(selectedPlanId, renameValue.trim());
      setIsRenaming(false);
      loadPlans();
    }
  };

  const handleDuplicate = () => {
    if (selectedPlanId) {
      const newId = duplicatePlan(selectedPlanId);
      if (newId) {
        setSelectedPlanId(newId);
        setSelectedVersionNum(1);
        setActiveTabDay(0);
        loadPlans();
      }
    }
  };

  const handleDelete = () => {
    if (selectedPlanId) {
      setShowPlanDeleteConfirm(true);
    }
  };

  const confirmDeletePlan = () => {
    if (selectedPlanId) {
      deletePlan(selectedPlanId);
      setSelectedPlanId(null);
      setSelectedVersionNum(null);
      setShowPlanDeleteConfirm(false);
      loadPlans();
    }
  };

  const handleVersionRestore = (vNum: number) => {
    if (selectedPlanId) {
      restorePlanVersion(selectedPlanId, vNum);
      setSelectedVersionNum(vNum);
      loadPlans();
    }
  };

  const handleVersionDelete = (vNum: number) => {
    if (selectedPlanId) {
      setShowVersionDeleteConfirm(vNum);
    }
  };

  const confirmDeleteVersion = () => {
    if (selectedPlanId && showVersionDeleteConfirm !== null) {
      deletePlanVersion(selectedPlanId, showVersionDeleteConfirm);
      setShowVersionDeleteConfirm(null);
      setSelectedVersionNum(null);
      loadPlans();
    }
  };

  // Check off daily workout
  const handleCompleteWorkout = (dayIndex: number, workoutName: string) => {
    if (!activePlan) return;
    const completionDate = new Date().toISOString().split('T')[0];
    addWorkoutCompletion({
      date: completionDate,
      planId: activePlan.id,
      dayIndex,
      workoutName,
      notes: "Completed via My Plans page checklist!"
    });
    alert(`Logged completion of "${workoutName}" for ${completionDate}! Great work!`);
  };

  // Swap exercise in the live plan and save as a new version
  const handleSwapExercise = (dayIdx: number, exerciseIdx: number, currentExId: string, altExId: string) => {
    if (!activePlan) return;

    const altExDetail = EXERCISE_DATABASE.find(e => e.id === altExId);
    if (!altExDetail) return;

    const updatedPlan: WorkoutPlan = JSON.parse(JSON.stringify(activePlan));
    
    // Ensure weeklySchedules exists for all duration weeks
    const totalWeeks = (updatedPlan.durationMonths || 1) * 4;
    if (!updatedPlan.weeklySchedules || updatedPlan.weeklySchedules.length < totalWeeks) {
      updatedPlan.weeklySchedules = [];
      const usedMap = new Map<string, number>();
      for (let w = 1; w <= totalWeeks; w++) {
        updatedPlan.weeklySchedules.push(generateSingleWeekSchedule(updatedPlan.userProfile, w, usedMap));
      }
    }

    const weekSchedule = updatedPlan.weeklySchedules[selectedWorkoutWeek - 1];
    if (weekSchedule && weekSchedule.schedule[dayIdx]) {
      const targetEx = weekSchedule.schedule[dayIdx].exercises[exerciseIdx];
      let goal = updatedPlan.userProfile?.goals?.[0] || "General Fitness";
      let reps = altExDetail.repRangeByGoal[goal] || "10-12";
      let rest = altExDetail.restSecondsByGoal[goal] || 60;

      const previousAlternatives = targetEx.alternativeIds || [];
      const combinedAlternatives = Array.from(new Set([
        currentExId,
        ...previousAlternatives,
        ...(altExDetail.alternatives || [])
      ])).filter(id => id !== altExId);

      weekSchedule.schedule[dayIdx].exercises[exerciseIdx] = {
        exerciseId: altExId,
        name: altExDetail.name,
        sets: targetEx.sets,
        reps,
        restSeconds: rest,
        instructions: altExDetail.instructions,
        formTips: altExDetail.formTips,
        alternativeIds: combinedAlternatives,
        primaryMuscles: altExDetail.primaryMuscles,
        notes: `Swapped in-place from "${targetEx.name}"`
      };

      if (selectedWorkoutWeek === 1) {
        updatedPlan.schedule[dayIdx].exercises[exerciseIdx] = weekSchedule.schedule[dayIdx].exercises[exerciseIdx];
      }
    } else {
      const targetEx = updatedPlan.schedule[dayIdx].exercises[exerciseIdx];
      let goal = updatedPlan.userProfile?.goals?.[0] || "General Fitness";
      let reps = altExDetail.repRangeByGoal[goal] || "10-12";
      let rest = altExDetail.restSecondsByGoal[goal] || 60;

      const previousAlternatives = targetEx.alternativeIds || [];
      const combinedAlternatives = Array.from(new Set([
        currentExId,
        ...previousAlternatives,
        ...(altExDetail.alternatives || [])
      ])).filter(id => id !== altExId);

      updatedPlan.schedule[dayIdx].exercises[exerciseIdx] = {
        exerciseId: altExId,
        name: altExDetail.name,
        sets: targetEx.sets,
        reps,
        restSeconds: rest,
        instructions: altExDetail.instructions,
        formTips: altExDetail.formTips,
        alternativeIds: combinedAlternatives,
        primaryMuscles: altExDetail.primaryMuscles,
        notes: `Swapped in-place from "${targetEx.name}"`
      };
    }

    saveWorkoutPlan(updatedPlan);

    // Refresh plans list and set selected version to newly incremented version
    const updatedPlansDict = getSavedPlans();
    setPlans(updatedPlansDict);
    const updatedHistory = updatedPlansDict[activePlan.id];
    if (updatedHistory) {
      setSelectedVersionNum(updatedHistory.currentVersion);
    }
  };

  // Export Plan to JSON file
  const handleExportJSON = () => {
    if (!activePlan) return;
    const dataStr = JSON.stringify(activePlan, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${activePlan.name.toLowerCase().replace(/\s+/g, '_')}_backup.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Import Backup JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const importedPlan = JSON.parse(event.target?.result as string) as WorkoutPlan;
        if (importedPlan.id && importedPlan.name && importedPlan.schedule) {
          // Wrap in a new SavedPlanHistory structure or save directly
          const history: SavedPlanHistory = {
            id: importedPlan.id,
            name: importedPlan.name,
            currentVersion: importedPlan.version || 1,
            versions: [
              {
                version: importedPlan.version || 1,
                createdDate: importedPlan.createdDate || new Date().toLocaleDateString(),
                plan: importedPlan
              }
            ]
          };
          savePlanHistory(history);
          loadPlans();
          setSelectedPlanId(importedPlan.id);
          setSelectedVersionNum(importedPlan.version || 1);
          alert("Workout plan restored successfully from file!");
        } else {
          alert("Invalid workout plan format.");
        }
      } catch (err) {
        alert("Failed to read JSON backup file.");
      }
    };
    fileReader.readAsText(file);
  };

  // Triggers print view (excellent clean printout formatting via standard CSS)
  const handlePrintPDF = () => {
    if (!activePlan) {
      alert("No active plan selected to export.");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let y = 15;
      const margin = 15;
      const pageWidth = 210;
      const pageHeight = 297;
      const contentWidth = pageWidth - (margin * 2);

      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
          drawFooter();
        }
      };

      const drawFooter = () => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`SmartWorkout Plan — Generated on ${new Date().toLocaleDateString()}`, margin, pageHeight - 8);
        doc.text(`Page ${pageCount}`, pageWidth - margin - 10, pageHeight - 8);
      };

      // 1. Cover / Title Banner
      doc.setFillColor(17, 17, 17);
      doc.rect(margin, y, contentWidth, 35, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text("SMARTWORKOUT", margin + 8, y + 15);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(197, 255, 74); // neon yellow accent
      doc.text("PREMIUM PERSONALIZED TRAINING REGIMEN", margin + 8, y + 25);
      
      y += 45;

      // Plan Name
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(17, 17, 17);
      doc.text(activePlan.name, margin, y);
      y += 6;
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Version: v${activePlan.version} | Generated: ${activePlan.createdDate}`, margin, y);
      y += 12;

      // Profile details
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y, contentWidth, 35, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.rect(margin, y, contentWidth, 35, 'S');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(17, 17, 17);
      doc.text("TRAINEE PROFILE", margin + 5, y + 7);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      
      const prof = activePlan.userProfile;
      const row1 = `Goals: ${prof.goals?.join(', ') || 'General'}  |  Experience: ${prof.experienceLevel}  |  Environment: ${prof.environment}`;
      const row2 = `Age: ${prof.age}  |  Gender: ${prof.gender}  |  Height: ${prof.height}cm  |  Weight: ${prof.weight}kg`;
      const row3 = `Equipment: ${prof.equipment?.join(', ') || 'Bodyweight only'}`;
      
      doc.text(row1, margin + 5, y + 15);
      doc.text(row2, margin + 5, y + 22);
      
      const splitEquipment = doc.splitTextToSize(row3, contentWidth - 10);
      doc.text(splitEquipment, margin + 5, y + 29);
      
      y += 45;

      // Nutrition Estimates
      const nutr = activePlan.nutritionEstimates;
      if (nutr) {
        doc.setFillColor(240, 247, 235);
        doc.rect(margin, y, contentWidth, 22, 'F');
        doc.setDrawColor(180, 210, 170);
        doc.rect(margin, y, contentWidth, 22, 'S');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(40, 80, 40);
        doc.text("DAILY NUTRITIONAL RECOMMENDATIONS", margin + 5, y + 6);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(50, 70, 50);
        doc.text(`Maintenance: ${Math.round(nutr.maintenanceCalories)} kcal  |  Fat Loss: ${Math.round(nutr.fatLossCalories)} kcal  |  Muscle Gain: ${Math.round(nutr.muscleGainCalories)} kcal`, margin + 5, y + 12);
        doc.text(`Protein Target: ${nutr.proteinGrams}g  |  Hydration Target: ${nutr.waterLiters}L/day  |  Estimated BMI: ${nutr.bmi?.toFixed(1)} (${nutr.weightCategory})`, margin + 5, y + 18);
        
        y += 30;
      }

      // Schedule / Workouts
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(17, 17, 17);
      doc.text("WEEKLY WORKOUT SCHEDULE", margin, y);
      doc.setDrawColor(17, 17, 17);
      doc.setLineWidth(0.5);
      doc.line(margin, y + 2, margin + 80, y + 2);
      y += 10;

      activePlan.schedule.forEach((day) => {
        checkPageBreak(50);
        
        // Day Header
        doc.setFillColor(17, 17, 17);
        doc.rect(margin, y, contentWidth, 8, 'F');
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(`${day.dayName.toUpperCase()} — ${day.workoutName}`, margin + 4, y + 5.5);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(`Focus: ${day.focus}`, margin + contentWidth - 45, y + 5.5);
        
        y += 13;

        // Warm-up
        if (day.warmUp && day.warmUp.length > 0) {
          checkPageBreak(15);
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text("WARM-UP ROUTINE:", margin, y);
          y += 4.5;
          
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);
          
          day.warmUp.forEach(wu => {
            checkPageBreak(8);
            const lineText = `• ${wu.name} (${wu.duration || wu.reps || '1 min'}) - ${wu.description}`;
            const splitLine = doc.splitTextToSize(lineText, contentWidth - 8);
            doc.text(splitLine, margin + 4, y);
            y += (splitLine.length * 4) + 1;
          });
          y += 2;
        }

        // Exercises
        if (day.exercises && day.exercises.length > 0) {
          checkPageBreak(15);
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(17, 17, 17);
          doc.text("CORE EXERCISES:", margin, y);
          y += 5;

          day.exercises.forEach((ex, exIdx) => {
            checkPageBreak(25);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.setTextColor(17, 17, 17);
            doc.text(`${exIdx + 1}. ${ex.name}`, margin + 2, y);
            
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(110, 120, 40);
            doc.text(`[ ${ex.sets} sets x ${ex.reps}  |  Rest: ${ex.restSeconds}s ]`, margin + contentWidth - 65, y);
            y += 4.5;

            // Instructions
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(80, 80, 80);
            
            const stepsStr = ex.instructions?.join(' ') || '';
            const splitSteps = doc.splitTextToSize(stepsStr, contentWidth - 8);
            doc.text(splitSteps, margin + 4, y);
            y += (splitSteps.length * 4) + 1.5;

            // Form Tip
            if (ex.formTips && ex.formTips.length > 0) {
              checkPageBreak(8);
              doc.setFont('Helvetica', 'italic');
              doc.setFontSize(7.5);
              doc.setTextColor(120, 120, 120);
              const tipText = `Tip: ${ex.formTips[0]}`;
              const splitTip = doc.splitTextToSize(tipText, contentWidth - 8);
              doc.text(splitTip, margin + 4, y);
              y += (splitTip.length * 3.8) + 1.5;
            }
            y += 1.5;
          });
        }

        // Cardio
        if (day.cardio) {
          checkPageBreak(15);
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(`CARDIO SEGMENT:`, margin, y);
          y += 4.5;
          
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);
          const cardioLine = `• ${day.cardio.type} - Duration: ${day.cardio.duration} mins | Intensity: ${day.cardio.intensity} | Notes: ${day.cardio.notes || 'Steady pace'}`;
          const splitCardio = doc.splitTextToSize(cardioLine, contentWidth - 8);
          doc.text(splitCardio, margin + 4, y);
          y += (splitCardio.length * 4) + 2;
        }

        // Cool-down
        if (day.coolDown && day.coolDown.length > 0) {
          checkPageBreak(15);
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text("COOL-DOWN & MOBILITY STRETCHES:", margin, y);
          y += 4.5;
          
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);
          
          day.coolDown.forEach(cd => {
            checkPageBreak(8);
            const lineText = `• ${cd.name} (${cd.duration || cd.reps || '1 min'}) - ${cd.description}`;
            const splitLine = doc.splitTextToSize(lineText, contentWidth - 8);
            doc.text(splitLine, margin + 4, y);
            y += (splitLine.length * 4) + 1;
          });
          y += 2;
        }

        // Notes
        if (day.progressionNotes) {
          checkPageBreak(12);
          doc.setFont('Helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(110, 110, 110);
          const noteText = `Progression Guidance: ${day.progressionNotes}`;
          const splitNotes = doc.splitTextToSize(noteText, contentWidth - 4);
          doc.text(splitNotes, margin + 2, y);
          y += (splitNotes.length * 4) + 3;
        }
        
        y += 6;
      });

      drawFooter();

      // Save
      const safeName = activePlan.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      doc.save(`${safeName}_workout_plan.pdf`);
    } catch (e) {
      console.error("PDF generation failed:", e);
      alert("An error occurred while generating your PDF. Standard window printing will be opened as a backup.");
      window.print();
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-1 sm:p-4 space-y-8 print:p-0">
      {/* Title & Import Backup Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="space-y-1">
          <h1 className="text-3xl font-light tracking-tight text-[#FAF9F6] font-serif">
            My Workout Plans
          </h1>
          <p className="text-[#FAF9F6]/60 text-sm font-serif">
            Manage your on-device plans, switch between backup versions, or restore backup JSON files.
          </p>
        </div>

        {/* Restore Backup Trigger */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportJSON}
            accept=".json"
            className="hidden"
          />
          <button
            id="btn-import-plan"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#111111] hover:bg-[#161616] border border-[#2A2A2A] text-xs font-bold font-mono uppercase tracking-wider text-[#FAF9F6] cursor-pointer transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import Backup
          </button>
        </div>
      </div>

      {/* Main Layout Split */}
      {Object.keys(plans).length === 0 ? (
        <div className="text-center py-16 px-4 bg-[#161616] border border-[#2A2A2A] rounded-none print:hidden space-y-4">
          <div className="h-14 w-14 bg-[#111111] text-[#C5FF4A] border border-[#2A2A2A] flex items-center justify-center mx-auto rounded-none">
            <Layers className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-light text-[#FAF9F6] font-serif">No Workout Plans Found</h3>
            <p className="text-[#FAF9F6]/60 text-sm max-w-md mx-auto font-serif">
              You haven't generated or saved any custom workout schedules yet. All schedules reside strictly inside your browser sandbox.
            </p>
          </div>
          <button
            id="btn-go-wizard"
            onClick={onNavigateToWizard}
            className="inline-flex items-center px-5 py-3 bg-[#C5FF4A] hover:bg-[#b0f530] text-[#111111] font-bold font-mono text-xs uppercase tracking-wider rounded-none cursor-pointer transition-all"
          >
            Create My First Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left: Saved Plans Rail */}
          <div className="lg:col-span-1 space-y-4 print:hidden" id="saved-plans-sidebar">
            <span className="text-xs font-bold text-[#FAF9F6]/40 uppercase tracking-widest block font-mono">Saved Schedules</span>
            <div className="space-y-2">
              {Object.keys(plans).map(id => {
                const hist = plans[id];
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setSelectedPlanId(id);
                      setSelectedVersionNum(hist.currentVersion);
                      setActiveTabDay(0);
                      setIsRenaming(false);
                    }}
                    className={`w-full text-left p-4 rounded-none border transition-all flex items-center justify-between group ${
                      selectedPlanId === id 
                        ? 'bg-[#C5FF4A] border-[#C5FF4A] text-[#111111] font-bold' 
                        : 'bg-[#111111] border-[#2A2A2A] text-[#FAF9F6] hover:border-[#FAF9F6]/30'
                    }`}
                  >
                    <div className="truncate space-y-1">
                      <p className="font-bold text-sm truncate font-serif">{hist.name}</p>
                      <p className={`text-[10px] font-mono ${selectedPlanId === id ? 'text-[#111111]/80' : 'text-[#FAF9F6]/50'}`}>
                        v{hist.currentVersion} • Updated {hist.versions[hist.versions.length - 1]?.createdDate}
                      </p>
                    </div>
                    <ChevronRight className={`h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity ${selectedPlanId === id ? 'text-[#111111]' : 'text-[#FAF9F6]/40'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Active Plan Viewer */}
          <div className="lg:col-span-3 space-y-6">
            {activePlan && activeHistory && (
              <div className="bg-[#161616] border border-[#2A2A2A] rounded-none shadow-none p-5 sm:p-6 space-y-6 print:border-none print:shadow-none print:p-0">
                
                {/* Plan Header & Operations */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-[#2A2A2A] print:pb-3">
                  <div className="space-y-1">
                    {isRenaming ? (
                      <div className="flex items-center gap-2">
                        <input
                          id="inp-rename-plan"
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="p-1.5 border border-[#2A2A2A] bg-[#111111] rounded-none text-sm font-bold text-[#FAF9F6] font-serif focus:outline-none focus:border-[#C5FF4A]"
                        />
                        <button onClick={handleRename} className="px-3 py-1.5 bg-[#C5FF4A] text-xs font-bold text-[#111111] rounded-none font-mono uppercase tracking-wider">Save</button>
                        <button onClick={() => setIsRenaming(false)} className="px-2.5 py-1.5 bg-[#111111] border border-[#2A2A2A] text-xs text-[#FAF9F6]/80 rounded-none font-mono uppercase tracking-wider">Cancel</button>
                      </div>
                    ) : (
                      <h2 className="text-2xl font-light text-[#FAF9F6] font-serif flex items-center gap-2">
                        {activePlan.name}
                        <button 
                          onClick={() => { setIsRenaming(true); setRenameValue(activePlan.name); }}
                          className="p-1 hover:bg-[#111111] text-[#FAF9F6]/40 hover:text-[#C5FF4A] rounded-none print:hidden cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </h2>
                    )}
                    <p className="text-xs text-[#FAF9F6]/50 font-serif">
                      Version v{activePlan.version} generated on {activePlan.createdDate} • Plan Duration: {activePlan.durationMonths} Months
                    </p>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-1.5 flex-wrap print:hidden">
                    <button
                      id="btn-duplicate-plan"
                      onClick={handleDuplicate}
                      className="p-2 bg-[#111111] hover:bg-[#161616] border border-[#2A2A2A] hover:border-[#C5FF4A] rounded-none text-[#FAF9F6]/80 hover:text-[#C5FF4A] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors font-mono uppercase tracking-wider"
                      title="Duplicate schedule"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Duplicate
                    </button>
                    <button
                      id="btn-delete-plan"
                      onClick={handleDelete}
                      className="p-2 bg-[#1a1111] hover:bg-[#251515] border border-red-900/30 text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors font-mono uppercase tracking-wider"
                      title="Delete schedule"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                    <button
                      id="btn-print-plan"
                      onClick={handlePrintPDF}
                      className="p-2 bg-[#111111] hover:bg-[#161616] border border-[#2A2A2A] text-[#FAF9F6]/80 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors font-mono uppercase tracking-wider"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Print
                    </button>
                    <button
                      id="btn-export-plan"
                      onClick={handleExportJSON}
                      className="p-2 bg-[#111111] hover:bg-[#161616] border border-[#2A2A2A] text-[#FAF9F6]/80 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors font-mono uppercase tracking-wider"
                      title="Download backup file"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export
                    </button>
                  </div>
                </div>

                {/* Plan Versioning History Selector */}
                <div className="bg-[#111111] p-4 border border-[#2A2A2A] rounded-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4.5 w-4.5 text-[#FAF9F6]/40" />
                    <span className="text-xs font-bold text-[#FAF9F6]/80 font-serif">Backup Version History:</span>
                    <select
                      id="sel-plan-version"
                      value={selectedVersionNum || activeHistory.currentVersion}
                      onChange={(e) => setSelectedVersionNum(parseInt(e.target.value))}
                      className="text-xs p-1 bg-[#161616] border border-[#2A2A2A] rounded-none text-[#FAF9F6] font-mono focus:outline-none focus:border-[#C5FF4A]"
                    >
                      {activeHistory.versions.map(v => (
                        <option key={v.version} value={v.version} className="bg-[#111111] text-[#FAF9F6]">v{v.version} ({v.createdDate})</option>
                      ))}
                    </select>
                  </div>

                  {/* Version Specific Actions */}
                  {selectedVersionNum && selectedVersionNum !== activeHistory.currentVersion && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVersionRestore(selectedVersionNum)}
                        className="px-2.5 py-1 bg-[#161616] border border-[#2A2A2A] text-[#C5FF4A] text-[11px] font-bold rounded-none hover:bg-[#1c1c1c] transition-colors cursor-pointer flex items-center gap-1 font-mono uppercase tracking-wider"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Restore as Current
                      </button>
                      <button
                        onClick={() => handleVersionDelete(selectedVersionNum)}
                        className="px-2 py-1 bg-[#1a1111] border border-red-900/30 text-rose-400 text-[11px] font-bold rounded-none hover:bg-[#251515] transition-colors cursor-pointer font-mono uppercase tracking-wider"
                      >
                        Delete v{selectedVersionNum}
                      </button>
                    </div>
                  )}
                </div>

                {/* Warnings Alert Box */}
                {activePlan.warnings.length > 0 && (
                  <div className="bg-[#1a1111] rounded-none border border-red-950 p-4 space-y-2 print:hidden" id="plan-warnings-alert">
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                      <AlertTriangle className="h-4 w-4" />
                      Plan Validation Warnings
                    </span>
                    <ul className="list-disc pl-5 text-xs text-[#FAF9F6]/80 space-y-1 font-serif">
                      {activePlan.warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                    </ul>
                  </div>
                )}

                {/* Nutrition Estimator Block */}
                <div className="bg-[#111111] rounded-none border border-[#2A2A2A] p-5 space-y-4">
                  <span className="text-xs font-bold text-[#FAF9F6]/40 uppercase tracking-widest block font-mono">Non-Medical Calorie & Health Estimations</span>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-[#161616] p-3.5 border border-[#2A2A2A] rounded-none">
                      <span className="text-[10px] text-[#FAF9F6]/50 font-bold block uppercase tracking-wider font-mono">Estimated BMI</span>
                      <strong className="text-lg text-[#FAF9F6] font-serif">{activePlan.nutritionEstimates.bmi}</strong>
                      <span className="text-[10px] block text-[#FAF9F6]/60 font-serif">({activePlan.nutritionEstimates.weightCategory})</span>
                    </div>

                    <div className="bg-[#161616] p-3.5 border border-[#2A2A2A] rounded-none">
                      <span className="text-[10px] text-[#FAF9F6]/50 font-bold block uppercase tracking-wider font-mono">Maintenance</span>
                      <strong className="text-lg text-[#C5FF4A] font-serif">{activePlan.nutritionEstimates.maintenanceCalories}</strong>
                      <span className="text-[10px] block text-[#FAF9F6]/60 font-serif">kcal / day</span>
                    </div>

                    <div className="bg-[#161616] p-3.5 border border-[#2A2A2A] rounded-none">
                      <span className="text-[10px] text-[#FAF9F6]/50 font-bold block uppercase tracking-wider font-mono">Daily Protein</span>
                      <strong className="text-lg text-[#C5FF4A] font-serif">{activePlan.nutritionEstimates.proteinGrams}g</strong>
                      <span className="text-[10px] block text-[#FAF9F6]/60 font-serif">essential target</span>
                    </div>

                    <div className="bg-[#161616] p-3.5 border border-[#2A2A2A] rounded-none">
                      <span className="text-[10px] text-[#FAF9F6]/50 font-bold block uppercase tracking-wider font-mono">Daily Hydration</span>
                      <strong className="text-lg text-[#C5FF4A] font-serif">{activePlan.nutritionEstimates.waterLiters}L</strong>
                      <span className="text-[10px] block text-[#FAF9F6]/60 font-serif">water target</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-[#FAF9F6]/40 leading-relaxed text-center font-serif">
                    *Estimates are calculated using standard mathematical formulas. They do not constitute professional metabolic advice. Consult a healthcare practitioner for bespoke nutrition planning.
                  </p>
                </div>

                {/* Week & Day Selector */}
                <div className="bg-[#111111] p-4 border border-[#2A2A2A] rounded-none flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden" id="plan-week-day-selectors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#FAF9F6]/40 uppercase tracking-wider font-mono">Current Week:</span>
                    <select
                      id="sel-workout-week"
                      value={selectedWorkoutWeek}
                      onChange={(e) => {
                        const newWeek = parseInt(e.target.value);
                        setSelectedWorkoutWeek(newWeek);
                        setActiveTabDay(0); // Automatically show default Week Day 1 for selected week
                      }}
                      className="text-xs px-3 py-1.5 bg-[#161616] border border-[#2A2A2A] rounded-none text-[#C5FF4A] font-mono font-bold focus:outline-none focus:border-[#C5FF4A] cursor-pointer"
                    >
                      {Array.from({ length: (activePlan.durationMonths || 1) * 4 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>Week {i + 1}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    <span className="text-xs font-bold text-[#FAF9F6]/40 uppercase tracking-wider font-mono mr-2">Target Day:</span>
                    <div className="flex items-center gap-1.5">
                      {currentSchedule.map((day, dIdx) => (
                        <button
                          key={dIdx}
                          onClick={() => setActiveTabDay(dIdx)}
                          className={`px-3 py-1.5 rounded-none text-[11px] font-bold font-mono uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer border ${
                            activeTabDay === dIdx
                              ? 'bg-[#C5FF4A] text-[#111111] border-[#C5FF4A]'
                              : 'text-[#FAF9F6]/60 hover:bg-[#161616] hover:text-[#FAF9F6] border-[#2A2A2A]'
                          }`}
                        >
                          Day {dIdx + 1}: {day.dayName.split(' ')[0]} ({day.focus})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mesocycle Phase Info Banner */}
                {currentWeekData && (
                  <div className="bg-[#111111] p-4 border border-[#2A2A2A] rounded-none space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-[#C5FF4A] text-[#111111] text-[10px] font-mono font-bold uppercase tracking-wider">
                        Systematic Mesocycle
                      </span>
                      <h4 className="text-sm font-bold text-[#FAF9F6] font-serif">
                        {currentWeekData.phaseName}
                      </h4>
                    </div>
                    <p className="text-xs text-[#FAF9F6]/70 font-serif pt-1 leading-relaxed">
                      {currentWeekData.phaseDescription}
                    </p>
                  </div>
                )}

                {/* Active Day Content */}
                {currentSchedule[activeTabDay] && (
                  <div className="space-y-6 print:space-y-8" id="active-day-workout-view">
                    
                    {/* Day Meta Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#2A2A2A]">
                      <div className="space-y-1">
                        <h3 className="text-lg font-light text-[#FAF9F6] font-serif print:text-xl">
                          Week {selectedWorkoutWeek} • Day {activeTabDay + 1}: {currentSchedule[activeTabDay].dayName} - {currentSchedule[activeTabDay].workoutName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 bg-[#111111] border border-[#2A2A2A] text-[10px] font-mono font-bold text-[#C5FF4A]">
                            🗓️ Week {selectedWorkoutWeek} of {(activePlan.durationMonths || 1) * 4}
                          </span>
                          <span className="px-2 py-0.5 bg-[#111111] border border-[#2A2A2A] text-[10px] font-mono font-bold text-[#C5FF4A]">
                            ⏱️ Est. Duration: ~{currentSchedule[activeTabDay].estimatedDurationMinutes || 60} Mins
                          </span>
                          {currentSchedule[activeTabDay].armFocus && (
                            <span className="px-2 py-0.5 bg-[#111111] border border-[#2A2A2A] text-[10px] font-mono font-bold text-[#FAF9F6]/80">
                              💪 {currentSchedule[activeTabDay].armFocus}
                            </span>
                          )}
                          <span className="text-xs text-[#FAF9F6]/50 font-serif">
                            Split Focus: {currentSchedule[activeTabDay].focus}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 print:hidden">
                        <button
                          onClick={handleStartGuidedSession}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FAF9F6] hover:bg-[#FAF9F6]/90 text-[#111111] text-xs font-bold rounded-none cursor-pointer transition-colors font-mono uppercase tracking-wider"
                        >
                          <Play className="h-4 w-4" />
                          Start Guided Coach
                        </button>

                        {/* session checklist completion trigger */}
                        <button
                          onClick={() => handleCompleteWorkout(activeTabDay, currentSchedule[activeTabDay].workoutName)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C5FF4A] hover:bg-[#b0f530] text-[#111111] text-xs font-bold rounded-none cursor-pointer transition-colors font-mono uppercase tracking-wider"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Log Finished Workout
                        </button>
                      </div>
                    </div>

                    {/* Warm-Up block */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold text-[#FAF9F6]/40 uppercase tracking-wider block font-mono">Warm-up Sequence</span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {currentSchedule[activeTabDay].warmUp.map((wStep, idx) => (
                          <div key={idx} className="bg-[#111111] p-3 border border-[#2A2A2A] rounded-none">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="font-bold text-xs text-[#FAF9F6]/90 font-serif">{wStep.name}</span>
                              <span className="px-2 py-0.5 bg-[#161616] border border-[#2A2A2A] rounded-none text-[9px] font-mono font-bold text-[#C5FF4A]">
                                {wStep.duration || wStep.reps}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#FAF9F6]/60 leading-relaxed font-serif">{wStep.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Resistance Exercises Block */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold text-[#FAF9F6]/40 uppercase tracking-wider block font-mono">Resistance Exercise Session</span>
                      
                      <div className="space-y-4">
                        {currentSchedule[activeTabDay].exercises.map((ex: WorkoutExercise, exIdx: number) => (
                          <div key={exIdx} className="bg-[#111111] border border-[#2A2A2A] p-4 rounded-none space-y-4">
                            
                            {/* Exercise stats */}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="space-y-1">
                                <h4 className="font-light text-sm text-[#FAF9F6] font-serif">{ex.name}</h4>
                                <div className="flex flex-wrap gap-1">
                                  {ex.primaryMuscles.map(m => (
                                    <span key={m} className="px-1.5 py-0.5 bg-[#161616] text-[#FAF9F6]/70 border border-[#2A2A2A] rounded-none text-[10px] font-mono">{m}</span>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="px-3 py-1.5 bg-[#161616] border border-[#2A2A2A] rounded-none text-xs font-bold text-[#C5FF4A] font-mono uppercase tracking-wider">
                                  Sets: {ex.sets}
                                </span>
                                <span className="px-3 py-1.5 bg-[#161616] border border-[#2A2A2A] rounded-none text-xs font-bold text-[#C5FF4A] font-mono uppercase tracking-wider">
                                  Reps: {ex.reps}
                                </span>
                                <span className="px-3 py-1.5 bg-[#161616] border border-[#2A2A2A] rounded-none text-xs font-bold text-[#C5FF4A] font-mono uppercase tracking-wider">
                                  Rest: {ex.restSeconds}s
                                </span>
                              </div>
                            </div>

                            {/* Instructions, Guidance & Visual Coach */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              {/* Left: Reference Visual Coach / Gif / Video */}
                              <div className="space-y-1">
                                <span className="font-bold text-[#FAF9F6]/40 block uppercase text-[10px] tracking-wider font-mono">Form Reference</span>
                                {(() => {
                                  const dbEx = EXERCISE_DATABASE.find(e => e.id === ex.exerciseId);
                                  const category = dbEx?.category || "Strength";
                                  const gifUrl = dbEx?.gifUrl;
                                  const images = dbEx?.images;
                                  return images || gifUrl ? (
                                    <div className="w-full h-36 border border-[#2A2A2A] overflow-hidden bg-[#111111] flex items-center justify-center">
                                      <AnimatedExerciseViewer 
                                        images={images}
                                        fallbackUrl={gifUrl}
                                        alt={ex.name}
                                        className="max-h-full max-w-full object-contain"
                                      />
                                    </div>
                                  ) : (
                                    <div className="h-36 overflow-hidden border border-[#2A2A2A] rounded-none">
                                      <ExerciseVisualCoach 
                                        exerciseName={ex.name} 
                                        category={category} 
                                        isResting={false} 
                                      />
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Middle: Step-by-Step Instructions */}
                              <div className="space-y-1">
                                <span className="font-bold text-[#FAF9F6]/40 block uppercase text-[10px] tracking-wider font-mono">Instructions</span>
                                <ul className="list-decimal pl-4 space-y-1 text-[#FAF9F6]/70 font-serif max-h-[140px] overflow-y-auto">
                                  {ex.instructions.map((inst, i) => <li key={i}>{inst}</li>)}
                                </ul>
                              </div>

                              {/* Right: Form Guidance */}
                              <div className="space-y-1 bg-[#161616] p-3 border border-[#2A2A2A] rounded-none">
                                <span className="font-bold text-[#FAF9F6]/40 block uppercase text-[10px] tracking-wider font-mono">Form Guidance</span>
                                <ul className="list-disc pl-4 space-y-1 text-[#FAF9F6]/70 font-serif max-h-[140px] overflow-y-auto">
                                  {ex.formTips.map((tip, i) => <li key={i}>{tip}</li>)}
                                </ul>
                              </div>
                            </div>

                            {/* Alternatives Swap Drawer */}
                            {ex.alternativeIds && ex.alternativeIds.length > 0 && (
                              <div className="pt-2 border-t border-[#2A2A2A] flex flex-col sm:flex-row sm:items-center gap-2 print:hidden">
                                <span className="text-[10px] font-bold text-[#FAF9F6]/40 uppercase tracking-wider flex items-center gap-1 font-mono">
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  Alternatives:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {ex.alternativeIds.map(altId => {
                                    const altExDetail = EXERCISE_DATABASE.find(e => e.id === altId);
                                    if (!altExDetail) return null;
                                    return (
                                      <button
                                        key={altId}
                                        onClick={() => handleSwapExercise(activeTabDay, exIdx, ex.exerciseId, altId)}
                                        className="px-2.5 py-1 bg-[#161616] hover:bg-[#1c1c1c] border border-[#2A2A2A] hover:border-[#C5FF4A] rounded-none text-[10px] font-mono text-[#FAF9F6]/80 hover:text-[#C5FF4A] cursor-pointer transition-colors"
                                      >
                                        {altExDetail.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cardio block if generated */}
                    {currentSchedule[activeTabDay].cardio && (
                      <div className="bg-[#10141a] rounded-none border border-blue-900/40 p-4 space-y-2">
                        <span className="text-xs font-bold text-[#C5FF4A] uppercase tracking-wider block font-mono">Recommended Cardio Session</span>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-sm">
                          <div>
                            <strong className="text-[#FAF9F6] font-serif">{currentSchedule[activeTabDay].cardio?.type} Cardio</strong>
                            <p className="text-xs text-[#FAF9F6]/70 font-serif">{currentSchedule[activeTabDay].cardio?.notes}</p>
                          </div>
                          <div className="bg-[#161616] border border-[#2A2A2A] px-3 py-1.5 rounded-none whitespace-nowrap self-start sm:self-center font-mono">
                            <span className="font-bold text-xs text-[#C5FF4A]">
                              Duration: {currentSchedule[activeTabDay].cardio?.duration} mins ({currentSchedule[activeTabDay].cardio?.intensity} Intensity)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cool-Down block */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold text-[#FAF9F6]/40 uppercase tracking-wider block font-mono">Cool-down Sequence</span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {currentSchedule[activeTabDay].coolDown.map((cStep, idx) => (
                          <div key={idx} className="bg-[#111111] p-3 border border-[#2A2A2A] rounded-none">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="font-bold text-xs text-[#FAF9F6]/90 font-serif">{cStep.name}</span>
                              <span className="px-2 py-0.5 bg-[#161616] border border-[#2A2A2A] rounded-none text-[9px] font-mono font-bold text-[#C5FF4A]">
                                {cStep.duration || cStep.reps}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#FAF9F6]/60 leading-relaxed font-serif">{cStep.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Day Progression advice block */}
                    <div className="bg-[#111111] p-4 border border-[#2A2A2A] rounded-none">
                      <span className="text-xs font-bold text-[#FAF9F6]/40 uppercase block tracking-wider mb-1 font-mono">Weekly Progression Strategy</span>
                      <p className="text-xs text-[#FAF9F6]/70 leading-relaxed font-serif">{currentSchedule[activeTabDay].progressionNotes}</p>
                    </div>

                  </div>
                )}

              </div>
            )}
          </div>

        </div>
      )}

      {/* Guided Exercise Coach Overlay Modal */}
      {isGuidedActive && activePlan && currentSchedule[activeTabDay] && (
        <div className="fixed inset-0 bg-[#000000]/95 backdrop-blur-md z-50 flex flex-col justify-between p-4 sm:p-6 overflow-y-auto" id="guided-coach-overlay">
          
          {/* Header */}
          <div className="border-b border-[#2A2A2A] pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-block px-2.5 py-0.5 bg-[#C5FF4A]/10 border border-[#C5FF4A]/30 text-[#C5FF4A] text-[10px] font-bold font-mono uppercase tracking-widest">
                  Week {selectedWorkoutWeek}
                </span>
                <span className="text-xs font-mono text-[#FAF9F6]/40 uppercase tracking-widest">
                  {currentSchedule[activeTabDay].dayName}
                </span>
              </div>
              <h2 className="text-xl font-light text-[#FAF9F6] font-serif">
                {currentSchedule[activeTabDay].workoutName}
              </h2>
            </div>

            <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-[#2A2A2A]">
              <div className="text-right font-mono">
                <span className="text-[10px] text-[#FAF9F6]/40 uppercase block">Total Elapsed</span>
                <span className="text-sm font-bold text-[#FAF9F6]">{formatTime(totalElapsedTime)}</span>
              </div>
              <div className="h-6 w-px bg-[#2A2A2A]"></div>
              <div className="text-right font-mono">
                <span className="text-[10px] text-[#FAF9F6]/40 uppercase block">Sets Logged</span>
                <span className="text-sm font-bold text-[#C5FF4A]">{totalCompletedSets} sets</span>
              </div>
              <div className="h-6 w-px bg-[#2A2A2A] mr-1"></div>
              <button
                onClick={() => {
                  setShowExitSessionConfirm(true);
                }}
                className="p-1.5 hover:bg-[#111111] border border-[#2A2A2A] hover:border-red-900 text-[#FAF9F6]/50 hover:text-red-400 cursor-pointer transition-colors"
                title="Exit Session"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Steps Timeline Navigation */}
          <div className="my-4 py-2 flex items-center justify-center overflow-x-auto gap-2 border-b border-[#2A2A2A]/40 pb-4 font-mono text-[10px] uppercase tracking-wider">
            <span className={`px-2.5 py-1 border transition-colors ${guidedStep === 'warmup' ? 'bg-[#C5FF4A] text-[#111111] border-[#C5FF4A]' : 'text-[#FAF9F6]/40 border-transparent'}`}>
              1. Warm-up
            </span>
            <ChevronRight className="h-3 w-3 text-[#FAF9F6]/20" />
            <span className={`px-2.5 py-1 border transition-colors ${guidedStep === 'resistance' && !isResting ? 'bg-[#C5FF4A] text-[#111111] border-[#C5FF4A]' : guidedStep === 'resistance' && isResting ? 'bg-[#C5FF4A]/25 text-[#C5FF4A] border-[#C5FF4A]/50 animate-pulse' : 'text-[#FAF9F6]/40 border-transparent'}`}>
              2. Resistance {guidedStep === 'resistance' ? `(${guidedStepIndex + 1}/${currentSchedule[activeTabDay].exercises.length})` : ''}
            </span>
            <ChevronRight className="h-3 w-3 text-[#FAF9F6]/20" />
            {currentSchedule[activeTabDay].cardio && (
              <>
                <span className={`px-2.5 py-1 border transition-colors ${guidedStep === 'cardio' ? 'bg-[#C5FF4A] text-[#111111] border-[#C5FF4A]' : 'text-[#FAF9F6]/40 border-transparent'}`}>
                  3. Cardio
                </span>
                <ChevronRight className="h-3 w-3 text-[#FAF9F6]/20" />
              </>
            )}
            <span className={`px-2.5 py-1 border transition-colors ${guidedStep === 'cooldown' ? 'bg-[#C5FF4A] text-[#111111] border-[#C5FF4A]' : 'text-[#FAF9F6]/40 border-transparent'}`}>
              {currentSchedule[activeTabDay].cardio ? '4. Cool-down' : '3. Cool-down'}
            </span>
          </div>

          {/* Immersive Center Layout */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 my-2 items-stretch" id="guided-immersive-panel">
            
            {/* LEFT COLUMN: VISUAL / PERFORMANCE CARD */}
            <div className="lg:col-span-5 flex flex-col justify-center bg-[#111111] border border-[#2A2A2A] p-5 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#2A2A2A_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>
              
              {guidedStep !== 'complete' ? (
                <div className="space-y-4 z-10 w-full">
                  <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-2">
                    <span className="text-xs font-bold text-[#C5FF4A] uppercase tracking-wider font-mono">
                      {isResting ? "Rest Recovery Window" : "Live Execution Form"}
                    </span>
                    {!isResting && (
                      <span className="text-[10px] text-[#FAF9F6]/40 font-mono">
                        Keep Movement Slow & Controlled
                      </span>
                    )}
                  </div>

                  {isResting ? (
                    <div className="w-full h-64 flex flex-col items-center justify-center relative bg-[#161616] border border-[#2A2A2A]">
                      <div className="w-24 h-24 rounded-full border-2 border-[#C5FF4A] flex items-center justify-center animate-ping absolute opacity-10"></div>
                      <div className="w-20 h-20 rounded-full border-4 border-[#C5FF4A] flex items-center justify-center relative bg-[#111111]">
                        <div className="w-10 h-10 rounded-full bg-[#C5FF4A]/10 flex items-center justify-center">
                          <Timer className="h-5 w-5 text-[#C5FF4A] animate-spin" style={{ animationDuration: '4s' }} />
                        </div>
                      </div>
                      <h4 className="text-[#C5FF4A] font-mono text-sm tracking-widest uppercase mt-4 animate-pulse">Recovery Rest Interval</h4>
                      <p className="text-xs text-[#FAF9F6]/50 text-center px-4 mt-2 font-serif">Inhale deeply through your nose, exhale slowly. Let your heart rate settle before your next set.</p>
                    </div>
                  ) : (
                    <div className="w-full border border-[#2A2A2A] bg-[#161616] overflow-hidden relative min-h-64 flex items-center justify-center">
                      {(() => {
                        const day = currentSchedule[activeTabDay];
                        if (guidedStep === 'resistance') {
                          const ex = day.exercises[guidedStepIndex];
                          const dbEx = EXERCISE_DATABASE.find(e => e.id === ex?.exerciseId);
                          const gifUrl = dbEx?.gifUrl;
                          const images = dbEx?.images;
                          if (images || gifUrl) {
                            return (
                              <AnimatedExerciseViewer 
                                images={images}
                                fallbackUrl={gifUrl}
                                alt={ex.name}
                                className="max-h-64 max-w-full object-contain"
                              />
                            );
                          }
                          return (
                            <ExerciseVisualCoach 
                              exerciseName={ex?.name || ''} 
                              category={dbEx?.category || 'Strength'} 
                              isResting={false} 
                            />
                          );
                        } else if (guidedStep === 'cardio') {
                          return (
                            <ExerciseVisualCoach 
                              exerciseName={day.cardio?.type || 'Cardio'} 
                              category="Cardio" 
                              isResting={false} 
                            />
                          );
                        } else {
                          // Warmup/Cooldown
                          const stepDetails = guidedStep === 'warmup' ? day.warmUp[guidedStepIndex] : day.coolDown[guidedStepIndex];
                          return (
                            <ExerciseVisualCoach 
                              exerciseName={stepDetails?.name || 'Stretch'} 
                              category="Stretch" 
                              isResting={false} 
                            />
                          );
                        }
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full flex flex-col items-center justify-center py-8 z-10 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#C5FF4A]/10 border border-[#C5FF4A]/40 flex items-center justify-center animate-bounce">
                    <Award className="h-8 w-8 text-[#C5FF4A]" />
                  </div>
                  <h3 className="text-xl font-light text-[#FAF9F6] font-serif text-center">Day Session Complete!</h3>
                  <p className="text-xs text-[#FAF9F6]/60 font-serif text-center max-w-sm">
                    You executed every sequence, tracked every set, and logged standard recovery limits today. Your body will thank you.
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: INTERACTIVE TIMER / ACTIONS & DETAILS */}
            <div className="lg:col-span-7 flex flex-col justify-between bg-[#161616] border border-[#2A2A2A] p-5">
              {guidedStep !== 'complete' ? (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  
                  {/* Phase Details & Instructions */}
                  <div className="space-y-4">
                    {(() => {
                      const day = currentSchedule[activeTabDay];
                      if (guidedStep === 'warmup') {
                        const wStep = day.warmUp[guidedStepIndex];
                        return (
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-[#FAF9F6]/40 uppercase tracking-widest block font-mono">Warm-up Movement ({guidedStepIndex + 1}/{day.warmUp.length})</span>
                            <h3 className="text-lg font-light text-[#FAF9F6] font-serif">{wStep?.name}</h3>
                            <div className="p-3 bg-[#111111] border border-[#2A2A2A] text-xs text-[#FAF9F6]/70 leading-relaxed font-serif">
                              {wStep?.description}
                            </div>
                            <div className="flex gap-2">
                              <span className="px-2.5 py-1 bg-[#111111] border border-[#2A2A2A] rounded-none text-xs text-[#C5FF4A] font-mono">
                                Target Duration: {wStep?.duration || wStep?.reps}
                              </span>
                            </div>
                          </div>
                        );
                      } else if (guidedStep === 'resistance') {
                        const ex = day.exercises[guidedStepIndex];
                        return (
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2 border-b border-[#2A2A2A] pb-2">
                              <div>
                                <span className="text-[10px] font-bold text-[#FAF9F6]/40 uppercase tracking-widest block font-mono">
                                  Exercise {guidedStepIndex + 1} of {day.exercises.length}
                                </span>
                                <h3 className="text-lg font-light text-[#FAF9F6] font-serif">{ex?.name}</h3>
                              </div>
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="px-2.5 py-1 bg-[#111111] border border-[#2A2A2A] text-xs text-[#C5FF4A] font-bold">
                                  Set {guidedSetIndex + 1} of {ex?.sets}
                                </span>
                                <span className="px-2.5 py-1 bg-[#111111] border border-[#2A2A2A] text-xs text-[#C5FF4A] font-bold">
                                  {ex?.reps} reps
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <span className="font-bold text-[#FAF9F6]/40 uppercase text-[9px] tracking-wider block font-mono">Instructions</span>
                                <ol className="list-decimal pl-4 text-[#FAF9F6]/75 font-serif space-y-1 max-h-[120px] overflow-y-auto">
                                  {ex?.instructions.map((inst, i) => <li key={i}>{inst}</li>)}
                                </ol>
                              </div>
                              <div className="space-y-1 bg-[#111111] p-2.5 border border-[#2A2A2A] rounded-none">
                                <span className="font-bold text-[#FAF9F6]/40 uppercase text-[9px] tracking-wider block font-mono">Form Guidance</span>
                                <ul className="list-disc pl-4 text-[#FAF9F6]/70 font-serif space-y-1 max-h-[120px] overflow-y-auto">
                                  {ex?.formTips.map((tip, i) => <li key={i}>{tip}</li>)}
                                </ul>
                              </div>
                            </div>
                          </div>
                        );
                      } else if (guidedStep === 'cardio') {
                        return (
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-[#FAF9F6]/40 uppercase tracking-widest block font-mono">Cardio Focus</span>
                            <h3 className="text-lg font-light text-[#FAF9F6] font-serif">{day.cardio?.type} Cardio</h3>
                            <div className="p-3 bg-[#111111] border border-[#2A2A2A] text-xs text-[#FAF9F6]/70 leading-relaxed font-serif">
                              {day.cardio?.notes}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                              <span className="p-2 bg-[#111111] border border-[#2A2A2A] rounded-none text-center">
                                Duration: {day.cardio?.duration} mins
                              </span>
                              <span className="p-2 bg-[#111111] border border-[#2A2A2A] rounded-none text-center text-[#C5FF4A]">
                                Intensity: {day.cardio?.intensity}
                              </span>
                            </div>
                          </div>
                        );
                      } else if (guidedStep === 'cooldown') {
                        const cStep = day.coolDown[guidedStepIndex];
                        return (
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-[#FAF9F6]/40 uppercase tracking-widest block font-mono">Cool-down Sequence ({guidedStepIndex + 1}/{day.coolDown.length})</span>
                            <h3 className="text-lg font-light text-[#FAF9F6] font-serif">{cStep?.name}</h3>
                            <div className="p-3 bg-[#111111] border border-[#2A2A2A] text-xs text-[#FAF9F6]/70 leading-relaxed font-serif">
                              {cStep?.description}
                            </div>
                            <div className="flex gap-2">
                              <span className="px-2.5 py-1 bg-[#111111] border border-[#2A2A2A] rounded-none text-xs text-[#C5FF4A] font-mono">
                                Target Duration: {cStep?.duration || cStep?.reps}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Gigantic Digital Countdown Timer */}
                  <div className="bg-[#111111] border border-[#2A2A2A] p-5 rounded-none space-y-3 font-mono text-center relative overflow-hidden">
                    <span className="text-[10px] text-[#FAF9F6]/40 uppercase tracking-widest block">
                      {isResting ? "Resting Countdown" : "Interval Timer"}
                    </span>
                    
                    {timeLeft > 0 ? (
                      <div className="text-4xl md:text-5xl font-bold tracking-tight text-[#FAF9F6] transition-all">
                        {formatTime(timeLeft)}
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-[#C5FF4A]/80 uppercase tracking-widest py-3">
                        {isResting ? "Rest Completed!" : "Complete Set/Movement!"}
                      </div>
                    )}

                    {/* Timer Adjusters & Play/Pause Controls */}
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => setTimeLeft(prev => prev + 30)}
                        className="px-2.5 py-1 bg-[#161616] hover:bg-[#1a1a1a] border border-[#2A2A2A] hover:border-[#C5FF4A]/40 text-[10px] text-[#FAF9F6]/60 hover:text-[#FAF9F6] cursor-pointer"
                        title="Add 30 Seconds"
                      >
                        +30s
                      </button>
                      
                      <button
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        className={`h-10 w-10 rounded-full flex items-center justify-center border text-[#111111] cursor-pointer transition-colors ${
                          isTimerRunning ? 'bg-amber-400 border-amber-400 hover:bg-amber-500' : 'bg-[#C5FF4A] border-[#C5FF4A] hover:bg-[#b0f530]'
                        }`}
                      >
                        {isTimerRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
                      </button>

                      <button
                        onClick={() => {
                          setIsTimerRunning(false);
                          setTimeLeft(0);
                        }}
                        className="px-2.5 py-1 bg-[#161616] hover:bg-[#1a1a1a] border border-[#2A2A2A] text-[10px] text-[#FAF9F6]/60 hover:text-red-400 cursor-pointer"
                        title="Reset Timer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Primary Stage Action Triggers */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#2A2A2A]/40">
                    <button
                      onClick={handlePrevGuidedStep}
                      className="flex-1 py-3 border border-[#2A2A2A] hover:border-[#C5FF4A]/40 text-[#FAF9F6]/60 hover:text-[#FAF9F6] text-xs font-bold uppercase tracking-wider font-mono transition-colors cursor-pointer"
                    >
                      ← Back Step
                    </button>

                    {isResting ? (
                      <button
                        onClick={() => {
                          setIsResting(false);
                          advanceResistanceSet();
                        }}
                        className="flex-1 py-3 bg-[#C5FF4A] hover:bg-[#b0f530] text-[#111111] text-xs font-bold uppercase tracking-wider font-mono transition-colors cursor-pointer"
                      >
                        Skip Rest Interval →
                      </button>
                    ) : (
                      <>
                        {guidedStep === 'resistance' ? (
                          <button
                            onClick={handleCompleteSet}
                            className="flex-1 py-3 bg-[#C5FF4A] hover:bg-[#b0f530] text-[#111111] text-xs font-bold uppercase tracking-wider font-mono transition-colors cursor-pointer shadow-lg"
                          >
                            Set Finished (Start Rest) ✓
                          </button>
                        ) : (
                          <button
                            onClick={handleNextGuidedStep}
                            className="flex-1 py-3 bg-[#C5FF4A] hover:bg-[#b0f530] text-[#111111] text-xs font-bold uppercase tracking-wider font-mono transition-colors cursor-pointer shadow-lg"
                          >
                            Next Step / Done →
                          </button>
                        )}
                      </>
                    )}
                  </div>

                </div>
              ) : (
                <div className="space-y-6 flex-1 flex flex-col justify-between py-6">
                  
                  {/* Summary Metrics List */}
                  <div className="space-y-4 text-center">
                    <span className="text-[10px] font-bold text-[#C5FF4A] uppercase tracking-widest block font-mono">Performance Summary Metrics</span>
                    <h2 className="text-2xl font-light text-[#FAF9F6] font-serif">Workout Log Details</h2>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-md mx-auto pt-4 font-mono text-xs">
                      <div className="bg-[#111111] p-3 border border-[#2A2A2A]">
                        <span className="text-[#FAF9F6]/40 uppercase text-[9px] block">Duration Spent</span>
                        <strong className="text-[#C5FF4A] text-lg font-bold">{Math.round(totalElapsedTime / 60)} mins</strong>
                      </div>
                      <div className="bg-[#111111] p-3 border border-[#2A2A2A]">
                        <span className="text-[#FAF9F6]/40 uppercase text-[9px] block">Sets Completed</span>
                        <strong className="text-[#C5FF4A] text-lg font-bold">{totalCompletedSets} sets</strong>
                      </div>
                      <div className="bg-[#111111] p-3 border border-[#2A2A2A] col-span-2 md:col-span-1">
                        <span className="text-[#FAF9F6]/40 uppercase text-[9px] block">Exercise Items</span>
                        <strong className="text-[#C5FF4A] text-lg font-bold">{activePlan.schedule[activeTabDay].exercises.length} movements</strong>
                      </div>
                    </div>
                  </div>

                  {/* Log Actions */}
                  <div className="space-y-3 pt-6 border-t border-[#2A2A2A]/40 max-w-md mx-auto w-full">
                    <button
                      onClick={logGuidedCompletion}
                      className="w-full py-3.5 bg-[#C5FF4A] hover:bg-[#b0f530] text-[#111111] text-xs font-bold uppercase tracking-wider font-mono transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Log Completion to History & Close
                    </button>
                    <button
                      onClick={() => setIsGuidedActive(false)}
                      className="w-full py-2.5 bg-[#111111] hover:bg-[#161616] border border-[#2A2A2A] text-xs font-bold uppercase tracking-wider font-mono text-[#FAF9F6]/60 hover:text-[#FAF9F6] transition-colors cursor-pointer"
                    >
                      Close Without Logging
                    </button>
                  </div>

                </div>
              )}
            </div>

          </div>

          {/* Footer Branding */}
          <div className="border-t border-[#2A2A2A] pt-4 mt-4 text-center font-mono text-[9px] text-[#FAF9F6]/30 uppercase tracking-widest flex flex-col sm:flex-row justify-between gap-2">
            <span>© SmartWorkout - Artificial Intelligence Fitness Systems</span>
            <span>Premium Performance Training Module</span>
          </div>

        </div>
      )}

      {/* 1. PLAN DELETE CONFIRMATION MODAL */}
      {showPlanDeleteConfirm && (
        <div className="fixed inset-0 bg-[#000000]/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] border border-[#2A2A2A] max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-950/40 border border-red-900 text-red-400">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-light text-[#FAF9F6] font-serif">Delete Workout Schedule?</h3>
                <p className="text-xs text-[#FAF9F6]/60 font-serif leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-[#FAF9F6]">{activeHistory?.name || 'this plan'}</strong>? All versions, progress links, and historical references for this schedule will be lost. This cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 font-mono text-xs uppercase tracking-wider">
              <button
                onClick={() => setShowPlanDeleteConfirm(false)}
                className="flex-1 py-2.5 border border-[#2A2A2A] text-[#FAF9F6]/60 hover:text-[#FAF9F6] hover:bg-[#1a1a1a] transition-all cursor-pointer"
              >
                No, Keep Plan
              </button>
              <button
                onClick={confirmDeletePlan}
                className="flex-1 py-2.5 bg-red-900/20 border border-red-700/50 hover:bg-red-900 hover:text-white text-red-200 transition-all cursor-pointer font-bold"
              >
                Yes, Delete Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. VERSION DELETE CONFIRMATION MODAL */}
      {showVersionDeleteConfirm !== null && (
        <div className="fixed inset-0 bg-[#000000]/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] border border-[#2A2A2A] max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-950/40 border border-red-900 text-red-400">
                <Layers className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-light text-[#FAF9F6] font-serif">Delete Plan Version?</h3>
                <p className="text-xs text-[#FAF9F6]/60 font-serif leading-relaxed">
                  Are you sure you want to delete version <strong className="text-[#FAF9F6]">v{showVersionDeleteConfirm}</strong>? This specific historical snapshot will be removed from your list of restore checkpoints.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 font-mono text-xs uppercase tracking-wider">
              <button
                onClick={() => setShowVersionDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-[#2A2A2A] text-[#FAF9F6]/60 hover:text-[#FAF9F6] hover:bg-[#1a1a1a] transition-all cursor-pointer"
              >
                No, Keep Version
              </button>
              <button
                onClick={confirmDeleteVersion}
                className="flex-1 py-2.5 bg-red-900/20 border border-red-700/50 hover:bg-red-900 hover:text-white text-red-200 transition-all cursor-pointer font-bold"
              >
                Yes, Delete Version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. EXIT GUIDED SESSION CONFIRMATION MODAL */}
      {showExitSessionConfirm && (
        <div className="fixed inset-0 bg-[#000000]/85 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] border border-[#2A2A2A] max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-950/40 border border-yellow-800 text-yellow-400">
                <ShieldAlert className="h-6 w-6 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-light text-[#FAF9F6] font-serif">Exit Guided Session?</h3>
                <p className="text-xs text-[#FAF9F6]/60 font-serif leading-relaxed">
                  Are you sure you want to exit your active personal training session? Your completed sets and elapsed duration for this workout will not be logged.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 font-mono text-xs uppercase tracking-wider">
              <button
                onClick={() => setShowExitSessionConfirm(false)}
                className="flex-1 py-2.5 border border-[#2A2A2A] text-[#FAF9F6]/60 hover:text-[#FAF9F6] hover:bg-[#1a1a1a] transition-all cursor-pointer"
              >
                No, Resume Training
              </button>
              <button
                onClick={() => {
                  setIsGuidedActive(false);
                  setShowExitSessionConfirm(false);
                }}
                className="flex-1 py-2.5 bg-yellow-900/20 border border-yellow-700/50 hover:bg-yellow-900 hover:text-white text-yellow-200 transition-all cursor-pointer font-bold"
              >
                Yes, Exit Session
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
