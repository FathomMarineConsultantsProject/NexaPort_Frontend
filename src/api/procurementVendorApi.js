import axiosClient from './axiosClient';
const base='/procurement/vendors';
export const listVendorRfqs=async()=>(await axiosClient.get(`${base}/my-invitations`)).data.data;
export const getVendorRfq=async(id)=>(await axiosClient.get(`${base}/my-invitations/${id}`)).data.data;
export const submitVendorQuote=async(id,body)=>(await axiosClient.post(`${base}/my-invitations/${id}/quotes`,body)).data.data;
export const listVendorPos=async()=>(await axiosClient.get(`${base}/my-orders`)).data.data;
export const getVendorPo=async(id)=>(await axiosClient.get(`${base}/my-orders/${id}`)).data.data;
export const vendorAcknowledgePo=async(id)=>(await axiosClient.post(`${base}/my-orders/${id}/acknowledge`)).data.data;
export const vendorDispatchPo=async(id,body)=>(await axiosClient.post(`${base}/my-orders/${id}/dispatch`,body)).data.data;
