import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/js/dist/modal';
import app from './app/app';

const init = () => {
  document.addEventListener('DOMContentLoaded', () => {
    app();
  });
};
init();

export default app;
