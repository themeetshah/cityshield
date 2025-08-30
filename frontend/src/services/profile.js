import api from './api';

export const profileAPI = {
    // Get user profile
    getProfile: async (userId = null) => {
        try {
            const url = userId ? `/users/profile/${userId}/` : '/users/profile/';
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching profile:', error);
            throw error;
        }
    },

    // Update user profile
    updateProfile: async (userId, data) => {
        try {
            const url = userId ? `/users/profile/${userId}/` : '/users/profile/';
            const response = await api.patch(url, data);

            // Update stored user data
            if (response.data) {
                localStorage.setItem('user', JSON.stringify(response.data));
            }

            return response.data;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    },

    // Get user statistics
    getStats: async (userId) => {
        try {
            const response = await api.get(`/users/stats/${userId}/`);
            return response.data;
        } catch (error) {
            console.error('Error fetching stats:', error);
            throw error;
        }
    },

    // Get user activities
    getActivities: async (userId) => {
        try {
            const response = await api.get(`/users/activities/${userId}/`);
            return response.data;
        } catch (error) {
            console.error('Error fetching activities:', error);
            throw error;
        }
    },

    // Get user notifications
    getNotifications: async (userId = null) => {
        try {
            const url = userId ? `/users/notifications/${userId}/` : '/users/notifications/';
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    },

    // Mark notification as read
    markNotificationRead: async (userId, notificationId) => {
        try {
            const response = await api.patch(`/users/notifications/${userId}/${notificationId}/mark-read/`);
            return response.data;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    },

    // Mark all notifications as read
    markAllNotificationsRead: async (userId = null) => {
        try {
            const url = userId ? `/users/notifications/${userId}/mark-all-read/` : '/users/notifications/mark-all-read/';
            const response = await api.patch(url);
            return response.data;
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    },

    // Get emergency contacts
    getEmergencyContacts: async (userId = null) => {
        try {
            const url = userId ? `/users/emergency-contacts/${userId}/` : '/users/emergency-contacts/';
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching emergency contacts:', error);
            throw error;
        }
    },

    // Add emergency contact
    addEmergencyContact: async (userId, contactData) => {
        try {
            const url = userId ? `/users/emergency-contacts/${userId}/` : '/users/emergency-contacts/';
            const response = await api.post(url, contactData);
            return response.data;
        } catch (error) {
            console.error('Error adding emergency contact:', error);
            throw error;
        }
    },

    // Update emergency contact
    updateEmergencyContact: async (userId, contactId, contactData) => {
        try {
            const response = await api.put(`/users/emergency-contacts/${userId}/${contactId}/`, contactData);
            return response.data;
        } catch (error) {
            console.error('Error updating emergency contact:', error);
            throw error;
        }
    },

    // Delete emergency contact
    deleteEmergencyContact: async (userId, contactId) => {
        try {
            const response = await api.delete(`/users/emergency-contacts/${userId}/${contactId}/`);
            return response.data;
        } catch (error) {
            console.error('Error deleting emergency contact:', error);
            throw error;
        }
    },

    // Change password
    changePassword: async (userId, passwordData) => {
        try {
            const url = userId ? `/users/change-password/${userId}/` : '/users/change-password/';
            const response = await api.post(url, passwordData);
            return response.data;
        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    },

    // Upload profile picture
    uploadProfilePicture: async (userId, imageFile) => {
        try {
            const formData = new FormData();
            formData.append('profile_picture', imageFile);

            const url = userId ? `/users/profile/${userId}/upload-picture/` : '/users/profile/upload-picture/';
            const response = await api.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            // Update stored user data
            if (response.data) {
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                const updatedUser = { ...currentUser, ...response.data };
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }

            return response.data;
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            throw error;
        }
    },

    // Delete account
    deleteAccount: async (userId, confirmationData) => {
        try {
            const url = userId ? `/users/delete-account/${userId}/` : '/users/delete-account/';
            const response = await api.post(url, confirmationData);

            // Clear local storage if account deleted successfully
            if (response.data.success) {
                localStorage.removeItem('access');
                localStorage.removeItem('refresh');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }

            return response.data;
        } catch (error) {
            console.error('Error deleting account:', error);
            throw error;
        }
    },

    applyForVolunteer: async (applicationData) => {
        try {
            const response = await api.post('/users/volunteer/apply/', applicationData);
            console.log(response)

            if (response.status === 201) {
                return await response.data
            } else {
                const errorData = await response.data;
                throw new Error(errorData.error || 'Application submission failed');
            }
        } catch (error) {
            console.error('Error applying for volunteer:', error);
            throw error;
        }
    },

    volunteerApplicationStatus: async () => {
        try {
            const response = await api.get('/users/volunteer/application-status/');
            console.log(response)

            if (response.status === 200) {
                const data = await response.data;
                return data;
            } else {
                const errorData = await response.data;
                throw new Error(errorData || 'Failed to fetch application status');
            }
        } catch (error) {
            console.error('Error fetching volunteer application status:', error);
            throw error;
        }
    },

    listVolunteerApplications: async (statusFilter = 'all') => {
        try {
            const response = await api.get(`/users/volunteer/applications/?status=${statusFilter}`);

            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch applications');
            }
        } catch (error) {
            console.error('Error fetching volunteer applications:', error);
            throw error;
        }
    },

    reviewVolunteerApplication: async (applicationId, action, notes = '') => {
        try {
            const response = await api.post(`/users/volunteer/applications/${applicationId}/review/`, {
                action, // 'approve' or 'reject'
                notes
            });

            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Review submission failed');
            }
        } catch (error) {
            console.error('Error reviewing volunteer application:', error);
            throw error;
        }
    }
};

export default profileAPI;
