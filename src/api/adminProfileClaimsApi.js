import axiosClient from "./axiosClient";
export const getProfileClaims=async params=>(await axiosClient.get("/admin/profile-claims",{params})).data.data;
