import axiosClient from "./axiosClient";

export const getDirectoryVessels = async (params, signal) => (await axiosClient.get("/vessel-directory", { params, signal })).data;
export const getDirectoryFlags = async (signal) => (await axiosClient.get("/vessel-directory/flags", { signal })).data;
export const getDirectoryVessel = async (id, signal) => (await axiosClient.get(`/vessel-directory/${id}`, { signal })).data;
