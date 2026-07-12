import React, { useState } from 'react';
import type { TodoItem, TetrominoType } from '../utils/tetris';
import { TETROMINO_COLORS, TETROMINO_SHAPES } from '../utils/tetris';
import { X, Calendar, Shapes, Check, Trash2 } from 'lucide-react';

interface TodoModalProps {
  isOpen: boolean;
  todo: TodoItem | null; // null if adding, active item if editing
  onClose: () => void;
  onSave: (text: string, deadline: string | null, shape: TetrominoType | 'auto') => void;
  onDelete?: (id: string) => void;
}

export const TodoModal: React.FC<TodoModalProps> = ({
  isOpen,
  todo,
  onClose,
  onSave,
  onDelete,
}) => {
  const [text, setText] = useState(() => todo?.text || '');
  const [deadline, setDeadline] = useState(() => todo?.deadline || '');
  const [shape, setShape] = useState<TetrominoType | 'auto'>(() => todo?.shape || 'auto');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSave(text.trim(), deadline ? deadline : null, shape);
  };

  const shapesList: (TetrominoType | 'auto')[] = ['auto', 'I', 'O', 'T', 'S', 'Z', 'J', 'L'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="glass-panel"
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(420px, calc(100vw - 20px))',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          animation: 'slideUp 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 
            style={{ 
              fontSize: '18px', 
              fontWeight: 700, 
              fontFamily: "'Outfit', sans-serif",
              color: 'var(--text-primary)',
              letterSpacing: '0.02em',
            }}
          >
            {todo ? '修改待办事项' : '新建待办事项'}
          </h3>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Todo Text input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              待办内容
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="需要完成什么任务？"
              value={text}
              onChange={e => setText(e.target.value.slice(0, 120))}
              autoFocus
              required
            />
          </div>

          {/* Deadline DateTime input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              截止时间 (可选)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="datetime-local"
                className="input-field"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
              <Calendar 
                size={16} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)',
                  pointerEvents: 'none'
                }} 
              />
            </div>
          </div>

          {/* Tetromino Shape Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              俄罗斯方块形状
            </label>
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '8px',
              }}
            >
              {shapesList.map(item => {
                const isSelected = shape === item;
                const color = item === 'auto' ? '#a0aec0' : TETROMINO_COLORS[item];
                
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setShape(item)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '8px',
                      background: isSelected ? `rgba(${hexToRgb(color)}, 0.15)` : 'rgba(255,255,255,0.02)',
                      border: isSelected ? `1.5px solid ${color}` : '1.5px solid rgba(255,255,255,0.05)',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.18s ease',
                      boxShadow: isSelected ? `0 0 10px rgba(${hexToRgb(color)}, 0.2)` : 'none',
                    }}
                  >
                    {item === 'auto' ? (
                      <Shapes size={16} style={{ color }} />
                    ) : (
                      <MiniShapePreview shapeType={item} color={color} />
                    )}
                    <span style={{ fontSize: '10px', fontWeight: isSelected ? 600 : 400 }}>
                      {item === 'auto' ? '自动' : item}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Actions */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: todo ? 'space-between' : 'flex-end', 
              marginTop: '10px',
              gap: '10px'
            }}
          >
            {todo && onDelete && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  onDelete(todo.id);
                  onClose();
                }}
                style={{ padding: '8px 12px' }}
              >
                <Trash2 size={15} />
                <span>删除</span>
              </button>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={onClose} className="btn btn-ghost">
                取消
              </button>
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px' }}>
                <Check size={16} />
                <span>保存</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

// Mini Tetris shape drawing helper (4x4 or 3x3 small dot grid)
const MiniShapePreview: React.FC<{ shapeType: TetrominoType; color: string }> = ({ shapeType, color }) => {
  const shape = TETROMINO_SHAPES[shapeType];
  
  // Calculate boundaries to center the shape
  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  shape.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });
  
  const cols = maxX - minX + 1;
  const rows = maxY - minY + 1;

  // Render a tiny 4x4 or similar flex grid
  return (
    <div 
      style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${cols}, 4px)`, 
        gridTemplateRows: `repeat(${rows}, 4px)`, 
        gap: '1px',
        padding: '2px',
        alignItems: 'center',
        justifyContent: 'center',
        height: '18px',
      }}
    >
      {Array.from({ length: rows }).map((_, r) => {
        return Array.from({ length: cols }).map((_, c) => {
          // Absolute relative coordinate
          const rx = c + minX;
          const ry = r + minY;
          const active = shape.some(p => p.x === rx && p.y === ry);
          
          return (
            <div 
              key={`${r}-${c}`}
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '1px',
                background: active ? color : 'transparent',
                boxShadow: active ? `0 0 4px ${color}` : 'none',
              }}
            />
          );
        });
      })}
    </div>
  );
};

// Helper function to convert hex color to RGB string
function hexToRgb(hex: string): string {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '255, 255, 255';
}
