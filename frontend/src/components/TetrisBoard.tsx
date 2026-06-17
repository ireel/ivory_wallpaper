import React, { useState, useRef } from 'react';
import type { TodoItem } from '../utils/tetris';
import { BOARD_COLS, BOARD_ROWS, TETROMINO_COLORS } from '../utils/tetris';

interface TetrisBoardProps {
  todos: TodoItem[];
  onEditTodo: (todo: TodoItem) => void;
  hoveredTodoId: string | null;
  setHoveredTodoId: (id: string | null) => void;
}

interface TooltipState {
  show: boolean;
  x: number;
  y: number;
  todo: TodoItem | null;
}

export const TetrisBoard: React.FC<TetrisBoardProps> = ({
  todos,
  onEditTodo,
  hoveredTodoId,
  setHoveredTodoId,
}) => {
  const [tooltip, setTooltip] = useState<TooltipState>({
    show: false,
    x: 0,
    y: 0,
    todo: null,
  });

  const boardRef = useRef<HTMLDivElement | null>(null);

  // Active (uncompleted) todos that have placement coordinates
  const activePlacedTodos = todos.filter(t => !t.completed && t.placedCoords && t.placedCoords.length > 0);

  // Find if a cell is occupied by a todo
  const getTodoAtCell = (x: number, y: number): TodoItem | undefined => {
    return activePlacedTodos.find(todo => 
      todo.placedCoords?.some(coord => coord.x === x && coord.y === y)
    );
  };

  const handleCellMouseMove = (e: React.MouseEvent, todo: TodoItem) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    
    // Position tooltip relative to the board
    setTooltip({
      show: true,
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top + 15,
      todo,
    });
    setHoveredTodoId(todo.id);
  };

  const handleCellMouseLeave = () => {
    setTooltip(prev => ({ ...prev, show: false }));
    setHoveredTodoId(null);
  };

  const handleCellClick = (todo: TodoItem) => {
    onEditTodo(todo);
    handleCellMouseLeave();
  };

  // Helper to format remaining time
  const getDeadlineStatusText = (deadlineStr?: string | null) => {
    if (!deadlineStr) return '无截止时间';
    const deadline = new Date(deadlineStr);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    
    if (diffMs < 0) {
      return '已逾期';
    }

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `剩余 ${diffDays} 天 ${diffHours % 24} 小时`;
    } else if (diffHours > 0) {
      return `剩余 ${diffHours} 小时 ${diffMins % 60} 分钟`;
    } else {
      return `剩余 ${diffMins} 分钟`;
    }
  };

  // Build the rows and columns
  const gridCells = [];
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const todo = getTodoAtCell(c, r);
      const isHovered = todo && hoveredTodoId === todo.id;
      
      gridCells.push({
        x: c,
        y: r,
        todo,
        isHovered,
      });
    }
  }

  return (
    <div 
      ref={boardRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px',
      }}
    >
      {/* Tetris Grid Container */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${BOARD_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${BOARD_ROWS}, 1fr)`,
          gap: '3px',
          width: '260px',
          height: '390px',
          background: 'rgba(9, 13, 22, 0.5)',
          border: '2px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '4px',
          boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {gridCells.map((cell) => {
          const color = cell.todo?.shape ? TETROMINO_COLORS[cell.todo.shape] : 'transparent';
          
          return (
            <div
              key={`${cell.x}-${cell.y}`}
              onClick={() => cell.todo && handleCellClick(cell.todo)}
              onMouseMove={(e) => cell.todo && handleCellMouseMove(e, cell.todo)}
              onMouseLeave={handleCellMouseLeave}
              style={{
                borderRadius: '3px',
                background: cell.todo 
                  ? `rgba(${hexToRgb(color)}, 0.4)`
                  : 'rgba(255, 255, 255, 0.02)',
                border: cell.todo
                  ? `1px solid ${color}`
                  : '1px solid rgba(255, 255, 255, 0.03)',
                boxShadow: cell.todo
                  ? `0 0 8px rgba(${hexToRgb(color)}, ${cell.isHovered ? 0.6 : 0.25})`
                  : 'none',
                cursor: cell.todo ? 'pointer' : 'default',
                transition: 'all 0.15s ease-out',
                transform: cell.isHovered ? 'scale(1.08)' : 'scale(1)',
                zIndex: cell.isHovered ? 2 : 1,
              }}
            />
          );
        })}
      </div>

      {/* Floating Tooltip */}
      {tooltip.show && tooltip.todo && (
        <div
          style={{
            position: 'absolute',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            zIndex: 100,
            pointerEvents: 'none',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.9)',
            border: `1px solid ${tooltip.todo.shape ? TETROMINO_COLORS[tooltip.todo.shape] : 'rgba(255, 255, 255, 0.15)'}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            maxWidth: '220px',
            animation: 'fadeIn 0.12s ease-out',
          }}
        >
          <div 
            style={{
              fontWeight: 600,
              fontSize: '13px',
              color: 'var(--text-primary)',
              lineHeight: '1.4',
              wordBreak: 'break-all',
              marginBottom: '6px',
            }}
          >
            {tooltip.todo.text}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {tooltip.todo.deadline && (
              <div>截止: {new Date(tooltip.todo.deadline).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            )}
            <div 
              style={{
                color: tooltip.todo.deadline && new Date(tooltip.todo.deadline) < new Date() ? 'var(--danger)' : 'var(--accent)',
                fontWeight: 500,
              }}
            >
              {getDeadlineStatusText(tooltip.todo.deadline)}
            </div>
            <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '2px' }}>
              形状: {tooltip.todo.shape} (点击可修改)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to convert hex color to RGB string
function hexToRgb(hex: string): string {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '255, 255, 255';
}
