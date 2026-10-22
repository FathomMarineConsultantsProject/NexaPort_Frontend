import axiosClient from "./axiosClient";
export const previewClaimInvitation=async token=>(await axiosClient.get(`/public/claim-invitations/${encodeURIComponent(token)}`)).data.data;
export const redeemClaimInvitation=async token=>(await axiosClient.post(`/claim-invitations/${encodeURIComponent(token)}/redeem`)).data.data;
export const issueClaimInvitation=async body=>(await axiosClient.post("/admin/claim-invitations",body)).data.data;
export const revokeClaimInvitation=async id=>(await axiosClient.post(`/admin/claim-invitations/${encodeURIComponent(id)}/revoke`)).data.data;
export const listClaimInvitations=async params=>(await axiosClient.get("/admin/claim-invitations",{params})).data.data;
