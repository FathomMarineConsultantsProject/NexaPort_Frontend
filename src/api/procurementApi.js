import axiosClient from './axiosClient';

const base='/procurement/requisitions';
export const getRequisitionContext=async()=>(await axiosClient.get(`${base}/context`)).data.data;
export const listRequisitions=async()=>(await axiosClient.get(base)).data.data;
export const getRequisition=async(id)=>(await axiosClient.get(`${base}/${id}`)).data.data;
export const createRequisition=async(payload)=>(await axiosClient.post(base,payload)).data.data;
export const updateRequisition=async(id,payload)=>(await axiosClient.patch(`${base}/${id}`,payload)).data.data;
export const submitRequisition=async(id,expectedVersion)=>(await axiosClient.post(`${base}/${id}/submit`,{expectedVersion})).data.data;
export const listSubmittedRequisitions=async(params={})=>(await axiosClient.get(`${base}/submitted`,{params})).data.data;
export const getSubmittedRequisition=async(id)=>(await axiosClient.get(`${base}/submitted/${id}`)).data.data;
export const listPurchaserInbox=async(params={})=>(await axiosClient.get(`${base}/purchaser/inbox`,{params})).data.data;
export const getPurchaserAccess=async()=>(await axiosClient.get(`${base}/purchaser/access`,{skipAuthRedirect:true})).data.data;
export const getPurchaserRequisition=async(id)=>(await axiosClient.get(`${base}/purchaser/inbox/${id}`)).data.data;
export const listAssignmentQueue=async(params={})=>(await axiosClient.get(`${base}/admin/assignments`,{params})).data.data;
export const listPurchasers=async()=>(await axiosClient.get(`${base}/admin/purchasers`)).data.data;
export const searchPurchaserCandidates=async(search)=>(await axiosClient.get(`${base}/admin/purchaser-candidates`,{params:{search}})).data.data;
export const grantPurchaser=async(userId,organization)=>(await axiosClient.post(`${base}/admin/purchasers`,{userId,organization})).data.data;
export const assignPurchaser=async(id,purchaserId)=>(await axiosClient.put(`${base}/admin/assignments/${id}`,{purchaserId})).data.data;
