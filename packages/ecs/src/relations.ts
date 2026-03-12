import {
  createRelation,
  makeExclusive,
  withAutoRemoveSubject,
} from 'bitecs';

/** One parent per child -- exclusive relation */
export const ChildOf = createRelation(makeExclusive);

/** Auto-remove subject when target is removed */
export const OwnedBy = createRelation(withAutoRemoveSubject);
