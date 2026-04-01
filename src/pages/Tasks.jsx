import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Loader2, Sparkles, Filter, ChevronDown, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function Tasks() {
  const [aiTasks, setAiTasks] = useState([]);
  const [manualTasks, setManualTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTaskText, setNewTaskText] = useState('');
  const [filterMeeting, setFilterMeeting] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const data = await api.getAllTasks();
      setAiTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Manual tasks (local)
  const addManualTask = (e) => {
    e.preventDefault();
    if (newTaskText.trim() === '') return;
    setManualTasks([
      ...manualTasks,
      { id: Date.now(), taskText: newTaskText.trim(), status: 'pending', priority: 'medium', isManual: true }
    ]);
    setNewTaskText('');
  };

  const toggleManualTask = (id) => {
    setManualTasks(manualTasks.map(t =>
      t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t
    ));
  };

  const removeManualTask = (id) => {
    setManualTasks(manualTasks.filter(t => t.id !== id));
  };

  // AI tasks (from DB)
  const toggleAiTask = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await api.updateTaskStatus(task.id, newStatus);
      setAiTasks(aiTasks.map(t =>
        t.id === task.id ? { ...t, status: newStatus } : t
      ));
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const deleteAiTask = async (taskId) => {
    try {
      await api.deleteTask(taskId);
      setAiTasks(aiTasks.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Combine and filter
  const allTasks = [...aiTasks.map(t => ({ ...t, isManual: false })), ...manualTasks];

  // Get unique meeting titles for filter
  const meetingTitles = [...new Set(aiTasks.map(t => t.meetingTitle).filter(Boolean))];

  const filteredTasks = allTasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterMeeting !== 'all' && t.meetingTitle !== filterMeeting && !t.isManual) return false;
    if (filterMeeting !== 'all' && t.isManual) return false;
    return true;
  });

  const completedCount = filteredTasks.filter(t => t.status === 'completed').length;
  const progress = filteredTasks.length === 0 ? 0 : Math.round((completedCount / filteredTasks.length) * 100);

  // Group AI tasks by meeting
  const groupedByMeeting = {};
  filteredTasks.forEach(task => {
    const key = task.isManual ? 'Manual Tasks' : (task.meetingTitle || 'Unknown Meeting');
    if (!groupedByMeeting[key]) groupedByMeeting[key] = [];
    groupedByMeeting[key].push(task);
  });

  const priorityColors = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-blue-50 text-blue-600 border-blue-200',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">My Tasks</h1>
          <p className="text-slate-500">AI-extracted action items and personal to-dos</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
              showFilters ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4 mr-1.5" />
            Filters
            <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Progress */}
          <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
            <div className="text-sm font-medium text-slate-600">
              {completedCount} of {filteredTasks.length} done
            </div>
            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="mb-6 bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-4 animate-slide-down">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          {meetingTitles.length > 0 && (
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 block">Meeting</label>
              <select
                value={filterMeeting}
                onChange={(e) => setFilterMeeting(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Meetings</option>
                {meetingTitles.map(title => (
                  <option key={title} value={title}>{title}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Add Manual Task Form */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <form onSubmit={addManualTask} className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Plus className="h-5 w-5 text-primary-500" />
            </div>
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              className="block w-full pl-12 pr-4 py-4 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm text-slate-700 placeholder-slate-400 bg-white transition-all text-lg"
              placeholder="Add a personal task..."
            />
          </form>
        </div>

        {/* Task Groups */}
        <div className="divide-y divide-slate-100">
          {Object.keys(groupedByMeeting).length > 0 ? (
            Object.entries(groupedByMeeting).map(([meetingTitle, tasks]) => (
              <div key={meetingTitle}>
                {/* Group Header */}
                <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center space-x-2">
                  {meetingTitle !== 'Manual Tasks' ? (
                    <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{meetingTitle}</span>
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-medium">{tasks.length}</span>
                </div>

                {/* Tasks in Group */}
                {tasks.map(task => (
                  <div
                    key={`${task.isManual ? 'manual' : 'ai'}-${task.id}`}
                    className={`p-4 flex items-start justify-between group transition-colors hover:bg-slate-50 ${task.status === 'completed' ? 'bg-slate-50/50' : ''}`}
                  >
                    <div className="flex items-start flex-1 space-x-3">
                      <button
                        onClick={() => task.isManual ? toggleManualTask(task.id) : toggleAiTask(task)}
                        className="focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full mt-0.5 shrink-0"
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 transition-colors" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 hover:text-primary-400 transition-colors" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-0.5">
                          <span className={`text-base transition-all duration-200 ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                            {task.taskText}
                          </span>

                          {/* Priority Badge */}
                          {task.priority && task.priority !== 'medium' && (
                            <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded border ${priorityColors[task.priority] || ''}`}>
                              {task.priority}
                            </span>
                          )}

                          {/* AI Badge */}
                          {!task.isManual && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-violet-50 text-violet-600 border border-violet-200">
                              AI
                            </span>
                          )}
                        </div>

                        {/* Metadata Row */}
                        <div className="flex items-center flex-wrap gap-3 text-xs text-slate-400">
                          {task.assignee && (
                            <span>Assigned to: <span className="text-slate-600 font-medium">{task.assignee}</span></span>
                          )}
                          {task.extractedFrom && (
                            <span className="truncate max-w-xs italic" title={task.extractedFrom}>
                              &ldquo;{task.extractedFrom.substring(0, 80)}{task.extractedFrom.length > 80 ? '...' : ''}&rdquo;
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => task.isManual ? removeManualTask(task.id) : deleteAiTask(task.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100 focus:outline-none shrink-0"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-slate-500">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-lg">No tasks yet.</p>
              <p className="text-sm mt-1">Tasks will be automatically extracted from your meetings, or add one above!</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Info Banner */}
      {aiTasks.length > 0 && (
        <div className="mt-6 bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-start space-x-3">
          <Sparkles className="w-5 h-5 text-violet-500 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-violet-800">AI-Extracted Tasks</h4>
            <p className="text-xs text-violet-600 mt-0.5">
              Tasks marked with <span className="px-1 py-0.5 bg-violet-100 rounded text-[10px] font-bold">AI</span> were 
              automatically extracted from your meeting transcripts using NLP analysis.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
