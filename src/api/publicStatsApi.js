import axiosClient from "./axiosClient";

export const getPlatformStats = async () => (await axiosClient.get("/public/platform-stats")).data;
