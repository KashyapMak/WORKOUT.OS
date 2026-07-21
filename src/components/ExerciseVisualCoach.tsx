import React from 'react';

export function ExerciseVisualCoach({ 
  exerciseName, 
  category, 
  isResting 
}: { 
  exerciseName: string; 
  category: string; 
  isResting: boolean; 
}) {
  const name = exerciseName.toLowerCase();
  let animationType = "general";
  if (isResting) {
    animationType = "rest";
  } else if (name.includes("squat") || name.includes("lunge") || name.includes("leg") || name.includes("quad") || name.includes("calf") || name.includes("deadlift") || name.includes("hinge") || name.includes("glute")) {
    animationType = "legs";
  } else if (name.includes("press") || name.includes("push") || name.includes("dip")) {
    animationType = "push";
  } else if (name.includes("pull") || name.includes("row") || name.includes("chin") || name.includes("lat") || name.includes("shrug")) {
    animationType = "pull";
  } else if (name.includes("curl") || name.includes("extension") || name.includes("arm") || name.includes("bicep") || name.includes("tricep")) {
    animationType = "curl";
  } else if (name.includes("plank") || name.includes("crunch") || name.includes("ab") || name.includes("core") || name.includes("situp") || name.includes("twist")) {
    animationType = "core";
  } else if (category.toLowerCase() === "cardio" || name.includes("run") || name.includes("walk") || name.includes("jump") || name.includes("cycle") || name.includes("rower")) {
    animationType = "cardio";
  }

  return (
    <div className="w-full h-48 bg-[#111111] border border-[#2A2A2A] flex flex-col items-center justify-center relative overflow-hidden p-2">
      <div className="absolute inset-0 bg-[radial-gradient(#2A2A2A_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>
      
      <style>{`
        @keyframes pressBar {
          0%, 100% { transform: translateY(15px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes squatter {
          0%, 100% { transform: scaleY(1) translateY(0); }
          50% { transform: scaleY(0.6) translateY(20px); }
        }
        @keyframes armCurlAng {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-80deg); }
        }
        @keyframes corePulseCircle {
          0%, 100% { transform: scale(0.8); opacity: 0.3; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes pulseSine {
          0%, 100% { stroke-dashoffset: 0; }
          50% { stroke-dashoffset: 50; }
        }
        @keyframes recoveryBreathing {
          0%, 100% { transform: scale(0.9); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0.95; }
        }
      `}</style>

      {animationType === "rest" && (
        <div className="flex flex-col items-center justify-center space-y-2 z-10">
          <div className="w-14 h-14 rounded-full border-2 border-[#C5FF4A] flex items-center justify-center" style={{ animation: "recoveryBreathing 4s ease-in-out infinite" }}>
            <div className="w-8 h-8 rounded-full bg-[#C5FF4A]/20"></div>
          </div>
          <span className="text-[10px] text-[#FAF9F6]/50 font-mono tracking-widest uppercase">Recovery Rest (Breathe)</span>
        </div>
      )}

      {animationType === "push" && (
        <svg className="w-32 h-32 text-[#FAF9F6] z-10" viewBox="0 0 100 100">
          <line x1="20" y1="75" x2="80" y2="75" stroke="#2A2A2A" strokeWidth="4" />
          <line x1="30" y1="75" x2="30" y2="55" stroke="#2A2A2A" strokeWidth="3" />
          <line x1="70" y1="75" x2="70" y2="55" stroke="#2A2A2A" strokeWidth="3" />
          <g style={{ animation: "pressBar 2.5s ease-in-out infinite" }}>
            <line x1="15" y1="45" x2="85" y2="45" stroke="#FAF9F6" strokeWidth="3" />
            <rect x="15" y="32" width="6" height="26" fill="#C5FF4A" rx="1" />
            <rect x="9" y="36" width="5" height="18" fill="#FAF9F6" rx="1" />
            <rect x="79" y="32" width="6" height="26" fill="#C5FF4A" rx="1" />
            <rect x="86" y="36" width="5" height="18" fill="#FAF9F6" rx="1" />
            <rect x="44" y="43" width="12" height="4" fill="#C5FF4A" />
          </g>
          <path d="M 35,70 Q 50,60 65,70" fill="none" stroke="#FAF9F6" strokeWidth="2" strokeDasharray="3,3" opacity="0.4" />
        </svg>
      )}

      {animationType === "legs" && (
        <svg className="w-32 h-32 text-[#FAF9F6] z-10" viewBox="0 0 100 100">
          <line x1="15" y1="85" x2="85" y2="85" stroke="#2A2A2A" strokeWidth="4" />
          <g style={{ animation: "squatter 2.8s ease-in-out infinite" }}>
            <path d="M 50,20 L 50,45 L 35,65 L 50,85" fill="none" stroke="#C5FF4A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="50" cy="20" r="7" fill="#111111" stroke="#FAF9F6" strokeWidth="3" />
            <line x1="30" y1="20" x2="70" y2="20" stroke="#FAF9F6" strokeWidth="4" />
            <rect x="24" y="12" width="6" height="16" fill="#C5FF4A" />
            <rect x="70" y="12" width="6" height="16" fill="#C5FF4A" />
          </g>
        </svg>
      )}

      {animationType === "pull" && (
        <svg className="w-32 h-32 text-[#FAF9F6] z-10" viewBox="0 0 100 100">
          <rect x="15" y="20" width="70" height="6" fill="#2A2A2A" />
          <circle cx="30" cy="23" r="4" fill="#FAF9F6" />
          <circle cx="70" cy="23" r="4" fill="#FAF9F6" />
          <g style={{ animation: "pressBar 3s ease-in-out infinite" }}>
            <line x1="25" y1="50" x2="75" y2="50" stroke="#C5FF4A" strokeWidth="4" strokeLinecap="round" />
            <rect x="28" y="48" width="10" height="4" fill="#FAF9F6" />
            <rect x="62" y="48" width="10" height="4" fill="#FAF9F6" />
          </g>
          <line x1="30" y1="23" x2="50" y2="90" stroke="#FAF9F6" strokeWidth="1.5" strokeDasharray="2,2" opacity="0.3" />
        </svg>
      )}

      {animationType === "curl" && (
        <svg className="w-32 h-32 text-[#FAF9F6] z-10" viewBox="0 0 100 100">
          <line x1="30" y1="70" x2="55" y2="70" stroke="#2A2A2A" strokeWidth="5" strokeLinecap="round" />
          <circle cx="30" cy="70" r="5" fill="#C5FF4A" />
          <g style={{ animation: "armCurlAng 2.2s ease-in-out infinite", transformOrigin: "55px 70px" }}>
            <line x1="55" y1="70" x2="85" y2="70" stroke="#C5FF4A" strokeWidth="5" strokeLinecap="round" />
            <g transform="translate(85, 70)">
              <line x1="0" y1="-15" x2="0" y2="15" stroke="#FAF9F6" strokeWidth="3" />
              <rect x="-6" y="-18" width="12" height="6" fill="#C5FF4A" rx="1" />
              <rect x="-6" y="12" width="12" height="6" fill="#C5FF4A" rx="1" />
            </g>
          </g>
          <circle cx="55" cy="70" r="4" fill="#FAF9F6" />
        </svg>
      )}

      {animationType === "core" && (
        <svg className="w-32 h-32 text-[#FAF9F6] z-10" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="30" fill="none" stroke="#2A2A2A" strokeWidth="2" />
          <circle cx="50" cy="50" r="20" fill="none" stroke="#C5FF4A" strokeWidth="3" style={{ animation: "corePulseCircle 2s ease-in-out infinite" }} />
          <circle cx="50" cy="50" r="10" fill="#FAF9F6" />
          <line x1="20" y1="20" x2="80" y2="80" stroke="#FAF9F6" strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
          <line x1="80" y1="20" x2="20" y2="80" stroke="#FAF9F6" strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
        </svg>
      )}

      {animationType === "cardio" && (
        <svg className="w-32 h-32 text-[#C5FF4A] z-10" viewBox="0 0 100 100">
          <line x1="10" y1="50" x2="90" y2="50" stroke="#2A2A2A" strokeWidth="2" />
          <path 
            d="M 10,50 L 30,50 L 35,30 L 40,75 L 45,45 L 48,53 L 50,50 L 70,50 L 75,20 L 80,80 L 85,50 L 90,50" 
            fill="none" 
            stroke="#C5FF4A" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            strokeDasharray="150"
            style={{ animation: "pulseSine 2s linear infinite" }}
          />
        </svg>
      )}

      {animationType === "general" && (
        <svg className="w-32 h-32 text-[#FAF9F6] z-10" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="25" fill="none" stroke="#2A2A2A" strokeWidth="4" />
          <circle cx="50" cy="50" r="25" fill="none" stroke="#C5FF4A" strokeWidth="4" strokeDasharray="40 50" style={{ transformOrigin: "50px 50px", animation: "armCurlAng 3s linear infinite" }} />
          <circle cx="50" cy="50" r="8" fill="#FAF9F6" />
        </svg>
      )}

      <span className="text-[10px] text-[#FAF9F6]/50 font-mono text-center truncate w-full mt-2 uppercase tracking-wide">
        {!isResting ? exerciseName : "Rest Recovery Interval"}
      </span>
    </div>
  );
}
