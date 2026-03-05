# Teacher Twin Writing Engine

This application is designed to automate the generation of personalized report card comments by mimicking a teacher's unique writing style.

It operates in two distinct phases, managed by the main `App.tsx` component:

## Phase 1: Analysis (`PersonaAnalyzer.tsx`)
In this initial phase, the application captures the user's teaching persona.
*   **Goal:** Define the "voice" of the report cards.
*   **Process:** The user provides input to establish parameters such as:
    *   **Tone:** (e.g., encouraging, formal, analytical)
    *   **Structure:** How comments are organized.
    *   **Formatting:** Specific stylistic preferences.
    *   **Vocabulary Bank:** Keywords or phrases the teacher prefers to use.
*   **Result:** This data is stored as a `PersonaProfile` object, which guides all subsequent comment generation.

## Phase 2: Production (`CommentGenerator.tsx`)
Once the persona is set, the application moves to generating the actual comments.
*   **Input:** The user uploads student data via marksheets. The app supports various formats, including images, PDFs, Excel, Word, and text files.
*   **Processing (`geminiService.ts`):** The app sends the uploaded files and the `PersonaProfile` to the Google Gemini API. The model extracts student names and marks from the files and generates comments that adhere to the established persona.
*   **Management:**
    *   **Queue:** Generated comments are displayed in a table where they can be reviewed.
    *   **Manual Override:** Teachers can manually edit any generated comment to ensure accuracy.
    *   **Bulk Actions:** The app provides features to copy all generated comments to the clipboard or export them into a formatted Word document.

## Key Technologies
*   **Frontend:** Built with **React** and **TypeScript**, styled using **Tailwind CSS**, with **Framer Motion** handling the smooth transitions between phases.
*   **Intelligence:** Uses the `@google/genai` SDK to interface with **Gemini models**, which perform the heavy lifting of analyzing documents and generating human-like text.
*   **Architecture:** The app maintains a clear separation between the UI components, the service layer (API interactions), and shared type definitions, ensuring it remains maintainable as features are added.
