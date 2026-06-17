import React, { useState } from 'react';
import { useWallpaperState } from '../hooks/useWallpaperState';
import type { TodoItem } from '../utils/tetris';
import { TETROMINO_COLORS } from '../utils/tetris';
import { TetrisBoard } from './TetrisBoard';
import { TodoModal } from './TodoModal';
import { Plus, Calendar, CheckSquare, Square, ClipboardList } from 'lucide-react';

interface TodoPanelProps {
  state: ReturnType<typeof useWallpaperState>;
  onOpenSettingsCalendar: () => void;
}

export const TodoPanel: React.FC<TodoPanelProps> = ({
  state,
  onOpenSettingsCalendar,
}) => {
  const { todos, addTodo, editTodo, deleteTodo, toggleTodoComplete } = state;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  
  // Interactive linkage state (hovering list item highlights block)
  const [hoveredTodoId, setHoveredTodoId] = useState<string | null>(null);

  const handleOpenAddModal = () => {
    setEditingTodo(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (todo: TodoItem) => {
    setEditingTodo(todo);
    setModalOpen(true);
  };

  const handleSaveTodo = (text: string, deadline: string | null, shape: any) => {
    if (editingTodo) {
      editTodo(editingTodo.id, text, deadline, shape);
    } else {
      addTodo(text, deadline, shape);
    }
    setModalOpen(false);
  };

  const handleDeleteTodo = (id: string) => {
    deleteTodo(id);
    setModalOpen(false);
  };

  // Format the date label beautifully
  const getFormattedDateLabel = () => {
    const parts = state.selectedDateKey.split('-');
    if (parts.length !== 3) return state.selectedDateKey;
    
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekday = weekdays[date.getDay()];
    
    return `${parts[0]}年${parts[1]}月${parts[2]}日 ${weekday}`;
  };

  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  return (
    <section
      className="glass-panel"
      style={{
        position: 'fixed',
        bottom: 'var(--panel-bottom)',
        left: 'var(--icon-grid-offset-x)',
        width: 'var(--panel-width)',
        height: 'var(--panel-height)',
        padding: '22px 26px',
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        pointerEvents: 'auto',
      }}
      aria-label="待办与方块面板"
    >
      {/* Panel Header */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          paddingBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <h2 
            style={{ 
              fontFamily: "'Outfit', sans-serif",
              fontSize: '15px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: 'var(--text-primary)',
              textShadow: '0 0 10px rgba(255, 255, 255, 0.1)',
            }}
          >
            TODO DASHBOARD
          </h2>
          
          {/* Date Chip - clickable only in editor role */}
          {state.viewContext.isEditor ? (
            <button
              onClick={onOpenSettingsCalendar}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.color = 'var(--accent)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <Calendar size={11} />
              <span>{getFormattedDateLabel()}</span>
            </button>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(255,255,255,0.02)',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: 500,
              }}
            >
              <Calendar size={11} />
              <span>{getFormattedDateLabel()}</span>
            </div>
          )}
        </div>

        {/* Add Todo Button - only in editor role */}
        {state.viewContext.isEditor && (
          <button onClick={handleOpenAddModal} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
            <Plus size={14} />
            <span>新建待办</span>
          </button>
        )}
      </div>

      {/* Panel Body */}
      <div style={{ flex: 1, display: 'flex', gap: '20px', overflow: 'hidden' }}>
        
        {/* Left: Tetris Grid (10x15 cells representation) */}
        <div 
          style={{ 
            flex: 0.8, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderRight: '1px solid rgba(255, 255, 255, 0.05)',
            paddingRight: '10px'
          }}
        >
          <TetrisBoard
            todos={todos}
            onEditTodo={handleOpenEditModal}
            hoveredTodoId={hoveredTodoId}
            setHoveredTodoId={setHoveredTodoId}
          />
        </div>

        {/* Right: Checklist of Todos */}
        <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div 
            style={{ 
              fontSize: '11px', 
              color: 'var(--text-secondary)', 
              fontWeight: 600, 
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'space-between'
            }}
          >
            <span>代办清单</span>
            <span>{activeTodos.length} 项进行中 · {completedTodos.length} 项已完成</span>
          </div>

          <div 
            style={{ 
              flex: 1, 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px',
              paddingRight: '4px'
            }}
          >
            {todos.length === 0 ? (
              <div 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '80%', 
                  gap: '10px',
                  color: 'var(--text-muted)',
                }}
              >
                <ClipboardList size={32} style={{ opacity: 0.5 }} />
                <span style={{ fontSize: '12px', textAlign: 'center' }}>
                  今日尚无任何待办，点击右上角“新建待办”开始玩俄罗斯方块消行吧！
                </span>
              </div>
            ) : (
              <>
                {/* Active Todos */}
                {activeTodos.map(todo => {
                  const color = todo.shape ? TETROMINO_COLORS[todo.shape] : '#a0aec0';
                  const isHovered = hoveredTodoId === todo.id;
                  
                  return (
                    <div
                      key={todo.id}
                      onClick={() => state.viewContext.isEditor && handleOpenEditModal(todo)}
                      onMouseEnter={() => setHoveredTodoId(todo.id)}
                      onMouseLeave={() => setHoveredTodoId(null)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: isHovered ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                        border: isHovered 
                          ? `1px solid ${color}` 
                          : '1px solid rgba(255,255,255,0.05)',
                        boxShadow: isHovered ? `0 0 10px rgba(${hexToRgb(color)}, 0.15)` : 'none',
                        cursor: state.viewContext.isEditor ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'all 0.18s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, overflow: 'hidden' }}>
                        {/* Custom visual checkbox button that intercepts click */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (state.viewContext.isEditor) {
                              toggleTodoComplete(todo.id);
                            }
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: state.viewContext.isEditor ? 'pointer' : 'default',
                            padding: '2px',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Square size={16} />
                        </button>
                        
                        {/* Title text */}
                        <span 
                          style={{ 
                            fontSize: '13px', 
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {todo.text}
                        </span>
                      </div>

                      {/* Right shape details */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {todo.deadline && (
                          <span 
                            style={{ 
                              fontSize: '10px', 
                              color: new Date(todo.deadline) < new Date() ? 'var(--danger)' : 'var(--text-secondary)',
                              background: 'rgba(255,255,255,0.03)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {new Date(todo.deadline).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                          </span>
                        )}
                        
                        {/* Small shape indicator */}
                        <div 
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: color,
                            boxShadow: `0 0 6px ${color}`,
                          }}
                          title={`俄罗斯方块形状: ${todo.shape}`}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Completed Todos */}
                {completedTodos.map(todo => (
                  <div
                    key={todo.id}
                    onClick={() => state.viewContext.isEditor && handleOpenEditModal(todo)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.005)',
                      border: '1px solid rgba(255,255,255,0.02)',
                      cursor: state.viewContext.isEditor ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      opacity: 0.5,
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (state.viewContext.isEditor) {
                            toggleTodoComplete(todo.id);
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: state.viewContext.isEditor ? 'pointer' : 'default',
                          padding: '2px',
                          color: 'var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <CheckSquare size={16} />
                      </button>
                      <span 
                        style={{ 
                          fontSize: '13px', 
                          color: 'var(--text-secondary)',
                          textDecoration: 'line-through',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {todo.text}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Todo Dialog Modal */}
      <TodoModal
        isOpen={modalOpen}
        todo={editingTodo}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveTodo}
        onDelete={handleDeleteTodo}
      />
    </section>
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
