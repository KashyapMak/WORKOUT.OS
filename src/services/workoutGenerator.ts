import { 
  UserProfile, 
  WorkoutPlan, 
  WeeklySchedule,
  DailyWorkout, 
  WorkoutExercise, 
  ActivityStep, 
  CardioSession, 
  NutritionEstimates, 
  Exercise, 
  BodyArea, 
  Severity 
} from '../types/workout';
import { EXERCISE_DATABASE } from '../data/exercises';

// Check if user's equipment inventory can support the exercise
function hasRequiredEquipment(exercise: Exercise, userEquipment: string[]): boolean {
  if (exercise.equipment.length === 0) return true;
  
  // If user selected "Bodyweight only", and exercise requires specialized gear, return false
  if (userEquipment.includes("Bodyweight only") || userEquipment.length === 0) {
    return exercise.equipment.every(eq => eq.toLowerCase() === "bodyweight only" || eq.toLowerCase() === "yoga mat");
  }
  
  // Otherwise check if the user has AT LEAST one of the primary equipment items or all depending on configuration
  // For most exercises, they require specific equipment. We check if all required equipment is in the user's inventory
  return exercise.equipment.every(reqEq => 
    userEquipment.some(userEq => userEq.toLowerCase().trim() === reqEq.toLowerCase().trim()) ||
    reqEq.toLowerCase() === "bodyweight only" ||
    reqEq.toLowerCase() === "yoga mat"
  );
}

// Generate Nutrition & Health Estimates
export function calculateNutritionEstimates(profile: UserProfile): NutritionEstimates {
  const heightM = profile.height / 100;
  const bmi = profile.weight / (heightM * heightM);
  
  let weightCategory = "Normal Weight";
  if (bmi < 18.5) weightCategory = "Underweight";
  else if (bmi >= 25 && bmi < 29.9) weightCategory = "Overweight";
  else if (bmi >= 30) weightCategory = "Obese";
  
  // Harris-Benedict Equation for BMR
  let bmr = 0;
  if (profile.gender.toLowerCase() === 'male') {
    bmr = 88.362 + (13.397 * profile.weight) + (4.799 * profile.height) - (5.677 * profile.age);
  } else {
    bmr = 447.593 + (9.247 * profile.weight) + (3.098 * profile.height) - (4.330 * profile.age);
  }
  
  // Activity Multiplier based on frequency
  let multiplier = 1.2; // Sedentary
  if (profile.frequency <= 2) multiplier = 1.375; // Lightly active
  else if (profile.frequency <= 4) multiplier = 1.55; // Moderately active
  else multiplier = 1.725; // Very active
  
  const maintenanceCalories = Math.round(bmr * multiplier);
  
  // Targets based on main goal
  const isFatLoss = profile.goals.some(g => g.includes("Fat") || g.includes("Weight"));
  const isMuscleGain = profile.goals.some(g => g.includes("Muscle") || g.includes("Strength"));
  
  const fatLossCalories = Math.round(maintenanceCalories - 500);
  const muscleGainCalories = Math.round(maintenanceCalories + 300);
  
  // Protein: 1.6g to 2.2g per kg
  let proteinFactor = 1.8;
  if (isMuscleGain) proteinFactor = 2.0;
  else if (isFatLoss) proteinFactor = 1.9;
  
  const proteinGrams = Math.round(profile.weight * proteinFactor);
  
  // Water Intake: 35ml per kg of bodyweight + 500ml per training frequency day
  const waterLiters = parseFloat(((profile.weight * 0.035) + (profile.frequency * 0.1)).toFixed(1));
  
  return {
    bmi: parseFloat(bmi.toFixed(1)),
    weightCategory,
    maintenanceCalories,
    fatLossCalories,
    muscleGainCalories,
    proteinGrams,
    waterLiters
  };
}

// Check if exercise is safe based on user's injuries
function isExerciseSafe(exercise: Exercise, injuries: Record<BodyArea, Severity>): { safe: boolean; reason?: string } {
  for (const [area, severity] of Object.entries(injuries) as [BodyArea, Severity][]) {
    if (severity === 'None') continue;
    
    // Check if the exercise is restricted for this body area
    if (exercise.injuryRestrictions?.includes(area)) {
      if (severity === 'Severe' || severity === 'Moderate') {
        return { 
          safe: false, 
          reason: `Excluded due to ${severity.toLowerCase()} ${area.toLowerCase()} issues.` 
        };
      }
    }
    
    // Check direct contraindications (e.g. matching tags or names)
    const matchesContraindication = exercise.contraindications?.some(c => 
      c.toLowerCase().includes(area.toLowerCase()) && 
      (severity === 'Severe' || severity === 'Moderate')
    );
    if (matchesContraindication) {
      return { 
        safe: false, 
        reason: `Directly contraindicated for ${severity.toLowerCase()} ${area.toLowerCase()} pain.` 
      };
    }
  }
  
  return { safe: true };
}

