export const validateInput = (value: string, fieldType: 'text' | 'number' | 'alphanumeric'): boolean => {
  switch (fieldType) {
    case 'text':
      return /^[a-zA-Z\s]*$/.test(value);
    case 'number':
      return /^\d+$/.test(value);
    case 'alphanumeric':
      return /^[a-zA-Z0-9]*$/.test(value);
    default:
      return false;
  }
};