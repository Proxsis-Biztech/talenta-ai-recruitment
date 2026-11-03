import axios from 'axios';

const headers = () => {
  const token = localStorage.getItem('adminToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const loadMasterScope = async <T = unknown>(scope: string): Promise<Record<string, T>> => {
  const response = await axios.get(`/api/admin/master/${scope}`, { headers: headers() });
  return (response.data?.data || {}) as Record<string, T>;
};

export const saveMasterRecord = async <T = unknown>(scope: string, key: string, value: T): Promise<void> => {
  await axios.put(`/api/admin/master/${scope}/${key}`, { value }, { headers: headers() });
};

export const deleteMasterRecord = async (scope: string, key: string): Promise<void> => {
  await axios.delete(`/api/admin/master/${scope}/${key}`, { headers: headers() });
};