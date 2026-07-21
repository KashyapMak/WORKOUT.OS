import { Exercise } from '../types/workout';
import exercisesData from './exercises.json';

export const EXERCISE_DATABASE: Exercise[] = exercisesData as unknown as Exercise[];
