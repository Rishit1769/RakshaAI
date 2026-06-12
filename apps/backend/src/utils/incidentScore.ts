export function calculateIncidentScore(likes: number, commentCount: number): number {
  return (likes * 1) + (commentCount * 2);
}

export function determinePinColor(score: number): 'white' | 'yellow' | 'red' {
  if (score === 0) return 'white';
  if (score < 10) return 'yellow';
  return 'red';
}
