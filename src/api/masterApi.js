import axiosClient from "./axiosClient";

export const getSpecialties = async () => {
  const res = await axiosClient.get("/master/specialties");
  return res.data;
};

export const getVesselTypes = async () => {
  const res = await axiosClient.get("/master/vessel-types");
  return res.data;
};

export const getCertifications = async () => {
  const res = await axiosClient.get("/master/certifications");
  return res.data;
};

export const getServiceRequestDropdowns = async () => {
  const res = await axiosClient.get(
    "/master/service-request-dropdowns"
  );

  return res.data;
};