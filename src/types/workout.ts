export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type WorkoutEnvironment = 
  | 'Home Bodyweight' 
  | 'Home Limited Equipment' 
  | 'Home Full Equipment' 
  | 'Commercial Gym' 
  | 'Limited Gym';

export type Severity = 'None' | 'Mild' | 'Moderate' | 'Severe';

export type BodyArea = 
  | 'Neck' 
  | 'Shoulder' 
  | 'Elbow' 
  | 'Wrist' 
  | 'Upper Back' 
  | 'Lower Back' 
  | 'Hip' 
  | 'Knee' 
  | 'Ankle';

export interface UserProfile {
  age: number;
  gender: string;
  height: number; // in cm
  weight: number; // in kg
  bodyFat?: number; // optional %
  goals: string[]; // e.g. ["Fat Loss", "Muscle Gain"]
  experienceLevel: ExperienceLevel;
  environment: WorkoutEnvironment;
  equipment: string[]; // list of available equipment
  frequency: number; // 2, 3, 4, 5, 6 days per week
  durationMonths: number; // 1, 3, 6, 12
  bodyFocus: string[]; // areas of priority
  cardio: {
    type: string; // "Walking", "Running", etc.
    frequency: number; // sessions per week
    duration: number; // minutes per session
    intensity: 'Low' | 'Moderate' | 'High';
  };
  injuries: Record<BodyArea, Severity>;
  additionalNotes: string;
  restrictedMovements: string[];
}

export interface Exercise {
  id: string;
  name: string;
  category: string; // e.g. "Strength", "Cardio", "Stretch", "Mobility"
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  environment: WorkoutEnvironment[];
  difficulty: ExperienceLevel;
  exerciseType: 'Compound' | 'Isolation';
  movementPattern: string; // e.g. "Horizontal Push", "Squat", "Hinge"
  recommendedGoals: string[];
  tags: string[];
  injuryRestrictions: BodyArea[];
  contraindications: string[];
  setsByExperience: {
    beginner: string;
    intermediate: string;
    advanced: string;
  };
  repRangeByGoal: Record<string, string>;
  restSecondsByGoal: Record<string, number>;
  gifUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  datasetPath?: string;
  images?: string[];
  instructions: string[];
  formTips: string[];
  alternatives: string[];
}

export interface WorkoutExercise {
  exerciseId: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  instructions: string[];
  formTips: string[];
  alternativeIds: string[];
  primaryMuscles: string[];
  notes?: string;
  weightTrack?: number; // local progress tracked
}

export interface ActivityStep {
  name: string;
  duration?: string;
  reps?: string;
  description: string;
}

export interface CardioSession {
  type: string;
  duration: number;
  intensity: 'Low' | 'Moderate' | 'High';
  notes: string;
}

export interface DailyWorkout {
  dayName: string; // e.g. "Monday"
  workoutName: string; // e.g. "Upper Body Strength"
  focus: string;
  armFocus?: string; // e.g. "Biceps Peak & Forearm Grip" vs "Triceps Overhead Extension"
  estimatedDurationMinutes?: number; // Target ~60 mins
  warmUp: ActivityStep[];
  exercises: WorkoutExercise[];
  cardio?: CardioSession;
  coolDown: ActivityStep[];
  progressionNotes: string;
  recoveryWarning?: string;
}

export interface NutritionEstimates {
  bmi: number;
  weightCategory: string;
  maintenanceCalories: number;
  fatLossCalories: number;
  muscleGainCalories: number;
  proteinGrams: number;
  waterLiters: number;
}

export interface WeeklySchedule {
  weekNumber: number;
  phaseName: string;
  phaseDescription: string;
  schedule: DailyWorkout[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  version: number;
  createdDate: string;
  userProfile: UserProfile;
  schedule: DailyWorkout[];
  weeklySchedules?: WeeklySchedule[];
  durationMonths: number;
  warnings: string[];
  nutritionEstimates: NutritionEstimates;
  isCustom?: boolean;
}

export interface PlanVersion {
  version: number;
  createdDate: string;
  plan: WorkoutPlan;
}

export interface SavedPlanHistory {
  id: string; // matches WorkoutPlan.id
  name: string;
  currentVersion: number;
  versions: PlanVersion[];
}

export interface ProgressWeightEntry {
  date: string; // YYYY-MM-DD
  weight: number; // kg
}

export interface ProgressMeasurementEntry {
  date: string;
  chest?: number;
  waist?: number;
  biceps?: number;
  thighs?: number;
}

export interface WorkoutCompletionEntry {
  date: string;
  planId: string;
  dayIndex: number; // index of the day in schedule
  workoutName: string;
  notes?: string;
}

export interface PersonalRecordEntry {
  exerciseId: string;
  exerciseName: string;
  weight: number; // max weight in kg
  date: string;
}

export interface ProgressState {
  weights: ProgressWeightEntry[];
  measurements: ProgressMeasurementEntry[];
  completions: WorkoutCompletionEntry[];
  prs: PersonalRecordEntry[];
}