// Find best replacement exercise from alternatives
function findReplacementExercise(
  failedExercise: Exercise,
  userProfile: UserProfile,
  alreadySelectedIds: Set<string>
): { exercise: Exercise; reason: string } | null {
  
  const alternatives = failedExercise.alternatives || [];
  
  for (const altId of alternatives) {
    if (alreadySelectedIds.has(altId)) continue;
    
    const altEx = EXERCISE_DATABASE.find(e => e.id === altId);
    if (!altEx) continue;
    
    // Check equipment compatibility
    if (!hasRequiredEquipment(altEx, userProfile.equipment)) continue;
    
    // Check injury safety
    const safety = isExerciseSafe(altEx, userProfile.injuries);
    if (!safety.safe) continue;
    
    return {
      exercise: altEx,
      reason: `Replaced "${failedExercise.name}" with "${altEx.name}" due to equipment or injury constraints.`
    };
  }
  
  // Final fallbacks: ultra-safe bodyweight movements that require zero equipment
  const coreFallbacks = ['bird_dog', 'dead_bug', 'glute_bridge', 'bodyweight_squat'];
  for (const fbId of coreFallbacks) {
    if (fbId === failedExercise.id || alreadySelectedIds.has(fbId)) continue;
    const fbEx = EXERCISE_DATABASE.find(e => e.id === fbId);
    if (fbEx) {
      const safety = isExerciseSafe(fbEx, userProfile.injuries);
      if (safety.safe) {
        return {
          exercise: fbEx,
          reason: `Fell back to ultra-safe "${fbEx.name}" because no preferred alternatives were available/safe.`
        };
      }
    }
  }
  
  return null;
}

// Specification for exercises on a given workout day
interface ExerciseSpec {
  pattern?: string;
  primaryMuscle?: string;
  targetType?: 'Compound' | 'Isolation';
  label?: string;
}

