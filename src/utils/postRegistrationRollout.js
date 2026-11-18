// Keep the new journey inactive until the backend application endpoints are deployed.
export const postRegistrationV2 = import.meta.env?.VITE_POST_REGISTRATION_V2 === "true";
