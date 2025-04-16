export const mockTerms = [
  {
    id: 'current-term',
    name: `SY${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    is_current: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const mockCadets = [
  {
    id: 'cadet-1',
    name: 'John Doe',
    student_no: '2023-001',
    attendance_score: 30,
    aptitude_score: 28,
    final_grade: 58,
    exam_score: 85,
    overall_grade: 68.8,
    equivalent: 1.75,
    status: 'PASSED'
  },
  {
    id: 'cadet-2',
    name: 'Jane Smith',
    student_no: '2023-002',
    attendance_score: 28,
    aptitude_score: 30,
    final_grade: 58,
    exam_score: 92,
    overall_grade: 71.6,
    equivalent: 1.5,
    status: 'PASSED'
  }
];
