import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { getUserData, getUserRole } from '../utils/storage';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasUser, setHasUser] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const userData = await getUserData();
    const userRole = await getUserRole();
    setHasUser(!!userData && !!userRole);
    setIsLoading(false);
  };

  if (isLoading) {
    return null;
  }

  // Redirect based on authentication status
  if (hasUser) {
    return <Redirect href="/map" />;
  }

  return <Redirect href="/login" />;
}
