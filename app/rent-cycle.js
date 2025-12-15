"use client";
import { useEffect, useState } from "react";
import { auth, db, rtdb } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, onValue, set } from "firebase/database";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { toast } from "react-hot-toast";

const mapContainerStyle = {
  width: "100%",
  height: "500px",
};

const center = {
  lat: 28.6139,
  lng: 77.209,
};

export default function MapPage() {
  const [user, setUser] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchUserBalance(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Listen to Realtime Database /locks path
    const locksRef = ref(rtdb, '/locks');
    const unsubscribe = onValue(locksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Transform object to array format
        const cyclesArray = Object.keys(data).map((lockID) => ({
          id: lockID,
          ...data[lockID],
        }));
        setCycles(cyclesArray);
      } else {
        setCycles([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Unable to get your location");
        }
      );
    }
  }, []);

  const fetchUserBalance = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        setBalance(userDoc.data().balance || 0);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
      toast.error("Failed to fetch balance");
    }
  };

  const handleRentCycle = async (cycle) => {
    if (!user) {
      toast.error("Please login to rent a cycle");
      return;
    }

    if (balance < 10) {
      toast.error("Insufficient balance. Minimum ₹10 required.");
      return;
    }

    try {
      // Write unlock command to Realtime Database
      const commandRef = ref(rtdb, `/locks/${cycle.id}/command`);
      await set(commandRef, {
        action: "UNLOCK",
        executed: false,
      });

      // Update user balance in Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        balance: balance - 10,
      });

      setBalance(balance - 10);
      toast.success(`Unlock command sent to ${cycle.id}! ₹10 deducted.`);
    } catch (error) {
      console.error("Error renting cycle:", error);
      toast.error("Failed to unlock cycle");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Cycle Map
          </h1>
          <p className="text-gray-600">
            Find and rent cycles near you
          </p>
          {user && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <p className="text-lg font-semibold text-green-800">
                Balance: ₹{balance}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={userLocation || center}
              zoom={13}
            >
              {userLocation && (
                <Marker
                  position={userLocation}
                  icon={{
                    url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                  }}
                />
              )}
              {cycles.map((cycle) => (
                cycle.latitude && cycle.longitude && (
                  <Marker
                    key={cycle.id}
                    position={{ lat: cycle.latitude, lng: cycle.longitude }}
                    icon={{
                      url: cycle.lockStatus === "UNLOCKED"
                        ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                        : "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                    }}
                    onClick={() => {
                      toast(
                        <div>
                          <p className="font-bold">{cycle.id}</p>
                          <p>Status: {cycle.lockStatus || "UNKNOWN"}</p>
                          {cycle.lockStatus === "LOCKED" && (
                            <button
                              onClick={() => handleRentCycle(cycle)}
                              className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                            >
                              Rent (₹10)
                            </button>
                          )}
                        </div>,
                        { duration: 5000 }
                      );
                    }}
                  />
                )
              ))}
            </GoogleMap>
          </LoadScript>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Available Cycles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cycles.map((cycle) => (
              <div
                key={cycle.id}
                className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {cycle.id}
                </h3>
                <p className="text-gray-600 mb-2">
                  Status:{" "}
                  <span
                    className={
                      cycle.lockStatus === "LOCKED"
                        ? "text-red-600 font-semibold"
                        : "text-green-600 font-semibold"
                    }
                  >
                    {cycle.lockStatus || "UNKNOWN"}
                  </span>
                </p>
                {cycle.latitude && cycle.longitude && (
                  <p className="text-gray-600 mb-3 text-sm">
                    Location: {cycle.latitude.toFixed(4)}, {cycle.longitude.toFixed(4)}
                  </p>
                )}
                {cycle.lockStatus === "LOCKED" && (
                  <button
                    onClick={() => handleRentCycle(cycle)}
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                  >
                    Rent - ₹10
                  </button>
                )}
                {cycle.lockStatus === "UNLOCKED" && (
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-600 px-4 py-2 rounded cursor-not-allowed"
                  >
                    In Use
                  </button>
                )}
              </div>
            ))}
          </div>
          {cycles.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              No cycles available at the moment
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
