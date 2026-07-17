import apiClient from './client';

export const loginWithPassword = async (email: string, password: string) => {
  const response = await apiClient.post('/auth/staff/login', {
    email,
    password,
  });
  return response.data;
};

export const loginWithPin = async (email: string, pin: string) => {
  const response = await apiClient.post('/auth/staff/pin-login', {
    email,
    pin,
  });
  return response.data;
};

export const changePassword = async (current_password: string, new_password: string) => {
  const response = await apiClient.post('/auth/staff/change-password', {
    current_password,
    new_password,
  });
  return response.data;
};
