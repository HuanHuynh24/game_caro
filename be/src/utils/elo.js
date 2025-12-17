export function calcEloDelta(rA, rB, scoreA, k = 32) {
  // scoreA: 1 = thắng, 0.5 = hoà, 0 = thua
  const expectedA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
  return Math.round(k * (scoreA - expectedA));
}
