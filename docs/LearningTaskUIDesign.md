This specification details the **LearningTaskUI** for the **Stella Logos Cooperative Learning System**, a synchronous instructional framework designed to transition learners from "unstructured confusion" to "logical clarity". The system is built on two pillars: **Intrapersonal growth** (mastering life’s unstructured problems) and **Interpersonal growth** (functioning within a structured collective).

---

### **1. Phase I: Metacognitive "Structure the Problem" UI**
**Philosophy**: Reality is unstructured and messy. This phase provides a **metacognitive scaffold** to train the brain to move from emotional reaction to analytical processing.

*   **UI Components**:
    *   **Challenge Panel**: A high-stakes, real-life scenario presented via video (with subtitles) and a written copy for accessibility.
    *   **Response Panel**: A fixed sequence of four mandatory questions that must be answered to "unlock" the lesson content.
*   **Interaction Logic**: Learners must define:
    1.  What is the core problem?
    2.  What are the criteria for a successful solution?
    3.  What is a possible initial solution?
    4.  **Reflective Audit**: Is this the best possible solution?

### **2. Phase II: Content Mastery & The Blind Quiz**
**Philosophy**: To prevent "groupthink," learners must commit to their own logic before entering social debate.

*   **UI Components**:
    *   **Resource Hub**: Access to PDF documents and videos that reveal the specific skills needed to resolve the challenge (e.g., public speaking rubrics).
    *   **Blind Quiz**: A 20-question interactive quiz.
*   **Interaction Logic**: Upon completion, no marks or feedback are shown. Answer labels (A, B, C, D) are **randomized** to ensure conceptual engagement rather than pattern memorization.

### **3. Phase III: The Cooperative Discussion (Role-Based UI)**
**Philosophy**: A group only functions when individuals have distinct, accountable responsibilities.

#### **A. The Leader / Manager Screen**
*   **The Logic Engine**: Features a **"Next Question" Control** button. The Leader pushes questions one by one to the group, showing a visual distribution chart of how the team answered.
*   **The Participation Pulse**: A mandatory button that **refreshes every 20 seconds**. The Leader must click this to maintain "Active" status in the system.
*   **Prompter Icons**: A row of team member icons. Clicking an icon (e.g., "Thabo") sends an automated chat prompt: *"[Name], what do you think about this discrepancy?"*.
*   **Visibility**: The Leader **cannot** see the Scribe’s drafting window during the debate to maintain focus on the group's verbal/textual flow.

#### **B. The Timer Screen**
*   **The Heartbeat**: Features a countdown clock visible **only** to the Timer to prevent group anxiety.
*   **Control Tools**: A "Divide Time" button that splits the total allotted time (entered manually) across the 20 questions and the final solution phase.
*   **Status Pulse**: A button that refreshes every 30 seconds to send a "Time Status" update to the group chat.
*   **"Move On" Alert**: A high-visibility button that triggers a global warning when the group is stalling.

#### **C. The Scribe Screen**
*   **Scrapbook Interface**: Next to every chat message, the Scribe sees a **"Capture" icon**. Clicking it instantly copies that text into a sidebar "Notebook".
*   **Synthesis Tools**: A drag-and-drop interface in the Notebook allowing the Scribe to reorganize captured points into a logical sequence.
*   **Drafting Mode**: A dedicated text area for typing the final team solution.
*   **Phase Shift**: Once the Leader triggers the "Final Solution" phase, **everyone's screen expands** to show the Scribe's window for collective review.

#### **D. The Angle Checker Screen**
*   **Anti-Groupthink Triad**: Three mandatory buttons that must be used during the session:
    1.  *"Are we sure about this?"*
    2.  *"Is there another way of thinking about this?"*
    3.  *"Are we missing something?"*
*   **Perspective Pulse**: Refreshes every 30 seconds, notifying the chat that the Checker is monitoring for logic gaps.

#### **E. General Learner UI (During Discussion)**
*   **Intent Toggle**: For every question pushed by the Leader, the learner sees two buttons: **"Keep My Answer"** and **"I want to change"**.
*   **Comparison View**: Learners see their initial answer side-by-side with the group's distribution chart to spark debate.

### **4. Phase IV & V: Recalibration & Final Artifact**
**Philosophy**: Social learning must translate back into individual mastery and accountability.

*   **Quiz Recalibration**: Learners take the 20-question quiz again. **Questions and answer choices are shuffled**, and the system pre-loads their "Intent" selections from Phase III.
*   **Final Submission**: A flexible submission point for an individual artifact (Video, PDF, Word file) that addresses the original challenge using the strategy refined during the group phase.

---

### **Instructions for the AI Agent**
1.  **State Management**: Implement a synchronous state engine that updates all client UIs based on the **Leader's** "Next Question" clicks and the **Scribe's** "Phase Shift" activation.
2.  **Tracking & Analytics**: Log four data points for every question: Initial Answer, Phase III Intent (Keep/Change), Chat explanations, and Final Individual Answer.
3.  **Pulse Mechanisms**: Program mandatory countdown timers for the Leader (20s), Timer (30s), and Angle Checker (30s). Failure to click these buttons should trigger system prompts to the role-player.
4.  **Randomization Engine**: Ensure both question order and answer option order are shuffled between Phase II and Phase IV to prevent rote memorization.
5.  **UI Constraints**: Enforce visibility rules—Leader cannot see Scribe window until the final phase; Timer countdown is private to the Timer.