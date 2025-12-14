/**
 * Tạo board rỗng
 * board[y][x]
 */
export function emptyBoard(size) {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

/**
 * Kiểm tra toạ độ hợp lệ
 */
export function inBounds(size, x, y) {
  return x >= 0 && y >= 0 && x < size && y < size;
}

/**
 * Check thắng + trả winningLine
 * @param {Array<Array<string|null>>} board
 * @param {{x:number,y:number,symbol:"X"|"O"}} lastMove
 * @param {number} winLen
 * @returns {{ winner: "X"|"O"|null, winningLine: Array<{x:number,y:number}>|null }}
 */
export function checkWinnerWithLine(board, lastMove, winLen = 5) {
  if (!lastMove) return { winner: null, winningLine: null };

  const { x, y, symbol } = lastMove;
  const size = board.length;

  const directions = [
    [1, 0],   // ngang →
    [0, 1],   // dọc ↓
    [1, 1],   // chéo \
    [1, -1],  // chéo /
  ];

  const collectLine = (dx, dy) => {
    const neg = [];
    let i = x - dx;
    let j = y - dy;
    while (i >= 0 && j >= 0 && i < size && j < size && board[j][i] === symbol) {
      neg.push({ x: i, y: j });
      i -= dx;
      j -= dy;
    }
    neg.reverse();

    const pos = [];
    i = x + dx;
    j = y + dy;
    while (i >= 0 && j >= 0 && i < size && j < size && board[j][i] === symbol) {
      pos.push({ x: i, y: j });
      i += dx;
      j += dy;
    }

    return [...neg, { x, y }, ...pos];
  };

  for (const [dx, dy] of directions) {
    const full = collectLine(dx, dy);
    if (full.length >= winLen) {
      // lấy đoạn winLen có chứa lastMove
      const idx = full.findIndex((p) => p.x === x && p.y === y);
      const maxStart = full.length - winLen;
      const start = Math.max(0, Math.min(idx - (winLen - 1), maxStart));
      const winningLine = full.slice(start, start + winLen);

      return { winner: symbol, winningLine };
    }
  }

  return { winner: null, winningLine: null };
}

/**
 * GIỮ TƯƠNG THÍCH: nếu code cũ đang gọi checkWinner() và chỉ cần symbol
 */
export function checkWinner(board, lastMove, winLen = 5) {
  return checkWinnerWithLine(board, lastMove, winLen).winner;
}
