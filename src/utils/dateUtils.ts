/**
 * Calculate the time difference between the current date and a future date
 * @param endDate The date to calculate time remaining until
 * @returns Object containing days, hours, and minutes remaining, or null if the date has passed
 */
export const calculateTimeRemaining = (endDate: string): { 
    days: number; 
    hours: number; 
    minutes: number; 
  } | null => {
    const now = new Date();
    const end = new Date(endDate);
    
    // If end date has passed, return null
    if (now > end) {
      return null;
    }
    
    // Calculate the time difference in milliseconds
    const diffMs = end.getTime() - now.getTime();
    
    // Convert to days, hours, minutes
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days, hours, minutes };
  };
  
  /**
   * Format the time remaining in a human-readable format
   * @param timeRemaining The time remaining object
   * @returns Formatted string (e.g., "5 days, 3 hours")
   */
  export const formatTimeRemaining = (timeRemaining: { 
    days: number; 
    hours: number; 
    minutes: number; 
  } | null): string => {
    if (!timeRemaining) {
      return "Expired";
    }
    
    const { days, hours, minutes } = timeRemaining;
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };


  export const isDateExpired = (dateString: string): boolean => {
    const now = new Date();
    const date = new Date(dateString);
    return now > date;
  };