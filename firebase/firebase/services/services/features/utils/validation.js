export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
export function validateName(name) {
  return name && name.trim().length >= 2;
}
export function validatePassword(password) {
  return password && password.length >= 6;
}
export function validateGoal(goal) {
  return goal && goal.trim().length >= 10;
}
export function validateCheckinScore(score) {
  return score >= 0 && score <= 100;
}
