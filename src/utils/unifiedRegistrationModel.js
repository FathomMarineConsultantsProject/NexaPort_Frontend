export const CATEGORIES = [
  ['ship_agent','Ship Agent'],['ship_supplier','Ship Supplier'],['service_provider','Service Provider'],
  ['bunkering','Bunkering'],['ship_owner_manager','Ship Owner / Manager'],['charterer_trader','Charterer / Trader'],
  ['broker','Broker'],['terminal','Terminal'],['offshore','Offshore'],['shipyard','Shipyard'],
  ['logistics','Logistics'],['marine_consultant_surveyor','Marine Consultant / Surveyor'],
];
export const SENIORITY = [['','Select (optional)'],['owner_founder','Owner / Founder'],['executive','C-Level / Executive'],['director','Director'],['department_head','Head of Department'],['manager','Manager'],['senior_professional','Senior Professional'],['individual_contributor','Individual Contributor'],['other','Other']];
export const ROLES = [['','Select (optional)'],['commercial','Commercial'],['operations','Operations'],['procurement','Procurement'],['technical','Technical'],['surveyor_consultant','Surveyor / Consultant'],['fleet_management','Fleet Management'],['port_agency','Port Agency'],['leadership','Leadership'],['other','Other']];
export const COUNTRY_CODES = [['+91','India +91'],['+1','US / Canada +1'],['+44','UK +44'],['+971','UAE +971'],['+65','Singapore +65'],['+30','Greece +30'],['+357','Cyprus +357'],['+61','Australia +61']];
export const initialRegistration = { firstName:'', lastName:'', email:'', countryCode:'+91', phone:'', companyName:'', worksIndependently:false, categories:[], seniority:'', professionalRole:'', password:'', confirmPassword:'' };
export function validateRegistration(form) {
  const errors = {};
  if (!form.firstName.trim()) errors.firstName = 'Enter your first name.';
  if (!form.lastName.trim()) errors.lastName = 'Enter your last name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email.';
  if (!/^\+[1-9]\d{0,3}$/.test(form.countryCode) || !/^[0-9 ()-]{6,25}$/.test(form.phone.trim())) errors.phone = 'Enter a valid country code and phone number.';
  if (!form.worksIndependently && !form.companyName.trim()) errors.companyName = 'Enter your company name.';
  if (!form.categories.length) errors.categories = 'Select at least one company activity.';
  if (form.worksIndependently && !form.categories.includes('marine_consultant_surveyor')) errors.categories = 'Independent work is available to consultants and surveyors.';
  if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) errors.password = 'Use 8+ characters with letters and numbers.';
  if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}
