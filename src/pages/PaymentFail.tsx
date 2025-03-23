import { getTransactionDetails } from "@/services/api";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";


const PaymentFailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(30);
  
  // Extract orderId from URL query params
  const queryParams = new URLSearchParams(location.search);
  const orderId = queryParams.get("orderId");
//   console.log("order Id ========>",orderId);
  useEffect(() => {

    const interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
  
      // Redirect after 10 seconds
      const timer = setTimeout(() => {
        navigate("/user/dashboard");
      }, 30000);
  
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
  }, [orderId, navigate]);
  if (loading) return <div className="flex justify-center items-center h-screen text-xl">Loading...</div>;
  if (error) return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-lg text-center">
        <h2 className="text-2xl font-bold text-red-600">Payment Failed! ❌</h2>
        <p className="text-gray-600 mt-2">Your payment has been failed.</p>
        <p className="text-gray-600 mt-2">If have any issue with transaction contact us at within 24 hrs : info@nvhotech.in</p>
        
        {/* Transaction Details */}
        <div className="mt-4 p-4 border rounded-lg text-left bg-gray-50" style={{display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center"}}>
        
          <p><strong>Order ID:</strong> {orderId}</p>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex gap-4" style={{justifyContent:"center",alignItems:"center"}}>
          <button
            onClick={() => navigate("/user/dashboard")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition"
          >
            Go to Home
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-4">You will be redirected to your dashboard in {countdown || 0} seconds...</p>
      </div>
    </div>
  );
};

export default PaymentFailPage;
