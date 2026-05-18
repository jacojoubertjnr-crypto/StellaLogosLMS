This is the comprehensive global description for Stella Logos, a platform engineered to transform the traditional classroom into a dynamic, state-driven "Learning Quest."

1. Project Vision
Stella Logos ("Star of Knowledge") is a professional-grade Educational Management & Gamification Platform. It addresses the "Engagement Gap" in secondary education by converting static curriculum content (History, IT, etc.) into a series of visual, progression-based milestones.
The project moves beyond a standard LMS by implementing a "State-Driven UI" where the entire visual identity of the school—from the buttons to the backgrounds—is interchangeable through themed pixel-art assets.

2. Core Product Pillars
A. The Quest-Based Pedagogy
Instead of "Lessons," learners engage with Learning Tasks. Each task is a multi-step sequence (e.g., a 7-step journey).
The Marker: A real-time database-tracked coordinate (CurrentStep) that places the learner’s avatar precisely on a visual path.
The "Wait-State" Guard: Prevents learners from skipping ahead while allowing teachers to see exactly where a student is "stuck" in real-time.

B. The Facilitation "Theater Mode"
For teachers, Stella Logos acts as a high-tech command center.
The Grid Monitor: A dashboard displaying live, pulsing progress bars for every student.
Active Messaging: A tiled UI that allows the teacher to manage dozens of simultaneous chat windows, filtered by the student's current step or specific help requests.

C. The Pixel-Art Economy
Engagement is driven by a virtual economy.
Milestone Rewards: Completing steps or quizzes triggers an instant "cha-ching" event, updating the learner's PointsBalance.
Asset Shop: Learners purchase cosmetic "Skins" (pixel-art badges, avatars, or profile themes).
Identity Injection: These skins are not just icons; they dynamically change the CSS variables of the user's interface, allowing them to truly "own" their learning space.

3. The "3-Segment" Architecture
The project is modularly split to ensure professional maintenance and high performance:
Segment 1: The UI Engine (Frontend)
Visuals: 16-bit Pixel Art with 9-slice scaling to keep edges crisp on 4K monitors.
Technology: Built with Vite + React for instant asset swapping.
Adaptive Logic: The UI uses the Network Information API to toggle performance tiers, ensuring the app remains smooth on poor school Wi-Fi.

Segment 2: The Middleware (Connective Tissue)
Communication: Powered by GraphQL (Apollo) for efficient data fetching and Socket.io for the "Theater Mode" live sync.
Security: A strict PaidStatus guard ensures that only verified accounts can pull curriculum data from the API.

Segment 3: The Data Vault (Backend)
Structure: A relational PostgreSQL database tracking the complex web of Register Classes, Academic Classes, and Enrollment.
Analytics: Every move is logged using xAPI standards, making the data readable for future institutional reporting.

4. Global Tech Stack Summary
Layer	Technology	Purpose
Frontend	React, Tailwind CSS, Zustand	Reactive UI and high-performance state management.
Visuals	Pixel Art (PNG) + SVG Containers	Scalable, crisp 16-bit aesthetic with 9-slice buttons.
Real-Time	Socket.io	Instant teacher-student messaging and progress tracking.
API	GraphQL	Optimized data requests for high-latency school networks.
Database	PostgreSQL + Redis	Relational data integrity combined with high-speed session caching.
Standards	LTI 1.3 & xAPI	Industry-standard authentication and pedagogical logging.

5. Future Scalability
Because Stella Logos is built on a Theme-Folder logic, it is infinitely scalable. A school can start with a "Medieval History" theme and, with a single update to the middleware, flip the entire school's UI to a "Cyberpunk IT" theme. The logic remains the same; only the logos (the expression) changes.