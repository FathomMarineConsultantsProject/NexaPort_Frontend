import axiosClient from "./axiosClient";

export const getExpertReviews = async (expertId) => {
  const res = await axiosClient.get(`/experts/${expertId}/reviews`);
  return res.data;
};

export const createExpertReview = async (expertId, payload) => {
  const res = await axiosClient.post(`/experts/${expertId}/reviews`, payload);
  return res.data;
};

export const deleteExpertReview = async (reviewId) => {
  const res = await axiosClient.delete(`/experts/reviews/${reviewId}`);
  return res.data;
};