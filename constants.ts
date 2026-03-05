
export const APP_NAME = "Teacher Twin Writing Engine";
export const APP_VERSION = "v2.5.0";

export const INITIAL_PERSONA = {
  tone: "Pending Analysis...",
  vocabulary: [],
  structure: "Waiting for samples...",
  formatting: "Unknown",
  isReady: false,
};

// Mock data for initial testing if needed, though we primarily use user input
export const SAMPLE_STUDENT_DATA = [
  { id: '1', name: 'Thabo Mbeki', subjectData: { 'Math': '75', 'English': '60' } },
  { id: '2', name: 'Sarah Jones', subjectData: { 'Math': '40', 'English': '90' } },
];
