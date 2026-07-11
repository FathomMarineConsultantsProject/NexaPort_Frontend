import axiosClient from "./axiosClient";

export const getAccreditationSchemes = async () => {
  const res = await axiosClient.get("/accreditation-schemes");
  return res.data;
};

export const getAccreditedInspectors = async (
  schemeSlug,
  { search = "", country = "", rcms = "" } = {}
) => {
  const params = {};
  if (search) params.search = search;
  if (country) params.country = country;
  if (rcms) params.rcms = rcms;

  const res = await axiosClient.get(`/accredited-inspectors/${schemeSlug}`, {
    params,
  });
  return res.data;
};
