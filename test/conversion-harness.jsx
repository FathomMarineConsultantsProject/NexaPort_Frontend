import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Route,Routes} from 'react-router-dom';
import {IntakeWorkspace} from '../src/pages/ProcurementIntake.jsx';
import ReceivedQuotations from '../src/pages/ReceivedQuotations.jsx';

createRoot(document.getElementById('root')).render(
 <MemoryRouter initialEntries={[location.hash==='#quote'?'/quote':'/procurement/requisitions/11111111-1111-4111-8111-111111111111']}>
  <Routes>
   <Route path="/quote" element={<ReceivedQuotations requisitionId="11111111-1111-4111-8111-111111111111"/>}/>
   <Route path="/procurement/requisitions/:id" element={<IntakeWorkspace/>}/>
  </Routes>
 </MemoryRouter>
);
