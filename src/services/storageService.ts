import { WorkoutPlan, SavedPlanHistory, ProgressState, ProgressWeightEntry, ProgressMeasurementEntry, WorkoutCompletionEntry, PersonalRecordEntry } from '../types/workout';

const PLANS_KEY = 'workout_plans_v1';
const PROGRESS_KEY = 'workout_progress_v1';

// Initial Progress state
const defaultProgressState: ProgressState = {
  weights: [],
  measurements: [],
  completions: [],
  prs: []
};

// Retrieve all plan histories from localStorage
export function getSavedPlans(): Record<string, SavedPlanHistory> {
  try {
    const data = localStorage.getItem(PLANS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('Failed to read plans from local storage:', e);
    return {};
  }
}

// Save or update a plan history in localStorage
export function savePlanHistory(history: SavedPlanHistory): void {
  try {
    const plans = getSavedPlans();
    plans[history.id] = history;
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  } catch (e) {
    console.error('Failed to save plan history to local storage:', e);
  }
}

// Save a newly generated or updated plan as a new version
export function saveWorkoutPlan(plan: WorkoutPlan): void {
  const plans = getSavedPlans();
  let history = plans[plan.id];

  if (!history) {
    // New plan entirely
    history = {
      id: plan.id,
      name: plan.name,
      currentVersion: 1,
      versions: [
        {
          version: 1,
          createdDate: new Date().toLocaleDateString(),
          plan: { ...plan, version: 1 }
        }
      ]
    };
  } else {
    // Plan already exists, increment version
    const newVersionNum = history.currentVersion + 1;
    history.currentVersion = newVersionNum;
    history.versions.push({
      version: newVersionNum,
      createdDate: new Date().toLocaleDateString(),
      plan: { ...plan, version: newVersionNum }
    });
  }

  savePlanHistory(history);
}

// Duplicate an existing plan
export function duplicatePlan(planId: string): string | null {
  const plans = getSavedPlans();
  const history = plans[planId];
  if (!history) return null;

  const currentActivePlan = history.versions.find(v => v.version === history.currentVersion)?.plan;
  if (!currentActivePlan) return null;

  const newId = `plan_${Date.now()}`;
  const duplicatedPlan: WorkoutPlan = {
    ...currentActivePlan,
    id: newId,
    name: `${currentActivePlan.name} (Copy)`,
    version: 1
  };

  const newHistory: SavedPlanHistory = {
    id: newId,
    name: duplicatedPlan.name,
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdDate: new Date().toLocaleDateString(),
        plan: duplicatedPlan
      }
    ]
  };

  savePlanHistory(newHistory);
  return newId;
}

// Rename a plan
export function renamePlan(planId: string, newName: string): void {
  const plans = getSavedPlans();
  const history = plans[planId];
  if (history) {
    history.name = newName;
    history.versions = history.versions.map(v => ({
      ...v,
      plan: { ...v.plan, name: newName }
    }));
    savePlanHistory(history);
  }
}

// Delete an entire plan history
export function deletePlan(planId: string): void {
  try {
    const plans = getSavedPlans();
    delete plans[planId];
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  } catch (e) {
    console.error('Failed to delete plan from local storage:', e);
  }
}

// Delete a specific version of a plan
export function deletePlanVersion(planId: string, versionNumber: number): void {
  const plans = getSavedPlans();
  const history = plans[planId];
  if (history) {
    history.versions = history.versions.filter(v => v.version !== versionNumber);
    if (history.versions.length === 0) {
      deletePlan(planId);
    } else {
      // Re-set active version if the deleted one was current
      if (history.currentVersion === versionNumber) {
        history.currentVersion = history.versions[history.versions.length - 1].version;
      }
      savePlanHistory(history);
    }
  }
}

// Restore a previous version as the current version
export function restorePlanVersion(planId: string, versionNumber: number): void {
  const plans = getSavedPlans();
  const history = plans[planId];
  if (history) {
    const versionExists = history.versions.some(v => v.version === versionNumber);
    if (versionExists) {
      history.currentVersion = versionNumber;
      savePlanHistory(history);
    }
  }
}

// === PROGRESS TRACKER LOGIC ===

// Retrieve all progress state from localStorage
export function getProgressState(): ProgressState {
  try {
    const data = localStorage.getItem(PROGRESS_KEY);
    return data ? JSON.parse(data) : defaultProgressState;
  } catch (e) {
    console.error('Failed to read progress from local storage:', e);
    return defaultProgressState;
  }
}

// Save complete progress state
export function saveProgressState(state: ProgressState): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save progress to local storage:', e);
  }
}

// Add body weight entry
export function addWeightEntry(weight: number, date?: string): void {
  const state = getProgressState();
  const entryDate = date || new Date().toISOString().split('T')[0];
  
  // Update if date already exists, or append
  const existingIdx = state.weights.findIndex(w => w.date === entryDate);
  if (existingIdx >= 0) {
    state.weights[existingIdx].weight = weight;
  } else {
    state.weights.push({ date: entryDate, weight });
  }
  
  // Sort by date ascending
  state.weights.sort((a, b) => a.date.localeCompare(b.date));
  saveProgressState(state);
}

// Delete weight entry
export function deleteWeightEntry(date: string): void {
  const state = getProgressState();
  state.weights = state.weights.filter(w => w.date !== date);
  saveProgressState(state);
}

// Add body measurements entry
export function addMeasurementEntry(measurements: Omit<ProgressMeasurementEntry, 'date'>, date?: string): void {
  const state = getProgressState();
  const entryDate = date || new Date().toISOString().split('T')[0];
  
  const existingIdx = state.measurements.findIndex(m => m.date === entryDate);
  if (existingIdx >= 0) {
    state.measurements[existingIdx] = { ...measurements, date: entryDate };
  } else {
    state.measurements.push({ ...measurements, date: entryDate });
  }
  
  state.measurements.sort((a, b) => a.date.localeCompare(b.date));
  saveProgressState(state);
}

// Delete measurement entry
export function deleteMeasurementEntry(date: string): void {
  const state = getProgressState();
  state.measurements = state.measurements.filter(m => m.date !== date);
  saveProgressState(state);
}

// Add workout completion entry
export function addWorkoutCompletion(completion: WorkoutCompletionEntry): void {
  const state = getProgressState();
  // Check for duplicates on same day/plan
  const duplicate = state.completions.some(c => c.date === completion.date && c.planId === completion.planId && c.dayIndex === completion.dayIndex);
  if (!duplicate) {
    state.completions.push(completion);
    state.completions.sort((a, b) => a.date.localeCompare(b.date));
    saveProgressState(state);
  }
}

// Delete workout completion
export function deleteWorkoutCompletion(date: string, planId: string, dayIndex: number): void {
  const state = getProgressState();
  state.completions = state.completions.filter(c => !(c.date === date && c.planId === planId && c.dayIndex === dayIndex));
  saveProgressState(state);
}

// Add or update Personal Record (PR)
export function addPersonalRecord(pr: PersonalRecordEntry): void {
  const state = getProgressState();
  const existingIdx = state.prs.findIndex(p => p.exerciseId === pr.exerciseId);
  
  if (existingIdx >= 0) {
    // Only update if the new weight is higher
    if (pr.weight > state.prs[existingIdx].weight) {
      state.prs[existingIdx] = pr;
    }
  } else {
    state.prs.push(pr);
  }
  
  saveProgressState(state);
}

// Delete PR
export function deletePersonalRecord(exerciseId: string): void {
  const state = getProgressState();
  state.prs = state.prs.filter(p => p.exerciseId !== exerciseId);
  saveProgressState(state);
}
