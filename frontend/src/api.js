const API_BASE = 'http://localhost:3000/api';

export const api = {
  async getUsers() {
    const res = await fetch(`${API_BASE}/users`);
    return res.json();
  },

  async getTasks(filters = {}) {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${API_BASE}/tasks?${params}`);
    return res.json();
  },

  async getTask(id) {
    const res = await fetch(`${API_BASE}/tasks/${id}`);
    return res.json();
  },

  async createTask(data) {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async assignTask(id, data) {
    const res = await fetch(`${API_BASE}/tasks/${id}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateTask(id, data) {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};
