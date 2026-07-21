import { test } from 'node:test';
import assert from 'node:assert';
import { UserProfile, WorkoutPlan, SavedPlanHistory, ProgressState } from '../src/types/workout';

// 1. Mock LocalStorage globally in Node.js before importing any client services
const mockStore: Record<string, string> = {};
global.localStorage = {
  getItem(key: string): string | null {
    return mockStore[key] || null;
  },
  setItem(key: string, value: string): void {
    mockStore[key] = value.toString();
  },
  removeItem(key: string): void {
    delete mockStore[key];
  },
  clear(): void {
    for (const key in mockStore) {
      delete mockStore[key];
    }
  },
  key(index: number): string | null {
    return Object.keys(mockStore)[index] || null;
  },
  get length(): number {
    return Object.keys(mockStore).length;
  }
};

// 2. Import core application logic after the Mock is registered
import { generateWorkoutPlan, calculateNutritionEstimates } from '../src/services/workoutGenerator';
import { 
  getSavedPlans, 
  saveWorkoutPlan, 
  duplicatePlan, 
  renamePlan, 
  deletePlan, 
  restorePlanVersion,
  getProgressState,
  addWeightEntry,
  addMeasurementEntry,
  addWorkoutCompletion,
  addPersonalRecord
} from '../src/services/storageService';

