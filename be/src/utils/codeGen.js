/**
 * Sinh roomCode dạng số (6 chữ số)
 * Ví dụ: 123456
 * - Dễ nhập tay
 * - Dễ đọc qua chat
 */
export function genRoomCode6() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * (Optional) Sinh roomCode dạng chữ + số
 * Ví dụ: A9F3KQ
 * Dùng nếu sau này bạn muốn chống đoán code
 */
export function genRoomCodeAlpha(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bỏ I,O,0,1 cho dễ đọc
  let code = "";
  for (let i = 0; i < len; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
