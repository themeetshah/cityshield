import api from './api';

export const staffService = {
    list: async (params = {}) => (await api.get('/users/staff/', { params })).data,
    create: async (payload) => (await api.post('/users/staff/', payload)).data,
    update: async (id, payload) => (await api.patch(`/users/staff/${id}/`, payload)).data,
    remove: async (id) => api.delete(`/users/staff/${id}/`),
    roles: async () => (await api.get('/users/roles/')).data,
    searchStations: async (search) =>
        (await api.get('/users/police-stations/', { params: { search } })).data.results,
};