// Map of Focus -> Exercise Specs, Name & Arm Focus Label
function getDailySpecsAndFocus(
  focus: 'Full Body' | 'Upper' | 'Lower' | 'Push' | 'Pull' | 'Legs',
  dayIndex: number
): { specs: ExerciseSpec[]; workoutName: string; armFocus: string } {

  if (focus === 'Full Body') {
    const cycle = dayIndex % 3;
    if (cycle === 0) {
      return {
        workoutName: "Full Body A — Quads, Chest & Biceps Peak Focus",
        armFocus: "Biceps Peak & Supination Focus",
        specs: [
          { pattern: 'Squat', label: 'Primary Quad Compound' },
          { pattern: 'Horizontal Push', label: 'Chest Press' },
          { pattern: 'Horizontal Pull', label: 'Rowing Movement' },
          { primaryMuscle: 'Biceps', label: 'Biceps Isolation' },
          { pattern: 'Squat', label: 'Secondary Leg / Quad Extension' },
          { pattern: 'Core / Stability', label: 'Core Stability' }
        ]
      };
    } else if (cycle === 1) {
      return {
        workoutName: "Full Body B — Posterior Chain, Shoulders & Triceps Focus",
        armFocus: "Triceps Lockout & Long-Head Focus",
        specs: [
          { pattern: 'Hinge', label: 'Posterior Chain Hinge' },
          { pattern: 'Vertical Push', label: 'Overhead Shoulder Press' },
          { pattern: 'Vertical Pull', label: 'Lat Pulldown / Pull-Up' },
          { primaryMuscle: 'Triceps', label: 'Triceps Isolation' },
          { pattern: 'Accessory / Push', label: 'Lateral Shoulder Raise' },
          { pattern: 'Core / Stability', label: 'Anti-Rotation Core' }
        ]
      };
    } else {
      return {
        workoutName: "Full Body C — Unilateral Legs & Brachialis/Grip Focus",
        armFocus: "Brachialis, Forearms & Grip Strength",
        specs: [
          { pattern: 'Squat', label: 'Unilateral Leg Movement' },
          { pattern: 'Horizontal Push', label: 'Incline Press / Flye' },
          { pattern: 'Horizontal Pull', label: 'Rear Delt / Upper Row' },
          { primaryMuscle: 'Brachialis', label: 'Hammer Curl / Brachialis' },
          { primaryMuscle: 'Triceps', label: 'Bench Dips / Lockout' },
          { pattern: 'Core / Stability', label: 'Core Endurance' }
        ]
      };
    }
  }

  if (focus === 'Upper') {
    const cycle = dayIndex % 2;
    if (cycle === 0) {
      return {
        workoutName: "Upper Body A — Chest Press, Heavy Rows & Biceps Focus",
        armFocus: "Biceps Peak & Brachialis Supination",
        specs: [
          { pattern: 'Horizontal Push', label: 'Heavy Chest Bench' },
          { pattern: 'Horizontal Pull', label: 'Heavy Row' },
          { pattern: 'Horizontal Push', label: 'Incline Press / DB Flye' },
          { pattern: 'Horizontal Pull', label: 'Rear Delt Face Pull' },
          { primaryMuscle: 'Biceps', label: 'Dumbbell Bicep Curl' },
          { primaryMuscle: 'Biceps', label: 'Hammer Curl / Concentration' },
          { pattern: 'Accessory / Push', label: 'Lateral Raise' }
        ]
      };
    } else {
      return {
        workoutName: "Upper Body B — Overhead Shoulder Press, Lats & Triceps Focus",
        armFocus: "Triceps Overhead Extension & Rope Pushdown",
        specs: [
          { pattern: 'Vertical Push', label: 'Overhead Press' },
          { pattern: 'Vertical Pull', label: 'Lat Pulldown / Pull-Up' },
          { pattern: 'Horizontal Push', label: 'Landmine / Neutral Press' },
          { pattern: 'Horizontal Pull', label: 'Chest Supported Row' },
          { primaryMuscle: 'Triceps', label: 'Cable Triceps Pushdown' },
          { primaryMuscle: 'Triceps', label: 'Weighted Bench Dips' },
          { pattern: 'Accessory / Push', label: 'Lateral Shoulder Raise' }
        ]
      };
    }
  }

  if (focus === 'Lower') {
    const cycle = dayIndex % 2;
    if (cycle === 0) {
      return {
        workoutName: "Lower Body A — Heavy Squat, Quads & Calf Dominant",
        armFocus: "Grip Hold & Postural Core Stabilization",
        specs: [
          { pattern: 'Squat', label: 'Heavy Squat Compound' },
          { pattern: 'Squat', label: 'Leg Press / Step-Up' },
          { pattern: 'Hinge', label: 'Glute / Hinge Movement' },
          { pattern: 'Squat', label: 'Machine Leg Extension' },
          { primaryMuscle: 'Calves', label: 'Standing Calf Raise' },
          { pattern: 'Core / Stability', label: 'Ab Rollout / Core' }
        ]
      };
    } else {
      return {
        workoutName: "Lower Body B — Hinge Deadlift & Posterior Chain Focus",
        armFocus: "Heavy Barbell / Dumbbell Grip Hold",
        specs: [
          { pattern: 'Hinge', label: 'Romanian Deadlift / Hinge' },
          { pattern: 'Squat', label: 'Walking Lunge / Box Squat' },
          { pattern: 'Hinge', label: 'Lying Hamstring Curl' },
          { pattern: 'Hinge', label: 'Glute Bridge / Pull-Through' },
          { primaryMuscle: 'Calves', label: 'Calf Raise' },
          { pattern: 'Core / Stability', label: 'Russian Twist' }
        ]
      };
    }
  }

  if (focus === 'Push') {
    const cycle = Math.floor(dayIndex / 3) % 2;
    if (cycle === 0) {
      return {
        workoutName: "Push A — Chest Heavy & Triceps Cable Pushdown Focus",
        armFocus: "Triceps Lateral & Medial Head Focus",
        specs: [
          { pattern: 'Horizontal Push', label: 'Main Chest Press' },
          { pattern: 'Vertical Push', label: 'Shoulder Overhead Press' },
          { pattern: 'Horizontal Push', label: 'Incline Push-Up / DB Flye' },
          { pattern: 'Accessory / Push', label: 'Lateral Shoulder Raise' },
          { primaryMuscle: 'Triceps', label: 'Cable Rope Pushdown' },
          { pattern: 'Core / Stability', label: 'Core Stability' }
        ]
      };
    } else {
      return {
        workoutName: "Push B — Overhead Shoulder Width & Triceps Dips Focus",
        armFocus: "Triceps Overhead Extension & Dips Focus",
        specs: [
          { pattern: 'Vertical Push', label: 'Dumbbell Overhead Press' },
          { pattern: 'Horizontal Push', label: 'Neutral Grip DB Press' },
          { pattern: 'Vertical Push', label: 'Single-Arm Landmine Press' },
          { pattern: 'Accessory / Push', label: 'Lateral Raise' },
          { primaryMuscle: 'Triceps', label: 'Weighted Bench Dips' },
          { pattern: 'Core / Stability', label: 'Russian Twist' }
        ]
      };
    }
  }

  if (focus === 'Pull') {
    const cycle = Math.floor(dayIndex / 3) % 2;
    if (cycle === 0) {
      return {
        workoutName: "Pull A — Lats Width & Biceps Supinated Curls Focus",
        armFocus: "Biceps Short Head & Bicep Peak Focus",
        specs: [
          { pattern: 'Vertical Pull', label: 'Lat Pulldown / Pull-Up' },
          { pattern: 'Horizontal Pull', label: 'One-Arm DB Row' },
          { pattern: 'Horizontal Pull', label: 'Rear Delt Face Pull' },
          { primaryMuscle: 'Biceps', label: 'Dumbbell Bicep Curl' },
          { primaryMuscle: 'Biceps', label: 'Concentration Curl' },
          { pattern: 'Core / Stability', label: 'Dead Bug / Core' }
        ]
      };
    } else {
      return {
        workoutName: "Pull B — Mid-Back Thickness & Hammer Curls Focus",
        armFocus: "Brachialis & Forearms Hammer Grip Focus",
        specs: [
          { pattern: 'Horizontal Pull', label: 'Seated Cable Row' },
          { pattern: 'Horizontal Pull', label: 'Chest Supported Row' },
          { pattern: 'Vertical Pull', label: 'Lat Pulldown / Band Row' },
          { pattern: 'Horizontal Pull', label: 'Face Pull / Upper Back' },
          { primaryMuscle: 'Brachialis', label: 'Dumbbell Hammer Curl' },
          { pattern: 'Core / Stability', label: 'Bird Dog' }
        ]
      };
    }
  }

  // Legs
  const legCycle = Math.floor(dayIndex / 3) % 2;
  if (legCycle === 0) {
    return {
      workoutName: "Legs A — Quad Dominant & Calf Building",
      armFocus: "Farmer Grip & Core Hold",
      specs: [
        { pattern: 'Squat', label: 'Barbell Back Squat / Goblet' },
        { pattern: 'Squat', label: 'Machine Leg Press' },
        { pattern: 'Squat', label: 'Machine Leg Extension' },
        { pattern: 'Hinge', label: 'Cable Pull-Through' },
        { primaryMuscle: 'Calves', label: 'Standing Calf Raise' },
        { pattern: 'Core / Stability', label: 'Ab Rollout' }
      ]
    };
  } else {
    return {
      workoutName: "Legs B — Hamstring & Posterior Chain Focus",
      armFocus: "Posterior Grip Hold",
      specs: [
        { pattern: 'Hinge', label: 'Dumbbell Romanian Deadlift' },
        { pattern: 'Squat', label: 'Dumbbell Walking Lunge' },
        { pattern: 'Hinge', label: 'Lying Hamstring Curl' },
        { pattern: 'Hinge', label: 'Glute Bridge' },
        { primaryMuscle: 'Calves', label: 'Standing Calf Raise' },
        { pattern: 'Core / Stability', label: 'Russian Twist' }
      ]
    };
  }
}

