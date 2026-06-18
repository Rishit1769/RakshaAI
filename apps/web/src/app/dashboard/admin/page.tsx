'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminAliasPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/superadmin');
  }, [router]);

  return null;
}
