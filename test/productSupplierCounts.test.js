import test from 'node:test';
import assert from 'node:assert/strict';
import { countLabel, verifiedCount } from '../src/components/directories/productSupplierCounts.js';

test('supplier counts distinguish absent data, zero, singular and plural',()=>{
  assert.equal(verifiedCount({}),null);
  assert.equal(verifiedCount({verified_supplier_count:0}),0);
  assert.equal(verifiedCount({verified_supplier_count:1}),1);
  assert.equal(verifiedCount({verified_supplier_count:-1}),null);
  assert.equal(countLabel(null),'Verified supplier count unavailable');
  assert.equal(countLabel(0),'0 verified suppliers');
  assert.equal(countLabel(1),'1 supplier');
  assert.equal(countLabel(3),'3 suppliers');
});
