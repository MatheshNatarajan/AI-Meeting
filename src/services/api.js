import axios from 'axios';

const API_BASE_URL = '/api';

export const api = {
  login: async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, { email, password });
      return response.data;
    } catch (err) {
      throw new Error('Invalid credentials');
    }
  },

  register: async (name, email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/register`, { name, email, password });
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data || 'Failed to register');
    }
  },

  checkUserExists: async (email) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/check`, { params: { email } });
      return response.data.exists;
    } catch (err) {
      console.error('Error checking user:', err);
      return false;
    }
  },
  
  getMeetings: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/meetings`);
      return response.data;
    } catch (err) {
      console.error('Error fetching meetings', err);
      return [];
    }
  },
  
  createMeeting: async (meetingData) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const payload = {
        ...meetingData,
        organizer: user.email || '',
      };
      const response = await axios.post(`${API_BASE_URL}/meetings`, payload);
      return response.data;
    } catch (err) {
      throw new Error('Failed to create meeting');
    }
  },
  
  updateMeetingStatus: async (meetingId, newStatus, requestedBy, newDate) => {
    try {
      const updates = {};
      if (newStatus) updates.status = newStatus;
      if (newDate) updates.date = newDate;
      if (requestedBy) updates.requestedBy = requestedBy;
      
      const response = await axios.put(`${API_BASE_URL}/meetings/${meetingId}/status`, updates);
      return response.data;
    } catch (err) {
      throw new Error('Meeting not found or failed to update');
    }
  },
  
  getNotes: async (meetingId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/notes/${meetingId}`);
      return response.data;
    } catch (err) {
      throw new Error('Notes not found or generating...');
    }
  },

  deleteMeeting: async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/meetings/${id}`);
    } catch (err) {
      throw new Error('Failed to delete meeting');
    }
  },

  deleteAllMeetings: async () => {
    try {
      await axios.delete(`${API_BASE_URL}/meetings/all`);
    } catch (err) {
      throw new Error('Failed to clean meetings');
    }
  },

  deleteAllNotes: async () => {
    try {
      await axios.delete(`${API_BASE_URL}/notes/all`);
    } catch (err) {
      throw new Error('Failed to clean notes');
    }
  },

  getBusySlots: async (email) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/meetings/busy-slots`, { params: { email } });
      return response.data;
    } catch (err) {
      console.error('Error fetching busy slots', err);
      return [];
    }
  },

  // --- Transcript & NLP ---

  submitTranscript: async (meetingId, transcript) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/transcript`, { meetingId, transcript });
      return response.data;
    } catch (err) {
      console.error('Error submitting transcript', err);
      throw new Error('Failed to submit transcript');
    }
  },

  // --- Tasks ---

  getAllTasks: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tasks`);
      return response.data;
    } catch (err) {
      console.error('Error fetching tasks', err);
      return [];
    }
  },

  getTasksByMeeting: async (meetingId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tasks/${meetingId}`);
      return response.data;
    } catch (err) {
      console.error('Error fetching tasks for meeting', err);
      return [];
    }
  },

  updateTaskStatus: async (taskId, status) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/tasks/${taskId}/status`, { status });
      return response.data;
    } catch (err) {
      throw new Error('Failed to update task status');
    }
  },

  deleteTask: async (taskId) => {
    try {
      await axios.delete(`${API_BASE_URL}/tasks/${taskId}`);
    } catch (err) {
      throw new Error('Failed to delete task');
    }
  },

  // --- Summaries ---

  getAllSummaries: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/summaries`);
      return response.data;
    } catch (err) {
      console.error('Error fetching summaries', err);
      return [];
    }
  },

  getSummary: async (meetingId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/summary/${meetingId}`);
      return response.data;
    } catch (err) {
      console.error('Error fetching summary', err);
      return null;
    }
  }
};
