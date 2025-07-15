import './App.css';
import EmployeePortal from './apps/mainbord.jsx';
import Login from './pages/Login.jsx';
// import { Toaster } from "react-hot-toast";

function App() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  return (
    <>
      {/* <Toaster position="top-center" reverseOrder={false} /> */}
      {user && user.username ? <EmployeePortal /> : <Login />}
    </>
  );
}

export default App;
