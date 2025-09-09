import { API_URL } from '@/config'; // Assuming you have a config file for API_URL

export const submitAndUpdate = async (data: any, isUpdate: boolean): Promise<void> => {
  const endpoint = isUpdate ? `${API_URL}/update` : `${API_URL}/submit`;
  const method = isUpdate ? 'PUT' : 'POST';

  try {
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Success:', result);
  } catch (error) {
    console.error('Failed to submit or update data:', error);
    throw error; // Rethrow the error for further handling if needed
  }
};