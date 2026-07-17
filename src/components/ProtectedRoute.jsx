'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = getUser();

    if (!user) {
      router.replace('/login');
      return;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.rol)) {
      router.replace('/login');
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, [router, allowedRoles]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">
        Validando sesión...
      </div>
    );
  }

  return children;
}
