# SmartWorkout 🏋️‍♂️✨
> **Artificial Intelligence Fitness Systems** — A premium, highly polished, offline-first personal training and workout generation application.

SmartWorkout is a desktop-optimized, responsive full-featured fitness ecosystem designed to generate personalized, week-by-week training regimens and guide users through active, immersive sessions with an interactive virtual trainer. Built with a sleek, minimalist **Cosmic Slate Theme** utilizing high-contrast neon accents, deep charcoal negative space, and elegant typography pairing.

---

## 🌟 Key Features

### 1. Dynamic Workout Regimen Generation
- **Intelligent Regimen Architect**: Generates custom multi-week training plans tailored to specific goals (*Strength Development, Muscle Gain, Fat Loss, Mobility Improvement, Rehabilitation, Athletic Performance*).
- **Targeted Customization**: Adapts dynamically based on experience levels (*Beginner, Intermediate, Advanced*), environment restrictions (*Home Bodyweight, Home Limited Equipment, Commercial Gym, etc.*), and physical pain points/injury restrictions.
- **Micro-Periodization**: Schedules balanced exercise phases including Warm-up, Core Resistance movements, specialized Cardio Focus segments, and targeted Cool-down/Stretches.

### 2. Immersive Guided Training Overlay (The "Live Coach")
- **Visual Coach Reference**: Features interactive visual coach panels demonstrating ideal forms (rendered via dynamic SVG vectors and reference URLs).
- **Step-by-Step Timeline Navigation**: Move sequentially through Warm-up, Core Exercises, Rest Windows, and Cool-downs.
- **Digital Countdown Engine**: Adjust rest timers with `+30s` controls, and play/pause/reset states to keep training on pace.
- **Form & Safety Guidance**: Integrated step-by-step cueing and injury-prevention coaching directly alongside each movement sequence.
- **Session Progress Recorder**: Logs completed reps, sets, and active durations directly to local storage profiles.

### 3. Comprehensive Exercise & Stretch Library
- **Extensive Database**: Features dozens of strength-training compound movements, isolation accessories, core stabilizers, and specialized dynamic stretches (*World's Greatest Stretch, Cobra Stretch, Cat-Cow Mobility Flow, Pigeon glute openers, etc.*).
- **Alternative Recommendations**: Automatically recommends alternative physical movements if a specific machine is unavailable or if you have a joint limitation.
- **Refined Filtering**: Sort and filter by target muscle groups, category (Strength vs. Mobility), equipment requirements, or difficulty levels.

### 4. Progress and History Analytics
- **Offline-First Persistence**: Retains historical workout logs, completed plans, active streaks, and current week progression without requiring heavy remote databases.
- **Metric Summaries**: View total lifted reps, calculated volume targets, and total minutes spent under active tension.

---

## 🎨 Design System & Visual Identity

The interface is curated around a premium, Swiss-style typography-forward visual system:
- **Color Palette**: Dark Mode Canvas of `#111111` and `#161616` (Deep Charcoal Slates) framed by sharp, thin `#2A2A2A` borders, with high-voltage neon `#C5FF4A` accents for call-to-actions, status markers, and metrics.
- **Typography Pairing**:
  - **Display Headings**: Elegant serif/display font settings for headers and primary plan names.
  - **General UI**: Clean, high-legibility **Inter** sans-serif font face.
  - **Technical Accents**: **JetBrains Mono** monospace numbers for precise timer readouts, set status tracking, and experience tags.
- **Rhythm & negative Space**: Generous, purposeful padding and structured spacing blocks to establish a clean and professional layout.

---

## 🛠️ Tech Stack & Architecture

- **Frontend Core**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vite.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animation Engine**: [Motion](https://motion.dev/) (from `motion/react`)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: React State Hooks combined with a custom Storage Service (`localStorage` backed profile persistence)
- **Generative Logic**: Advanced client-side rule-engine mapping muscle recovery cycles, kinetic movement pairs, and biomechanical guidelines.

---

## 📂 Project Structure

```text
├── src/
│   ├── App.tsx                  # Application hub and layout coordinator
│   ├── index.css                # Global CSS imports, Google Fonts, and Tailwind Theme setup
│   ├── main.tsx                 # Client bootstrap entry point
│   ├── components/              # Extracted modular interfaces
│   │   ├── ExerciseLibrary.tsx  # Interactive catalog & alternative exercise finder
│   │   ├── MyPlans.tsx          # Regimen dashboard, week selection & Live Immersive Coach
│   │   └── ...                  # Reusable components (Visual Coach vectors, cards, etc.)
│   ├── data/
│   │   └── exercises.ts         # Comprehensive catalog definitions with tips, steps, and GIFs
│   ├── services/
│   │   ├── storageService.ts    # Key-value client-side history, metrics, & profile state engine
│   │   └── workoutGenerator.ts  # Biomechanical rule engine pairing movements to profile variables
│   └── types/
│       └── workout.ts           # Shared TypeScript interfaces, types, and enums
├── metadata.json                # Project description and frame capabilities
├── package.json                 # Dependency manifests & development scripts
└── vite.config.ts               # Vite bundler configuration
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the local development server:
   ```bash
   npm run dev
   ```
   *The server binds to port `3000` on localhost by default.*

### Building and Deployment

To compile the production bundle:
```bash
npm run build
```
This produces static, optimized assets in the `/dist` directory.

To preview your production build locally:
```bash
npm run preview
```

### 🧪 Running Automated Tests

To run the programmatic end-to-end integration and biomechanics test suite:
```bash
npm test
```
*The test framework uses Node.js's built-in testing library for rapid, dependency-free local validation of state engines, storage managers, and safety overlays.*

---

## ⚖️ Safety & Biomechanics Notice
SmartWorkout includes built-in protective filters. Selecting an injury restriction (e.g. *Lower Back, Shoulder, Knee*) automatically swaps out potentially harmful movements (like heavy barbell squats or pull-ups) in favor of safe, low-impact rehabilitative exercises (like Glute Bridges, Bird Dogs, and targeted dynamic stretching). Always consult a physician before beginning any new training program.

---
*Created with 💛 by the AI Coding Agent inside Google AI Studio.*
