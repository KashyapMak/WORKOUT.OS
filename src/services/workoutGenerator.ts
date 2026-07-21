import { 
  UserProfile, 
  WorkoutPlan, 
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

// Primary Workout Generator Engine
export function generateWorkoutPlan(profile: UserProfile, customName?: string): WorkoutPlan {
  const warnings: string[] = [];
  const schedule: DailyWorkout[] = [];
  
  // Determine Split Structure based on frequency
  // 2 Days: Full Body / Full Body
  // 3 Days: Full Body / Full Body / Full Body
  // 4 Days: Upper / Lower / Upper / Lower
  // 5 Days: Push / Pull / Legs / Upper / Lower
  // 6 Days: Push / Pull / Legs / Push / Pull / Legs
  
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
  } else { // 6 Days
    daysOfSplit.push({ name: 'Day 1', focus: 'Push' });
    daysOfSplit.push({ name: 'Day 2', focus: 'Pull' });
    daysOfSplit.push({ name: 'Day 3', focus: 'Legs' });
    daysOfSplit.push({ name: 'Day 4', focus: 'Push' });
    daysOfSplit.push({ name: 'Day 5', focus: 'Pull' });
    daysOfSplit.push({ name: 'Day 6', focus: 'Legs' });
  }
  
  // Set Workout Parameters based on Goal
  let targetGoal = profile.goals[0] || "General Fitness";
  
  let repCountStyle = "3 x 10";
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
  
  // Track exercises already scheduled in a single day to avoid repeats
  daysOfSplit.forEach((daySplit, idx) => {
    const dayExercises: WorkoutExercise[] = [];
    const alreadySelectedIds = new Set<string>();
    const replacementsLog: string[] = [];
    
    // Warm-up Generation
    const warmUp: ActivityStep[] = [
      { name: "Light Cardio Warm-up", duration: "5 mins", description: "Walking, light jog, or low intensity stationary cycling to raise core temperature." }
    ];
    
    if (daySplit.focus === 'Upper' || daySplit.focus === 'Push' || daySplit.focus === 'Pull') {
      warmUp.push(
        { name: "Shoulder Arm Circles", duration: "1 min", description: "Slow controlled arm circles forward and backward." },
        { name: "Scapular Glides", reps: "10 reps", description: "Pinch shoulder blades together and release to activate upper back stabilizers." }
      );
    } else if (daySplit.focus === 'Lower' || daySplit.focus === 'Legs') {
      warmUp.push(
        { name: "Dynamic Hip Opener", reps: "10 per leg", description: "Step-over motion to release tight hips before squatting." },
        { name: "Bodyweight Glute Squeeze", reps: "12 reps", description: "Lying flat, lift hips slightly and squeeze glutes to activate posterior chain." }
      );
    } else {
      warmUp.push(
        { name: "World's Greatest Stretch", reps: "5 per side", description: "Deep lunge with rotation to stretch thoracic spine, hip flexors, and hamstrings." },
        { name: "Torso Twists", duration: "1 min", description: "Gently twist upper torso with arms extended to mobilize core." }
      );
    }
    
    // Cool-down Generation
    const coolDown: ActivityStep[] = [
      { name: "Deep Diaphragmatic Breathing", duration: "2 mins", description: "Inhale slowly through the nose for 4s, hold 4s, exhale 6s to lower heart rate." }
    ];
    if (daySplit.focus === 'Upper' || daySplit.focus === 'Push' || daySplit.focus === 'Pull') {
      coolDown.push(
        { name: "Doorway Chest Stretch", duration: "30s", description: "Place forearm on door frame and lean forward gently to release chest muscles." },
        { name: "Cross-Body Shoulder Stretch", duration: "30s", description: "Pull arm across chest to release posterior shoulder capsule." }
      );
    } else if (daySplit.focus === 'Lower' || daySplit.focus === 'Legs') {
      coolDown.push(
        { name: "Hamstring Static Stretch", duration: "30s per leg", description: "Sit and reach toward toes with a straight back." },
        { name: "Kneeling Quad Stretch", duration: "30s per leg", description: "Hold ankle behind you to stretch the front of thighs." }
      );
    } else {
      coolDown.push(
        { name: "Child's Pose", duration: "1 min", description: "Rest on knees, reach hands forward on floor, stretch lats and lower back." },
        { name: "Standing Full Body Reach", duration: "1 min", description: "Inhale, reach arms up high, exhale, let arms drop down slowly." }
      );
    }
    
    // Find Candidate Exercises matching the day's focus
    // Map of Focus -> Movement Patterns
    let desiredPatterns: string[] = [];
    if (daySplit.focus === 'Full Body') {
      desiredPatterns = ['Squat', 'Horizontal Push', 'Horizontal Pull', 'Hinge', 'Core / Stability'];
    } else if (daySplit.focus === 'Upper') {
      desiredPatterns = ['Horizontal Push', 'Horizontal Pull', 'Vertical Push', 'Vertical Pull', 'Accessory / Pull', 'Accessory / Push'];
    } else if (daySplit.focus === 'Lower') {
      desiredPatterns = ['Squat', 'Hinge', 'Core / Stability'];
    } else if (daySplit.focus === 'Push') {
      desiredPatterns = ['Horizontal Push', 'Vertical Push', 'Accessory / Push'];
    } else if (daySplit.focus === 'Pull') {
      desiredPatterns = ['Horizontal Pull', 'Vertical Pull', 'Accessory / Pull'];
    } else if (daySplit.focus === 'Legs') {
      desiredPatterns = ['Squat', 'Hinge'];
    }
    
    desiredPatterns.forEach(pattern => {
      // Find matching exercises in DB
      let candidate = EXERCISE_DATABASE.find(ex => 
        ex.movementPattern === pattern && 
        hasRequiredEquipment(ex, profile.equipment)
      );
      
      if (candidate) {
        // Evaluate safety for injuries
        const safety = isExerciseSafe(candidate, profile.injuries);
        
        if (!safety.safe) {
          // Attempt replacement
          const replacement = findReplacementExercise(candidate, profile, alreadySelectedIds);
          if (replacement) {
            candidate = replacement.exercise;
            replacementsLog.push(replacement.reason);
          } else {
            // No safe replacement found, look for general safe fallback
            const fallbackEx = EXERCISE_DATABASE.find(e => e.id === 'bird_dog');
            if (fallbackEx && isExerciseSafe(fallbackEx, profile.injuries).safe) {
              candidate = fallbackEx;
              replacementsLog.push(`No safe equipment-compatible replacement for "${pattern}" movement. Substituted with ultra-safe "${fallbackEx.name}".`);
            } else {
              return; // Skip
            }
          }
        }
        
        if (candidate && !alreadySelectedIds.has(candidate.id)) {
          alreadySelectedIds.add(candidate.id);
          
          // Determine custom reps/sets for this experience level
          let actualSets = 3;
          if (profile.experienceLevel === 'Beginner') actualSets = 3;
          else if (profile.experienceLevel === 'Intermediate') actualSets = 4;
          else actualSets = 5;
          
          let actualReps = candidate.repRangeByGoal[targetGoal] || repRange;
          let actualRest = candidate.restSecondsByGoal[targetGoal] || restSeconds;
          
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
            notes: replacementsLog[replacementsLog.length - 1] || ""
          });
        }
      }
    });
    
    // Cardio planning for relevant days
    let cardioSession: CardioSession | undefined = undefined;
    if (profile.cardio.frequency > 0 && idx < profile.cardio.frequency) {
      cardioSession = {
        type: profile.cardio.type,
        duration: profile.cardio.duration,
        intensity: profile.cardio.intensity,
        notes: `Perform cardio after the main resistance workout. Keep heart rate in ${
          profile.cardio.intensity === 'High' ? 'vigorous zone (HIIT)' : 'aerobic zone (LISS)'
        }.`
      };
    }
    
    // Progression notes per experience
    let progressionNotes = "Add 1-2 repetitions to each set once the upper limit of the target rep range is achieved with pristine form.";
    if (profile.experienceLevel === 'Beginner') {
      progressionNotes = "Prioritize slow controlled form. Once all sets are easily performed at the prescribed repetitions, increase weight slightly (1-2kg for dumbbells) while maintaining identical tempo.";
    } else if (profile.experienceLevel === 'Advanced') {
      progressionNotes = "Double progressive overload: Attempt to increase weight by 2-5% for compound movements. If reps fall below the lower range, stay at this weight until you build back up to upper rep target.";
    } else if (targetGoal === "Rehabilitation") {
      progressionNotes = "Never push into any pain. Focus purely on mind-muscle connection and range of motion. Only increase reps or duration if completed 100% pain-free across two consecutive sessions.";
    }
    
    schedule.push({
      dayName: daySplit.name,
      workoutName: `${daySplit.focus} Workout`,
      focus: daySplit.focus,
      warmUp,
      exercises: dayExercises,
      cardio: cardioSession,
      coolDown,
      progressionNotes,
      recoveryWarning: replacementsLog.length > 0 ? "Adjusted due to local equipment or physical limitations." : undefined
    });
  });
  
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
