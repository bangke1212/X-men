/**
 * Filter untuk Unfollow
 * Digunakan oleh automation/unfollow.js
 */

/**
 * Cek apakah akun verified/premium (blue checkmark)
 */
export function isVerified(userCell) {
  return userCell.querySelector('[data-testid="icon-verified"]') !== null;
}

/**
 * Cek apakah akun follow balik
 */
export function followsBack(userCell) {
  return userCell.querySelector('[data-testid="userFollowIndicator"]') !== null;
}

/**
 * Filter — skip akun premium
 */
export function skipPremium(userCell) {
  return !isVerified(userCell);
}

/**
 * Filter — skip akun yang follow balik
 */
export function skipFollowsBack(userCell) {
  return !followsBack(userCell);
}

/**
 * Filter — hanya unfollow yang tidak follow balik DAN non-premium
 */
export function shouldUnfollow(userCell) {
  return !followsBack(userCell) && !isVerified(userCell);
}

/**
 * Filter — unfollow semua (termasuk yang follow balik)
 */
export function unfollowEveryone(userCell) {
  return true;
}
