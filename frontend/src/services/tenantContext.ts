import axios from 'axios';

axios.interceptors.request.use((config) => {
  if (config.url?.startsWith('/api/admin')) {
    const tenantId = localStorage.getItem('activeTenantId');
    if (tenantId) {
      config.headers = config.headers || {};
      config.headers['x-tenant-id'] = tenantId;
    }
  }
  return config;
});
