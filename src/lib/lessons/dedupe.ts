type UserLessonLike = {
  status: string;
  createdAt: Date | string;
  lesson: { stepNumber: number };
};

const STATUS_PRIORITY: Record<string, number> = {
  COMPLETED: 4,
  IN_PROGRESS: 3,
  FAILED: 2,
  PENDING: 1,
};

/**
 * Historical personalized lessons may contain more than one row for a step.
 * Keep every record in storage, while presenting one canonical lesson: the
 * furthest-progressed record, then the oldest one if progress is equal.
 */
export function dedupeUserLessonsByStep<T extends UserLessonLike>(lessons: T[]): T[] {
  const selected = new Map<number, T>();

  for (const candidate of lessons) {
    const step = candidate.lesson.stepNumber;
    const current = selected.get(step);
    if (!current) {
      selected.set(step, candidate);
      continue;
    }

    const candidatePriority = STATUS_PRIORITY[candidate.status] || 0;
    const currentPriority = STATUS_PRIORITY[current.status] || 0;
    const candidateCreatedAt = new Date(candidate.createdAt).getTime();
    const currentCreatedAt = new Date(current.createdAt).getTime();
    if (candidatePriority > currentPriority || (candidatePriority === currentPriority && candidateCreatedAt < currentCreatedAt)) {
      selected.set(step, candidate);
    }
  }

  return [...selected.values()].sort((left, right) => left.lesson.stepNumber - right.lesson.stepNumber);
}
