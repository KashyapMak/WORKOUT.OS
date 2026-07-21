import React, { useState, useMemo } from 'react';
import { Search, Eye, Filter, ShieldAlert, CheckCircle2, RefreshCw, X } from 'lucide-react';
import { EXERCISE_DATABASE } from '../data/exercises';
import { Exercise, BodyArea, ExperienceLevel } from '../types/workout';
import { ExerciseVisualCoach } from './ExerciseVisualCoach';
import { AnimatedExerciseViewer } from './AnimatedExerciseViewer';

export default function ExerciseLibrary() {
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('All');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedPattern, setSelectedPattern] = useState<string>('All');
  const [selectedInjury, setSelectedInjury] = useState<string>('All');
  
  // Selected exercise for detail modal
  const [viewExercise, setViewExercise] = useState<Exercise | null>(null);

  // Muscle lists, equipment lists, and patterns for filters
  const musclesList = useMemo(() => {
    const list = new Set<string>();
    EXERCISE_DATABASE.forEach(ex => {
      ex.primaryMuscles.forEach(m => list.add(m));
      ex.secondaryMuscles.forEach(m => list.add(m));
    });
    return ['All', ...Array.from(list)];
  }, []);

  const equipmentList = useMemo(() => {
    const list = new Set<string>();
    EXERCISE_DATABASE.forEach(ex => {
      ex.equipment.forEach(eq => list.add(eq));
    });
    return ['All', ...Array.from(list)];
  }, []);

  const patternsList = useMemo(() => {
    const list = new Set<string>();
    EXERCISE_DATABASE.forEach(ex => {
      if (ex.movementPattern) list.add(ex.movementPattern);
    });
    return ['All', ...Array.from(list)];
  }, []);

  const injuriesList = useMemo(() => {
    const list = new Set<string>();
    EXERCISE_DATABASE.forEach(ex => {
      ex.injuryRestrictions?.forEach(inj => list.add(inj));
    });
    return ['All', ...Array.from(list)];
  }, []);

  // Filtering Logic
  const filteredExercises = useMemo(() => {
    return EXERCISE_DATABASE.filter(ex => {
      // Search
      const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase()) || 
        ex.category.toLowerCase().includes(search.toLowerCase()) ||
        ex.primaryMuscles.some(m => m.toLowerCase().includes(search.toLowerCase())) ||
        ex.secondaryMuscles.some(m => m.toLowerCase().includes(search.toLowerCase()));

      // Muscle filter
      const matchesMuscle = selectedMuscle === 'All' || 
        ex.primaryMuscles.includes(selectedMuscle) || 
        ex.secondaryMuscles.includes(selectedMuscle);

      // Equipment filter
      const matchesEquipment = selectedEquipment === 'All' || 
        ex.equipment.includes(selectedEquipment);

      // Difficulty filter
      const matchesDifficulty = selectedDifficulty === 'All' || 
        ex.difficulty === selectedDifficulty;

      // Pattern filter
      const matchesPattern = selectedPattern === 'All' || 
        ex.movementPattern === selectedPattern;

      // Injury restriction filter
      const matchesInjury = selectedInjury === 'All' || 
        ex.injuryRestrictions?.includes(selectedInjury as BodyArea);

      return matchesSearch && matchesMuscle && matchesEquipment && matchesDifficulty && matchesPattern && matchesInjury;
    });
  }, [search, selectedMuscle, selectedEquipment, selectedDifficulty, selectedPattern, selectedInjury]);

  const handleSelectAlternative = (altId: string) => {
    const found = EXERCISE_DATABASE.find(e => e.id === altId);
    if (found) {
      setViewExercise(found);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedMuscle('All');
    setSelectedEquipment('All');
    setSelectedDifficulty('All');
    setSelectedPattern('All');
    setSelectedInjury('All');
  };

  return (
    <div className="space-y-6 p-1 sm:p-4 max-w-7xl mx-auto">
      {/* Title */}
      <div className="space-y-2">
        <h1 className="text-3xl font-light tracking-tight text-[#FAF9F6] font-serif" id="library-heading">
          Exercise Library
        </h1>
        <p className="text-[#FAF9F6]/60 text-sm font-serif">
          Browse dynamic instruction guides, equipment demands, and muscle maps of standard fitness exercises.
        </p>
      </div>

      {/* Search and Quick Filters */}
      <div className="bg-[#161616] p-5 rounded-none border border-[#2A2A2A] space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#FAF9F6]/40" />
          <input
            id="exercise-search"
            type="text"
            placeholder="Search exercises by name, primary muscles, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[#111111] rounded-none border border-[#2A2A2A] text-[#FAF9F6] placeholder-[#FAF9F6]/30 focus:outline-none focus:border-[#C5FF4A] text-sm transition-all font-serif"
          />
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Muscle */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#FAF9F6]/40 block uppercase tracking-wider font-mono">Muscle Group</label>
            <select
              id="filter-muscle"
              value={selectedMuscle}
              onChange={(e) => setSelectedMuscle(e.target.value)}
              className="w-full p-2 bg-[#111111] border border-[#2A2A2A] rounded-none text-xs text-[#FAF9F6] focus:outline-none focus:border-[#C5FF4A] font-mono"
            >
              {musclesList.map(m => <option key={m} value={m} className="bg-[#111111]">{m}</option>)}
            </select>
          </div>

          {/* Equipment */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#FAF9F6]/40 block uppercase tracking-wider font-mono">Equipment</label>
            <select
              id="filter-equipment"
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="w-full p-2 bg-[#111111] border border-[#2A2A2A] rounded-none text-xs text-[#FAF9F6] focus:outline-none focus:border-[#C5FF4A] font-mono"
            >
              {equipmentList.map(eq => <option key={eq} value={eq} className="bg-[#111111]">{eq}</option>)}
            </select>
          </div>

          {/* Difficulty */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#FAF9F6]/40 block uppercase tracking-wider font-mono">Difficulty</label>
            <select
              id="filter-difficulty"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full p-2 bg-[#111111] border border-[#2A2A2A] rounded-none text-xs text-[#FAF9F6] focus:outline-none focus:border-[#C5FF4A] font-mono"
            >
              <option value="All" className="bg-[#111111]">All Difficulties</option>
              <option value="Beginner" className="bg-[#111111]">Beginner</option>
              <option value="Intermediate" className="bg-[#111111]">Intermediate</option>
              <option value="Advanced" className="bg-[#111111]">Advanced</option>
            </select>
          </div>

          {/* Movement Pattern */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#FAF9F6]/40 block uppercase tracking-wider font-mono">Movement Pattern</label>
            <select
              id="filter-pattern"
              value={selectedPattern}
              onChange={(e) => setSelectedPattern(e.target.value)}
              className="w-full p-2 bg-[#111111] border border-[#2A2A2A] rounded-none text-xs text-[#FAF9F6] focus:outline-none focus:border-[#C5FF4A] font-mono"
            >
              {patternsList.map(p => <option key={p} value={p} className="bg-[#111111]">{p}</option>)}
            </select>
          </div>

          {/* Injury Restriction */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#FAF9F6]/40 block uppercase tracking-wider font-mono">Avoids Injury Area</label>
            <select
              id="filter-injury"
              value={selectedInjury}
              onChange={(e) => setSelectedInjury(e.target.value)}
              className="w-full p-2 bg-[#111111] border border-[#2A2A2A] rounded-none text-xs text-[#FAF9F6] focus:outline-none focus:border-[#C5FF4A] font-mono"
            >
              {injuriesList.map(inj => <option key={inj} value={inj} className="bg-[#111111]">{inj}</option>)}
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(search || selectedMuscle !== 'All' || selectedEquipment !== 'All' || selectedDifficulty !== 'All' || selectedPattern !== 'All' || selectedInjury !== 'All') && (
          <div className="flex justify-end pt-1">
            <button
              id="btn-clear-filters"
              onClick={clearFilters}
              className="text-xs font-bold text-[#FAF9F6] hover:text-[#C5FF4A] flex items-center gap-1.5 px-3 py-1 bg-[#111111] border border-[#2A2A2A] hover:border-[#C5FF4A] rounded-none cursor-pointer transition-colors font-mono uppercase tracking-wider"
            >
              <X className="h-3.5 w-3.5" />
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Exercise Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="exercise-grid">
        {filteredExercises.map((ex) => (
          <div 
            key={ex.id}
            className="bg-[#161616] rounded-none border border-[#2A2A2A] overflow-hidden flex flex-col hover:border-[#C5FF4A]/50 transition-all duration-200"
            id={`exercise-card-${ex.id}`}
          >
            {/* Upper Content */}
            <div className="p-5 flex-1 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-none border text-xs font-bold font-mono uppercase tracking-wider ${
                  ex.difficulty === 'Beginner' ? 'bg-[#111111] text-[#C5FF4A] border-[#2A2A2A]' :
                  ex.difficulty === 'Intermediate' ? 'bg-[#111111] text-[#C5FF4A] border-[#2A2A2A]' :
                  'bg-[#1a1111] text-rose-400 border-red-900/30'
                }`}>
                  {ex.difficulty}
                </span>
                <span className="text-xs font-bold text-[#FAF9F6]/40 font-mono">
                  {ex.movementPattern}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-light text-[#FAF9F6] font-serif hover:text-[#C5FF4A] transition-colors">
                  {ex.name}
                </h3>
                <p className="text-xs text-[#FAF9F6]/50 font-serif">Category: {ex.category}</p>
              </div>

              {/* Muscle Map */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-[#FAF9F6]/40 uppercase tracking-widest block font-mono">Muscles Targeted</span>
                <div className="flex flex-wrap gap-1.5 font-mono">
                  {ex.primaryMuscles.map(m => (
                    <span key={m} className="px-2 py-0.5 bg-[#111111] border border-[#2A2A2A] rounded-none text-[11px] text-[#FAF9F6]/80">
                      {m}
                    </span>
                  ))}
                  {ex.secondaryMuscles.map(m => (
                    <span key={m} className="px-2 py-0.5 bg-[#111111]/50 border border-dashed border-[#2A2A2A] rounded-none text-[11px] text-[#FAF9F6]/40">
                      {m} (2nd)
                    </span>
                  ))}
                </div>
              </div>

              {/* Injury Warning Badge */}
              {ex.injuryRestrictions && ex.injuryRestrictions.length > 0 && (
                <div className="flex items-center gap-1.5 text-rose-400 bg-[#1a1111] p-2 rounded-none border border-red-950">
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  <span className="text-[11px] font-serif">Caution if injured: {ex.injuryRestrictions.join(', ')}</span>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="px-5 py-4 bg-[#111111] border-t border-[#2A2A2A] flex items-center justify-between font-mono">
              <span className="text-xs text-[#FAF9F6]/50 truncate max-w-[150px]" title={ex.equipment.join(', ')}>
                ⚙️ {ex.equipment[0]}{ex.equipment.length > 1 ? ` +${ex.equipment.length - 1}` : ''}
              </span>
              <button
                id={`btn-view-${ex.id}`}
                onClick={() => setViewExercise(ex)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C5FF4A] hover:text-[#b0f530] cursor-pointer uppercase tracking-wider"
              >
                <Eye className="h-3.5 w-3.5" />
                View Details
              </button>
            </div>
          </div>
        ))}

        {filteredExercises.length === 0 && (
          <div className="col-span-full py-12 text-center space-y-3 bg-[#161616] rounded-none border border-[#2A2A2A]">
            <p className="text-[#FAF9F6]/60 text-sm font-serif">No exercises match your specified filters.</p>
            <button
              onClick={clearFilters}
              className="text-xs font-bold text-[#C5FF4A] hover:underline uppercase tracking-wider font-mono"
            >
              Clear filters and search again
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {viewExercise && (
        <div className="fixed inset-0 bg-[#000000]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#161616] rounded-none border border-[#2A2A2A] max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-none">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[#2A2A2A] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-light text-[#FAF9F6] font-serif">{viewExercise.name}</h2>
                <p className="text-xs text-[#FAF9F6]/50 font-serif">Movement Pattern: {viewExercise.movementPattern} | Category: {viewExercise.category}</p>
              </div>
              <button 
                onClick={() => setViewExercise(null)}
                className="p-1.5 hover:bg-[#111111] rounded-none text-[#FAF9F6]/40 hover:text-[#FAF9F6] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Equipment & Level info */}
              <div className="grid grid-cols-2 gap-4 bg-[#111111] p-4 border border-[#2A2A2A] rounded-none font-mono">
                <div>
                  <span className="text-[10px] font-bold text-[#FAF9F6]/40 uppercase tracking-wider block">Equipment Required</span>
                  <p className="text-xs font-bold text-[#FAF9F6]">{viewExercise.equipment.join(', ')}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#FAF9F6]/40 uppercase tracking-wider block">Skill Level</span>
                  <p className="text-xs font-bold text-[#C5FF4A]">{viewExercise.difficulty}</p>
                </div>
              </div>

              {/* Reference Gif / Video / Live Animated Coach */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#FAF9F6]/40 uppercase tracking-wider block font-mono">Visual Performance Reference</span>
                {viewExercise.images || viewExercise.gifUrl || viewExercise.videoUrl ? (
                  <div className="border border-[#2A2A2A] bg-[#111111] p-1 flex items-center justify-center relative overflow-hidden h-48">
                    {viewExercise.images || viewExercise.gifUrl ? (
                      <AnimatedExerciseViewer 
                        images={viewExercise.images}
                        fallbackUrl={viewExercise.gifUrl}
                        alt={viewExercise.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <iframe 
                        src={viewExercise.videoUrl} 
                        title={viewExercise.name} 
                        className="w-full h-full border-none"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    )}
                  </div>
                ) : (
                  <div className="border border-[#2A2A2A] rounded-none overflow-hidden relative">
                    <div className="absolute top-2 left-2 z-20 px-2 py-0.5 bg-[#111111]/80 border border-[#2A2A2A] text-[9px] font-mono font-bold text-[#C5FF4A] uppercase tracking-wider">
                      Live Form Coach
                    </div>
                    <ExerciseVisualCoach 
                      exerciseName={viewExercise.name} 
                      category={viewExercise.category} 
                      isResting={false} 
                    />
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-[#FAF9F6]/40 uppercase tracking-wider font-mono">Step-by-Step Instructions</h4>
                <ol className="space-y-2 text-sm text-[#FAF9F6]/80 font-serif">
                  {viewExercise.instructions.map((inst, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 h-5 w-5 bg-[#111111] border border-[#2A2A2A] flex items-center justify-center text-xs font-bold font-mono text-[#C5FF4A]">
                        {index + 1}
                      </span>
                      <span className="leading-relaxed">{inst}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Form Tips */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-[#FAF9F6]/40 uppercase tracking-wider font-mono">Form & Safety Tips</h4>
                <ul className="space-y-2 text-sm text-[#FAF9F6]/80 font-serif">
                  {viewExercise.formTips.map((tip, idx) => (
                    <li key={idx} className="flex gap-2.5 items-start">
                      <CheckCircle2 className="h-4 w-4 text-[#C5FF4A] flex-shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Injury Warning */}
              {viewExercise.injuryRestrictions && viewExercise.injuryRestrictions.length > 0 && (
                <div className="space-y-2.5 p-4 bg-[#1a1111] border border-red-950 rounded-none">
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <ShieldAlert className="h-4 w-4 text-rose-400" />
                    Injury & Contraindications
                  </h4>
                  <p className="text-xs text-rose-300 leading-relaxed font-serif">
                    This exercise can stress the following joints: <strong>{viewExercise.injuryRestrictions.join(', ')}</strong>. 
                    Avoid this movement if you experience severe pain.
                  </p>
                  {viewExercise.contraindications && viewExercise.contraindications.length > 0 && (
                    <p className="text-xs text-rose-300 font-serif">
                      <strong>Do not perform:</strong> {viewExercise.contraindications.join(', ')}.
                    </p>
                  )}
                </div>
              )}

              {/* Alternatives Chain */}
              {viewExercise.alternatives && viewExercise.alternatives.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-[#FAF9F6]/40 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <RefreshCw className="h-4 w-4 text-[#C5FF4A]" />
                    Recommended Alternatives
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {viewExercise.alternatives.map(altId => {
                      const altDetails = EXERCISE_DATABASE.find(e => e.id === altId);
                      if (!altDetails) return null;
                      return (
                        <button
                          key={altId}
                          onClick={() => handleSelectAlternative(altId)}
                          className="px-3 py-1.5 bg-[#111111] hover:bg-[#161616] border border-[#2A2A2A] hover:border-[#C5FF4A] rounded-none text-xs font-bold text-[#FAF9F6]/80 hover:text-[#C5FF4A] cursor-pointer transition-colors font-mono"
                        >
                          {altDetails.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#111111] border-t border-[#2A2A2A] flex justify-end font-mono">
              <button
                onClick={() => setViewExercise(null)}
                className="px-4 py-2 bg-[#C5FF4A] hover:bg-[#b0f530] text-[#111111] text-xs font-bold uppercase tracking-wider rounded-none transition-colors cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
