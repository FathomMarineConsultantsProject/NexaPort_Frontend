import axiosClient from "./axiosClient";

export const getAppointedSurveyors = async ({
  search = "",
  country = "",
  scope = "",
  mlc = "",
} = {}) => {
  const params = {};
  if (search) params.search = search;
  if (country) params.country = country;
  if (scope) params.scope = scope;
  if (mlc) params.mlc = mlc;

  const response = await axiosClient.get("/appointed-surveyors", { params });
  return response.data;
};
