import axiosClient from './axiosClient';

const base='/procurement/requisitions';
export const getRequisitionContext=async()=>(await axiosClient.get(`${base}/context`)).data.data;
export const listRequisitions=async()=>(await axiosClient.get(base)).data.data;
export const getRequisition=async(id)=>(await axiosClient.get(`${base}/${id}`)).data.data;
export const createRequisition=async(payload)=>(await axiosClient.post(base,payload)).data.data;
export const updateRequisition=async(id,payload)=>(await axiosClient.patch(`${base}/${id}`,payload)).data.data;