// Helper to pick candidate exercises with variation across days
function selectCandidateExercise(
  spec: ExerciseSpec,
  profile: UserProfile,
  alreadySelectedIdsInDay: Set<string>,
  usedExerciseIdsInPlan: Map<string, number>,
  rotationOffset: number = 0
): { exercise: Exercise; reason?: string } | null {

  // 1. Gather matching exercises in DB
  let candidates = EXERCISE_DATABASE.filter(ex => {
    if (!hasRequiredEquipment(ex, profile.equipment)) return false;

    if (spec.primaryMuscle) {
      if (ex.primaryMuscles.includes(spec.primaryMuscle)) return true;
      if (spec.primaryMuscle === 'Brachialis' && ex.id === 'dumbbell_hammer_curl') return true;
      if (spec.primaryMuscle === 'Calves' && ex.primaryMuscles.includes('Calves')) return true;
      if (spec.primaryMuscle === 'Biceps' && (ex.primaryMuscles.includes('Biceps') || ex.movementPattern === 'Accessory / Pull')) return true;
      if (spec.primaryMuscle === 'Triceps' && (ex.primaryMuscles.includes('Triceps') || ex.movementPattern === 'Accessory / Push')) return true;
    }

    if (spec.pattern && ex.movementPattern === spec.pattern) return true;

    return false;
  });

  // Exclude exercises already selected TODAY
  candidates = candidates.filter(ex => !alreadySelectedIdsInDay.has(ex.id));

  if (candidates.length === 0) return null;

  // 2. Sort candidates so that exercises NOT YET USED in the overall plan come first!
  candidates.sort((a, b) => {
    const countA = usedExerciseIdsInPlan.get(a.id) || 0;
    const countB = usedExerciseIdsInPlan.get(b.id) || 0;
    return countA - countB;
  });

  // Apply rotation offset if there are multiple candidates so different weeks rotate exercise selection
  if (rotationOffset > 0 && candidates.length > 1) {
    const shift = rotationOffset % candidates.length;
    candidates = [...candidates.slice(shift), ...candidates.slice(0, shift)];
  }

  // 3. Test safety against injuries
  for (const candidate of candidates) {
    const safety = isExerciseSafe(candidate, profile.injuries);
    if (safety.safe) {
      return { exercise: candidate };
    }

    // Try finding safe replacement
    const replacement = findReplacementExercise(candidate, profile, alreadySelectedIdsInDay);
    if (replacement) {
      return { exercise: replacement.exercise, reason: replacement.reason };
    }
  }

  // Safe Fallback
  const coreFallbacks = ['bird_dog', 'dead_bug', 'glute_bridge', 'bodyweight_squat'];
  for (const fbId of coreFallbacks) {
    if (alreadySelectedIdsInDay.has(fbId)) continue;
    const fbEx = EXERCISE_DATABASE.find(e => e.id === fbId);
    if (fbEx && isExerciseSafe(fbEx, profile.injuries).safe) {
      return {
        exercise: fbEx,
        reason: `Substituted with ultra-safe "${fbEx.name}" due to safety constraints.`
      };
    }
  }

  return null;
}

