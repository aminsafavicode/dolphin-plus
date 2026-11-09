import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { OperatorApp } from './OperatorApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OperatorApp />
  </StrictMode>,
);
