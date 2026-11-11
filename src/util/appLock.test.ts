import { isAutolockDue } from './appLock';

it('checks elapsed inactivity at the deadline, including when the timer was suspended', () => {
  expect(isAutolockDue('1', 1000, 30999)).toBe(false);
  expect(isAutolockDue('1', 1000, 31000)).toBe(true);
  expect(isAutolockDue('2', 1000, 601000)).toBe(true);
  expect(isAutolockDue('3', 1000, 601000)).toBe(true);
});

it('does not apply idle deadlines to disabled or background locking', () => {
  expect(isAutolockDue('never', 0, 999999999)).toBe(false);
  expect(isAutolockDue('background', 0, 999999999)).toBe(false);
});
