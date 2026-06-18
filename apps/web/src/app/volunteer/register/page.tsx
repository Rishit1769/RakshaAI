'use client';

import { AppShell } from '@/components/layout/AppShell';

export default function VolunteerRegisterPage() {
  return (
    <AppShell title="Volunteer Accounts" subtitle="Public volunteer self-registration is disabled." backLabel="Dashboard">
      <div className="surface-panel p-8">
        <span className="eyebrow">Managed by hierarchy</span>
        <h2 className="display-subsection mt-6">Volunteer accounts must be created by an NGO.</h2>
        <p className="mt-4 text-base leading-7 text-body">
          Ask your NGO administrator to create your account. You will receive a temporary password and will be required to change it on first sign-in.
        </p>
      </div>
    </AppShell>
  );
}
