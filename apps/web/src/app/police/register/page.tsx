'use client';

import { AppShell } from '@/components/layout/AppShell';

export default function PoliceRegisterPage() {
  return (
    <AppShell title="Policeman Accounts" subtitle="Public policeman self-registration is disabled." backLabel="Dashboard">
      <div className="surface-panel p-8">
        <span className="eyebrow">Managed by hierarchy</span>
        <h2 className="display-subsection mt-6">Policeman accounts must be created by a police department.</h2>
        <p className="mt-4 text-base leading-7 text-body">
          Ask your police department administrator to create your account. You will receive a temporary password and will be required to change it on first sign-in.
        </p>
      </div>
    </AppShell>
  );
}
