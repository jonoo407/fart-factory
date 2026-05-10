export interface ComboState {
  count: number;
  peak: number;
  lastGrade: string | null;
}

const COMBO_GRADES = new Set(['A', 'A+', 'S+']);

export function isComboGrade(grade: string): boolean {
  return COMBO_GRADES.has(grade);
}

export function reduceCombo(state: ComboState, grade: string): ComboState {
  if (isComboGrade(grade)) {
    const count = state.count + 1;
    return {
      count,
      peak: Math.max(state.peak, count),
      lastGrade: grade,
    };
  }
  return { count: 0, peak: state.peak, lastGrade: grade };
}

export function initialCombo(): ComboState {
  return { count: 0, peak: 0, lastGrade: null };
}