// Generate a specific periodized week's schedule with mesocycle phase adaptation
export function generateSingleWeekSchedule(
  profile: UserProfile,
  weekNumber: number,
  usedExerciseIdsInPlan: Map<string, number>
): { weekNumber: number; phaseName: string; phaseDescription: string; schedule: DailyWorkout[] } {
  const isDeload = weekNumber % 4 === 0;
  const mesocycleIndex = Math.floor((weekNumber - 1) / 4); // 0 = Month 1, 1 = Month 2, 2 = Month 3
  const weekInPhase = ((weekNumber - 1) % 4) + 1; // 1, 2, 3 or 4

  let phaseName = "";
  let phaseDescription = "";

  if (isDeload) {
    phaseName = `Week ${weekNumber} — Planned Deload & Active Recovery Phase`;
    phaseDescription = `A structured deload week to dissipate systemic fatigue, restore central nervous system readiness, flush lactic acid, and reduce joint strain before starting the next block.`;
  } else if (mesocycleIndex === 0) {
    phaseName = `Phase 1: Hypertrophy & Movement Mastery (Week ${weekNumber})`;
    phaseDescription = `Focus on pristine movement mechanics, controlling the 3-second negative phase, and accumulating volume for muscle hypertrophy.`;
  } else if (mesocycleIndex === 1) {
    phaseName = `Phase 2: Progressive Overload & Exercise Variation (Week ${weekNumber})`;
    phaseDescription = `Increasing working weight by 2.5–5% and rotating complementary exercise variations to stimulate distinct muscle heads and prevent adaptation plateaus.`;
  } else if (mesocycleIndex === 2) {
    phaseName = `Phase 3: Peak Strength & Neuromuscular Density (Week ${weekNumber})`;
    phaseDescription = `High intensity strength focus with heavier load, lower rep targets, and maximum focus on motor unit recruitment and power.`;
  } else {
    phaseName = `Phase 4: Advanced Specialization & Conditioning (Week ${weekNumber})`;
    phaseDescription = `Targeted specialization week focusing on muscle density, unilateral symmetry, and high density output.`;
  }

  // Determine Split Structure based on frequency
  const daysOfSplit: { name: string; focus: 'Full Body' | 'Upper' | 'Lower' | 'Push' | 'Pull' | 'Legs' }[] = [];
  
  if (profile.frequency === 2) {
    daysOfSplit.push({ name: 'Day 1', focus: 'Full Body' });
    daysOfSplit.push({ name: 'Day 2', focus: 'Full Body' });
  } else if (profile.frequency === 3) {
    daysOfSplit.push({ name: 'Day 1', focus: 'Full Body' });
    daysOfSplit.push({ name: 'Day 2', focus: 'Full Body' });
    daysOfSplit.push({ name: 'Day 3', focus: 'Full Body' });
  } else if (profile.frequency === 4) {
    daysOfSplit.push({ name: 'Day 1', focus: 'Upper' });
    daysOfSplit.push({ name: 'Day 2', focus: 'Lower' });
    daysOfSplit.push({ name: 'Day 3', focus: 'Upper' });
    daysOfSplit.push({ name: 'Day 4', focus: 'Lower' });
  } else if (profile.frequency === 5) {
    daysOfSplit.push({ name: 'Day 1', focus: 'Push' });
    daysOfSplit.push({ name: 'Day 2', focus: 'Pull' });
    daysOfSplit.push({ name: 'Day 3', focus: 'Legs' });
    daysOfSplit.push({ name: 'Day 4', focus: 'Upper' });
    daysOfSplit.push({ name: 'Day 5', focus: 'Lower' });
  } else {
    daysOfSplit.push({ name: 'Day 1', focus: 'Push' });
    daysOfSplit.push({ name: 'Day 2', focus: 'Pull' });
    daysOfSplit.push({ name: 'Day 3', focus: 'Legs' });
    daysOfSplit.push({ name: 'Day 4', focus: 'Push' });
    daysOfSplit.push({ name: 'Day 5', focus: 'Pull' });
    daysOfSplit.push({ name: 'Day 6', focus: 'Legs' });
  }

  let targetGoal = profile.goals[0] || "General Fitness";
  let restSeconds = 60;
  let repRange = "8-12";
  
  if (targetGoal === "Strength Development") {
    restSeconds = 120;
    repRange = "5-8";
  } else if (targetGoal === "Fat Loss" || targetGoal === "Weight Loss") {
    restSeconds = 45;
    repRange = "12-15";
  } else if (targetGoal === "Rehabilitation") {
    restSeconds = 90;
    repRange = "10-12";
  } else if (targetGoal === "Endurance") {
    restSeconds = 45;
    repRange = "15-20";
  }

  const schedule: DailyWorkout[] = [];

  daysOfSplit.forEach((daySplit, idx) => {
    const dayExercises: WorkoutExercise[] = [];
    const alreadySelectedIds = new Set<string>();
    const replacementsLog: string[] = [];

    // Spec selection offset uses weekNumber and day index so exercise variations systematically rotate across weeks
    const rotationOffset = (weekNumber - 1) + (idx % 2);
    const { specs, workoutName, armFocus } = getDailySpecsAndFocus(daySplit.focus, idx + (weekNumber - 1));

    // Warm-up Generation
    const warmUp: ActivityStep[] = [
      { name: "Dynamic Cardio Activation", duration: "5 mins", description: "Walking, light jog, skipping, or low intensity stationary cycling to raise core temperature and prep joints." }
    ];
    if (daySplit.focus === 'Upper' || daySplit.focus === 'Push' || daySplit.focus === 'Pull') {
      warmUp.push(
        { name: "Shoulder Arm Circles", duration: "1 min", description: "Slow controlled arm circles forward and backward to lubricate rotator cuff." },
        { name: "Scapular Glides & Band Pulls", reps: "12 reps", description: "Pinch shoulder blades together and release to activate upper back stabilizers." }
      );
    } else if (daySplit.focus === 'Lower' || daySplit.focus === 'Legs') {
      warmUp.push(
        { name: "Dynamic Hip Opener", reps: "10 per leg", description: "Step-over motion to release tight hips before squatting/hinging." },
        { name: "Bodyweight Glute Squeeze", reps: "12 reps", description: "Lying flat, lift hips slightly and squeeze glutes to activate posterior chain." }
      );
    } else {
      warmUp.push(
        { name: "World's Greatest Stretch", reps: "5 per side", description: "Deep lunge with rotation to stretch thoracic spine, hip flexors, and hamstrings." },
        { name: "Torso Twists & Arm Swings", duration: "1 min", description: "Gently twist upper torso with arms extended to mobilize spine." }
      );
    }

    // Cool-down Generation
    const coolDown: ActivityStep[] = [
      { name: "Deep Diaphragmatic Breathing", duration: "2 mins", description: "Inhale slowly through the nose for 4s, hold 4s, exhale 6s to lower heart rate." }
    ];
    if (daySplit.focus === 'Upper' || daySplit.focus === 'Push' || daySplit.focus === 'Pull') {
      coolDown.push(
        { name: "Doorway Chest Stretch", duration: "1 min", description: "Place forearm on door frame and lean forward gently to release chest muscles." },
        { name: "Cross-Body Shoulder & Bicep Stretch", duration: "1 min", description: "Pull arm across chest to release posterior shoulder capsule and arms." }
      );
    } else if (daySplit.focus === 'Lower' || daySplit.focus === 'Legs') {
      coolDown.push(
        { name: "Hamstring Static Stretch", duration: "1 min per leg", description: "Sit and reach toward toes with a straight back." },
        { name: "Kneeling Quad Stretch", duration: "1 min per leg", description: "Hold ankle behind you to stretch the front of thighs." }
      );
    } else {
      coolDown.push(
        { name: "Child's Pose Rest Hold", duration: "1 min", description: "Rest on knees, reach hands forward on floor, stretch lats and lower back." },
        { name: "Standing Full Body Reach", duration: "1 min", description: "Inhale, reach arms up high, exhale, let arms drop down slowly." }
      );
    }

    specs.forEach(spec => {
      const selected = selectCandidateExercise(spec, profile, alreadySelectedIds, usedExerciseIdsInPlan, rotationOffset);
      if (selected) {
        const candidate = selected.exercise;
        alreadySelectedIds.add(candidate.id);

        const currCount = usedExerciseIdsInPlan.get(candidate.id) || 0;
        usedExerciseIdsInPlan.set(candidate.id, currCount + 1);

        if (selected.reason) replacementsLog.push(selected.reason);

        // Calculate phase-specific sets & reps
        let actualSets = 3;
        if (isDeload) {
          actualSets = 2; // Deload volume reduction
        } else if (weekInPhase === 3) {
          actualSets = 4; // Peak volume week
        } else if (mesocycleIndex >= 1 && profile.experienceLevel !== 'Beginner') {
          actualSets = 4;
        } else {
          actualSets = profile.experienceLevel === 'Beginner' ? 3 : 4;
        }

        let baseReps = candidate.repRangeByGoal[targetGoal] || repRange;
        let actualReps = baseReps;
        if (isDeload) {
          actualReps = "12-15 (Light Load)";
        } else if (mesocycleIndex === 1) {
          actualReps = baseReps.replace("12", "10").replace("10", "8");
        } else if (mesocycleIndex === 2) {
          actualReps = baseReps.replace("12", "8").replace("10", "6");
        }

        let actualRest = candidate.restSecondsByGoal[targetGoal] || restSeconds;
        if (isDeload) actualRest = 60;

        dayExercises.push({
          exerciseId: candidate.id,
          name: candidate.name,
          sets: actualSets,
          reps: actualReps,
          restSeconds: actualRest,
          instructions: candidate.instructions,
          formTips: candidate.formTips,
          alternativeIds: candidate.alternatives,
          primaryMuscles: candidate.primaryMuscles,
          notes: selected.reason || ""
        });
      }
    });

    let cardioSession: CardioSession | undefined = undefined;
    if (profile.cardio.frequency > 0 && idx < profile.cardio.frequency) {
      cardioSession = {
        type: profile.cardio.type,
        duration: isDeload ? Math.round(profile.cardio.duration * 0.7) : profile.cardio.duration,
        intensity: isDeload ? 'Low' : profile.cardio.intensity,
        notes: isDeload
          ? "Perform light active-recovery cardio to flush fatigue."
          : `Perform cardio after resistance training. Keep heart rate in ${
              profile.cardio.intensity === 'High' ? 'vigorous zone (HIIT)' : 'aerobic zone (LISS)'
            }.`
      };
    }

    const warmUpMinutes = 8;
    const coolDownMinutes = 6;
    const resistanceMinutes = dayExercises.reduce((total, ex) => {
      const setTimeSec = ex.sets * (45 + ex.restSeconds);
      return total + (setTimeSec / 60);
    }, 0);
    const cardioMinutes = cardioSession ? cardioSession.duration : 0;
    const totalMinutesCalculated = Math.round(warmUpMinutes + resistanceMinutes + coolDownMinutes + cardioMinutes);
    const estimatedDurationMinutes = Math.max(isDeload ? 45 : 60, totalMinutesCalculated);

    let progressionNotes = isDeload
      ? "Deload Week: Use 50-60% of your typical working weight. Focus on joint health, stretching, and recovering energy reserves."
      : weekNumber === 1
      ? "Baseline Week: Use conservative weights to establish baseline strength and calibrate form."
      : mesocycleIndex === 1
      ? "Phase 2 Progression: Attempt to increase working weight by 2.5-5% over Week 1 baseline."
      : mesocycleIndex === 2
      ? "Phase 3 Strength Peak: Focus on heavy explosive concentric drive with 3s controlled negative."
      : "Maintain double progressive overload: Add 1 rep per set until reaching upper threshold, then step up load.";

    schedule.push({
      dayName: daySplit.name,
      workoutName: `${workoutName} (W${weekNumber})`,
      focus: daySplit.focus,
      armFocus,
      estimatedDurationMinutes,
      warmUp,
      exercises: dayExercises,
      cardio: cardioSession,
      coolDown,
      progressionNotes,
      recoveryWarning: replacementsLog.length > 0 ? "Adjusted due to local equipment or physical limitations." : undefined
    });
  });

  return {
    weekNumber,
    phaseName,
    phaseDescription,
    schedule
  };
}

