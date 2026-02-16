# Systems / Idle: Architectural Demo

A high-performance, headless combat simulation engine built with vanilla ES6+ JavaScript. 

## 🏗 Architectural Highlights
- **Unidirectional Data Flow**: State is centralized in a `GameState` object. The UI reacts to state changes rather than driving logic.
- **Headless Combat Engine**: The combat logic is decoupled from the DOM, allowing for high-speed offline progress simulation (up to 4 hours of gameplay calculated in <100ms).
- **Deterministic Logic**: Combat uses standardized formulas: $HitChance = \frac{Acc_{atk}}{Acc_{atk} + Eva_{def}}$.
- **Persistence Layer**: Automatic `localStorage` hydration with robust error handling for corrupted save strings.

## 🛠 Tech Stack
- **Language**: Vanilla JavaScript (ES6 Modules)
- **Styles**: CSS3 with Variable-based theming and Keyframe animations
- **Deployment**: Static hosting via GitHub Pages

## 📈 Engineering Decisions
- **No Frameworks**: Chosen to demonstrate proficiency with the native DOM API and to minimize bundle size.
- **Performance**: Used a tick-based loop ($100ms$ intervals) to balance simulation accuracy with CPU efficiency.