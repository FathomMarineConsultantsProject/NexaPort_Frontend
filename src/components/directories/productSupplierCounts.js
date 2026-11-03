export const verifiedCount = product => {
  const value = product?.verified_supplier_count ?? product?.verifiedSupplierCount;
  return Number.isInteger(value) && value >= 0 ? value : null;
};

export const countLabel = count => count === null ? 'Verified supplier count unavailable'
  : count === 0 ? '0 verified suppliers' : `${count} supplier${count === 1 ? '' : 's'}`;
