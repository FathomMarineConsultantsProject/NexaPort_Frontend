import axiosClient from "./axiosClient";

export const getPlatformStats = async () => {
  const response = await axiosClient.get(
    "/public/platform-stats"
  );

  return response.data;
};