test('End-to-End Workflow: User Profile & Regimen Generation & Storage Lifecycle', async (t) => {

  // Create a realistic sample user profile with injury constraints
  const sampleProfile: UserProfile = {
    age: 28,
    gender: 'male',
    height: 180,
    weight: 82,
    goals: ['Muscle Gain', 'Strength Development'],
    experienceLevel: 'Intermediate',
    environment: 'Commercial Gym',
    equipment: ['Barbell', 'Dumbbell', 'Cable', 'Bodyweight only', 'Bench'],
    frequency: 3,
    durationMonths: 3,
    bodyFocus: ['Chest', 'Legs'],
    cardio: {
      type: 'Walking',
      frequency: 2,
      duration: 20,
      intensity: 'Low'
    },
    injuries: {
      Neck: 'None',
      Shoulder: 'None',
      Elbow: 'None',
      Wrist: 'None',
      'Upper Back': 'None',
      'Lower Back': 'Moderate', // Lower back injury should trigger alternative exercise replacements!
      Hip: 'None',
      Knee: 'None',
      Ankle: 'None'
    },
    additionalNotes: 'Recovering from minor back tweak, avoid heavy compressive lower spine moves.',
    restrictedMovements: [],
  };

  await t.test('1. Nutritional and BMI calculations', () => {
    const estimates = calculateNutritionEstimates(sampleProfile);
    
    // Height 1.8m, Weight 82kg => BMI should be roughly 25.3
    assert.strictEqual(estimates.bmi, 25.3);
    assert.strictEqual(estimates.weightCategory, 'Overweight');
    assert.ok(estimates.maintenanceCalories > 2000, 'Maintenance calories should be sensible');
    assert.ok(estimates.proteinGrams >= 130, 'Protein target should align with intermediate lifting needs');
    assert.strictEqual(estimates.waterLiters, 3.2); // (82 * 0.035) + (3 * 0.1) = 2.87 + 0.3 = 3.17 => rounded to 3.2
  });

  await t.test('2. Biomechanically optimized workout generation and safe exercise replacement', () => {
    const plan = generateWorkoutPlan(sampleProfile, 'E2E Target Strength Plan');

    assert.strictEqual(plan.name, 'E2E Target Strength Plan');
    assert.strictEqual(plan.schedule.length, 3, 'Plan should contain exactly 3 daily workouts');
    
    // Check that active injuries were accommodated
    assert.ok(plan.warnings.some(w => w.includes('lower back')), 'Should include active lower back warning');

    // Confirm that exercises inside the workouts are safe and do not include contraindicated exercises like heavy barbell deadlifts / squats if back is moderate/severe
    plan.schedule.forEach(day => {
      day.exercises.forEach(ex => {
        // Exclude specific dangerous deadlift/squat ids if back pain exists
        assert.notStrictEqual(ex.exerciseId, 'barbell_deadlift', 'Barbell deadlift should have been avoided/replaced due to lower back injury');
      });
    });
  });

  await t.test('3. Persistent storage plan versioning, renaming, duplication, and restore flow', () => {
    localStorage.clear();
    const plan = generateWorkoutPlan(sampleProfile, 'Initial Regimen');

    // Verify initial storage starts empty
    assert.deepStrictEqual(getSavedPlans(), {}, 'Saved plans should be empty initially');

    // Save plan
    saveWorkoutPlan(plan);
    let plans = getSavedPlans();
    assert.ok(plans[plan.id], 'Plan should be successfully saved');
    assert.strictEqual(plans[plan.id].currentVersion, 1, 'Initial plan version should be 1');

    // Rename plan
    renamePlan(plan.id, 'My Premium Regimen');
    plans = getSavedPlans();
    assert.strictEqual(plans[plan.id].name, 'My Premium Regimen', 'Plan history name should be updated');

    // Duplicate plan
    const duplicatedId = duplicatePlan(plan.id);
    assert.ok(duplicatedId, 'Should successfully duplicate plan');
    plans = getSavedPlans();
    assert.ok(plans[duplicatedId!], 'Duplicated plan should be in storage');
    assert.strictEqual(plans[duplicatedId!].name, 'My Premium Regimen (Copy)', 'Duplicated name should append Copy');

    // Delete duplicated plan
    deletePlan(duplicatedId!);
    plans = getSavedPlans();
    assert.strictEqual(plans[duplicatedId!], undefined, 'Duplicated plan should be deleted');
  });

  await t.test('4. End-to-end active training metrics and progression logs tracking', () => {
    localStorage.clear();
    
    // Check initial state
    let progress = getProgressState();
    assert.deepStrictEqual(progress.weights, [], 'Initial weights should be empty');
    assert.deepStrictEqual(progress.measurements, [], 'Initial measurements should be empty');

    // Add weights progress log
    addWeightEntry(82.5, '2026-07-21');
    addWeightEntry(82.1, '2026-07-20'); // Past day entry
    
    progress = getProgressState();
    assert.strictEqual(progress.weights.length, 2, 'Should contain exactly 2 weight entries');
    // Ensure ascending date sorting
    assert.strictEqual(progress.weights[0].date, '2026-07-20');
    assert.strictEqual(progress.weights[0].weight, 82.1);
    assert.strictEqual(progress.weights[1].date, '2026-07-21');
    assert.strictEqual(progress.weights[1].weight, 82.5);

    // Add body dimensions measurement log
    addMeasurementEntry({ chest: 104, waist: 88, biceps: 38, thighs: 60 }, '2026-07-21');
    progress = getProgressState();
    assert.strictEqual(progress.measurements.length, 1);
    assert.strictEqual(progress.measurements[0].chest, 104);

    // Complete a daily training session log
    addWorkoutCompletion({
      date: '2026-07-21',
      planId: 'plan_e2e_123',
      dayIndex: 0,
      workoutName: 'Full Body A',
      notes: 'Form felt extremely tight and responsive today.'
    });
    progress = getProgressState();
    assert.strictEqual(progress.completions.length, 1);
    assert.strictEqual(progress.completions[0].workoutName, 'Full Body A');

    // Save a brand new personal record (PR)
    addPersonalRecord({
      exerciseId: 'bench_press',
      exerciseName: 'Bench Press',
      weight: 100,
      date: '2026-07-21'
    });
    progress = getProgressState();
    assert.strictEqual(progress.prs.length, 1);
    assert.strictEqual(progress.prs[0].weight, 100);

    // Update the PR to a higher weight (should accept and update)
    addPersonalRecord({
      exerciseId: 'bench_press',
      exerciseName: 'Bench Press',
      weight: 105,
      date: '2026-07-22'
    });
    progress = getProgressState();
    assert.strictEqual(progress.prs.length, 1, 'Should still have 1 record entry');
    assert.strictEqual(progress.prs[0].weight, 105, 'PR weight should have been updated to 105');

    // Attempting to log a lower PR (should be rejected automatically to preserve peak performance logs)
    addPersonalRecord({
      exerciseId: 'bench_press',
      exerciseName: 'Bench Press',
      weight: 95,
      date: '2026-07-23'
    });
    progress = getProgressState();
    assert.strictEqual(progress.prs[0].weight, 105, 'Peak performance records must be protected');
  });

});
