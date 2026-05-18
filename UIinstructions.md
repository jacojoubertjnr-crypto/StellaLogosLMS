ROLE: Lead UI/UX Developer (Pixel Art & Cloud Specialist)
Project: Stella Logos – State-Driven Theatrical UI
Standard: 2026 Responsive Pixel-Perfect Engineering

1. THE CORE INNOVATION: "Theme-Folder" Architecture
You are building a React system where the entire visual identity is controlled by a single folder path.

Directory Mapping: Define a structure where /assets/themes/[theme_name]/ contains standardized filenames: bg.png, banner_top.png, frame_main.png, btn_primary.png, and ambient_sprite.png.

CSS Variable Injection: Use a global CSS file that maps :root variables to these paths. The UI must swap themes (Medieval to Sci-Fi) instantly by changing the data-theme attribute on the <html> tag.

2. THE VISUAL ENGINE: "Theatrical Shell"
The UI must feel like a "Mediated Game Screen," not a traditional website.

Continuous Background: Side assets (e.g., the Medieval Castle and Tree) must be integrated into the background layer to appear as one seamless landscape. No vertical wooden borders; the world must touch the screen edges.

The Safe Zone: All interactive content must be centered in a "Safe Zone."

9-Slice Scaling: CRITICAL REQUIREMENT. All UI frames (like the parchment scroll or buttons) must use border-image properties. This ensures that as the container grows, the pixel-art corners remain sharp (un-stretched) while the middle repeats or stretches.

Pixel-Perfect Rendering: Apply image-rendering: pixelated; to all sprites. Ensure "integer scaling" to prevent sub-pixel blurring on high-DPI (4K) monitors.

3. CLOUD & PERFORMANCE LOGIC (Adaptive Tiering)
Since this is a cloud-based app, we must account for varying internet speeds.

Performance State: Implement a Zustand-managed state performanceTier (High/Low).

Logic Gate: * High Tier: Enable CSS keyframe animations (swaying leaves, moving clouds, flying cars) and backdrop-blur (Dark Glass effect).

Low Tier: Revert to purely static images and solid backgrounds to minimize GPU/Network overhead.

4. UI/UX & LEARNER CLARITY
Cognitive Load Management: The system must isolate steps. If a learner is on Step 3 of 7, do not render or load assets for Step 4.

Typography: Maintain a strict "Vector-over-Pixel" aesthetic.

Use high-resolution sans-serif fonts (Inter/Roboto) for all functional text.

Standard Terminology: Do not use themed words for inputs. Use USERNAME, PASSWORD, and LOGIN. The theme stays in the art; the clarity stays in the text.

5. TECHNICAL STACK REQUIREMENTS
React + Vite: For instant HMR when swapping theme assets.

Tailwind CSS: Use an 8px (pixel-unit) grid for all spacing.

Zustand: For global theme and performance state.

INITIAL TASK FOR THE AGENT:
"Generate the Theme-Folder Directory Structure, the Global CSS Variable system (including 9-slice classes), and a Medieval Login Screen. Ensure the Castle/Tree background is integrated and daylight-themed. The central login form should be inside a 'Parchment Scroll' frame using 9-slice scaling, with crisp vector typography for 'USERNAME', 'PASSWORD', and 'LOGIN'."