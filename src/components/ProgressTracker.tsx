import React, { useState, useEffect } from 'react';
import { 
  getProgressState, 
  addWeightEntry, 
  deleteWeightEntry, 
  addMeasurementEntry, 
  deleteMeasurementEntry, 
  addPersonalRecord, 
  deletePersonalRecord 
} from '../services/storageService';
import { ProgressState, ProgressWeightEntry, ProgressMeasurementEntry, PersonalRecordEntry } from '../types/workout';
import { LineChart, Plus, Trash2, Calendar, Scale, Ruler, Dumbbell, Sparkles } from 'lucide-react';

export default function ProgressTracker() {
  const [state, setState] = useState<ProgressState>(getProgressState());
  
  // Weights form
  const [weightInput, setWeightInput] = useState('');
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split('T')[0]);

  // Measurements form
  const [mDate, setMDate] = useState(new Date().toISOString().split('T')[0]);
  const [chestInput, setChestInput] = useState('');
  const [waistInput, setWaistInput] = useState('');
  const [bicepsInput, setBicepsInput] = useState('');
  const [thighsInput, setThighsInput] = useState('');

  // PR Form
  const [prExercise, setPrExercise] = useState('');
  const [prWeight, setPrWeight] = useState('');
  const [prDate, setPrDate] = useState(new Date().toISOString().split('T')[0]);

  // Read state on load
  const refreshData = () => {
    setState(getProgressState());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleAddWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(weightInput);
    if (!isNaN(val) && val > 0) {
      addWeightEntry(val, weightDate);
      setWeightInput('');
      refreshData();
    }
  };

  const handleAddMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      chest: chestInput ? parseFloat(chestInput) : undefined,
      waist: waistInput ? parseFloat(waistInput) : undefined,
      biceps: bicepsInput ? parseFloat(bicepsInput) : undefined,
      thighs: thighsInput ? parseFloat(thighsInput) : undefined,
    };
    addMeasurementEntry(payload, mDate);
    setChestInput('');
    setWaistInput('');
    setBicepsInput('');
    setThighsInput('');
    refreshData();
  };

  const handleAddPR = (e: React.FormEvent) => {
    e.preventDefault();
    const weightVal = parseFloat(prWeight);
    if (prExercise.trim() && !isNaN(weightVal)) {
      addPersonalRecord({
        exerciseId: prExercise.toLowerCase().replace(/\s+/g, '_'),
        exerciseName: prExercise,
        weight: weightVal,
        date: prDate
      });
      setPrExercise('');
      setPrWeight('');
      refreshData();
    }
  };

  // Custom Responsive SVG Chart Generator for Weight Trend
  const renderWeightChart = () => {
    const data = state.weights;
    if (data.length < 2) {
      return (
        <div className="h-48 flex flex-col items-center justify-center text-[#FAF9F6]/40 bg-[#111111] border border-dashed border-[#2A2A2A] rounded-none font-serif">
          <LineChart className="h-8 w-8 mb-2 stroke-1 text-[#FAF9F6]/30" />
          <p className="text-xs">Log at least 2 weight records to generate a visual trend chart.</p>
        </div>
      );
    }

    const width = 500;
    const height = 200;
    const padding = 40;

    const weights = data.map(d => d.weight);
    const minW = Math.min(...weights) - 2;
    const maxW = Math.max(...weights) + 2;
    const rangeW = maxW - minW || 1;

    // Calculate Coordinates
    const points = data.map((d, index) => {
      const x = padding + (index / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((d.weight - minW) / rangeW) * (height - padding * 2);
      return { x, y, ...d };
    });

    // Build SVG Polyline path
    const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    // Build Area closed path (for gradient fill)
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <div className="w-full overflow-x-auto bg-[#111111] p-4 rounded-none border border-[#2A2A2A]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[400px]">
          {/* Gradients */}
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C5FF4A" stopOpacity="0.15"/>
              <stop offset="100%" stopColor="#C5FF4A" stopOpacity="0.0"/>
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#2A2A2A" strokeWidth="1" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#2A2A2A" strokeWidth="1" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#2A2A2A" strokeWidth="1.5" />

          {/* Chart Line with gradient area */}
          <path d={areaD} fill="url(#chartGrad)" />
          <path d={pathD} fill="none" stroke="#C5FF4A" strokeWidth="2.5" strokeLinecap="round" />

          {/* Data Points */}
          {points.map((p, idx) => (
            <g key={idx} className="group">
              <circle cx={p.x} cy={p.y} r="4" fill="#111111" stroke="#C5FF4A" strokeWidth="2" className="transition-all hover:r-6 cursor-pointer" />
              {/* Text label */}
              <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" className="fill-[#FAF9F6] font-bold font-mono">
                {p.weight}kg
              </text>
              {/* Date label */}
              <text x={p.x} y={height - 15} textAnchor="middle" fontSize="8" className="fill-[#FAF9F6]/40 font-mono">
                {p.date.substring(5)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-8 p-1 sm:p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-light tracking-tight text-[#FAF9F6] font-serif" id="progress-heading">
          Progress Tracker
        </h1>
        <p className="text-[#FAF9F6]/60 text-sm font-serif">
          Log measurements, weight, and lift history on-device to visualize physical and strength progression.
        </p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-[#161616] border border-[#2A2A2A] p-5 rounded-none flex items-center gap-4">
          <div className="h-12 w-12 bg-[#111111] border border-[#2A2A2A] rounded-none flex items-center justify-center text-[#C5FF4A]">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#FAF9F6]/40 block uppercase tracking-wider font-mono">Current Weight</span>
            <span className="text-2xl font-light text-[#FAF9F6] font-serif">
              {state.weights.length > 0 ? `${state.weights[state.weights.length - 1].weight} kg` : '--'}
            </span>
          </div>
        </div>

        <div className="bg-[#161616] border border-[#2A2A2A] p-5 rounded-none flex items-center gap-4">
          <div className="h-12 w-12 bg-[#111111] border border-[#2A2A2A] rounded-none flex items-center justify-center text-[#C5FF4A]">
            <Dumbbell className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#FAF9F6]/40 block uppercase tracking-wider font-mono">Logged PRs</span>
            <span className="text-2xl font-light text-[#FAF9F6] font-serif">
              {state.prs.length} Exercises
            </span>
          </div>
        </div>

        <div className="bg-[#161616] border border-[#2A2A2A] p-5 rounded-none flex items-center gap-4">
          <div className="h-12 w-12 bg-[#111111] border border-[#2A2A2A] rounded-none flex items-center justify-center text-[#C5FF4A]">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#FAF9F6]/40 block uppercase tracking-wider font-mono">Sessions Completed</span>
            <span className="text-2xl font-light text-[#FAF9F6] font-serif">
              {state.completions.length} Workouts
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Input logs */}
        <div className="lg:col-span-1 space-y-6">
          {/* Weight log input */}
          <div className="bg-[#161616] p-5 rounded-none border border-[#2A2A2A] space-y-4" id="log-weight-section">
            <h3 className="text-sm font-light text-[#FAF9F6] font-serif flex items-center gap-2">
              <Scale className="h-5 w-5 text-[#C5FF4A]" />
              Log Current Weight
            </h3>
            <form onSubmit={handleAddWeight} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  id="log-weight-val"
                  type="number"
                  step="0.1"
                  required
                  placeholder="Weight (kg)"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="w-full p-2.5 bg-[#111111] border border-[#2A2A2A] text-[#FAF9F6] focus:outline-none focus:border-[#C5FF4A] text-xs font-mono rounded-none"
                />
                <input
                  id="log-weight-date"
                  type="date"
                  required
                  value={weightDate}
                  onChange={(e) => setWeightDate(e.target.value)}
                  className="w-full p-2.5 bg-[#111111] border border-[#2A2A2A] text-[#FAF9F6] focus:outline-none focus:border-[#C5FF4A] text-xs font-mono rounded-none"
                />
              </div>
              <button
                type="submit"
                id="btn-add-weight"
                className="w-full py-2 bg-[#C5FF4A] hover:bg-[#b0f530] rounded-none text-xs font-bold text-[#111111] flex items-center justify-center gap-1.5 cursor-pointer transition-all font-mono uppercase tracking-wider"
              >
                <Plus className="h-4 w-4" />
                Add Record
              </button>
            </form>
          </div>

          {/* Measurements log input */}
          <div className="bg-[#161616] p-5 rounded-none border border-[#2A2A2A] space-y-4" id="log-measurements-section">
            <h3 className="text-sm font-light text-[#FAF9F6] font-serif flex items-center gap-2">
              <Ruler className="h-5 w-5 text-[#C5FF4A]" />
              Log Body Measurements
            </h3>
            <form onSubmit={handleAddMeasurement} className="space-y-3">
              <input
                id="log-m-date"
                type="date"
                required
                value={mDate}
                onChange={(e) => setMDate(e.target.value)}
                className="w-full p-2.5 bg-[#111111] border border-[#2A2A2A] text-[#FAF9F6] focus:outline-none focus:border-[#C5FF4A] text-xs font-mono rounded-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  id="log-m-chest"
                  type="number"
                  step="0.1"
                  placeholder="Chest (cm)"
                  value={chestInput}
                  onChange={(e) => setChestInput(e.target.value)}
                  className="w-full p-2 bg-[#111111] border border-[#2A2A2A] text-[#FAF9F6] text-xs font-mono rounded-none focus:outline-none focus:border-[#C5FF4A]"
                />
                <input
                  id="log-m-waist"
                  type="number"
                  step="0.1"
                  placeholder="Waist (cm)"
                  value={waistInput}
                  onChange={(e) => setWaistInput(e.target.value)}
                  className="w-full p-2 bg-[#111111] border border-[#2A2A2A] text-[#FAF9F6] text-xs font-mono rounded-none focus:outline-none focus:border-[#C5FF4A]"
                />
                <input
                  id="log-m-biceps"
                  type="number"
                  step="0.1"
                  placeholder="Bicep (cm)"
                  value={bicepsInput}
                  onChange={(e) => setBicepsInput(e.target.value)}
                  className="w-full p-2 bg-[#111111] border border-[#2A2A2A] text-[#FAF9F6] text-xs font-mono rounded-none focus:outline-none focus:border-[#C5FF4A]"
                />
                <input
                  id="log-m-thighs"
                  type="number"
                  step="0.1"
                  placeholder="Thighs (cm)"
                  value={thighsInput}
                  onChange={(e) => setThighsInput(e.target.value)}
                  className="w-full p-2 bg-[#111111] border border-[#2A2A2A] text-[#FAF9F6] text-xs font-mono rounded-none focus:outline-none focus:border-[#C5FF4A]"
                />
              </div>
              <button
                type="submit"
                id="btn-add-m"
                className="w-full py-2 bg-[#C5FF4A] hover:bg-[#b0f530] rounded-none text-xs font-bold text-[#111111] flex items-center justify-center gap-1.5 cursor-pointer transition-all font-mono uppercase tracking-wider"
              >
                <Plus className="h-4 w-4" />
                Add Measurements
              </button>
            </form>
          </div>

          {/* Personal Record input */}
          <div className="bg-[#161616] p-5 rounded-none border border-[#2A2A2A] space-y-4" id="log-pr-section">
            <h3 className="text-sm font-light text-[#FAF9F6] font-serif flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-[#C5FF4A]" />
              Log Exercise Personal Record
            </h3>
            <form onSubmit={handleAddPR} className="space-y-3">
              <input
                id="log-pr-exercise"
                type="text"
                required
                placeholder="Exercise (e.g. Bench Press)"
                value={prExercise}
                onChange={(e) => setPrExercise(e.target.value)}
                className="w-full p-2.5 bg-[#111111] border border-[#2A2A2A] text-[#FAF9F6] focus:outline-none focus:border-[#C5FF4A] text-xs font-mono rounded-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  id="log-pr-weight"
                  type="number"
                  required
                  placeholder="Max Weight (kg)"
                  value={prWeight}
                  onChange={(e) => setPrWeight(e.target.value)}
                  className="w-full p-2 bg-[#111111] border border-[#2A2A2A] text-[#FAF9F6] text-xs font-mono rounded-none focus:outline-none focus:border-[#C5FF4A]"
                />
                <input
                  id="log-pr-date"
                  type="date"
                  required
                  value={prDate}
                  onChange={(e) => setPrDate(e.target.value)}
                  className="w-full p-2 bg-[#111111] border border-[#2A2A2A] text-[#FAF9F6] text-xs font-mono rounded-none focus:outline-none focus:border-[#C5FF4A]"
                />
              </div>
              <button
                type="submit"
                id="btn-add-pr"
                className="w-full py-2 bg-[#C5FF4A] hover:bg-[#b0f530] rounded-none text-xs font-bold text-[#111111] flex items-center justify-center gap-1.5 cursor-pointer transition-all font-mono uppercase tracking-wider"
              >
                <Plus className="h-4 w-4" />
                Record Lift PR
              </button>
            </form>
          </div>
        </div>

        {/* Right: Charts and Log Lists */}
        <div className="lg:col-span-2 space-y-6">
          {/* Weight trend visualizer */}
          <div className="bg-[#161616] p-6 rounded-none border border-[#2A2A2A] space-y-4">
            <h3 className="text-base font-light text-[#FAF9F6] font-serif flex items-center gap-2">
              <LineChart className="h-5 w-5 text-[#C5FF4A]" />
              On-Device Weight Trend (kg)
            </h3>
            {renderWeightChart()}
          </div>

          {/* Records lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Body weight logs table */}
            <div className="bg-[#161616] p-5 rounded-none border border-[#2A2A2A] space-y-3">
              <h4 className="font-light text-sm text-[#FAF9F6] font-serif">Historic Weight Logs</h4>
              {state.weights.length === 0 ? (
                <p className="text-xs text-[#FAF9F6]/40 font-serif">No weight entries logged yet.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto border border-[#2A2A2A] rounded-none font-mono">
                  <table className="w-full text-left text-xs text-[#FAF9F6]/80">
                    <thead className="bg-[#111111] text-[#FAF9F6]/40 uppercase tracking-wider font-bold text-[10px]">
                      <tr>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Weight</th>
                        <th className="px-4 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2A2A]">
                      {state.weights.slice().reverse().map(w => (
                        <tr key={w.date} className="hover:bg-[#111111]/40">
                          <td className="px-4 py-2.5 font-bold">{w.date}</td>
                          <td className="px-4 py-2.5 font-bold text-[#C5FF4A]">{w.weight} kg</td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              onClick={() => { deleteWeightEntry(w.date); refreshData(); }}
                              className="text-[#FAF9F6]/40 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Circumference list */}
            <div className="bg-[#161616] p-5 rounded-none border border-[#2A2A2A] space-y-3">
              <h4 className="font-light text-sm text-[#FAF9F6] font-serif">Measurement History</h4>
              {state.measurements.length === 0 ? (
                <p className="text-xs text-[#FAF9F6]/40 font-serif">No measurements logged yet.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto border border-[#2A2A2A] rounded-none font-mono">
                  <table className="w-full text-left text-xs text-[#FAF9F6]/80">
                    <thead className="bg-[#111111] text-[#FAF9F6]/40 uppercase tracking-wider font-bold text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Stats</th>
                        <th className="px-3 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2A2A]">
                      {state.measurements.slice().reverse().map(m => (
                        <tr key={m.date} className="hover:bg-[#111111]/40">
                          <td className="px-3 py-2.5 font-bold whitespace-nowrap">{m.date}</td>
                          <td className="px-3 py-2.5 space-y-0.5 text-xs text-[#FAF9F6]/60">
                            {m.chest && <span className="block text-[10px]">Chest: <strong className="text-[#C5FF4A] font-bold">{m.chest}cm</strong></span>}
                            {m.waist && <span className="block text-[10px]">Waist: <strong className="text-[#C5FF4A] font-bold">{m.waist}cm</strong></span>}
                            {m.biceps && <span className="block text-[10px]">Bicep: <strong className="text-[#C5FF4A] font-bold">{m.biceps}cm</strong></span>}
                            {m.thighs && <span className="block text-[10px]">Thighs: <strong className="text-[#C5FF4A] font-bold">{m.thighs}cm</strong></span>}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <button
                              onClick={() => { deleteMeasurementEntry(m.date); refreshData(); }}
                              className="text-[#FAF9F6]/40 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Personal Records table */}
          <div className="bg-[#161616] p-5 rounded-none border border-[#2A2A2A] space-y-3">
            <h4 className="font-light text-sm text-[#FAF9F6] font-serif">Personal Records (PRs)</h4>
            {state.prs.length === 0 ? (
              <p className="text-xs text-[#FAF9F6]/40 font-serif">No PR entries logged yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="pr-list-grid">
                {state.prs.map(pr => (
                  <div key={pr.exerciseId} className="flex items-center justify-between p-3 bg-[#111111] rounded-none border border-[#2A2A2A] font-mono">
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs text-[#FAF9F6]/90">{pr.exerciseName}</p>
                      <p className="text-[10px] text-[#FAF9F6]/40">Achieved: {pr.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-[#C5FF4A]">{pr.weight} kg</span>
                      <button
                        onClick={() => { deletePersonalRecord(pr.exerciseId); refreshData(); }}
                        className="text-[#FAF9F6]/40 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
