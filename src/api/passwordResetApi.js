import axiosClient from "./axiosClient";

export const sendPasswordResetOtp = async (email) => {
  const response = await axiosClient.post(
    "/auth/forgot-password/send-otp",
    { email }
  );

  return response.data;
};

export const resetPasswordWithOtp = async ({
  email,
  otp,
  newPassword,
  confirmPassword,
}) => {
  const response = await axiosClient.post(
    "/auth/forgot-password/reset",
    {
      email,
      otp,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }
  );

  return response.data;
};