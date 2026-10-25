import axiosClient from './axiosClient';
export const searchCatalog = async (q,page=1) => (await axiosClient.get('/catalog/search',{params:{q,page}})).data;
export const getCatalogProduct = async (id,page=1) => (await axiosClient.get(`/catalog/${id}`,{params:{page,limit:25}})).data.data;
export const getCatalogSupplier = async (id) => (await axiosClient.get(`/catalog/suppliers/${id}`)).data.data;
export const getCatalogImage = async (path) => (await axiosClient.get(path,{responseType:'blob'})).data;
