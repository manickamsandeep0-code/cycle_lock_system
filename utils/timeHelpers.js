// Helper function to calculate remaining availability time for a cycle
export const calculateRemainingTime = (cycle) => {
  if (!cycle.availableUntil) return 0;
  
  const availableUntil = new Date(cycle.availableUntil);
  const now = new Date();
  const diffMs = availableUntil - now;
  
  if (diffMs <= 0) return 0;
  
  return Math.floor(diffMs / 60000); // Convert to minutes
};

// Helper function to format minutes into hours and minutes
export const formatMinutes = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
};

// Helper function to calculate price
export const calculatePrice = (minutes) => {
  const hours = minutes / 60;
  return Math.ceil(hours * 30); // ₹30 per hour, rounded up
};
