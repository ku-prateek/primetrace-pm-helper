import { useState, useEffect } from 'react';
import { api } from './api';

function App() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tasksData, usersData] = await Promise.all([
        api.getTasks(),
        api.getUsers(),
      ]);
      setTasks(tasksData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      title: formData.get('title'),
      created_by: parseInt(formData.get('created_by')),
      owner_id: parseInt(formData.get('owner_id')),
      due_date: formData.get('due_date') || null,
      notes: formData.get('notes') || null,
    };

    try {
      await api.createTask(data);
      setShowCreate(false);
      loadData();
      e.target.reset();
    } catch (error) {
      alert('Failed to create task');
    }
  };

  const handleAssign = async (task, newOwnerId) => {
    try {
      // For 'created' status, PM (creator) can assign. Otherwise, current owner assigns.
      const assignedBy = task.status === 'created' ? task.created_by : task.owner_id;
      await api.assignTask(task.id, {
        assigned_by: assignedBy,
        new_owner_id: newOwnerId,
      });
      loadData();
    } catch (error) {
      alert('Failed to assign task: ' + (error.message || 'Unknown error'));
    }
  };

  const handleUpdate = async (task, updates) => {
    try {
      await api.updateTask(task.id, {
        updated_by: task.owner_id,
        ...updates,
      });
      setEditingTask(null);
      loadData();
    } catch (error) {
      alert('Failed to update task');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      created: 'bg-gray-100 text-gray-800',
      assigned_to_dev: 'bg-blue-100 text-blue-800',
      assigned_to_qa: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getNextAssignee = (task) => {
    if (task.status === 'created') return users.find((u) => u.role === 'Dev');
    if (task.status === 'assigned_to_dev') return users.find((u) => u.role === 'QA');
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const pmUser = users.find((u) => u.role === 'PM');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Task Management</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Create Task
          </button>
        </div>

        {showCreate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Create Task</h2>
              <form onSubmit={handleCreateTask}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    name="title"
                    required
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Created By (PM)</label>
                  <select name="created_by" required className="w-full border rounded px-3 py-2">
                    {users.filter((u) => u.role === 'PM').map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Assign To</label>
                  <select name="owner_id" required className="w-full border rounded px-3 py-2">
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    name="due_date"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    name="notes"
                    rows="3"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Update Task</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  handleUpdate(editingTask, {
                    status: formData.get('status'),
                    notes: formData.get('notes'),
                    due_date: formData.get('due_date') || null,
                  });
                }}
              >
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue={editingTask.status}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="created">Created</option>
                    <option value="assigned_to_dev">Assigned to Dev</option>
                    <option value="assigned_to_qa">Assigned to QA</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    name="notes"
                    defaultValue={editingTask.notes || ''}
                    rows="3"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    name="due_date"
                    defaultValue={
                      editingTask.due_date
                        ? new Date(editingTask.due_date).toISOString().split('T')[0]
                        : ''
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Update
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {tasks.map((task) => {
            const nextAssignee = getNextAssignee(task);
            return (
              <div
                key={task.id}
                className="bg-white rounded-lg shadow p-6 border border-gray-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                      <span>Owner: {task.owner_username} ({task.owner_role})</span>
                      <span>Created by: {task.creator_username}</span>
                      {task.due_date && (
                        <span>
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      task.status
                    )}`}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                </div>

                {task.notes && (
                  <p className="text-gray-700 mb-4 text-sm">{task.notes}</p>
                )}

                <div className="flex gap-2">
                  {nextAssignee && (
                    <button
                      onClick={() => handleAssign(task, nextAssignee.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                    >
                      Assign to {nextAssignee.username}
                    </button>
                  )}
                  <button
                    onClick={() => setEditingTask(task)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
                  >
                    Update
                  </button>
                </div>
              </div>
            );
          })}

          {tasks.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No tasks found. Create your first task!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
