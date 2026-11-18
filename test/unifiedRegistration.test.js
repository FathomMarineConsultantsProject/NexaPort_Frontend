import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, initialRegistration, validateRegistration } from '../src/utils/unifiedRegistrationModel.js';

const valid = { ...initialRegistration, firstName:'Ada',lastName:'Marin',email:'ada@example.com',countryCode:'+44',phone:'7700 900123',companyName:'Harbor Works',categories:['ship_supplier','service_provider'],password:'Secure123',confirmPassword:'Secure123' };
test('all basic fields are required but seniority and role are optional',()=>{
  assert.deepEqual(validateRegistration(valid),{});
  const missing=validateRegistration(initialRegistration);
  assert.deepEqual(Object.keys(missing).sort(),['categories','companyName','email','firstName','lastName','password','phone'].sort());
});
test('independent professional can omit company and keeps consultant activity',()=>{
  assert.deepEqual(validateRegistration({...valid,worksIndependently:true,companyName:'',categories:['marine_consultant_surveyor']}),{});
  assert.ok(validateRegistration({...valid,worksIndependently:true,companyName:''}).categories);
});
test('category choices are distinct and include all requested maritime activities',()=>{
  assert.equal(new Set(CATEGORIES.map(([value])=>value)).size,CATEGORIES.length);
  assert.equal(CATEGORIES.length,12);
  assert.deepEqual(validateRegistration({...valid,categories:['ship_supplier','service_provider']}),{});
});
test('password and contact errors are field specific',()=>{
  const errors=validateRegistration({...valid,email:'bad',countryCode:'44',password:'short',confirmPassword:'different'});
  assert.deepEqual(Object.keys(errors).sort(),['email','phone','password','confirmPassword'].sort());
});