// Retrieve or generate week-specific periodized schedule for a plan
export function getScheduleForWeek(plan: WorkoutPlan, weekNumber: number): {
  schedule: DailyWorkout[];
  phaseName: string;
  phaseDescription: string;
} {
  if (plan.weeklySchedules && plan.weeklySchedules.length >= weekNumber && plan.weeklySchedules[weekNumber - 1]) {
    const ws = plan.weeklySchedules[weekNumber - 1];
    return {
      schedule: ws.schedule,
      phaseName: ws.phaseName,
      phaseDescription: ws.phaseDescription
    };
  }

  const emptyInjuries: Record<BodyArea, Severity> = {
    Neck: 'None', Shoulder: 'None', Elbow: 'None', Wrist: 'None',
    'Upper Back': 'None', 'Lower Back': 'None', Hip: 'None', Knee: 'None', Ankle: 'None'
  };

  // Fallback for plans without stored weeklySchedules: dynamically compute periodized week
  const fallbackProfile: UserProfile = plan.userProfile || {
    age: 30, weight: 75, height: 175, gender: 'Male',
    experienceLevel: 'Intermediate', environment: 'Commercial Gym', frequency: plan.schedule?.length || 3,
    goals: ['General Fitness'], equipment: ['Dumbbell', 'Barbell', 'Machine'],
    injuries: emptyInjuries, cardio: { frequency: 0, duration: 20, intensity: 'Moderate', type: 'Running' },
    durationMonths: plan.durationMonths || 1, bodyFocus: [], additionalNotes: '', restrictedMovements: []
  };

  const generatedWeek = generateSingleWeekSchedule(fallbackProfile, weekNumber, new Map());

  return {
    schedule: generatedWeek.schedule,
    phaseName: generatedWeek.phaseName,
    phaseDescription: generatedWeek.phaseDescription
  };
}

