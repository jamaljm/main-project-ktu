export interface FormData {
  formData: {
    fullName: string | null;
    dob: string | null;
    gender: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    pincode: string | null;
    aadharNumber: string | null;
    certificateType: string | null;
  };
  lastUpdated: string | null;
  isComplete: boolean;
}

const STORAGE_KEY = "kerala_gov_cert_form_data";

const getDefaultFormData = (): FormData => ({
  formData: {
    fullName: null,
    dob: null,
    gender: null,
    email: null,
    phone: null,
    address: null,
    pincode: null,
    aadharNumber: null,
    certificateType: null,
  },
  lastUpdated: null,
  isComplete: false,
});

export const readFormData = (): FormData => {
  try {
    if (typeof window === "undefined") {
      return getDefaultFormData();
    }
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : getDefaultFormData();
  } catch (error) {
    console.error("Error reading form data:", error);
    return getDefaultFormData();
  }
};

export const updateFormData = (
  fieldName: keyof FormData["formData"],
  value: string
): FormData => {
  const currentData = readFormData();

  // Update the specified field
  currentData.formData[fieldName] = value;
  currentData.lastUpdated = new Date().toISOString();

  // Check if all required fields are filled
  const requiredFields: (keyof FormData["formData"])[] = [
    "fullName",
    "dob",
    "gender",
    "email",
    "phone",
    "address",
    "pincode",
    "aadharNumber",
    "certificateType",
  ];

  currentData.isComplete = requiredFields.every(
    (field) => currentData.formData[field] !== null
  );

  // Save to localStorage
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentData));
    }
  } catch (error) {
    console.error("Error writing form data:", error);
  }

  return currentData;
};

export const resetFormData = (): void => {
  const emptyData = getDefaultFormData();

  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyData));
    }
  } catch (error) {
    console.error("Error resetting form data:", error);
  }
};