// Primary Workout Generator Engine
export function generateWorkoutPlan(profile: UserProfile, customName?: string): WorkoutPlan {
  const warnings: string[] = [];
  const usedExerciseIdsInPlan = new Map<string, number>();

  const totalWeeks = (profile.durationMonths || 1) * 4;
  const weeklySchedules: WeeklySchedule[] = [];

  for (let w = 1; w <= totalWeeks; w++) {
    weeklySchedules.push(generateSingleWeekSchedule(profile, w, usedExerciseIdsInPlan));
  }

  const schedule = weeklySchedules[0]?.schedule || [];

  // Check global constraints for recovery and warnings
  if (profile.experienceLevel === 'Beginner' && profile.frequency > 4) {
    warnings.push("We recommend a maximum of 3-4 days of training per week for beginners. Excessive frequency may cause fatigue and slow down muscular recovery.");
  }

  // Injury specific warnings
  const activeInjuries = Object.entries(profile.injuries).filter(([_, sev]) => sev !== 'None');
  if (activeInjuries.length > 0) {
    const areas = activeInjuries.map(([area, sev]) => `${sev.toLowerCase()} ${area.toLowerCase()}`).join(', ');
    warnings.push(`This plan is customized to accommodate: ${areas}. Always perform movements in a completely pain-free range of motion. Consult a physiotherapist if discomfort persists.`);
  }

  if (profile.equipment.length <= 1 && profile.equipment.includes("Bodyweight only")) {
    warnings.push("Bodyweight only selected. Progression is focused on isometric holds, density, and higher repetitions.");
  }

  // Calculate nutrition
  const nutritionEstimates = calculateNutritionEstimates(profile);

  return {
    id: `plan_${Date.now()}`,
    name: customName || `Custom ${profile.goals[0] || 'Fitness'} Plan (${profile.frequency} Days/Wk)`,
    version: 1,
    createdDate: new Date().toLocaleDateString(),
    userProfile: profile,
    schedule,
    weeklySchedules,
    durationMonths: profile.durationMonths,
    warnings,
    nutritionEstimates
  };
}

// Check for conflicts before showing the plan
export function validateWorkoutPlan(plan: WorkoutPlan): { valid: boolean; errors: string[]; recommendations: string[] } {
  const errors: string[] = [];
  const recommendations: string[] = [];
  
  if (plan.schedule.length === 0) {
    errors.push("No workouts generated in the schedule. Please check your equipment selection.");
  }
  
  plan.schedule.forEach(day => {
    if (day.exercises.length === 0) {
      recommendations.push(`No resistance exercises matched for ${day.dayName} (${day.focus}). Consider selecting more basic equipment like dumbbells or resistance bands to open up exercise selections.`);
    }
  });
  
  if (plan.userProfile.age < 12 || plan.userProfile.age > 100) {
    errors.push("Sensible age limit exceeded. Plan should only be generated for users aged 12-100.");
  }
  
  return {
    valid: errors.length === 0,
    errors,
    recommendations
  };
}
